import { useEffect, useRef, useState } from "react";
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
import { useRouter } from "expo-router";
import { searchMembers, type Member } from "../lib/api";
import { matchStates } from "../lib/usStates";
import { colors } from "../lib/theme";

const CHAMBERS = [
  { key: "", label: "All" },
  { key: "senate", label: "Senate" },
  { key: "house", label: "House" },
  { key: "executive", label: "Executive" },
];

export default function Home() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 720;

  const [q, setQ] = useState("");
  const [state, setState] = useState("");
  const [chamber, setChamber] = useState("");

  // Autocomplete (politician name)
  const [suggestions, setSuggestions] = useState<Member[]>([]);
  const [showNameAC, setShowNameAC] = useState(false);
  const acReqId = useRef(0);

  // Typeahead (state)
  const [stateMatches, setStateMatches] = useState<string[]>([]);
  const [showStateAC, setShowStateAC] = useState(false);

  // Full search results
  const [results, setResults] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Debounced politician autocomplete — refetches when name OR filters change,
  // so the chamber chips and chosen state also narrow the suggestions.
  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setShowNameAC(false);
      return;
    }
    const id = ++acReqId.current;
    const t = setTimeout(async () => {
      try {
        const res = await searchMembers({ q, chamber, state, limit: 8 });
        if (id === acReqId.current) {
          setSuggestions(res);
          setShowNameAC(true);
        }
      } catch {
        /* ignore autocomplete errors */
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q, chamber, state]);

  function onStateChange(text: string) {
    setState(text);
    const m = matchStates(text);
    setStateMatches(m);
    setShowStateAC(m.length > 0);
  }

  function pickState(s: string) {
    setState(s);
    setShowStateAC(false);
  }

  function pickMember(m: Member) {
    setShowNameAC(false);
    router.push({ pathname: "/members/[id]", params: { id: m.id } });
  }

  function clearQuery() {
    setQ("");
    setSuggestions([]);
    setShowNameAC(false);
  }

  async function runSearch() {
    setShowNameAC(false);
    setShowStateAC(false);
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
    <ScrollView
      contentContainerStyle={[styles.page, { paddingTop: wide ? 64 : 48 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.shell}>
        <Text style={styles.title}>Political Voting Record Analyzer</Text>
        <Text style={styles.subtitle}>AI-powered analysis of how politicians actually voted</Text>

        <View style={styles.searchCard}>
          {/* Name + Search */}
          <View style={[styles.searchRow, !wide && { flexDirection: "column" }, styles.zTop]}>
            <View style={[styles.nameWrap, wide && { flex: 1 }]}>
              <TextInput
                style={[styles.input, { paddingRight: 40 }]}
                placeholder="Enter politician's name (e.g., Bernie Sanders, Ted Cruz)"
                placeholderTextColor={colors.muted}
                value={q}
                onChangeText={setQ}
                onSubmitEditing={runSearch}
                onFocus={() => q.trim().length >= 2 && suggestions.length > 0 && setShowNameAC(true)}
                onBlur={() => setTimeout(() => setShowNameAC(false), 150)}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
              />
              {q.length > 0 && (
                <Pressable style={styles.clearBtn} onPress={clearQuery} hitSlop={8} accessibilityLabel="Clear search">
                  <Text style={styles.clearBtnText}>×</Text>
                </Pressable>
              )}
              {showNameAC && (
                <View style={styles.dropdown}>
                  {suggestions.length === 0 ? (
                    <Text style={styles.acEmpty}>No matches</Text>
                  ) : (
                    suggestions.map((m) => (
                      <Pressable
                        key={m.id}
                        style={(state) => [styles.acItem, (state as any).hovered && styles.acItemHover]}
                        onPress={() => pickMember(m)}
                      >
                        <Text style={styles.acName}>{m.fullName}</Text>
                        <Text style={styles.acMeta}>
                          {roleLabel(m.role)}
                          {m.state ? ` · ${m.state}` : ""}
                          {m.party ? ` · ${m.party}` : ""}
                        </Text>
                      </Pressable>
                    ))
                  )}
                </View>
              )}
            </View>
            <Pressable style={[styles.searchBtn, !wide && { marginTop: 10 }]} onPress={runSearch}>
              <Text style={styles.searchBtnText}>🔍  Search</Text>
            </Pressable>
          </View>

          {/* Filters: chamber chips + state typeahead */}
          <View style={[styles.filterRow, styles.zMid]}>
            {CHAMBERS.map((c) => (
              <Pressable
                key={c.key || "all"}
                onPress={() => setChamber(c.key)}
                style={[styles.chip, chamber === c.key && styles.chipActive]}
              >
                <Text style={[styles.chipText, chamber === c.key && styles.chipTextActive]}>{c.label}</Text>
              </Pressable>
            ))}
            <View style={styles.stateWrap}>
              <TextInput
                style={styles.stateInput}
                placeholder="State (optional)"
                placeholderTextColor={colors.muted}
                value={state}
                onChangeText={onStateChange}
                onFocus={() => state.trim().length > 0 && setShowStateAC(matchStates(state).length > 0)}
                onBlur={() => setTimeout(() => setShowStateAC(false), 150)}
                onSubmitEditing={runSearch}
                autoCorrect={false}
              />
              {showStateAC && (
                <View style={styles.dropdown}>
                  {stateMatches.map((s) => (
                    <Pressable
                      key={s}
                      style={(state) => [styles.acItem, (state as any).hovered && styles.acItemHover]}
                      onPress={() => pickState(s)}
                    >
                      <Text style={styles.acName}>{s}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
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

        {searched && !loading && results.length === 0 && (
          <Text style={styles.empty}>No matches. Try a different name or chamber.</Text>
        )}

        {results.map((item) => (
          <Pressable
            key={item.id}
            style={styles.resultCard}
            onPress={() => router.push({ pathname: "/members/[id]", params: { id: item.id } })}
          >
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
        ))}
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
    // Lift the whole card (and its floating dropdowns) above the info card /
    // results that follow it as siblings, so autocomplete overlays them.
    position: "relative",
    zIndex: 50,
  },
  // zIndex ordering so the name dropdown floats above the filter row.
  zTop: { zIndex: 30 },
  zMid: { zIndex: 20 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  nameWrap: { position: "relative" },
  clearBtn: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  clearBtnText: { fontSize: 22, lineHeight: 24, color: colors.muted, fontWeight: "600" },
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
  stateWrap: { position: "relative", flex: 1, minWidth: 140 },
  stateInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    fontSize: 13,
    color: colors.text,
  },
  // Floating autocomplete panel
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 4,
    maxHeight: 300,
    overflow: "hidden",
    zIndex: 100,
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  acItem: { paddingHorizontal: 14, paddingVertical: 10 },
  acItemHover: { backgroundColor: colors.evidenceBg },
  acName: { color: colors.title, fontWeight: "700", fontSize: 15 },
  acMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  acEmpty: { color: colors.muted, paddingHorizontal: 14, paddingVertical: 10 },
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
  empty: { color: colors.muted, marginTop: 28, textAlign: "center" },
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
});
