import { sqlite } from "./db/client.js";
import {
  fetchMemberDetail,
  fetchSponsoredLegislation,
  fetchCosponsoredLegislation,
  type CgTerm,
} from "./sources/congressGov.js";
import type { Member } from "./db/schema.js";

// Official public-domain portraits for executives (no Congress.gov record).
const PRESIDENT_PORTRAITS: Record<string, string> = {
  "potus-donald-trump":
    "https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg",
};

const ROLE_LABEL: Record<string, string> = {
  Representative: "U.S. Representative",
  Senator: "U.S. Senator",
  Delegate: "Delegate",
  "Resident Commissioner": "Resident Commissioner",
};

const TYPE_SLUG: Record<string, string> = {
  HR: "house-bill",
  S: "senate-bill",
  HRES: "house-resolution",
  SRES: "senate-resolution",
  HJRES: "house-joint-resolution",
  SJRES: "senate-joint-resolution",
  HCONRES: "house-concurrent-resolution",
  SCONRES: "senate-concurrent-resolution",
};

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function billRef(congress: number, type: string, number: string): string {
  return `${congress}-${type.toUpperCase()}-${number}`;
}

function billUrl(congress: number, type: string, number: string): string | null {
  const slug = TYPE_SLUG[type.toUpperCase()];
  return slug ? `https://www.congress.gov/bill/${ordinal(congress)}-congress/${slug}/${number}` : null;
}

export interface Position {
  roleLabel: string;
  startYear: number;
  endYear: number | null; // null = present
  current: boolean;
}

/** Collapse the term list into one entry per role (chamber), with year spans. */
function computePositions(terms: CgTerm[], currentMember: boolean): Position[] {
  if (terms.length === 0) return [];
  const latestType = terms[terms.length - 1].memberType;
  const groups = new Map<string, { start: number; end: number }>();
  for (const t of terms) {
    const g = groups.get(t.memberType) ?? { start: Infinity, end: -Infinity };
    g.start = Math.min(g.start, t.startYear);
    if (t.endYear != null) g.end = Math.max(g.end, t.endYear);
    groups.set(t.memberType, g);
  }
  return [...groups.entries()]
    .map(([memberType, g]) => {
      const current = currentMember && memberType === latestType;
      return {
        roleLabel: ROLE_LABEL[memberType] ?? memberType,
        startYear: g.start,
        endYear: current ? null : g.end === -Infinity ? null : g.end,
        current,
      };
    })
    .sort((a, b) => a.startYear - b.startYear);
}

export interface ProfileData {
  headshotUrl: string | null;
  tenure: { roleLabel: string; sinceYear: number; years: number } | null;
  positions: Position[];
  recentVotes: Array<{ cast: string; title: string; ref: string; date: string | null; url: string | null }>;
  recentLegislation: Array<{
    kind: "Sponsored" | "Cosponsored";
    title: string;
    ref: string;
    date: string | null;
    url: string | null;
    policyArea: string | null;
  }>;
}

export async function buildProfile(member: Member): Promise<ProfileData> {
  const detail = member.role === "president" ? null : await fetchMemberDetail(member.id);
  const positions = computePositions(detail?.terms ?? [], detail?.currentMember ?? !!member.currentMember);

  const currentPos = positions.find((p) => p.current);
  const tenure = currentPos
    ? {
        roleLabel: currentPos.roleLabel,
        sinceYear: currentPos.startYear,
        years: Math.max(0, new Date().getFullYear() - currentPos.startYear),
      }
    : null;

  // Recent votes — local DB (House roll calls only). Empty for senators/president.
  const recentVotes = sqlite
    .prepare(
      `SELECT v.cast AS cast, b.title AS title, b.id AS ref, r.date AS date, b.url AS url
       FROM votes v
       JOIN rollcalls r ON r.id = v.rollcall_id
       JOIN bills b ON b.id = r.bill_id
       WHERE v.member_id = ? AND v.cast IN ('Yea','Nay')
       ORDER BY r.date DESC
       LIMIT 30`,
    )
    .all(member.id) as ProfileData["recentVotes"];

  // Recent legislation — live from Congress.gov (sponsored + cosponsored), labeled.
  let recentLegislation: ProfileData["recentLegislation"] = [];
  if (member.role !== "president") {
    const [sponsored, cosponsored] = await Promise.all([
      fetchSponsoredLegislation(member.id, 20),
      fetchCosponsoredLegislation(member.id, 20),
    ]);
    recentLegislation = [...sponsored, ...cosponsored]
      .map((x) => ({
        kind: x.kind,
        title: x.title,
        ref: billRef(x.congress, x.type, x.number),
        date: x.introducedDate,
        url: billUrl(x.congress, x.type, x.number),
        policyArea: x.policyArea,
      }))
      .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
      .slice(0, 30);
  }

  return {
    headshotUrl: detail?.imageUrl ?? member.imageUrl ?? PRESIDENT_PORTRAITS[member.id] ?? null,
    tenure,
    positions,
    recentVotes,
    recentLegislation,
  };
}
