/**
 * Partisan "temperature" of a roll call, derived from per-party Yea/Nay totals.
 * score: 0 = fully party-line split, 100 = both parties voted the same way.
 */
export interface Temperature {
  score: number; // 0-100 (higher = more bipartisan)
  label: string;
  dem: { yea: number; nay: number };
  rep: { yea: number; nay: number };
}

export function temperatureFromPartyTotals(partyTotalsJson: string | null): Temperature | null {
  if (!partyTotalsJson) return null;
  let pt: any;
  try {
    pt = JSON.parse(partyTotalsJson);
  } catch {
    return null;
  }
  const dem = pt.D ?? {};
  const rep = pt.R ?? {};
  const demYea = dem.Yea ?? 0;
  const demNay = dem.Nay ?? 0;
  const repYea = rep.Yea ?? 0;
  const repNay = rep.Nay ?? 0;
  const demTot = demYea + demNay;
  const repTot = repYea + repNay;
  if (demTot === 0 || repTot === 0) return null; // can't gauge partisanship

  const gap = Math.abs(demYea / demTot - repYea / repTot); // 0 = identical, 1 = opposite
  const score = Math.round((1 - gap) * 100);
  let label: string;
  if (gap >= 0.7) label = "Party-line";
  else if (gap >= 0.4) label = "Leans partisan";
  else if (gap >= 0.15) label = "Mostly bipartisan";
  else label = "Bipartisan";

  return { score, label, dem: { yea: demYea, nay: demNay }, rep: { yea: repYea, nay: repNay } };
}
