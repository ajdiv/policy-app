import { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Link } from "expo-router";
import { searchBills, type BillSummary } from "../../lib/api";
import { tempColors, space, radius, fontSize, fontWeight, lineHeight, maxWidth, type Palette } from "../../lib/theme";
import { useTheme } from "../../lib/theme-context";
import { useWideLayout } from "../../lib/useWideLayout";

export default function BillsExplorer() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const wide = useWideLayout(720);
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
          const tc = t ? tempColors(colors, t.label) : null;
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

function makeStyles(c: Palette) {
  return StyleSheet.create({
  page: { paddingHorizontal: space.lg, paddingBottom: space.huge, alignItems: "center" },
  shell: { width: "100%", maxWidth: maxWidth.default, alignSelf: "center" },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.bold, color: c.title, textAlign: "center" },
  subtitle: { fontSize: fontSize.lg, color: c.subtitle, textAlign: "center", marginTop: space.sm, marginBottom: space.lg },
  searchCard: {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: c.border,
  },
  searchRow: { flexDirection: "row", alignItems: "center", gap: space.md },
  input: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    fontSize: fontSize.xl,
    color: c.text,
  },
  searchBtn: { backgroundColor: c.primary, paddingHorizontal: space.xxl, paddingVertical: space.md, borderRadius: radius.md, alignItems: "center" },
  searchBtnText: { color: c.onPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.xl },
  infoCard: { backgroundColor: c.card, borderRadius: radius.lg, padding: space.xxl, marginTop: space.lg, borderWidth: 1, borderColor: c.border, alignItems: "center" },
  infoText: { color: c.text, fontSize: fontSize.lg, textAlign: "center" },
  error: { color: c.nayText, marginTop: space.lg, textAlign: "center" },
  empty: { color: c.muted, marginTop: space.xxl, textAlign: "center" },
  card: { backgroundColor: c.card, borderRadius: radius.md, padding: space.lg, marginTop: space.md, borderWidth: 1, borderColor: c.border },
  billTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: c.title, lineHeight: lineHeight.normal },
  metaRow: { flexDirection: "row", alignItems: "center", gap: space.md, marginTop: space.sm, flexWrap: "wrap" },
  billRef: { color: c.muted, fontSize: fontSize.base },
  result: { color: c.text, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  tempChip: { paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radius.md, marginLeft: "auto" },
  tempChipText: { fontWeight: fontWeight.semibold, fontSize: fontSize.sm },
  });
}
