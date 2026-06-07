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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * GET with throttle + retry. The API drops connections ("fetch failed") under
 * rapid sequential load, so we pace requests and retry transient failures.
 */
async function getJson(path: string): Promise<any> {
  const sep = path.includes("?") ? "&" : "?";
  const url = `${BASE}${path}${sep}api_key=${config.congressGovApiKey}&format=json`;
  await sleep(75); // gentle throttle
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429 || res.status >= 500) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      if (!res.ok) throw new Error(`Congress.gov API error ${res.status} on ${path}: ${await res.text()}`);
      return await res.json();
    } catch (e) {
      lastErr = e; // network-level ("fetch failed") — back off and retry
      await sleep(500 * 2 ** attempt);
    }
  }
  throw lastErr ?? new Error(`Congress.gov request failed: ${path}`);
}

export interface CgRollCall {
  congress: number;
  session: number;
  rollCallNumber: number;
  legislationType: string | null; // HR, HRES, S, ...
  legislationNumber: string | null;
  result: string | null;
  voteType: string | null;
  startDate: string | null;
  legislationUrl: string | null;
}

/** List House roll-call votes for a congress+session, newest first, up to `max`. */
export async function fetchHouseRollCalls(
  congress: number,
  session: number,
  max = 250,
): Promise<CgRollCall[]> {
  const out: CgRollCall[] = [];
  const limit = 250;
  let offset = 0;
  while (out.length < max) {
    const data = await getJson(`/house-vote/${congress}/${session}?limit=${limit}&offset=${offset}`);
    const rows: any[] = data.houseRollCallVotes ?? [];
    for (const r of rows) {
      out.push({
        congress: r.congress,
        session: r.sessionNumber,
        rollCallNumber: r.rollCallNumber,
        legislationType: r.legislationType ?? null,
        legislationNumber: r.legislationNumber ?? null,
        result: r.result ?? null,
        voteType: r.voteType ?? null,
        startDate: r.startDate ?? null,
        legislationUrl: r.legislationUrl ?? null,
      });
    }
    if (rows.length < limit || !data.pagination?.next) break;
    offset += limit;
  }
  return out.slice(0, max);
}

export interface CgMemberVote {
  bioguideId: string;
  voteCast: string; // Aye | No | Not Voting | Present
  voteParty: string | null;
  voteState: string | null;
}

/** How each member voted on a specific House roll call. */
export async function fetchMemberVotes(
  congress: number,
  session: number,
  rollCall: number,
): Promise<CgMemberVote[]> {
  const data = await getJson(`/house-vote/${congress}/${session}/${rollCall}/members`);
  const results: any[] = data.houseRollCallVoteMemberVotes?.results ?? [];
  return results.map((r) => ({
    bioguideId: r.bioguideID,
    voteCast: r.voteCast ?? "",
    voteParty: r.voteParty ?? null,
    voteState: r.voteState ?? null,
  }));
}

export interface CgBill {
  title: string | null;
  policyArea: string | null;
}

/** Fetch a bill's title and policy area. Returns null if not found. */
export async function fetchBill(
  congress: number,
  billType: string,
  number: string,
): Promise<CgBill | null> {
  try {
    const data = await getJson(`/bill/${congress}/${billType.toLowerCase()}/${number}`);
    const bill = data.bill;
    if (!bill) return null;
    return { title: bill.title ?? null, policyArea: bill.policyArea?.name ?? null };
  } catch {
    return null; // some legislation types (e.g. procedural) may not resolve
  }
}

export interface CgTerm {
  chamber: string;
  memberType: string; // Representative | Senator | Delegate | ...
  startYear: number;
  endYear: number | null;
  stateName: string | null;
}

export interface CgMemberDetail {
  imageUrl: string | null;
  terms: CgTerm[];
  partyName: string | null;
  directOrderName: string | null;
  nickName: string | null;
  currentMember: boolean;
}

/** Full member detail (term history, party history, headshot). Null if not found. */
export async function fetchMemberDetail(bioguideId: string): Promise<CgMemberDetail | null> {
  try {
    const data = await getJson(`/member/${bioguideId}`);
    const m = data.member;
    if (!m) return null;
    const terms: CgTerm[] = (m.terms ?? []).map((t: any) => ({
      chamber: t.chamber,
      memberType: t.memberType,
      startYear: Number(t.startYear),
      endYear: t.endYear != null ? Number(t.endYear) : null,
      stateName: t.stateName ?? null,
    }));
    const ph = m.partyHistory ?? [];
    return {
      imageUrl: m.depiction?.imageUrl ?? null,
      terms,
      partyName: ph.length ? ph[ph.length - 1].partyName : null,
      directOrderName: m.directOrderName ?? null,
      nickName: m.nickName ?? null,
      currentMember: !!m.currentMember,
    };
  } catch {
    return null;
  }
}

export interface CgLegislation {
  kind: "Sponsored" | "Cosponsored";
  congress: number;
  type: string;
  number: string;
  title: string;
  introducedDate: string | null;
  policyArea: string | null;
}

async function fetchLegislation(
  bioguideId: string,
  kind: "Sponsored" | "Cosponsored",
  limit: number,
): Promise<CgLegislation[]> {
  const path = kind === "Sponsored" ? "sponsored-legislation" : "cosponsored-legislation";
  const key = kind === "Sponsored" ? "sponsoredLegislation" : "cosponsoredLegislation";
  try {
    const data = await getJson(`/member/${bioguideId}/${path}?limit=${limit}`);
    const arr: any[] = data[key] ?? [];
    return arr
      .filter((x) => x.type && x.number)
      .map((x) => ({
        kind,
        congress: x.congress,
        type: String(x.type),
        number: String(x.number),
        title: x.title ?? `${x.type} ${x.number}`,
        introducedDate: x.introducedDate ?? null,
        policyArea: x.policyArea?.name ?? null,
      }));
  } catch {
    return [];
  }
}

export const fetchSponsoredLegislation = (bioguideId: string, limit = 10) =>
  fetchLegislation(bioguideId, "Sponsored", limit);
export const fetchCosponsoredLegislation = (bioguideId: string, limit = 10) =>
  fetchLegislation(bioguideId, "Cosponsored", limit);

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
