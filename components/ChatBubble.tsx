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
import { ask, type AskResult, type Citation, type ChatTurn } from "../lib/api";
import { colors, stanceColors, castColors, space, radius, fontSize, fontWeight, lineHeight, shadow } from "../lib/theme";
import { useWideLayout } from "../lib/useWideLayout";

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
  const { height } = useWindowDimensions();
  const wide = useWideLayout(720);
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
    // Build conversation history from prior answered turns (most recent kept).
    const history: ChatTurn[] = exchanges
      .filter((e) => e.answer)
      .flatMap((e) => [
        { role: "user" as const, content: e.question },
        { role: "assistant" as const, content: e.answer!.answer },
      ])
      .slice(-8);
    const idx = exchanges.length;
    setExchanges((e) => [...e, { question: q, pending: true }]);
    setBusy(true);
    try {
      const res = await ask(memberId, q, history);
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
    ...shadow.fab,
    zIndex: 1000,
  },
  panel: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    ...shadow.floating,
    zIndex: 1000,
  },
  panelSheet: { top: 56, left: 8, right: 8, bottom: 8, width: undefined, height: undefined },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "#fafbff",
  },
  aiAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  aiAvatarText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.sm },
  headerTitle: { fontWeight: fontWeight.bold, color: colors.text, fontSize: fontSize.lg },
  headerSub: { color: colors.muted, fontSize: fontSize.sm },

  body: { flex: 1 },
  intro: { color: colors.muted, fontSize: fontSize.md, lineHeight: lineHeight.normal, marginBottom: space.md },
  noteBox: { backgroundColor: colors.noteBg, borderWidth: 1, borderColor: colors.noteBorder, borderRadius: radius.md, padding: space.md, marginBottom: space.md },
  noteText: { color: colors.noteText, fontSize: fontSize.sm, lineHeight: lineHeight.snug },
  tryTitle: { fontWeight: fontWeight.semibold, color: colors.text, marginBottom: space.sm, fontSize: fontSize.base },
  suggest: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.md, marginBottom: space.sm, backgroundColor: "#fbfbff" },
  suggestText: { color: colors.primaryDark, fontSize: fontSize.base },

  userBubble: { alignSelf: "flex-end", maxWidth: "85%", backgroundColor: colors.primary, borderRadius: radius.md, borderBottomRightRadius: 4, paddingHorizontal: space.md, paddingVertical: space.sm },
  userText: { color: "#fff", fontSize: fontSize.md, lineHeight: lineHeight.snug },
  aiBubble: { alignSelf: "flex-start", maxWidth: "92%", backgroundColor: "#f4f6fb", borderRadius: radius.md, borderBottomLeftRadius: 4, padding: space.md },
  pending: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingVertical: space.sm },

  stanceBadge: { alignSelf: "flex-start", paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.md, marginBottom: space.sm },
  stanceText: { fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  answerText: { color: colors.text, fontSize: fontSize.md, lineHeight: lineHeight.normal },
  inlineLink: { color: colors.primary, fontWeight: fontWeight.semibold, textDecorationLine: "underline" },

  sources: { marginTop: space.md },
  sourcesToggle: { flexDirection: "row", alignItems: "center", gap: space.xs, paddingVertical: space.xs },
  sourcesToggleText: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.base },
  sourceCard: { backgroundColor: "#fff", borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: space.md, marginTop: space.sm },
  sourceTop: { flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.xs },
  numBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  numBadgeText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.xs },
  castBadge: { paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radius.sm },
  castText: { fontWeight: fontWeight.semibold, fontSize: fontSize.xs },
  sourceTitle: { color: colors.title, fontWeight: fontWeight.semibold, fontSize: fontSize.base, lineHeight: lineHeight.snug },
  sourceRef: { color: colors.muted, fontSize: fontSize.sm, marginTop: 1 },
  sourceWhy: { color: colors.text, fontSize: fontSize.sm, lineHeight: lineHeight.tight, marginTop: space.sm },
  sourceLink: { color: colors.primary, fontWeight: fontWeight.semibold, fontSize: fontSize.sm, marginTop: space.sm },

  inputBar: { flexDirection: "row", alignItems: "center", gap: space.sm, padding: space.md, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: "#f4f6fb", borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.md, fontSize: fontSize.md, color: colors.text },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },

  muted: { color: colors.muted, fontSize: fontSize.base },
  error: { color: colors.nayText, fontSize: fontSize.base },
});
