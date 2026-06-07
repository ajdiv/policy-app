// Full state/territory names as Congress.gov returns them, with 2-letter codes
// so the typeahead matches both "New York" and "NY".
export const STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO",
  Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH",
  Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
  "District of Columbia": "DC", "American Samoa": "AS", Guam: "GU",
  "Northern Mariana Islands": "MP", "Puerto Rico": "PR", "Virgin Islands": "VI",
};

export const US_STATES: string[] = Object.keys(STATE_ABBR);

/**
 * States matching the query — by name (prefix first, then substring) or by
 * 2-letter abbreviation (e.g. "ny" -> New York). Best matches first.
 */
export function matchStates(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: Array<{ name: string; score: number }> = [];
  for (const name of US_STATES) {
    const lname = name.toLowerCase();
    const abbr = STATE_ABBR[name].toLowerCase();
    let score = Infinity;
    if (abbr === q) score = 0; // exact code match (e.g. "ny")
    else if (lname.startsWith(q)) score = 1;
    else if (q.length <= 2 && abbr.startsWith(q)) score = 2;
    else if (lname.includes(q)) score = 3;
    if (score !== Infinity) scored.push({ name, score });
  }
  scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
  return scored.slice(0, limit).map((s) => s.name);
}
