// Search alias expansion: common first-name nicknames, well-known political
// initialisms, and state abbreviations. Lets "Bernie" find "Bernard Sanders",
// "AOC" find "Alexandria Ocasio-Cortez", and "NY" resolve to "New York".

/** Common nickname -> formal first name(s). */
const NICKNAMES: Record<string, string[]> = {
  bernie: ["bernard"],
  bill: ["william"],
  billy: ["william"],
  will: ["william"],
  bob: ["robert"],
  bobby: ["robert"],
  rob: ["robert"],
  robbie: ["robert"],
  dick: ["richard"],
  rick: ["richard"],
  ricky: ["richard"],
  jim: ["james"],
  jimmy: ["james"],
  joe: ["joseph"],
  joey: ["joseph"],
  mike: ["michael"],
  mikey: ["michael"],
  tom: ["thomas"],
  tommy: ["thomas"],
  ted: ["edward", "theodore"],
  teddy: ["theodore", "edward"],
  ed: ["edward"],
  eddie: ["edward"],
  chuck: ["charles"],
  charlie: ["charles"],
  liz: ["elizabeth"],
  beth: ["elizabeth"],
  betty: ["elizabeth"],
  nan: ["nancy"],
  dave: ["david"],
  dan: ["daniel"],
  danny: ["daniel"],
  ben: ["benjamin"],
  sam: ["samuel"],
  sammy: ["samuel"],
  tony: ["anthony"],
  fred: ["frederick"],
  greg: ["gregory"],
  ron: ["ronald"],
  ronnie: ["ronald"],
  steve: ["steven", "stephen"],
  matt: ["matthew"],
  chris: ["christopher"],
  nick: ["nicholas"],
  pat: ["patrick", "patricia"],
  patty: ["patricia"],
  kate: ["katherine", "kathleen"],
  katie: ["katherine", "kathleen"],
  cathy: ["catherine"],
  jack: ["john"],
  johnny: ["john"],
  andy: ["andrew"],
  alex: ["alexander", "alexandria"],
  abby: ["abigail"],
  gabe: ["gabriel"],
  hank: ["henry"],
  harry: ["harold", "henry"],
  jerry: ["gerald", "jerome"],
  larry: ["lawrence"],
  marty: ["martin"],
  vince: ["vincent"],
  walt: ["walter"],
  mitch: ["mitchell"],
};

/** Well-known political initialisms -> a distinctive name fragment. */
const POLITICIAN_ALIASES: Record<string, string> = {
  aoc: "Ocasio-Cortez",
  mtg: "Greene",
};

/**
 * Expand a name query into the set of LIKE terms to match against full names.
 * Always includes the raw query; adds nickname/initialism expansions.
 */
export function expandNameQuery(q: string): string[] {
  const raw = q.trim();
  if (!raw) return [];
  const terms = new Set<string>([raw]);
  const lower = raw.toLowerCase();

  if (POLITICIAN_ALIASES[lower]) terms.add(POLITICIAN_ALIASES[lower]);

  const tokens = raw.split(/\s+/);
  const firstLower = tokens[0].toLowerCase();
  const expansions = NICKNAMES[firstLower];
  if (expansions) {
    for (const formal of expansions) terms.add([formal, ...tokens.slice(1)].join(" "));
  }
  return [...terms];
}

/** 2-letter state/territory code -> full name (as Congress.gov stores it). */
export const STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia", AS: "American Samoa", GU: "Guam",
  MP: "Northern Mariana Islands", PR: "Puerto Rico", VI: "Virgin Islands",
};

/** If the input is a known 2-letter code, return the full state name; else the input. */
export function resolveState(s: string): string {
  const key = s.trim().toUpperCase();
  return STATE_ABBR_TO_NAME[key] ?? s.trim();
}
