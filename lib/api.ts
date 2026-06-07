// Talks to our backend. NEVER calls Gemini/Congress.gov directly — those keys
// live only on the server. Override the base URL with EXPO_PUBLIC_API_URL
// (e.g. http://192.168.1.203:3000 when testing on a physical phone).
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export interface Member {
  id: string;
  fullName: string;
  party: string | null;
  state: string | null;
  chamber: string; // 'senate' | 'house' | 'executive'
  role: string; // 'senator' | 'representative' | 'president'
  imageUrl: string | null;
}

export interface RecordItem {
  ref: string;
  title: string;
  date: string | null;
  url: string | null;
}

export interface Citation {
  index: number;
  type: "vote" | "executive_order";
  ref: string;
  title: string;
  date: string | null;
  url: string | null;
  cast?: string;
  party?: string | null;
  direction?: "supportive" | "opposed" | "neutral";
  why?: string;
}

export interface Stance {
  label: string;
  confidence: number;
  supportive: number;
  opposed: number;
  total: number;
}

export interface AskResult {
  question: string;
  answer: string;
  stance: Stance | null;
  citations: Citation[];
  member: { id: string; fullName: string; role: string; party: string | null; state: string | null };
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export async function searchMembers(params: {
  q?: string;
  chamber?: string;
  state?: string;
  limit?: number;
}): Promise<Member[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.chamber) qs.set("chamber", params.chamber);
  if (params.state) qs.set("state", params.state);
  if (params.limit) qs.set("limit", String(params.limit));
  const data = await getJson<{ members: Member[] }>(`/api/members?${qs.toString()}`);
  return data.members;
}

export interface Position {
  roleLabel: string;
  startYear: number;
  endYear: number | null; // null = present
  current: boolean;
}

export interface Tenure {
  roleLabel: string;
  sinceYear: number;
  years: number;
}

export interface LegislationItem {
  kind: "Sponsored" | "Cosponsored";
  title: string;
  ref: string;
  date: string | null;
  url: string | null;
  policyArea: string | null;
}

export interface VoteItem {
  cast: string;
  title: string;
  ref: string;
  date: string | null;
  url: string | null;
}

export interface MemberProfile {
  member: Member;
  recordType: string;
  recordCount: number;
  votesAvailable: boolean;
  headshotUrl: string | null;
  tenure: Tenure | null;
  positions: Position[];
  recentVotes: VoteItem[];
  recentLegislation: LegislationItem[];
  executiveOrders: RecordItem[];
}

export async function getMember(id: string): Promise<MemberProfile> {
  return getJson(`/api/members/${encodeURIComponent(id)}`);
}

export async function ask(memberId: string, question: string): Promise<AskResult> {
  const res = await fetch(`${BASE_URL}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId, question }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as AskResult;
}

export interface AuthUser {
  email: string;
  name: string | null;
  picture: string | null;
}

/** Exchange a Google access token for an app session (token + user). */
export async function loginWithGoogle(accessToken: string): Promise<{ token: string; user: AuthUser }> {
  const res = await fetch(`${BASE_URL}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Sign-in failed");
  return data as { token: string; user: AuthUser };
}

export { BASE_URL };
