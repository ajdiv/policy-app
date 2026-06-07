import { db, sqlite } from "../db/client.js";
import { bills, rollcalls } from "../db/schema.js";
import {
  fetchHouseRollCalls,
  fetchMemberVotes,
  fetchBill,
  type CgMemberVote,
} from "../sources/congressGov.js";
import { embedPending, type EmbedRow } from "./embedUtil.js";

const CONGRESSES = (process.env.INGEST_CONGRESSES ?? "118,119")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter(Boolean);
const SESSIONS = (process.env.INGEST_SESSIONS ?? "1,2")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter(Boolean);
const MAX_ROLLCALLS = Number(process.env.INGEST_MAX_ROLLCALLS ?? 250);

/** Aye/No/Not Voting/Present -> normalized vote label. */
function normCast(raw: string): string {
  const x = (raw ?? "").trim().toLowerCase();
  if (x.includes("present")) return "Present";
  if (x.includes("not voting")) return "Not Voting";
  if (x === "aye" || x === "yea" || x === "yes") return "Yea";
  if (x === "no" || x === "nay") return "Nay";
  return raw || "Unknown";
}

function partyTotalsFrom(votes: CgMemberVote[]): Record<string, Record<string, number>> {
  const totals: Record<string, Record<string, number>> = {};
  for (const v of votes) {
    const p = v.voteParty || "?";
    totals[p] ??= { Yea: 0, Nay: 0, Present: 0, "Not Voting": 0 };
    const c = normCast(v.voteCast);
    if (totals[p][c] !== undefined) totals[p][c]++;
  }
  return totals;
}

/**
 * Ingest House roll-call votes: roll calls, the bills they're on (title +
 * policy area), and how every member voted. Then embed the distinct bills.
 */
export async function ingestHouseVotes() {
  const seenBills = new Set<string>();
  const insertVote = sqlite.prepare(
    `INSERT INTO votes (rollcall_id, member_id, cast) VALUES (?, ?, ?)`,
  );
  const deleteVotes = sqlite.prepare(`DELETE FROM votes WHERE rollcall_id = ?`);

  let ingested = 0;
  outer: for (const congress of CONGRESSES) {
    for (const session of SESSIONS) {
      const remaining = MAX_ROLLCALLS - ingested;
      if (remaining <= 0) break outer;
      console.log(`\n[votes] Fetching House roll calls for congress ${congress}, session ${session}…`);
      let rollCalls;
      try {
        rollCalls = await fetchHouseRollCalls(congress, session, remaining);
      } catch (e: any) {
        console.warn(`[votes] skipping ${congress}/${session}: ${e.message}`);
        continue;
      }
      console.log(`[votes] ${rollCalls.length} roll calls.`);

      for (const rc of rollCalls) {
        if (ingested >= MAX_ROLLCALLS) break outer;
        const rcId = `${rc.congress}-${rc.session}-${rc.rollCallNumber}`;

        // Resolve the bill (once per distinct bill).
        let billId: string | null = null;
        if (rc.legislationType && rc.legislationNumber) {
          billId = `${rc.congress}-${rc.legislationType.toUpperCase()}-${rc.legislationNumber}`;
          if (!seenBills.has(billId)) {
            seenBills.add(billId);
            const exists = sqlite.prepare(`SELECT 1 FROM bills WHERE id = ?`).get(billId);
            if (!exists) {
              const detail = await fetchBill(rc.congress, rc.legislationType, rc.legislationNumber);
              db.insert(bills)
                .values({
                  id: billId,
                  congress: rc.congress,
                  billType: rc.legislationType.toUpperCase(),
                  number: Number(rc.legislationNumber) || null,
                  title: detail?.title ?? `${rc.legislationType} ${rc.legislationNumber}`,
                  policyArea: detail?.policyArea ?? null,
                  url: rc.legislationUrl,
                })
                .onConflictDoUpdate({
                  target: bills.id,
                  set: { title: detail?.title ?? `${rc.legislationType} ${rc.legislationNumber}` },
                })
                .run();
            }
          }
        }

        // Member votes.
        let memberVotes: CgMemberVote[];
        try {
          memberVotes = await fetchMemberVotes(rc.congress, rc.session, rc.rollCallNumber);
        } catch (e: any) {
          console.warn(`[votes] roll call ${rcId} members failed: ${e.message}`);
          continue;
        }

        db.insert(rollcalls)
          .values({
            id: rcId,
            congress: rc.congress,
            session: rc.session,
            chamber: "house",
            number: rc.rollCallNumber,
            date: rc.startDate,
            result: rc.result,
            voteType: rc.voteType,
            legislationType: rc.legislationType,
            legislationNumber: rc.legislationNumber,
            billId,
            partyTotals: JSON.stringify(partyTotalsFrom(memberVotes)),
            url: rc.legislationUrl,
          })
          .onConflictDoUpdate({ target: rollcalls.id, set: { billId, result: rc.result } })
          .run();

        const tx = sqlite.transaction(() => {
          deleteVotes.run(rcId);
          for (const v of memberVotes) {
            if (v.bioguideId) insertVote.run(rcId, v.bioguideId, normCast(v.voteCast));
          }
        });
        tx();

        ingested++;
        if (ingested % 25 === 0) console.log(`[votes] processed ${ingested}/${MAX_ROLLCALLS} roll calls…`);
      }
    }
  }
  console.log(`\n[votes] Done. Ingested ${ingested} roll calls, ${seenBills.size} distinct bills.`);

  // Embed bills that don't yet have an embedding.
  const pending = sqlite
    .prepare(
      `SELECT b.id AS id, b.title AS title, b.policy_area AS policyArea
       FROM bills b
       LEFT JOIN embedding_sources s ON s.source_type = 'bill' AND s.source_id = b.id
       WHERE s.id IS NULL`,
    )
    .all() as Array<{ id: string; title: string; policyArea: string | null }>;
  const rows: EmbedRow[] = pending.map((b) => ({
    sourceId: b.id,
    text: [b.title, b.policyArea].filter(Boolean).join(" — "),
  }));
  try {
    await embedPending("bill", rows);
  } catch (e: any) {
    console.warn(`[embed] bill embedding interrupted (${e?.message}). Re-run \`npm run ingest\` to finish — it resumes.`);
  }
}
