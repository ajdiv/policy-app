import { eq } from "drizzle-orm";
import { Type, type Schema } from "@google/genai";
import { db, sqlite } from "../db/client.js";
import { members, executiveOrders } from "../db/schema.js";
import { embedOne, generate, generateStructured } from "./gemini.js";
import { search } from "./embeddingStore.js";

export interface Citation {
  index: number;
  type: "vote" | "executive_order";
  ref: string; // "118-HR-1" or "EO 14206"
  title: string;
  date: string | null;
  url: string | null;
  cast?: string; // Yea/Nay (votes only)
  party?: string | null;
  direction?: "supportive" | "opposed" | "neutral";
  why?: string;
}

export interface Stance {
  label: string;
  confidence: number; // 0-100
  supportive: number;
  opposed: number;
  total: number;
}

export interface AskResult {
  question: string;
  member: { id: string; fullName: string; role: string; party: string | null; state: string | null };
  stance: Stance | null;
  answer: string;
  citations: Citation[];
}

export async function answerQuestion(memberId: string, question: string): Promise<AskResult> {
  const member = db.select().from(members).where(eq(members.id, memberId)).get();
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });
  const base = {
    id: member.id,
    fullName: member.fullName,
    role: member.role,
    party: member.party,
    state: member.state,
  };

  if (member.role === "president") return answerPresident(base, question);
  return answerLegislator(base, question);
}

type Base = AskResult["member"];

// --- Legislator path: real roll-call votes -> stance + cited evidence ---

const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          index: { type: Type.INTEGER },
          direction: { type: Type.STRING, enum: ["supportive", "opposed", "neutral"] },
          why: { type: Type.STRING },
        },
        required: ["index", "direction", "why"],
      },
    },
  },
  required: ["summary", "items"],
};

interface AnalysisOut {
  summary: string;
  items: { index: number; direction: "supportive" | "opposed" | "neutral"; why: string }[];
}

async function answerLegislator(member: Base, question: string): Promise<AskResult> {
  const billIds = (
    sqlite
      .prepare(
        `SELECT DISTINCT r.bill_id AS id
         FROM votes v JOIN rollcalls r ON r.id = v.rollcall_id
         WHERE v.member_id = ? AND r.bill_id IS NOT NULL`,
      )
      .all(member.id) as Array<{ id: string }>
  ).map((r) => r.id);

  if (billIds.length === 0) return empty(member, "no-votes");

  const queryVector = await embedOne(question);
  const hits = search(queryVector, { sourceType: "bill", sourceIds: billIds, k: 800, limit: 8 });
  if (hits.length === 0) return empty(member, "no-matches");

  // Assemble the real (bill, vote) records for the matched bills.
  const records: Array<{
    bill: { id: string; title: string; policyArea: string | null; url: string | null };
    cast: string;
    date: string | null;
    url: string | null;
  }> = [];
  for (const h of hits) {
    const bill = sqlite
      .prepare(`SELECT id, title, policy_area AS policyArea, url FROM bills WHERE id = ?`)
      .get(h.sourceId) as { id: string; title: string; policyArea: string | null; url: string | null } | undefined;
    const vote = sqlite
      .prepare(
        `SELECT v.cast AS cast, r.date AS date, r.url AS url
         FROM votes v JOIN rollcalls r ON r.id = v.rollcall_id
         WHERE v.member_id = ? AND r.bill_id = ?
         ORDER BY r.date DESC LIMIT 1`,
      )
      .get(member.id, h.sourceId) as { cast: string; date: string | null; url: string | null } | undefined;
    if (bill && vote) records.push({ bill, cast: vote.cast, date: vote.date, url: vote.url });
  }
  if (records.length === 0) return empty(member, "no-matches");

  const recordBlocks = records.map(
    (r, i) =>
      `[${i + 1}] Bill ${r.bill.id} "${r.bill.title}"${
        r.bill.policyArea ? ` (policy area: ${r.bill.policyArea})` : ""
      } — ${member.fullName} voted ${r.cast}${r.date ? ` on ${r.date.slice(0, 10)}` : ""}.`,
  );

  const out = await generateStructured<AnalysisOut>(buildLegislatorPrompt(member.fullName, question, recordBlocks), ANALYSIS_SCHEMA);
  const byIndex = new Map((out.items ?? []).map((it) => [it.index, it]));

  const citations: Citation[] = records.map((r, i) => {
    const it = byIndex.get(i + 1);
    return {
      index: i + 1,
      type: "vote",
      ref: r.bill.id,
      title: r.bill.title,
      date: r.date,
      url: r.bill.url ?? r.url,
      cast: r.cast,
      party: member.party,
      direction: it?.direction,
      why: it?.why,
    };
  });

  return {
    question,
    member,
    stance: computeStance(citations),
    answer: (out.summary ?? "").trim(),
    citations,
  };
}

/** Stance label + Laplace-smoothed confidence from the directional votes. */
function computeStance(citations: Citation[]): Stance {
  const supportive = citations.filter((c) => c.direction === "supportive").length;
  const opposed = citations.filter((c) => c.direction === "opposed").length;
  const total = supportive + opposed;
  if (total === 0) return { label: "Unclear", confidence: 0, supportive, opposed, total };
  const dominant = Math.max(supportive, opposed);
  const frac = dominant / total;
  const dir = supportive > opposed ? "Supportive" : opposed > supportive ? "Opposed" : "Mixed";
  let label: string;
  if (dir === "Mixed" || frac < 0.6) label = "Mixed Record";
  else if (frac >= 0.85) label = `Strongly ${dir}`;
  else label = `Generally ${dir}`;
  // Laplace smoothing avoids 100% on tiny samples (e.g. 3/3 -> 88%).
  const confidence = Math.round(((dominant + 0.5) / (total + 1)) * 100);
  return { label, confidence, supportive, opposed, total };
}

function buildLegislatorPrompt(name: string, question: string, blocks: string[]): string {
  return [
    `You are a nonpartisan civic-education assistant analyzing the real roll-call voting record of ${name}.`,
    `Use ONLY the votes provided below. Do not use outside knowledge or invent bills.`,
    ``,
    `For EACH numbered vote, decide whether that vote indicates the member is "supportive", "opposed", or "neutral" toward the subject of the question — reasoning from the bill's title/policy area and how they voted (Yea vs Nay). Write a one-sentence "why" grounded in the bill and their vote.`,
    `Then write a concise, neutral overall "summary" (2-4 sentences) describing their record on this topic, referencing votes by their bracket number like [1], [2].`,
    `If a vote is not actually relevant to the question, mark it "neutral".`,
    ``,
    `VOTES:`,
    ...blocks,
    ``,
    `QUESTION: ${question}`,
  ].join("\n");
}

function empty(member: Base, reason: "no-votes" | "no-matches"): AskResult {
  const msg =
    reason === "no-votes"
      ? `No roll-call votes are loaded for ${member.fullName} yet. The dataset currently covers House recorded votes from 2023 onward; run/extend ingestion to add more.`
      : `I couldn't find votes by ${member.fullName} relevant to that question in the loaded record. Try a broader topic, or ingest more roll calls.`;
  return { question: "", member, stance: null, answer: msg, citations: [] };
}

// --- President path: executive orders ---

async function answerPresident(member: Base, question: string): Promise<AskResult> {
  const eos = db
    .select()
    .from(executiveOrders)
    .where(eq(executiveOrders.presidentId, member.id))
    .all();
  const ids = eos.map((e) => e.id);
  if (ids.length === 0) {
    return { question, member, stance: null, answer: `No records on file for ${member.fullName}.`, citations: [] };
  }
  const queryVector = await embedOne(question);
  const hits = search(queryVector, { sourceType: "executive_order", sourceIds: ids, limit: 8 });
  const byId = new Map(eos.map((e) => [e.id, e]));

  const citations: Citation[] = [];
  const blocks: string[] = [];
  hits.forEach((h, i) => {
    const eo = byId.get(h.sourceId);
    if (!eo) return;
    const ref = eo.eoNumber ? `EO ${eo.eoNumber}` : `EO ${eo.id}`;
    citations.push({
      index: i + 1,
      type: "executive_order",
      ref,
      title: eo.title,
      date: eo.signingDate,
      url: eo.htmlUrl,
    });
    blocks.push(`[${ref}] "${eo.title}" (signed ${eo.signingDate ?? "n/a"})\n${eo.abstract ?? ""}`);
  });

  if (blocks.length === 0) {
    return { question, member, stance: null, answer: `No records address that question for ${member.fullName}.`, citations: [] };
  }

  const prompt = [
    `You are a nonpartisan assistant. Answer the question about ${member.fullName} using ONLY the executive orders below.`,
    `Cite each claim with the order in brackets, e.g. [EO 14206]. If the records don't address it, say so. Be concise and neutral.`,
    ``,
    ...blocks.map((b, i) => `--- Record ${i + 1} ---\n${b}`),
    ``,
    `QUESTION: ${question}`,
  ].join("\n");

  return { question, member, stance: null, answer: (await generate(prompt)).trim(), citations };
}
