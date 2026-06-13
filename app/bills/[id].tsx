import { useEffect, useState, useMemo } from "react";
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
import { tempColors, castColors, space, radius, fontSize, fontWeight, lineHeight, maxWidth, type Palette } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";

export default function BillDetailScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
  const tc = t ? tempColors(colors, t.label) : null;
  const yeas = data.votes.filter((v) => v.cast === "Yea");
  const nays = data.votes.filter((v) => v.cast === "Nay");

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
    const cc = castColors(colors, label);
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

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <Stack.Screen options={{ title: `${bill.billType} ${bill.number}` }} />
      <View style={styles.shell}>
        <Text style={styles.title}>{bill.title ?? `${bill.billType} ${bill.number}`}</Text>
        <Text style={styles.meta}>
          {bill.billType} {bill.number} · {bill.congress}th Congress
          {bill.policyArea ? ` · ${bill.policyArea}` : ""}
        </Text>
        {bill.url ? (
          <Pressable onPress={() => Linking.openURL(bill.url!)}>
            <Text style={styles.link}>View on Congress.gov ↗</Text>
          </Pressable>
        ) : null}

        {data.notInDataset && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No recorded House votes</Text>
            <Text style={styles.subtle}>
              This bill isn&apos;t in our vote dataset — it may not have reached a recorded House floor vote (our
              coverage is recorded House votes, 2023→). Use the Congress.gov link above for the full text and status.
            </Text>
          </View>
        )}

        {/* Partisan temperature */}
        {!data.notInDataset && (
        <>

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

              <PartyBar label="Democrats" yea={t.dem.yea} nay={t.dem.nay} color={colors.partyDemBar} />
              <PartyBar label="Republicans" yea={t.rep.yea} nay={t.rep.nay} color={colors.partyRepBar} />
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
                  <View style={[styles.tempChipSm, { backgroundColor: tempColors(colors, rc.temperature.label).bg }]}>
                    <Text style={[styles.tempChipSmText, { color: tempColors(colors, rc.temperature.label).text }]}>
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
        </>
        )}
      </View>
    </ScrollView>
  );
}

function fmtDate(d: string): string {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d.slice(0, 10) : dt.toLocaleDateString("en-US");
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
  page: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.mega, alignItems: "center" },
  shell: { width: "100%", maxWidth: maxWidth.narrow, alignSelf: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: space.xl },
  err: { color: c.nayText },
  title: { fontSize: fontSize.h3, fontWeight: fontWeight.bold, color: c.title, lineHeight: lineHeight.display },
  meta: { color: c.muted, marginTop: space.sm, fontSize: fontSize.md },
  link: { color: c.primary, fontWeight: fontWeight.semibold, marginTop: space.sm, fontSize: fontSize.md },
  card: {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    padding: space.lg,
    marginTop: space.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  tempHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: c.text },
  subtle: { color: c.muted, fontSize: fontSize.base, marginTop: space.xs },
  tempChip: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.md },
  tempChipText: { fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  scaleTrack: { height: 10, borderRadius: 5, backgroundColor: c.track, overflow: "hidden" },
  scaleFill: { height: "100%", borderRadius: 5 },
  scaleLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: space.xs },
  scaleEnd: { color: c.muted, fontSize: fontSize.xs },
  partyLabel: { color: c.text, fontSize: fontSize.base, fontWeight: fontWeight.medium },
  partyTrack: { height: 8, borderRadius: 4, backgroundColor: c.track, overflow: "hidden", marginTop: space.xs },
  rcRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: c.border },
  rcText: { color: c.text, fontSize: fontSize.base },
  tempChipSm: { paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.md },
  tempChipSmText: { fontWeight: fontWeight.semibold, fontSize: fontSize.xs },
  toggle: { color: c.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  voteGroupBadge: { alignSelf: "flex-start", paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.md, marginTop: space.sm, marginBottom: space.xs },
  voteGroupText: { fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  voterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.sm, borderTopWidth: 1, borderTopColor: c.border },
  voterName: { color: c.title, fontWeight: fontWeight.medium, fontSize: fontSize.md, flexShrink: 1 },
  voterMeta: { color: c.muted, fontSize: fontSize.sm, marginLeft: space.sm },
  });
}
