import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Linking,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { getMember, ask, type Member, type AskResult } from "../../lib/api";
import { colors, stanceColors, castColors } from "../../lib/theme";

const LEGISLATOR_SUGGESTIONS = [
  "What are their views on climate change?",
  "How did they vote on healthcare bills?",
  "Show votes where they broke with their party",
  "What's their record on immigration reform?",
];
const PRESIDENT_SUGGESTIONS = [
  "What are their views on immigration?",
  "Their record on energy and the environment",
  "Actions on trade and tariffs",
  "Views on national security",
];

export default function Profile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const wide = width >= 920;

  const [member, setMember] = useState<Member | null>(null);
  const [recordCount, setRecordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<AskResult | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await getMember(id);
        setMember(data.member);
        setRecordCount(data.recordCount);
      } catch (e: any) {
        setLoadError(e.message ?? "Could not load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function runAsk(text?: string) {
    const qn = (text ?? question).trim();
    if (!qn || !id) return;
    setQuestion(qn);
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      setAnswer(await ask(id, qn));
    } catch (e: any) {
      setAskError(e.message ?? "Could not get an answer.");
    } finally {
      setAsking(false);
    }
  }

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
  const suggestions = isPresident ? PRESIDENT_SUGGESTIONS : LEGISLATOR_SUGGESTIONS;

  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View style={styles.shell}>
        {/* Header */}
        <Text style={styles.name}>{member.fullName}</Text>
        <Text style={styles.meta}>
          {roleLabel(member.role)}
          {member.state ? ` · ${member.state}` : ""}
          {member.party ? ` · ${member.party}` : ""}
          {!isPresident && recordCount > 0 ? ` · ${recordCount.toLocaleString()} recorded votes` : ""}
        </Text>

        <View style={[styles.columns, !wide && { flexDirection: "column" }]}>
          {/* LEFT — analysis */}
          <View style={[styles.colLeft, wide && { flex: 1.45 }]}>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>AI</Text>
                </View>
                <Text style={styles.cardTitle}>Evidence-Based Voting Analysis</Text>
              </View>
              <Text style={styles.cardDesc}>
                {isPresident
                  ? "Ask about this president's record. Answers are grounded in their executive orders, with links to the Federal Register."
                  : "Ask questions about this politician's voting record. All answers are grounded in verifiable roll call data with direct links to Congress.gov."}
              </Text>

              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>ⓘ Important Notes:</Text>
                {(isPresident
                  ? [
                      "Based on executive orders from the Federal Register",
                      "Stances are inferred from official actions, not statements",
                      "Every claim links to the specific executive order",
                    ]
                  : [
                      "Stances are inferred from voting behavior, not stated positions",
                      "Data currently covers House recorded votes from 2023 onward (118th Congress)",
                      "Every claim is backed by specific roll call evidence",
                    ]
                ).map((n) => (
                  <Text key={n} style={styles.noteBullet}>
                    •  {n}
                  </Text>
                ))}
              </View>

              {!answer && !asking && (
                <View>
                  <Text style={styles.tryTitle}>Try asking:</Text>
                  <View style={styles.suggestWrap}>
                    {suggestions.map((s) => (
                      <Pressable key={s} style={styles.suggestChip} onPress={() => runAsk(s)}>
                        <Text style={styles.suggestText}>&ldquo;{s}&rdquo;</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              {asking && (
                <View style={{ paddingVertical: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.muted}>Analyzing the record…</Text>
                </View>
              )}

              {answer && (
                <View>
                  <View style={styles.questionBox}>
                    <Text style={styles.questionLabel}>Your Question:</Text>
                    <Text style={styles.questionText}>{answer.question || question}</Text>
                  </View>

                  <View style={styles.analysisRow}>
                    <Text style={styles.analysisLabel}>Analysis:</Text>
                    {answer.stance && answer.stance.total > 0 && (
                      <View style={[styles.stanceBadge, { backgroundColor: stanceColors(answer.stance.label).bg }]}>
                        <Text style={[styles.stanceText, { color: stanceColors(answer.stance.label).text }]}>
                          {answer.stance.label} ({answer.stance.confidence}% confidence)
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.answerText}>{answer.answer}</Text>

                  <Pressable onPress={() => { setAnswer(null); setQuestion(""); }}>
                    <Text style={styles.link}>Ask another question</Text>
                  </Pressable>
                </View>
              )}

              {askError && <Text style={styles.error}>{askError}</Text>}
            </View>

            {/* Ask bar */}
            <View style={styles.askBar}>
              <TextInput
                style={styles.askInput}
                placeholder="Ask about their voting record…"
                placeholderTextColor={colors.muted}
                value={question}
                onChangeText={setQuestion}
                onSubmitEditing={() => runAsk()}
                returnKeyType="send"
              />
              <Pressable
                style={[styles.askBtn, (asking || !question.trim()) && { opacity: 0.5 }]}
                onPress={() => runAsk()}
                disabled={asking || !question.trim()}
              >
                <Text style={styles.askBtnText}>➤ Ask</Text>
              </Pressable>
            </View>
          </View>

          {/* RIGHT — evidence */}
          <View style={[styles.colRight, wide && { flex: 1 }]}>
            <View style={styles.card}>
              <View style={styles.evidenceHeader}>
                <View style={styles.greenDot} />
                <Text style={styles.cardTitle}>Evidence Citations</Text>
              </View>

              {!answer ? (
                <View style={styles.evidenceEmpty}>
                  <Text style={styles.evidenceEmptyIcon}>◔</Text>
                  <Text style={styles.muted}>Ask a question to see supporting evidence</Text>
                </View>
              ) : answer.citations.length === 0 ? (
                <Text style={styles.muted}>No supporting records were found for this question.</Text>
              ) : (
                <View>
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Evidence Summary</Text>
                    <Text style={styles.summaryBig}>
                      {answer.citations.length} {answer.citations[0].type === "vote" ? "votes" : "orders"} analyzed
                    </Text>
                    <Text style={styles.muted}>All claims are backed by these verified records</Text>
                  </View>

                  {answer.citations.map((c) => (
                    <View key={c.index} style={styles.citationCard}>
                      <View style={styles.citationTop}>
                        <View style={styles.numBadge}>
                          <Text style={styles.numBadgeText}>{c.index}</Text>
                        </View>
                        {c.type === "vote" && c.cast ? (
                          <View style={[styles.voteBadge, { backgroundColor: castColors(c.cast).bg }]}>
                            <Text style={[styles.voteBadgeText, { color: castColors(c.cast).text }]}>{c.cast}</Text>
                          </View>
                        ) : (
                          <View style={[styles.voteBadge, { backgroundColor: colors.evidenceBg }]}>
                            <Text style={[styles.voteBadgeText, { color: colors.primaryDark }]}>{c.ref}</Text>
                          </View>
                        )}
                        {c.date && <Text style={styles.citationDate}>{fmtDate(c.date)}</Text>}
                      </View>

                      <Text style={styles.citationTitle}>{c.title}</Text>
                      {c.type === "vote" && <Text style={styles.citationRef}>{c.ref}</Text>}

                      {c.why ? (
                        <View style={styles.whyBox}>
                          <Text style={styles.whyTitle}>Why this vote matters:</Text>
                          <Text style={styles.whyText}>{c.why}</Text>
                        </View>
                      ) : null}

                      {c.url && (
                        <Pressable onPress={() => Linking.openURL(c.url!)}>
                          <Text style={styles.link}>View on Congress.gov ↗</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
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

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48, alignItems: "center" },
  shell: { width: "100%", maxWidth: 1080, alignSelf: "center" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  name: { fontSize: 28, fontWeight: "800", color: colors.title },
  meta: { color: colors.muted, marginTop: 4, marginBottom: 18, fontSize: 15 },

  columns: { flexDirection: "row", gap: 18, alignItems: "flex-start" },
  colLeft: {},
  colRight: {},

  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  cardDesc: { color: colors.muted, lineHeight: 21, marginBottom: 14 },

  noteBox: { backgroundColor: colors.noteBg, borderWidth: 1, borderColor: colors.noteBorder, borderRadius: 12, padding: 14, marginBottom: 16 },
  noteTitle: { color: colors.noteText, fontWeight: "800", marginBottom: 6 },
  noteBullet: { color: colors.noteText, lineHeight: 22 },

  tryTitle: { fontWeight: "700", color: colors.text, marginBottom: 10 },
  suggestWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  suggestChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fbfbff", flexGrow: 1, flexBasis: "45%" },
  suggestText: { color: colors.primaryDark, fontSize: 14 },

  questionBox: { borderLeftWidth: 3, borderLeftColor: colors.primary, backgroundColor: colors.evidenceBg, padding: 14, borderRadius: 8, marginBottom: 14 },
  questionLabel: { color: colors.primaryDark, fontWeight: "700", marginBottom: 4, fontSize: 13 },
  questionText: { color: colors.text, fontSize: 15 },
  analysisRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  analysisLabel: { fontWeight: "800", color: colors.text, fontSize: 15 },
  stanceBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  stanceText: { fontWeight: "700", fontSize: 13 },
  answerText: { color: colors.text, fontSize: 15, lineHeight: 23, marginBottom: 14 },
  link: { color: colors.primary, fontWeight: "700", fontSize: 14 },

  askBar: { flexDirection: "row", gap: 10, alignItems: "center" },
  askInput: { flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: colors.text },
  askBtn: { backgroundColor: colors.primary, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 12 },
  askBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  evidenceHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  greenDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#22c55e" },
  evidenceEmpty: { alignItems: "center", paddingVertical: 40, gap: 12 },
  evidenceEmptyIcon: { fontSize: 40, color: "#c7cbe0" },

  summaryBox: { backgroundColor: "#f7f8fc", borderRadius: 10, padding: 14, marginBottom: 14 },
  summaryTitle: { color: colors.muted, fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  summaryBig: { color: colors.text, fontWeight: "800", fontSize: 16, marginVertical: 2 },

  citationCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 12 },
  citationTop: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  numBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  numBadgeText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  voteBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6 },
  voteBadgeText: { fontWeight: "700", fontSize: 12 },
  citationDate: { marginLeft: "auto", color: colors.muted, fontSize: 12 },
  citationTitle: { color: colors.text, fontWeight: "700", fontSize: 15, lineHeight: 20 },
  citationRef: { color: colors.muted, fontSize: 13, marginTop: 2 },
  whyBox: { backgroundColor: colors.evidenceBg, borderRadius: 8, padding: 10, marginTop: 10, marginBottom: 10 },
  whyTitle: { color: colors.primaryDark, fontWeight: "700", fontSize: 12, marginBottom: 3 },
  whyText: { color: colors.text, fontSize: 13, lineHeight: 19 },

  muted: { color: colors.muted, fontSize: 14, textAlign: "center" },
  error: { color: colors.nayText, marginTop: 12 },
});
