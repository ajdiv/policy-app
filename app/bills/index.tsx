import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Link } from "expo-router";
import { searchBills, type BillSummary } from "../../lib/api";
import { colors, tempColors } from "../../lib/theme";

export default function BillsExplorer() {
  const { width } = useWindowDimensions();
  const wide = width >= 720;
  const [q, setQ] = useState("");
  const [bills, setBills] = useState<BillSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      setBills(await searchBills({ q, limit: 50 }));
      setSearched(true);
    } catch (e: any) {
      setError(e.message ?? "Search failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: wide ? 56 : 40 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.shell}>
        <Text style={styles.title}>Bills</Text>
        <Text style={styles.subtitle}>Search House bills and see who voted — and how partisan the vote was</Text>

        <View style={styles.searchCard}>
          <View style={[styles.searchRow, !wide && { flexDirection: "column" }]}>
            <TextInput
              style={[styles.input, wide && { flex: 1 }]}
              placeholder="Search bills (e.g., energy, immigration, NDAA)"
              placeholderTextColor={colors.muted}
              value={q}
              onChangeText={setQ}
              onSubmitEditing={run}
              returnKeyType="search"
            />
            <Pressable style={[styles.searchBtn, !wide && { marginTop: 10 }]} onPress={run}>
              <Text style={styles.searchBtnText}>🔍  Search</Text>
            </Pressable>
          </View>
        </View>

        {loading && <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />}
        {error && <Text style={styles.error}>{error}</Text>}
        {!searched && !loading && (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Search by keyword to browse bills with recorded House votes (2023→).</Text>
          </View>
        )}
        {searched && !loading && bills.length === 0 && <Text style={styles.empty}>No bills match that search.</Text>}

        {bills.map((b) => {
          const t = b.temperature;
          const tc = t ? tempColors(t.label) : null;
          return (
            <Link key={b.id} href={{ pathname: "/bills/[id]", params: { id: b.id } }} asChild>
              <Pressable style={styles.card}>
                <Text style={styles.billTitle}>{b.title}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.billRef}>
                    {b.billType} {b.number}
                    {b.policyArea ? ` · ${b.policyArea}` : ""}
                  </Text>
                  {b.result ? <Text style={styles.result}>{b.result}</Text> : null}
                  {t && tc ? (
                    <View style={[styles.tempChip, { backgroundColor: tc.bg }]}>
                      <Text style={[styles.tempChipText, { color: tc.text }]}>{t.label}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 16, paddingBottom: 48, alignItems: "center" },
  shell: { width: "100%", maxWidth: 860, alignSelf: "center" },
  title: { fontSize: 30, fontWeight: "800", color: colors.title, textAlign: "center" },
  subtitle: { fontSize: 15, color: colors.subtitle, textAlign: "center", marginTop: 6, marginBottom: 18 },
  searchCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
  searchBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  infoCard: { backgroundColor: colors.card, borderRadius: 16, padding: 24, marginTop: 18, borderWidth: 1, borderColor: colors.border, alignItems: "center" },
  infoText: { color: colors.text, fontSize: 15, textAlign: "center" },
  error: { color: colors.nayText, marginTop: 16, textAlign: "center" },
  empty: { color: colors.muted, marginTop: 24, textAlign: "center" },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginTop: 12, borderWidth: 1, borderColor: colors.border },
  billTitle: { fontSize: 16, fontWeight: "700", color: colors.title, lineHeight: 21 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" },
  billRef: { color: colors.muted, fontSize: 13 },
  result: { color: colors.text, fontSize: 12, fontWeight: "700" },
  tempChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginLeft: "auto" },
  tempChipText: { fontWeight: "700", fontSize: 12 },
});
