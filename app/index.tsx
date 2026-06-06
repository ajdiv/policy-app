import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { searchMembers, type Member } from "../lib/api";

const CHAMBERS = [
  { key: "", label: "All" },
  { key: "senate", label: "Senate" },
  { key: "house", label: "House" },
  { key: "executive", label: "Executive" },
];

export default function Home() {
  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [chamber, setChamber] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function runSearch() {
    setLoading(true);
    setError(null);
    try {
      setResults(await searchMembers({ q, chamber, state }));
      setSearched(true);
    } catch (e: any) {
      setError(e.message ?? "Search failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Find a politician</Text>
      <Text style={styles.sub}>Search by name, chamber, or state — then ask what they actually did.</Text>

      <TextInput
        style={styles.input}
        placeholder="Name (e.g. Trump)"
        value={q}
        onChangeText={setQ}
        onSubmitEditing={runSearch}
        autoCapitalize="words"
        returnKeyType="search"
      />
      <TextInput
        style={styles.input}
        placeholder="State (e.g. California) — optional"
        value={state}
        onChangeText={setState}
        onSubmitEditing={runSearch}
      />

      <View style={styles.chamberRow}>
        {CHAMBERS.map((c) => (
          <Pressable
            key={c.key || "all"}
            onPress={() => setChamber(c.key)}
            style={[styles.chip, chamber === c.key && styles.chipActive]}
          >
            <Text style={[styles.chipText, chamber === c.key && styles.chipTextActive]}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.button} onPress={runSearch}>
        <Text style={styles.buttonText}>Search</Text>
      </Pressable>

      {loading && <ActivityIndicator style={{ marginTop: 24 }} color="#1d3557" />}
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        style={{ marginTop: 16 }}
        data={results}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <Link href={{ pathname: "/members/[id]", params: { id: item.id } }} asChild>
            <Pressable style={styles.card}>
              <Text style={styles.cardName}>{item.fullName}</Text>
              <Text style={styles.cardMeta}>
                {roleLabel(item.role)}
                {item.state ? ` · ${item.state}` : ""}
                {item.party ? ` · ${item.party}` : ""}
              </Text>
            </Pressable>
          </Link>
        )}
        ListEmptyComponent={
          !loading && searched ? (
            <Text style={styles.empty}>No matches. Try a different name or chamber.</Text>
          ) : null
        }
      />
    </View>
  );
}

function roleLabel(role: string): string {
  if (role === "president") return "President";
  if (role === "senator") return "U.S. Senator";
  if (role === "representative") return "U.S. Representative";
  return role;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 24, fontWeight: "800", color: "#1d3557" },
  sub: { color: "#5a6472", marginTop: 4, marginBottom: 16 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d6dae0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 10,
  },
  chamberRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e9edf2",
  },
  chipActive: { backgroundColor: "#1d3557" },
  chipText: { color: "#1d3557", fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  button: {
    backgroundColor: "#e63946",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: "#e63946", marginTop: 16 },
  empty: { color: "#5a6472", marginTop: 24, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e6e9ed",
  },
  cardName: { fontSize: 17, fontWeight: "700", color: "#1d3557" },
  cardMeta: { color: "#5a6472", marginTop: 4 },
});
