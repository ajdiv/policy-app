import { eq } from "drizzle-orm";
import { db, initDb, sqlite } from "../db/client.js";
import { bills } from "../db/schema.js";
import { fetchBill } from "../sources/congressGov.js";
import { embedPending, type EmbedRow } from "./embedUtil.js";

/**
 * Repairs bills whose detail fetch failed on an earlier run (placeholder title
 * like "HR 1" and/or a null policy area). Re-fetches real title + policy area,
 * drops the now-stale embedding, then re-embeds. Targeted + fast (bills only).
 */
async function main() {
  initDb();
  const rows = sqlite
    .prepare(
      `SELECT id, congress, bill_type AS billType, number, title, policy_area AS policyArea FROM bills`,
    )
    .all() as Array<{
    id: string;
    congress: number;
    billType: string;
    number: number | null;
    title: string;
    policyArea: string | null;
  }>;

  let fixed = 0;
  for (const b of rows) {
    const placeholder = b.title === `${b.billType} ${b.number}`;
    if (!placeholder && b.policyArea) continue; // already good
    if (!b.billType || b.number == null) continue;

    const detail = await fetchBill(b.congress, b.billType, String(b.number));
    if (!detail?.title) continue;

    db.update(bills)
      .set({ title: detail.title, policyArea: detail.policyArea })
      .where(eq(bills.id, b.id))
      .run();

    // Drop the stale embedding so it gets recomputed from the real title.
    const src = sqlite
      .prepare(`SELECT id FROM embedding_sources WHERE source_type = 'bill' AND source_id = ?`)
      .get(b.id) as { id: number } | undefined;
    if (src) {
      sqlite.prepare(`DELETE FROM vec_items WHERE rowid = ?`).run(BigInt(src.id));
      sqlite.prepare(`DELETE FROM embedding_sources WHERE id = ?`).run(src.id);
    }
    fixed++;
    if (fixed % 25 === 0) console.log(`[repair] fixed ${fixed}…`);
  }
  console.log(`[repair] Repaired ${fixed} bills.`);

  // Re-embed any bills now missing an embedding.
  const pending = sqlite
    .prepare(
      `SELECT b.id AS id, b.title AS title, b.policy_area AS policyArea
       FROM bills b
       LEFT JOIN embedding_sources s ON s.source_type = 'bill' AND s.source_id = b.id
       WHERE s.id IS NULL`,
    )
    .all() as Array<{ id: string; title: string; policyArea: string | null }>;
  const er: EmbedRow[] = pending.map((b) => ({
    sourceId: b.id,
    text: [b.title, b.policyArea].filter(Boolean).join(" — "),
  }));
  await embedPending("bill", er);
  console.log("[repair] done.");
}

main().catch((err) => {
  console.error("Repair failed:", err);
  process.exit(1);
});
