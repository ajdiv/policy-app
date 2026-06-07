// Shared visual tokens, matching the indigo/white design language of the mockups.
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

/** Color for a stance label. */
export function stanceColors(label: string): { bg: string; text: string } {
  if (/support/i.test(label)) return { bg: colors.yeaBg, text: colors.yeaText };
  if (/oppos/i.test(label)) return { bg: colors.nayBg, text: colors.nayText };
  return { bg: colors.noteBg, text: colors.noteText }; // mixed / unclear
}

/** Color for a vote cast (Yea/Nay/other). */
export function castColors(cast?: string): { bg: string; text: string } {
  if (cast === "Yea") return { bg: colors.yeaBg, text: colors.yeaText };
  if (cast === "Nay") return { bg: colors.nayBg, text: colors.nayText };
  return { bg: colors.neutralBg, text: colors.neutralText };
}
