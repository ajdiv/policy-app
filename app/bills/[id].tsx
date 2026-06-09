import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, Link, Stack } from "expo-router";
import { getBill, type BillDetail, type BillVote } from "../../lib/api";
import { colors, tempColors, castColors } from "../../lib/theme";

export default function BillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<BillDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVotes, setShowVotes] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setData(await getBill(id));
      } catch (e: any) {
        setError(e.message ?? "Could not load bill.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>;
  if (error || !data) return <View style={styles.center}><Text style={styles.err}>{error ?? "Not found."}</Text></View>;

  const { bill, temperature: t } = data;
  const tc = t ? tempColors(t.label) : null;
  const yeas = data.votes.filter((v) => v.cast === "Yea");
  const nays = data.votes.filter((v) => v.cast === "Nay");

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: `${bill.billType} ${bill.number}` }} />
      <View style={styles.shell}>
        <Text style={styles.title}>{bill.title}</Text>
        <Text style={styles.meta}>
          {bill.billType} {bill.number} · {bill.congress}th Congress
          {bill.policyArea ? ` · ${bill.policyArea}` : ""}
        </Text>
        {bill.url ? (
          <Pressable onPress={() => Linking.openURL(bill.url!)}>
            <Text style={styles.link}>View on Congress.gov ↗</Text>
          </Pressable>
        ) : null}

        {/* Partisan temperature */}
        <View style={styles.card}>
          <View style={styles.tempHeader}>
            <Text style={styles.cardTitle}>Partisan temperature</Text>
            {t && tc ? (
              <View style={[styles.tempChip, { backgroundColor: tc.bg }]}>
                <Text style={[styles.tempChipText, { color: tc.text }]}>{t.label}</Text>
              </View>
            ) : null}
          </View>
          {data.primaryResult ? (
            <Text style={styles.subtle}>
              Key vote: {data.primaryResult}
              {data.primaryDate ? ` · ${fmtDate(data.primaryDate)}` : ""}
            </Text>
          ) : null}

          {t && tc ? (
            <View style={{ marginTop: 12 }}>
              {/* bipartisan scale */}
              <View style={styles.scaleTrack}>
                <View style={[styles.scaleFill, { width: `${t.score}%`, backgroundColor: tc.bar }]} />
              </View>
              <View style={styles.scaleLabels}>
                <Text style={styles.scaleEnd}>Party-line</Text>
                <Text style={styles.scaleEnd}>Bipartisan</Text>
              </View>

              <PartyBar label="Democrats" yea={t.dem.yea} nay={t.dem.nay} color="#1d4ed8" />
              <PartyBar label="Republicans" yea={t.rep.yea} nay={t.rep.nay} color="#b91c1c" />
            </View>
          ) : (
            <Text style={styles.subtle}>No party breakdown available for this bill's votes.</Text>
          )}
        </View>

        {/* All roll calls on this bill */}
        {data.rollcalls.length > 1 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>All roll calls ({data.rollcalls.length})</Text>
            {data.rollcalls.map((rc) => (
              <View key={rc.id} style={styles.rcRow}>
                <Text style={styles.rcText}>
                  #{rc.number} · {rc.result ?? "—"}
                  {rc.date ? ` · ${fmtDate(rc.date)}` : ""}
                </Text>
                {rc.temperature ? (
                  <View style={[styles.tempChipSm, { backgroundColor: tempColors(rc.temperature.label).bg }]}>
                    <Text style={[styles.tempChipSmText, { color: tempColors(rc.temperature.label).text }]}>
                      {rc.temperature.label}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Who voted (current members) */}
        <View style={styles.card}>
          <Pressable style={styles.tempHeader} onPress={() => setShowVotes((v) => !v)}>
            <Text style={styles.cardTitle}>
              How members voted ({yeas.length} Yea · {nays.length} Nay)
            </Text>
            <Text style={styles.toggle}>{showVotes ? "Hide" : "Show"}</Text>
          </Pressable>
          <Text style={styles.subtle}>Members currently in our directory; the party totals above count every voter.</Text>
          {showVotes ? (
            <View style={{ marginTop: 10 }}>
              <VoteGroup label="Yea" votes={yeas} />
              <VoteGroup label="Nay" votes={nays} />
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

function PartyBar({ label, yea, nay, color }: { label: string; yea: number; nay: number; color: string }) {
  const total = yea + nay || 1;
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={styles.partyLabel}>
        {label}: {yea} Yea · {nay} Nay
      </Text>
      <View style={styles.partyTrack}>
        <View style={{ width: `${(yea / total) * 100}%`, backgroundColor: color, height: "100%" }} />
      </View>
    </View>
  );
}

function VoteGroup({ label, votes }: { label: string; votes: BillVote[] }) {
  if (votes.length === 0) return null;
  const cc = castColors(label);
  return (
    <View style={{ marginTop: 8 }}>
      <View style={[styles.voteGroupBadge, { backgroundColor: cc.bg }]}>
        <Text style={[styles.voteGroupText, { color: cc.text }]}>
          {label} · {votes.length}
        </Text>
      </View>
      {votes.map((v) => (
        <Link key={v.id} href={{ pathname: "/members/[id]", params: { id: v.id } }} asChild>
          <Pressable style={styles.voterRow}>
            <Text style={styles.voterName}>{v.name}</Text>
            <Text style={styles.voterMeta}>
              {v.party ?? ""}
              {v.state ? ` · ${v.state}` : ""}
            </Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

function fmtDate(d: string): string {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d.slice(0, 10) : dt.toLocaleDateString("en-US");
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 64, alignItems: "center" },
  shell: { width: "100%", maxWidth: 820, alignSelf: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  err: { color: colors.nayText },
  title: { fontSize: 24, fontWeight: "800", color: colors.title, lineHeight: 30 },
  meta: { color: colors.muted, marginTop: 6, fontSize: 14 },
  link: { color: colors.primary, fontWeight: "700", marginTop: 8, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tempHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  subtle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  tempChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14 },
  tempChipText: { fontWeight: "700", fontSize: 13 },
  scaleTrack: { height: 10, borderRadius: 5, backgroundColor: "#eef0f5", overflow: "hidden" },
  scaleFill: { height: "100%", borderRadius: 5 },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  scaleEnd: { color: colors.muted, fontSize: 11 },
  partyLabel: { color: colors.text, fontSize: 13, fontWeight: "600" },
  partyTrack: { height: 8, borderRadius: 4, backgroundColor: "#eef0f5", overflow: "hidden", marginTop: 4 },
  rcRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  rcText: { color: colors.text, fontSize: 13 },
  tempChipSm: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  tempChipSmText: { fontWeight: "700", fontSize: 11 },
  toggle: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  voteGroupBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 6, marginBottom: 4 },
  voteGroupText: { fontWeight: "700", fontSize: 12 },
  voterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border },
  voterName: { color: colors.title, fontWeight: "600", fontSize: 14, flexShrink: 1 },
  voterMeta: { color: colors.muted, fontSize: 12, marginLeft: 8 },
});
