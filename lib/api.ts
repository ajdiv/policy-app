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
  type: string;
  ref: string;
  title: string;
  date: string | null;
  url: string | null;
}

export interface AskResult {
  answer: string;
  citations: Citation[];
  member: { id: string; fullName: string; role: string };
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
}): Promise<Member[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.chamber) qs.set("chamber", params.chamber);
  if (params.state) qs.set("state", params.state);
  const data = await getJson<{ members: Member[] }>(`/api/members?${qs.toString()}`);
  return data.members;
}

export async function getMember(
  id: string,
): Promise<{ member: Member; recordType: string; records: RecordItem[] }> {
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

export { BASE_URL };
