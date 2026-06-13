import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
  Image,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getMember,
  type Member,
  type Tenure,
  type Position,
  type VoteItem,
  type LegislationItem,
  type RecordItem,
} from "../../lib/api";
import { colors, castColors, space, radius, fontSize, fontWeight, lineHeight, shadow, maxWidth } from "../../lib/theme";
import { ChatBubble } from "../../components/ChatBubble";
import { useWideLayout } from "../../lib/useWideLayout";

export default function Profile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const wide = useWideLayout(920);

  const [member, setMember] = useState<Member | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [headshotUrl, setHeadshotUrl] = useState<string | null>(null);
  const [tenure, setTenure] = useState<Tenure | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [recentVotes, setRecentVotes] = useState<VoteItem[]>([]);
  const [recentLegislation, setRecentLegislation] = useState<LegislationItem[]>([]);
  const [executiveOrders, setExecutiveOrders] = useState<RecordItem[]>([]);
  const [votesAvailable, setVotesAvailable] = useState(false);
  const [legVisible, setLegVisible] = useState(5);
  const [votesVisible, setVotesVisible] = useState(5);
  const [eoVisible, setEoVisible] = useState(5);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLegVisible(5);
    setVotesVisible(5);
    setEoVisible(5);
    (async () => {
      try {
        const data = await getMember(id);
        setMember(data.member);
        setRecordCount(data.recordCount);
        setHeadshotUrl(data.headshotUrl);
        setTenure(data.tenure);
        setPositions(data.positions ?? []);
        setRecentVotes(data.recentVotes ?? []);
        setRecentLegislation(data.recentLegislation ?? []);
        setExecutiveOrders(data.executiveOrders ?? []);
        setVotesAvailable(data.votesAvailable);
      } catch (e: any) {
        setLoadError(e.message ?? "Could not load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (loadError || !member) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{loadError ?? "Not found."}</Text>
      </View>
    );
  }

  const isPresident = member.role === "president";

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.shell}>
        {/* Profile header */}
        <View style={styles.profileCard}>
          <View style={[styles.profileRow, !wide && { flexDirection: "column", alignItems: "flex-start" }]}>
            {headshotUrl ? (
              <Image source={{ uri: headshotUrl }} style={styles.headshot} />
            ) : (
              <View style={[styles.headshot, styles.headshotFallback]}>
                <Text style={styles.headshotInitials}>{initials(member.fullName)}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{member.fullName}</Text>
              <Text style={styles.meta}>
                {tenure?.roleLabel ?? roleLabel(member.role)}
                {member.state ? ` · ${member.state}` : ""}
              </Text>
              <View style={styles.badgeRow}>
                {member.party ? (
                  <View style={[styles.partyBadge, { backgroundColor: partyColor(member.party).bg }]}>
                    <Text style={[styles.partyBadgeText, { color: partyColor(member.party).text }]}>{member.party}</Text>
                  </View>
                ) : null}
                {tenure ? (
                  <Text style={styles.factText}>
                    In office since {tenure.sinceYear} · {tenure.years} yr{tenure.years === 1 ? "" : "s"}
                  </Text>
                ) : null}
                {!isPresident && recordCount > 0 ? (
                  <Text style={styles.factText}>{recordCount.toLocaleString()} recorded votes</Text>
                ) : null}
              </View>
              {positions.length > 1 && (
                <View style={styles.positionsWrap}>
                  <Text style={styles.positionsLabel}>Positions held</Text>
                  {positions.map((p, i) => (
                    <Text key={i} style={styles.positionItem}>
                      • {p.roleLabel} · {p.startYear}–{p.endYear ?? "present"}
                      {p.current ? "  (current)" : ""}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Recent legislation + votes (or executive orders for the President) */}
        {isPresident ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Recent executive orders</Text>
            {executiveOrders.length === 0 ? (
              <Text style={styles.muted}>No executive orders loaded.</Text>
            ) : (
              executiveOrders.slice(0, eoVisible).map((e, i) => (
                <Pressable key={i} style={styles.listItem} onPress={() => e.url && Linking.openURL(e.url)}>
                  <Text style={styles.listItemTitle}>{e.title}</Text>
                  <Text style={styles.listItemMeta}>
                    {e.ref}
                    {e.date ? ` · ${fmtDate(e.date)}` : ""}
                  </Text>
                </Pressable>
              ))
            )}
            {loadMore(executiveOrders.length, eoVisible, () => setEoVisible((v) => v + 5))}
          </View>
        ) : (
          <View style={[styles.columns, !wide && { flexDirection: "column" }]}>
            <View style={[styles.colLeft, wide && { flex: 1 }]}>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Recent legislation</Text>
                {recentLegislation.length === 0 ? (
                  <Text style={styles.muted}>No recent legislation found.</Text>
                ) : (
                  recentLegislation.slice(0, legVisible).map((l, i) => (
                    <View key={i} style={styles.legRow}>
                      <Pressable
                        style={styles.legMain}
                        onPress={() => router.push({ pathname: "/bills/[id]", params: { id: l.ref } })}
                      >
                        <View style={styles.itemTopRow}>
                          <View style={[styles.kindBadge, l.kind === "Sponsored" ? styles.kindSponsored : styles.kindCosponsored]}>
                            <Text style={[styles.kindBadgeText, l.kind === "Sponsored" ? styles.kindSponsoredText : styles.kindCosponsoredText]}>
                              {l.kind}
                            </Text>
                          </View>
                          {l.date && <Text style={styles.listItemDate}>{fmtDate(l.date)}</Text>}
                        </View>
                        <Text style={styles.listItemTitle}>{l.title}</Text>
                        <Text style={styles.listItemMeta}>
                          {l.ref}
                          {l.policyArea ? ` · ${l.policyArea}` : ""}
                        </Text>
                      </Pressable>
                      {l.url ? (
                        <Pressable
                          onPress={() => Linking.openURL(l.url!)}
                          hitSlop={8}
                          style={styles.govArrow}
                          accessibilityLabel="View on Congress.gov"
                        >
                          <Ionicons name="open-outline" size={18} color={colors.muted} />
                        </Pressable>
                      ) : null}
                    </View>
                  ))
                )}
                {loadMore(recentLegislation.length, legVisible, () => setLegVisible((v) => v + 5))}
              </View>
            </View>
            <View style={[styles.colRight, wide && { flex: 1 }]}>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Recent votes</Text>
                {!votesAvailable ? (
                  <Text style={styles.muted}>
                    Recent vote data isn&apos;t available for {member.role === "senator" ? "senators" : "this member"} yet —
                    our roll-call dataset currently covers the U.S. House (2023+).
                  </Text>
                ) : recentVotes.length === 0 ? (
                  <Text style={styles.muted}>No recent votes found.</Text>
                ) : (
                  recentVotes.slice(0, votesVisible).map((v, i) => (
                    <Pressable key={i} style={styles.listItem} onPress={() => v.url && Linking.openURL(v.url)}>
                      <View style={styles.itemTopRow}>
                        <View style={[styles.voteBadge, { backgroundColor: castColors(v.cast).bg }]}>
                          <Text style={[styles.voteBadgeText, { color: castColors(v.cast).text }]}>{v.cast}</Text>
                        </View>
                        {v.date && <Text style={styles.listItemDate}>{fmtDate(v.date)}</Text>}
                      </View>
                      <Text style={styles.listItemTitle}>{v.title}</Text>
                      <Text style={styles.listItemMeta}>{v.ref}</Text>
                    </Pressable>
                  ))
                )}
                {votesAvailable && loadMore(recentVotes.length, votesVisible, () => setVotesVisible((v) => v + 5))}
              </View>
            </View>
          </View>
        )}

      </View>
      </ScrollView>
      <ChatBubble memberId={id!} role={member.role} name={member.fullName} />
    </View>
  );
}

function roleLabel(role: string): string {
  if (role === "president") return "President";
  if (role === "senator") return "U.S. Senator";
  if (role === "representative") return "U.S. Representative";
  return role;
}
function fmtDate(d: string): string {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? d.slice(0, 10) : dt.toLocaleDateString("en-US");
}
/** A "Load more (N more)" button shown when a list has more rows than are visible. */
function loadMore(total: number, visible: number, onMore: () => void) {
  if (total <= visible) return null;
  return (
    <Pressable style={styles.loadMoreBtn} onPress={onMore}>
      <Text style={styles.loadMoreText}>Load more ({total - visible} more)</Text>
    </Pressable>
  );
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}
function partyColor(party: string): { bg: string; text: string } {
  if (/^D/i.test(party)) return { bg: "#dbeafe", text: "#1d4ed8" };
  if (/^R/i.test(party)) return { bg: "#fee2e2", text: "#b91c1c" };
  return { bg: "#e5e7eb", text: "#4b5563" };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  page: { paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.giant, alignItems: "center" },
  shell: { width: "100%", maxWidth: maxWidth.wide, alignSelf: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: space.xl },
  name: { fontSize: fontSize.display, fontWeight: fontWeight.bold, color: colors.title, letterSpacing: -0.5 },
  meta: { color: colors.subtitle, marginTop: space.xs, fontSize: fontSize.xxl, fontWeight: fontWeight.medium },

  profileCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: space.xxl,
    borderWidth: 1,
    borderColor: "#dfe3f3",
    marginBottom: space.xl,
    ...shadow.raised,
  },
  profileRow: { flexDirection: "row", alignItems: "center", gap: space.xxl },
  headshot: { width: 132, height: 132, borderRadius: 18, backgroundColor: "#eef2ff", borderWidth: 3, borderColor: "#e0e7ff" },
  headshotFallback: { alignItems: "center", justifyContent: "center" },
  headshotInitials: { fontSize: 46, fontWeight: fontWeight.bold, color: colors.primary },
  inlineLink: { color: colors.primary, fontWeight: fontWeight.semibold, textDecorationLine: "underline" },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.md, flexWrap: "wrap" },
  partyBadge: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.md },
  partyBadgeText: { fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  factText: { color: colors.muted, fontSize: fontSize.md },
  positionsWrap: { marginTop: space.md },
  positionsLabel: { color: colors.text, fontWeight: fontWeight.semibold, fontSize: fontSize.base, marginBottom: space.xs },
  positionItem: { color: colors.muted, fontSize: fontSize.md, lineHeight: lineHeight.normal },

  sectionTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, marginBottom: space.xs },
  loadMoreBtn: { marginTop: space.md, paddingVertical: space.md, borderRadius: radius.md, backgroundColor: "#eef2ff", alignItems: "center" },
  loadMoreText: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  listItem: { paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  legRow: { flexDirection: "row", alignItems: "center", paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  legMain: { flex: 1 },
  govArrow: { paddingLeft: space.md, paddingVertical: space.sm, alignSelf: "center" },
  itemTopRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.xs },
  listItemTitle: { color: colors.title, fontWeight: fontWeight.medium, fontSize: fontSize.lg, lineHeight: lineHeight.normal },
  listItemMeta: { color: colors.muted, fontSize: fontSize.base, marginTop: space.xs },
  listItemDate: { color: colors.muted, fontSize: fontSize.sm, marginLeft: "auto" },
  kindBadge: { paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.sm },
  kindBadgeText: { fontWeight: fontWeight.semibold, fontSize: fontSize.xs },
  kindSponsored: { backgroundColor: "#e0e7ff" },
  kindSponsoredText: { color: "#4338ca" },
  kindCosponsored: { backgroundColor: "#f3f4f6" },
  kindCosponsoredText: { color: "#6b7280" },

  columns: { flexDirection: "row", gap: space.lg, alignItems: "flex-start" },
  colLeft: {},
  colRight: {},

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.lg,
    ...shadow.card,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.sm },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.base },
  cardTitle: { fontSize: fontSize.xxxl, fontWeight: fontWeight.bold, color: colors.text },
  cardDesc: { color: colors.muted, lineHeight: lineHeight.normal, marginBottom: space.md },

  noteBox: { backgroundColor: colors.noteBg, borderWidth: 1, borderColor: colors.noteBorder, borderRadius: radius.md, padding: space.md, marginBottom: space.lg },
  noteTitle: { color: colors.noteText, fontWeight: fontWeight.bold, marginBottom: space.sm },
  noteBullet: { color: colors.noteText, lineHeight: lineHeight.relaxed },

  tryTitle: { fontWeight: fontWeight.semibold, color: colors.text, marginBottom: space.md },
  suggestWrap: { flexDirection: "row", flexWrap: "wrap", gap: space.md },
  suggestChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.md, backgroundColor: "#fbfbff", flexGrow: 1, flexBasis: "45%" },
  suggestText: { color: colors.primaryDark, fontSize: fontSize.md },

  questionBox: { borderLeftWidth: 3, borderLeftColor: colors.primary, backgroundColor: colors.evidenceBg, padding: space.md, borderRadius: radius.sm, marginBottom: space.md },
  questionLabel: { color: colors.primaryDark, fontWeight: fontWeight.semibold, marginBottom: space.xs, fontSize: fontSize.base },
  questionText: { color: colors.text, fontSize: fontSize.lg },
  analysisRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.md, flexWrap: "wrap" },
  analysisLabel: { fontWeight: fontWeight.bold, color: colors.text, fontSize: fontSize.lg },
  stanceBadge: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill },
  stanceText: { fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  answerText: { color: colors.text, fontSize: fontSize.lg, lineHeight: lineHeight.relaxed, marginBottom: space.md },
  link: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.md },

  askBar: { flexDirection: "row", gap: space.md, alignItems: "center" },
  askInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: space.md, fontSize: fontSize.lg, color: colors.text },
  askBtn: { backgroundColor: colors.primary, paddingHorizontal: space.xl, paddingVertical: space.md, borderRadius: radius.md },
  askBtnText: { color: "#fff", fontWeight: fontWeight.semibold, fontSize: fontSize.lg },

  evidenceHeader: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.md },
  greenDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#22c55e" },
  evidenceEmpty: { alignItems: "center", paddingVertical: space.xxxl, gap: space.md },
  evidenceEmptyIcon: { fontSize: 40, color: "#c7cbe0" },

  summaryBox: { backgroundColor: "#f7f8fc", borderRadius: radius.md, padding: space.md, marginBottom: space.md },
  summaryTitle: { color: colors.muted, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textTransform: "uppercase" },
  summaryBig: { color: colors.text, fontWeight: fontWeight.bold, fontSize: fontSize.xl, marginVertical: space.xs },

  citationCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md, marginBottom: space.md },
  citationTop: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.sm },
  numBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  numBadgeText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  voteBadge: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.sm },
  voteBadgeText: { fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  citationDate: { marginLeft: "auto", color: colors.muted, fontSize: fontSize.sm },
  citationTitle: { color: colors.text, fontWeight: fontWeight.semibold, fontSize: fontSize.lg, lineHeight: lineHeight.normal },
  citationRef: { color: colors.muted, fontSize: fontSize.base, marginTop: space.xs },
  whyBox: { backgroundColor: colors.evidenceBg, borderRadius: radius.sm, padding: space.md, marginTop: space.md, marginBottom: space.md },
  whyTitle: { color: colors.primaryDark, fontWeight: fontWeight.semibold, fontSize: fontSize.sm, marginBottom: space.xs },
  whyText: { color: colors.text, fontSize: fontSize.base, lineHeight: lineHeight.snug },

  muted: { color: colors.muted, fontSize: fontSize.md, textAlign: "center" },
  error: { color: colors.nayText, marginTop: space.md },
});
