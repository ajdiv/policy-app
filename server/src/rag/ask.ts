import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { members, executiveOrders } from "../db/schema.js";
import { embedOne, generate } from "./gemini.js";
import { search } from "./embeddingStore.js";

export interface Citation {
  type: "executive_order" | "bill" | "vote";
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

/**
 * Answer a question about a politician using ONLY their real records,
 * retrieved by semantic similarity. Routing depends on their role:
 *   - president  -> executive orders (Federal Register)
 *   - legislator -> votes / sponsored bills (arrives in Phase 2/3)
 */
export async function answerQuestion(memberId: string, question: string): Promise<AskResult> {
  const member = db.select().from(members).where(eq(members.id, memberId)).get();
  if (!member) throw Object.assign(new Error("Member not found"), { status: 404 });

  const citations: Citation[] = [];
  const contextBlocks: string[] = [];

  if (member.role === "president") {
    const eos = db
      .select()
      .from(executiveOrders)
      .where(eq(executiveOrders.presidentId, member.id))
      .all();
    const ids = eos.map((e) => e.id);
    if (ids.length > 0) {
      const queryVector = await embedOne(question);
      const hits = search(queryVector, {
        sourceType: "executive_order",
        sourceIds: ids,
        limit: 8,
      });
      const byId = new Map(eos.map((e) => [e.id, e]));
      for (const h of hits) {
        const eo = byId.get(h.sourceId);
        if (!eo) continue;
        const ref = eo.eoNumber ? `EO ${eo.eoNumber}` : `EO ${eo.id}`;
        citations.push({
          type: "executive_order",
          ref,
          title: eo.title,
          date: eo.signingDate,
          url: eo.htmlUrl,
        });
        contextBlocks.push(
          `[${ref}] "${eo.title}" (signed ${eo.signingDate ?? "n/a"})\n${
            eo.abstract ?? "(no abstract provided)"
          }`,
        );
      }
    }
  }

  if (contextBlocks.length === 0) {
    return {
      answer:
        member.role === "president"
          ? `I don't have any records on file for ${member.fullName} that address that question.`
          : `Voting and sponsorship records for legislators like ${member.fullName} aren't loaded yet — that arrives in a later phase. Right now the AI answers about executives (e.g. the President) from their executive orders.`,
      citations: [],
      member: { id: member.id, fullName: member.fullName, role: member.role },
    };
  }

  const answer = await generate(buildPrompt(member.fullName, question, contextBlocks));
  return {
    answer: answer.trim(),
    citations,
    member: { id: member.id, fullName: member.fullName, role: member.role },
  };
}

function buildPrompt(name: string, question: string, blocks: string[]): string {
  return [
    `You are a nonpartisan civic-education assistant. Answer the question about ${name} using ONLY the official records provided below.`,
    ``,
    `Rules:`,
    `- Base every statement strictly on the records. Do not use outside knowledge or speculate.`,
    `- Cite the specific record in brackets after each claim, e.g. [EO 14036].`,
    `- If the records do not address the question, say so plainly rather than guessing.`,
    `- Be concise, factual, and neutral. Do not characterize motives or offer opinions.`,
    ``,
    `RECORDS:`,
    ...blocks.map((b, i) => `--- Record ${i + 1} ---\n${b}`),
    ``,
    `QUESTION: ${question}`,
    ``,
    `ANSWER (with bracketed citations):`,
  ].join("\n");
}
