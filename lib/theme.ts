// Shared design tokens. Colors are the primary makeover lever; the spacing,
// radius, type, and shadow scales below make the rest of the system tweakable
// from one place. See DESIGN.md for how these map to the UI.
export const colors = {
  bgGradient: ["#eef2ff", "#f7f8ff", "#ffffff"] as const,
  primary: "#4f46e5",
  primaryDark: "#3730a3",
  title: "#312e81",
  subtitle: "#6366f1",
  text: "#1f2937",
  muted: "#6b7280",
  card: "#ffffff",
  border: "#e7e8f0",
  shadow: "rgba(49,46,129,0.08)",

  yeaBg: "#dcfce7",
  yeaText: "#15803d",
  nayBg: "#fee2e2",
  nayText: "#b91c1c",
  neutralBg: "#e5e7eb",
  neutralText: "#4b5563",

  noteBg: "#fffbeb",
  noteBorder: "#fde68a",
  noteText: "#92400e",

  evidenceBg: "#eef2ff",
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

/** Elevation presets (indigo-tinted soft shadows). Spread into a style object. */
export const shadow = {
  card: { shadowColor: colors.shadow, shadowOpacity: 1, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  raised: { shadowColor: colors.shadow, shadowOpacity: 1, shadowRadius: 28, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  dropdown: { shadowColor: colors.shadow, shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  floating: { shadowColor: "rgba(49,46,129,0.3)", shadowOpacity: 1, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 16 },
  fab: { shadowColor: "rgba(49,46,129,0.45)", shadowOpacity: 1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
} as const;

/** Content shell max-widths per screen role. */
export const maxWidth = {
  narrow: 820,
  default: 860,
  wide: 1080,
} as const;

/** Color for a stance label. */
export function stanceColors(label: string): { bg: string; text: string } {
  if (/support/i.test(label)) return { bg: colors.yeaBg, text: colors.yeaText };
  if (/oppos/i.test(label)) return { bg: colors.nayBg, text: colors.nayText };
  return { bg: colors.noteBg, text: colors.noteText }; // mixed / unclear
}

/** Colors for a partisan-temperature label (party-line → bipartisan). */
export function tempColors(label: string): { bg: string; text: string; bar: string } {
  if (/party-line/i.test(label)) return { bg: "#fee2e2", text: "#b91c1c", bar: "#ef4444" };
  if (/leans/i.test(label)) return { bg: "#ffedd5", text: "#c2410c", bar: "#f97316" };
  if (/mostly bipartisan/i.test(label)) return { bg: "#ccfbf1", text: "#0f766e", bar: "#14b8a6" };
  return { bg: "#dcfce7", text: "#15803d", bar: "#22c55e" }; // bipartisan
}

/** Color for a vote cast (Yea/Nay/other). */
export function castColors(cast?: string): { bg: string; text: string } {
  if (cast === "Yea") return { bg: colors.yeaBg, text: colors.yeaText };
  if (cast === "Nay") return { bg: colors.nayBg, text: colors.nayText };
  return { bg: colors.neutralBg, text: colors.neutralText };
}
