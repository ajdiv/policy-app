import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { searchMembers, type Member } from "../lib/api";
import { matchStates } from "../lib/usStates";
import { space, radius, fontSize, fontWeight, maxWidth, makeShadow, type Palette } from "../lib/theme";
import { useTheme } from "../lib/theme-context";
import { useWideLayout } from "../lib/useWideLayout";
import { AuthButton } from "../components/AuthButton";
import { ThemeToggle } from "../components/ThemeToggle";

const CHAMBERS = [
  { key: "", label: "All" },
  { key: "senate", label: "Senate" },
  { key: "house", label: "House" },
  { key: "executive", label: "Executive" },
];

export default function Home() {
  const router = useRouter();
  const wide = useWideLayout(720);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
        <View style={styles.topBar}>
          <ThemeToggle />
          <AuthButton />
        </View>
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

        <Pressable style={styles.billsLink} onPress={() => router.push({ pathname: "/bills" })}>
          <Text style={styles.billsLinkText}>📜  Browse bills & partisan temperature  →</Text>
        </Pressable>

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

function makeStyles(c: Palette) {
  const sh = makeShadow(c);
  return StyleSheet.create({
  page: { paddingHorizontal: space.lg, paddingBottom: space.huge, alignItems: "center" },
  shell: { width: "100%", maxWidth: maxWidth.default, alignSelf: "center" },
  topBar: { flexDirection: "row", justifyContent: "flex-end", marginBottom: space.xs, minHeight: 36 },
  title: { fontSize: fontSize.h1, fontWeight: fontWeight.bold, color: c.title, textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.xl, color: c.subtitle, textAlign: "center", marginTop: space.sm, marginBottom: space.xxl },
  searchCard: {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: c.border,
    // Lift the whole card (and its floating dropdowns) above the info card /
    // results that follow it as siblings, so autocomplete overlays them.
    position: "relative",
    zIndex: 50,
    ...sh.raised,
  },
  // zIndex ordering so the name dropdown floats above the filter row.
  zTop: { zIndex: 30 },
  zMid: { zIndex: 20 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: space.md },
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
  clearBtnText: { fontSize: 22, lineHeight: 24, color: c.muted, fontWeight: fontWeight.medium },
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
  searchBtn: {
    backgroundColor: c.primary,
    paddingHorizontal: space.xxl,
    paddingVertical: space.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  searchBtnText: { color: c.onPrimary, fontWeight: fontWeight.semibold, fontSize: fontSize.xl },
  filterRow: { flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.md, flexWrap: "wrap" },
  chip: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.pill, backgroundColor: c.evidenceBg },
  chipActive: { backgroundColor: c.primary },
  chipText: { color: c.primaryDark, fontWeight: fontWeight.medium, fontSize: fontSize.base },
  chipTextActive: { color: c.onPrimary },
  stateWrap: { position: "relative", flex: 1, minWidth: 140 },
  stateInput: {
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontSize: fontSize.base,
    color: c.text,
  },
  // Floating autocomplete panel
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: space.sm,
    backgroundColor: c.card,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingVertical: space.xs,
    maxHeight: 300,
    overflow: "hidden",
    zIndex: 100,
    ...sh.dropdown,
  },
  acItem: { paddingHorizontal: space.md, paddingVertical: space.md },
  acItemHover: { backgroundColor: c.evidenceBg },
  acName: { color: c.title, fontWeight: fontWeight.semibold, fontSize: fontSize.lg },
  acMeta: { color: c.muted, fontSize: fontSize.base, marginTop: space.xs },
  acEmpty: { color: c.muted, paddingHorizontal: space.md, paddingVertical: space.md },
  billsLink: { alignSelf: "center", marginTop: space.md, paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radius.pill, backgroundColor: c.evidenceBg },
  billsLinkText: { color: c.primaryDark, fontWeight: fontWeight.semibold, fontSize: fontSize.md },
  infoCard: {
    backgroundColor: c.card,
    borderRadius: radius.lg,
    padding: space.xxl,
    marginTop: space.xl,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
  },
  infoText: { color: c.text, fontSize: fontSize.xl, textAlign: "center" },
  footer: { color: c.muted, fontSize: fontSize.base, marginTop: space.md, textAlign: "center" },
  error: { color: c.nayText, marginTop: space.lg, textAlign: "center" },
  empty: { color: c.muted, marginTop: space.xxl, textAlign: "center" },
  resultCard: {
    backgroundColor: c.card,
    borderRadius: radius.md,
    padding: space.lg,
    marginTop: space.md,
    borderWidth: 1,
    borderColor: c.border,
    flexDirection: "row",
    alignItems: "center",
  },
  resultName: { fontSize: fontSize.xxl, fontWeight: fontWeight.semibold, color: c.title },
  resultMeta: { color: c.muted, marginTop: space.xs },
  chevron: { fontSize: 26, color: c.primary, fontWeight: "300" },
  });
}
