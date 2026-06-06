/**
 * Congress.gov API client. Requires a free api.data.gov key.
 * Docs: https://github.com/LibraryOfCongress/api.congress.gov
 */
import { config, hasCongressGov } from "../config.js";

export interface CgMember {
  bioguideId: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  party: string | null;
  state: string | null;
  chamber: "house" | "senate" | null;
  role: "representative" | "senator" | null;
  imageUrl: string | null;
  startYear: number | null;
}

const BASE = "https://api.congress.gov/v3";

function normalizeChamber(raw?: string): { chamber: CgMember["chamber"]; role: CgMember["role"] } {
  if (!raw) return { chamber: null, role: null };
  if (/senate/i.test(raw)) return { chamber: "senate", role: "senator" };
  if (/house/i.test(raw)) return { chamber: "house", role: "representative" };
  return { chamber: null, role: null };
}

/** Congress.gov returns names as "Last, First Middle"; produce a display name. */
function toDisplayName(name: string): { fullName: string; firstName: string | null; lastName: string | null } {
  if (name.includes(",")) {
    const [last, rest] = name.split(",", 2);
    const first = rest.trim();
    return { fullName: `${first} ${last.trim()}`.trim(), firstName: first || null, lastName: last.trim() || null };
  }
  return { fullName: name, firstName: null, lastName: null };
}

function mapMember(m: any): CgMember {
  const term = m.terms?.item?.[m.terms.item.length - 1] ?? m.terms?.item?.[0];
  const { chamber, role } = normalizeChamber(term?.chamber);
  const { fullName, firstName, lastName } = toDisplayName(m.name ?? "");
  return {
    bioguideId: m.bioguideId,
    fullName,
    firstName,
    lastName,
    party: m.partyName ?? null,
    state: m.state ?? null,
    chamber,
    role,
    imageUrl: m.depiction?.imageUrl ?? null,
    startYear: term?.startYear ? Number(term.startYear) : null,
  };
}

/** Fetch current members of Congress, paginating up to `max`. */
export async function fetchCurrentMembers(max = 600): Promise<CgMember[]> {
  if (!hasCongressGov()) {
    throw new Error("CONGRESS_GOV_API_KEY is not set — cannot fetch members.");
  }
  const out: CgMember[] = [];
  const limit = 250;
  let offset = 0;
  while (out.length < max) {
    const params = new URLSearchParams({
      api_key: config.congressGovApiKey,
      format: "json",
      currentMember: "true",
      limit: String(limit),
      offset: String(offset),
    });
    const res = await fetch(`${BASE}/member?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Congress.gov API error ${res.status}: ${await res.text()}`);
    }
    const data: any = await res.json();
    const members: any[] = data.members ?? [];
    for (const m of members) out.push(mapMember(m));
    if (members.length < limit || !data.pagination?.next) break;
    offset += limit;
  }
  return out.slice(0, max);
}
