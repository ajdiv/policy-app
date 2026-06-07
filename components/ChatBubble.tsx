import { useEffect, useRef, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { ask, type AskResult, type Citation } from "../lib/api";
import { colors, stanceColors, castColors } from "../lib/theme";

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

interface Exchange {
  question: string;
  pending: boolean;
  answer?: AskResult;
  error?: string;
}

export function ChatBubble({ memberId, role, name }: { memberId: string; role: string; name: string }) {
  const { width, height } = useWindowDimensions();
  const wide = width >= 720;
  const isPresident = role === "president";

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (open) setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [exchanges, open]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput("");
    const idx = exchanges.length;
    setExchanges((e) => [...e, { question: q, pending: true }]);
    setBusy(true);
    try {
      const res = await ask(memberId, q);
      setExchanges((e) => e.map((x, i) => (i === idx ? { ...x, pending: false, answer: res } : x)));
    } catch (err: any) {
      setExchanges((e) => e.map((x, i) => (i === idx ? { ...x, pending: false, error: err.message ?? "Failed" } : x)));
    } finally {
      setBusy(false);
    }
  }

  // Collapsed: floating action button.
  if (!open) {
    return (
      <Pressable style={styles.fab} onPress={() => setOpen(true)} accessibilityLabel="Ask the AI about this politician">
        <Ionicons name="chatbubble-ellipses" size={26} color="#fff" />
      </Pressable>
    );
  }

  // Expanded: panel (wide) or near-fullscreen sheet (narrow).
  const panelStyle = wide
    ? [styles.panel, { width: 392, height: Math.min(height - 120, 660) }]
    : [styles.panel, styles.panelSheet];

  return (
    <View style={panelStyle}>
      <View style={styles.header}>
        <View style={styles.aiAvatar}>
          <Text style={styles.aiAvatarText}>AI</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Voting Analysis</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            Grounded in {name}&apos;s real record
          </Text>
        </View>
        <Pressable onPress={() => setOpen(false)} hitSlop={10} accessibilityLabel="Close">
          <Ionicons name="close" size={22} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} style={styles.body} contentContainerStyle={{ padding: 14, gap: 12 }}>
        {exchanges.length === 0 && (
          <View>
            <Text style={styles.intro}>
              Ask about this {isPresident ? "president's" : "politician's"} record. Every answer is grounded in
              real {isPresident ? "executive orders" : "roll-call votes"} — tap a citation or open Sources to verify.
            </Text>
            <View style={styles.noteBox}>
              <Text style={styles.noteText}>• Stances are inferred from actions, not statements</Text>
              <Text style={styles.noteText}>
                • {isPresident ? "Executive orders from the Federal Register" : "House recorded votes, 2023+"}
              </Text>
            </View>
            <Text style={styles.tryTitle}>Try asking:</Text>
            {(isPresident ? PRESIDENT_SUGGESTIONS : LEGISLATOR_SUGGESTIONS).map((s) => (
              <Pressable key={s} style={styles.suggest} onPress={() => send(s)}>
                <Text style={styles.suggestText}>&ldquo;{s}&rdquo;</Text>
              </Pressable>
            ))}
          </View>
        )}

        {exchanges.map((ex, i) => (
          <View key={i} style={{ gap: 10 }}>
            <View style={styles.userBubble}>
              <Text style={styles.userText}>{ex.question}</Text>
            </View>
            {ex.pending ? (
              <View style={styles.pending}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={styles.muted}>Analyzing the record…</Text>
              </View>
            ) : ex.error ? (
              <Text style={styles.error}>{ex.error}</Text>
            ) : ex.answer ? (
              <AiMessage result={ex.answer} />
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Ask about their record…"
          placeholderTextColor={colors.muted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => send()}
          returnKeyType="send"
        />
        <Pressable
          style={[styles.sendBtn, (busy || !input.trim()) && { opacity: 0.5 }]}
          onPress={() => send()}
          disabled={busy || !input.trim()}
        >
          <Ionicons name="send" size={16} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

function AiMessage({ result }: { result: AskResult }) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const stance = result.stance;
  return (
    <View style={styles.aiBubble}>
      {stance && stance.total > 0 && (
        <View style={[styles.stanceBadge, { backgroundColor: stanceColors(stance.label).bg }]}>
          <Text style={[styles.stanceText, { color: stanceColors(stance.label).text }]}>
            {stance.label} ({stance.confidence}%)
          </Text>
        </View>
      )}
      <Text style={styles.answerText}>{renderAnswerWithLinks(result.answer, result.citations)}</Text>

      {result.citations.length > 0 && (
        <View style={styles.sources}>
          <Pressable style={styles.sourcesToggle} onPress={() => setSourcesOpen((v) => !v)}>
            <Ionicons name={sourcesOpen ? "chevron-down" : "chevron-forward"} size={14} color={colors.primary} />
            <Text style={styles.sourcesToggleText}>
              {sourcesOpen ? "Hide" : "Show"} sources ({result.citations.length})
            </Text>
          </Pressable>
          {sourcesOpen &&
            result.citations.map((c) => <SourceCard key={c.index} c={c} />)}
        </View>
      )}
    </View>
  );
}

function SourceCard({ c }: { c: Citation }) {
  return (
    <View style={styles.sourceCard}>
      <View style={styles.sourceTop}>
        <View style={styles.numBadge}>
          <Text style={styles.numBadgeText}>{c.index}</Text>
        </View>
        {c.type === "vote" && c.cast ? (
          <View style={[styles.castBadge, { backgroundColor: castColors(c.cast).bg }]}>
            <Text style={[styles.castText, { color: castColors(c.cast).text }]}>{c.cast}</Text>
          </View>
        ) : (
          <View style={[styles.castBadge, { backgroundColor: colors.evidenceBg }]}>
            <Text style={[styles.castText, { color: colors.primaryDark }]}>{c.ref}</Text>
          </View>
        )}
      </View>
      <Text style={styles.sourceTitle}>{c.title}</Text>
      {c.type === "vote" && <Text style={styles.sourceRef}>{c.ref}</Text>}
      {c.why ? <Text style={styles.sourceWhy}>{c.why}</Text> : null}
      {c.url ? (
        <Pressable onPress={() => Linking.openURL(c.url!)}>
          <Text style={styles.sourceLink}>View on Congress.gov ↗</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Render answer prose, turning inline citations like [2] or [EO 14206] into links. */
function renderAnswerWithLinks(text: string, citations: Citation[]) {
  const byIndex = new Map(citations.map((c) => [String(c.index), c]));
  const byRef = new Map(citations.map((c) => [c.ref.toLowerCase(), c]));
  return text.split(/(\[[^\]]+\])/g).map((part, i) => {
    const m = /^\[([^\]]+)\]$/.exec(part);
    if (m) {
      const key = m[1].trim();
      const c = byIndex.get(key) ?? byRef.get(key.toLowerCase());
      if (c?.url) {
        return (
          <Text key={i} style={styles.inlineLink} onPress={() => Linking.openURL(c.url!)}>
            {part}
          </Text>
        );
      }
    }
    return <Text key={i}>{part}</Text>;
  });
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(49,46,129,0.45)",
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
    zIndex: 1000,
  },
  panel: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "rgba(49,46,129,0.3)",
    shadowOpacity: 1,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 16,
    zIndex: 1000,
  },
  panelSheet: { top: 56, left: 8, right: 8, bottom: 8, width: undefined, height: undefined },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#fafbff",
  },
  aiAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  aiAvatarText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  headerTitle: { fontWeight: "800", color: colors.text, fontSize: 15 },
  headerSub: { color: colors.muted, fontSize: 12 },

  body: { flex: 1 },
  intro: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 10 },
  noteBox: { backgroundColor: colors.noteBg, borderWidth: 1, borderColor: colors.noteBorder, borderRadius: 10, padding: 10, marginBottom: 12 },
  noteText: { color: colors.noteText, fontSize: 12, lineHeight: 18 },
  tryTitle: { fontWeight: "700", color: colors.text, marginBottom: 8, fontSize: 13 },
  suggest: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, backgroundColor: "#fbfbff" },
  suggestText: { color: colors.primaryDark, fontSize: 13 },

  userBubble: { alignSelf: "flex-end", maxWidth: "85%", backgroundColor: colors.primary, borderRadius: 14, borderBottomRightRadius: 4, paddingHorizontal: 12, paddingVertical: 9 },
  userText: { color: "#fff", fontSize: 14, lineHeight: 19 },
  aiBubble: { alignSelf: "flex-start", maxWidth: "92%", backgroundColor: "#f4f6fb", borderRadius: 14, borderBottomLeftRadius: 4, padding: 12 },
  pending: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6 },

  stanceBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, marginBottom: 8 },
  stanceText: { fontWeight: "700", fontSize: 12 },
  answerText: { color: colors.text, fontSize: 14, lineHeight: 21 },
  inlineLink: { color: colors.primary, fontWeight: "700", textDecorationLine: "underline" },

  sources: { marginTop: 10 },
  sourcesToggle: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  sourcesToggleText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  sourceCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10, marginTop: 8 },
  sourceTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  numBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  numBadgeText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  castBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  castText: { fontWeight: "700", fontSize: 11 },
  sourceTitle: { color: colors.title, fontWeight: "700", fontSize: 13, lineHeight: 18 },
  sourceRef: { color: colors.muted, fontSize: 12, marginTop: 1 },
  sourceWhy: { color: colors.text, fontSize: 12, lineHeight: 17, marginTop: 6 },
  sourceLink: { color: colors.primary, fontWeight: "700", fontSize: 12, marginTop: 6 },

  inputBar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: "#f4f6fb", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.text },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },

  muted: { color: colors.muted, fontSize: 13 },
  error: { color: colors.nayText, fontSize: 13 },
});
