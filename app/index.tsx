import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Link } from "expo-router";
import { searchMembers, type Member } from "../lib/api";
import { colors } from "../lib/theme";

const CHAMBERS = [
  { key: "", label: "All" },
  { key: "senate", label: "Senate" },
  { key: "house", label: "House" },
  { key: "executive", label: "Executive" },
];

export default function Home() {
  const { width } = useWindowDimensions();
  const wide = width >= 720;

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
    <FlatList
      contentContainerStyle={[styles.page, { paddingTop: wide ? 64 : 48 }]}
      data={results}
      keyExtractor={(m) => m.id}
      ListHeaderComponent={
        <View style={styles.shell}>
          <Text style={styles.title}>Political Voting Record Analyzer</Text>
          <Text style={styles.subtitle}>AI-powered analysis of how politicians actually voted</Text>

          <View style={styles.searchCard}>
            <View style={[styles.searchRow, !wide && { flexDirection: "column" }]}>
              <TextInput
                style={[styles.input, wide && { flex: 1 }]}
                placeholder="Enter politician's name (e.g., Bernie Sanders, Ted Cruz)"
                placeholderTextColor={colors.muted}
                value={q}
                onChangeText={setQ}
                onSubmitEditing={runSearch}
                autoCapitalize="words"
                returnKeyType="search"
              />
              <Pressable style={[styles.searchBtn, !wide && { marginTop: 10 }]} onPress={runSearch}>
                <Text style={styles.searchBtnText}>🔍  Search</Text>
              </Pressable>
            </View>

            <View style={styles.filterRow}>
              {CHAMBERS.map((c) => (
                <Pressable
                  key={c.key || "all"}
                  onPress={() => setChamber(c.key)}
                  style={[styles.chip, chamber === c.key && styles.chipActive]}
                >
                  <Text style={[styles.chipText, chamber === c.key && styles.chipTextActive]}>{c.label}</Text>
                </Pressable>
              ))}
              <TextInput
                style={styles.stateInput}
                placeholder="State (optional)"
                placeholderTextColor={colors.muted}
                value={state}
                onChangeText={setState}
                onSubmitEditing={runSearch}
              />
            </View>
          </View>

          {loading && <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />}
          {error && <Text style={styles.error}>{error}</Text>}

          {!searched && !loading && (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                Search for any current or recent member of the U.S. Congress to see their voting record
              </Text>
              <Text style={styles.footer}>Data provided by the Library of Congress API • AI-powered analysis</Text>
            </View>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.shell}>
          <Link href={{ pathname: "/members/[id]", params: { id: item.id } }} asChild>
            <Pressable style={styles.resultCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultName}>{item.fullName}</Text>
                <Text style={styles.resultMeta}>
                  {roleLabel(item.role)}
                  {item.state ? ` · ${item.state}` : ""}
                  {item.party ? ` · ${item.party}` : ""}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          </Link>
        </View>
      )}
      ListEmptyComponent={
        !loading && searched ? (
          <View style={styles.shell}>
            <Text style={styles.empty}>No matches. Try a different name or chamber.</Text>
          </View>
        ) : null
      }
    />
  );
}

function roleLabel(role: string): string {
  if (role === "president") return "President";
  if (role === "senator") return "U.S. Senator";
  if (role === "representative") return "U.S. Representative";
  return role;
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingBottom: 48, alignItems: "center" },
  shell: { width: "100%", maxWidth: 860, alignSelf: "center" },
  title: { fontSize: 34, fontWeight: "800", color: colors.title, textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: colors.subtitle, textAlign: "center", marginTop: 8, marginBottom: 24 },
  searchCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
  },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 26,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  filterRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14, flexWrap: "wrap" },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: "#eef2ff" },
  chipActive: { backgroundColor: colors.primary },
  chipText: { color: colors.primaryDark, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: "#fff" },
  stateInput: {
    flex: 1,
    minWidth: 120,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontSize: 13,
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 28,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  infoText: { color: colors.text, fontSize: 16, textAlign: "center" },
  footer: { color: colors.muted, fontSize: 13, marginTop: 12, textAlign: "center" },
  error: { color: colors.nayText, marginTop: 16, textAlign: "center" },
  resultCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 18,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
  },
  resultName: { fontSize: 17, fontWeight: "700", color: colors.title },
  resultMeta: { color: colors.muted, marginTop: 4 },
  chevron: { fontSize: 26, color: colors.primary, fontWeight: "300" },
  empty: { color: colors.muted, marginTop: 28, textAlign: "center" },
});
