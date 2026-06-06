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
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import {
  getMember,
  ask,
  type Member,
  type RecordItem,
  type AskResult,
} from "../../lib/api";

export default function Profile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
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
        setRecords(data.records);
      } catch (e: any) {
        setLoadError(e.message ?? "Could not load profile.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  async function runAsk() {
    if (!question.trim() || !id) return;
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    try {
      setAnswer(await ask(id, question.trim()));
    } catch (e: any) {
      setAskError(e.message ?? "Could not get an answer.");
    } finally {
      setAsking(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#1d3557" />
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: member.fullName }} />

      <Text style={styles.name}>{member.fullName}</Text>
      <Text style={styles.meta}>
        {roleLabel(member.role)}
        {member.state ? ` · ${member.state}` : ""}
        {member.party ? ` · ${member.party}` : ""}
      </Text>

      {/* Ask the AI */}
      <View style={styles.askCard}>
        <Text style={styles.sectionTitle}>Ask the AI</Text>
        <Text style={styles.hint}>
          Answers come only from this politician&apos;s real records, with citations.
        </Text>
        <TextInput
          style={styles.input}
          placeholder='e.g. "What are their views on guns?"'
          value={question}
          onChangeText={setQuestion}
          onSubmitEditing={runAsk}
          returnKeyType="send"
          multiline
        />
        <Pressable style={[styles.button, asking && { opacity: 0.6 }]} onPress={runAsk} disabled={asking}>
          <Text style={styles.buttonText}>{asking ? "Thinking…" : "Ask"}</Text>
        </Pressable>

        {askError && <Text style={styles.error}>{askError}</Text>}

        {answer && (
          <View style={styles.answerBox}>
            <Text style={styles.answerText}>{answer.answer}</Text>
            {answer.citations.length > 0 && (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.citationsTitle}>Sources</Text>
                {answer.citations.map((c, i) => (
                  <Pressable key={`${c.ref}-${i}`} onPress={() => c.url && Linking.openURL(c.url)}>
                    <Text style={styles.citation}>
                      {c.ref} — {c.title}
                      {c.date ? ` (${c.date})` : ""}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* The record */}
      <Text style={styles.sectionTitle}>
        {member.role === "president" ? "Executive orders" : "Record"}
      </Text>
      {records.length === 0 ? (
        <Text style={styles.hint}>
          {member.role === "president"
            ? "No records loaded yet — run the ingestion step on the server."
            : "Voting records for legislators load in a later phase."}
        </Text>
      ) : (
        records.map((r, i) => (
          <Pressable
            key={`${r.ref}-${i}`}
            style={styles.recordCard}
            onPress={() => r.url && Linking.openURL(r.url)}
          >
            <Text style={styles.recordRef}>{r.ref}</Text>
            <Text style={styles.recordTitle}>{r.title}</Text>
            {r.date && <Text style={styles.recordDate}>{r.date}</Text>}
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function roleLabel(role: string): string {
  if (role === "president") return "President";
  if (role === "senator") return "U.S. Senator";
  if (role === "representative") return "U.S. Representative";
  return role;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  name: { fontSize: 26, fontWeight: "800", color: "#1d3557" },
  meta: { color: "#5a6472", marginTop: 4, fontSize: 15 },
  askCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#e6e9ed",
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1d3557", marginTop: 24, marginBottom: 8 },
  hint: { color: "#5a6472", marginBottom: 10 },
  input: {
    backgroundColor: "#f5f6f8",
    borderWidth: 1,
    borderColor: "#d6dae0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
    marginBottom: 10,
  },
  button: { backgroundColor: "#e63946", paddingVertical: 13, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  answerBox: { marginTop: 16, backgroundColor: "#eef3f8", borderRadius: 10, padding: 14 },
  answerText: { color: "#22303f", fontSize: 15, lineHeight: 22 },
  citationsTitle: { fontWeight: "700", color: "#1d3557", marginBottom: 6 },
  citation: { color: "#1d6fb8", paddingVertical: 4, fontSize: 14 },
  recordCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e6e9ed",
  },
  recordRef: { color: "#e63946", fontWeight: "700", fontSize: 13 },
  recordTitle: { color: "#1d3557", fontWeight: "600", marginTop: 2 },
  recordDate: { color: "#5a6472", marginTop: 4, fontSize: 13 },
  error: { color: "#e63946", marginTop: 10 },
});
