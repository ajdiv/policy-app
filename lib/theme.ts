// Shared design tokens. Colors come in two palettes (light/dark); everything
// else (spacing, radius, type) is theme-independent. Components read the active
// palette via useTheme() (lib/theme-context) and build styles with makeStyles().
// See DESIGN.md. Dark values mirror the design system's [data-theme="dark"] scope.

/** Every color the UI references, in one shape so light/dark stay in sync. */
export interface Palette {
  bgGradient: readonly [string, string, string];

  // Brand & surface
  primary: string;
  primaryDark: string;
  title: string;
  subtitle: string;
  text: string;
  muted: string;
  card: string;
  border: string;
  borderStrong: string;
  evidenceBg: string;
  onPrimary: string;

  // Indigo-tinted elevation
  shadow: string;
  shadowFloating: string;
  shadowFab: string;

  // Semantic — vote cast
  yeaBg: string;
  yeaText: string;
  nayBg: string;
  nayText: string;
  neutralBg: string;
  neutralText: string;

  // Semantic — note / mixed
  noteBg: string;
  noteBorder: string;
  noteText: string;

  // Semantic — partisan temperature
  tempPartylineBar: string;
  tempPartylineBg: string;
  tempPartylineText: string;
  tempLeansBar: string;
  tempLeansBg: string;
  tempLeansText: string;
  tempMostlyBar: string;
  tempMostlyBg: string;
  tempMostlyText: string;
  tempBipartisanBar: string;
  tempBipartisanBg: string;
  tempBipartisanText: string;

  // Party affiliation
  partyDemBg: string;
  partyDemText: string;
  partyRepBg: string;
  partyRepText: string;
  partyIndBg: string;
  partyIndText: string;
  partyDemBar: string;
  partyRepBar: string;

  // Legislation kind badge
  kindSponsoredBg: string;
  kindSponsoredText: string;
  kindCosponsoredBg: string;
  kindCosponsoredText: string;

  // Misc surfaces
  track: string;
  aiBubble: string;
  chatHeader: string;
  summaryBg: string;
}

export const lightColors: Palette = {
  bgGradient: ["#eef2ff", "#f7f8ff", "#ffffff"],

  primary: "#4f46e5",
  primaryDark: "#3730a3",
  title: "#312e81",
  subtitle: "#6366f1",
  text: "#1f2937",
  muted: "#6b7280",
  card: "#ffffff",
  border: "#e7e8f0",
  borderStrong: "#dfe3f3",
  evidenceBg: "#eef2ff",
  onPrimary: "#ffffff",

  shadow: "rgba(49,46,129,0.08)",
  shadowFloating: "rgba(49,46,129,0.30)",
  shadowFab: "rgba(49,46,129,0.45)",

  yeaBg: "#dcfce7",
  yeaText: "#15803d",
  nayBg: "#fee2e2",
  nayText: "#b91c1c",
  neutralBg: "#e5e7eb",
  neutralText: "#4b5563",

  noteBg: "#fffbeb",
  noteBorder: "#fde68a",
  noteText: "#92400e",

  tempPartylineBar: "#ef4444",
  tempPartylineBg: "#fee2e2",
  tempPartylineText: "#b91c1c",
  tempLeansBar: "#f97316",
  tempLeansBg: "#ffedd5",
  tempLeansText: "#c2410c",
  tempMostlyBar: "#14b8a6",
  tempMostlyBg: "#ccfbf1",
  tempMostlyText: "#0f766e",
  tempBipartisanBar: "#22c55e",
  tempBipartisanBg: "#dcfce7",
  tempBipartisanText: "#15803d",

  partyDemBg: "#dbeafe",
  partyDemText: "#1d4ed8",
  partyRepBg: "#fee2e2",
  partyRepText: "#b91c1c",
  partyIndBg: "#e5e7eb",
  partyIndText: "#4b5563",
  partyDemBar: "#1d4ed8",
  partyRepBar: "#b91c1c",

  kindSponsoredBg: "#e0e7ff",
  kindSponsoredText: "#4338ca",
  kindCosponsoredBg: "#f3f4f6",
  kindCosponsoredText: "#6b7280",

  track: "#eef0f5",
  aiBubble: "#f4f6fb",
  chatHeader: "#fafbff",
  summaryBg: "#f7f8fc",
};

export const darkColors: Palette = {
  bgGradient: ["#1a1830", "#161424", "#100e18"],

  primary: "#6366f1",
  primaryDark: "#a5b4fc",
  title: "#e8ebff",
  subtitle: "#a5b4fc",
  text: "#e5e7eb",
  muted: "#9aa1b2",
  card: "#1e1b2e",
  border: "#322e48",
  borderStrong: "#3b3658",
  evidenceBg: "#272338",
  onPrimary: "#ffffff",

  shadow: "rgba(0,0,0,0.45)",
  shadowFloating: "rgba(0,0,0,0.60)",
  shadowFab: "rgba(79,70,229,0.50)",

  yeaBg: "#15321f",
  yeaText: "#4ade80",
  nayBg: "#3a1d22",
  nayText: "#f87171",
  neutralBg: "#2d2b3a",
  neutralText: "#cbd5e1",

  noteBg: "#2e2614",
  noteBorder: "#5c4a1f",
  noteText: "#fcd34d",

  tempPartylineBar: "#ef4444",
  tempPartylineBg: "#3a1d22",
  tempPartylineText: "#f87171",
  tempLeansBar: "#f97316",
  tempLeansBg: "#3a2614",
  tempLeansText: "#fb923c",
  tempMostlyBar: "#14b8a6",
  tempMostlyBg: "#0f2e2b",
  tempMostlyText: "#2dd4bf",
  tempBipartisanBar: "#22c55e",
  tempBipartisanBg: "#15321f",
  tempBipartisanText: "#4ade80",

  partyDemBg: "#1c2a4a",
  partyDemText: "#93c5fd",
  partyRepBg: "#3a1d22",
  partyRepText: "#f87171",
  partyIndBg: "#2d2b3a",
  partyIndText: "#cbd5e1",
  partyDemBar: "#3b82f6",
  partyRepBar: "#ef4444",

  kindSponsoredBg: "#2a2550",
  kindSponsoredText: "#c7d2fe",
  kindCosponsoredBg: "#26242f",
  kindCosponsoredText: "#9aa1b2",

  track: "#2a2740",
  aiBubble: "#232032",
  chatHeader: "#1a1828",
  summaryBg: "#232032",
};

/** Spacing scale — 4px grid. Use for padding / margin / gap. */
export const space = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
  mega: 64,
  giant: 96,
} as const;

/** Corner-radius scale. `pill` = fully rounded chips/buttons. Circular avatars
 *  and dots set borderRadius to half their fixed size directly (not from here). */
export const radius = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Font sizes (kept 1:1 with the original design — not snapped). */
export const fontSize = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 15,
  xl: 16,
  xxl: 17,
  xxxl: 18,
  h3: 24,
  h2: 30,
  h1: 34,
  display: 36,
} as const;

/** Font weights (React Native string literals). */
export const fontWeight = {
  medium: "600",
  semibold: "700",
  bold: "800",
} as const;

/** Absolute line heights, paired with the sizes above. */
export const lineHeight = {
  tight: 17,
  snug: 19,
  normal: 21,
  relaxed: 23,
  display: 30,
} as const;

/** Content shell max-widths per screen role. */
export const maxWidth = {
  narrow: 820,
  default: 860,
  wide: 1080,
} as const;

/** Elevation presets, tinted by the active palette. Spread into a style. */
export function makeShadow(c: Palette) {
  return {
    card: { shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    raised: { shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
    dropdown: { shadowColor: c.shadow, shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    floating: { shadowColor: c.shadowFloating, shadowOpacity: 1, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 16 },
    fab: { shadowColor: c.shadowFab, shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  } as const;
}

/** Color for a stance label. */
export function stanceColors(c: Palette, label: string): { bg: string; text: string } {
  if (/support/i.test(label)) return { bg: c.yeaBg, text: c.yeaText };
  if (/oppos/i.test(label)) return { bg: c.nayBg, text: c.nayText };
  return { bg: c.noteBg, text: c.noteText }; // mixed / unclear
}

/** Colors for a partisan-temperature label (party-line → bipartisan). */
export function tempColors(c: Palette, label: string): { bg: string; text: string; bar: string } {
  if (/party-line/i.test(label)) return { bg: c.tempPartylineBg, text: c.tempPartylineText, bar: c.tempPartylineBar };
  if (/leans/i.test(label)) return { bg: c.tempLeansBg, text: c.tempLeansText, bar: c.tempLeansBar };
  if (/mostly bipartisan/i.test(label)) return { bg: c.tempMostlyBg, text: c.tempMostlyText, bar: c.tempMostlyBar };
  return { bg: c.tempBipartisanBg, text: c.tempBipartisanText, bar: c.tempBipartisanBar }; // bipartisan
}

/** Color for a vote cast (Yea/Nay/other). */
export function castColors(c: Palette, cast?: string): { bg: string; text: string } {
  if (cast === "Yea") return { bg: c.yeaBg, text: c.yeaText };
  if (cast === "Nay") return { bg: c.nayBg, text: c.nayText };
  return { bg: c.neutralBg, text: c.neutralText };
}

/** Color for a party affiliation (D/R/other). */
export function partyColor(c: Palette, party: string): { bg: string; text: string } {
  if (/^D/i.test(party)) return { bg: c.partyDemBg, text: c.partyDemText };
  if (/^R/i.test(party)) return { bg: c.partyRepBg, text: c.partyRepText };
  return { bg: c.partyIndBg, text: c.partyIndText };
}
