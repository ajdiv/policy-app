import { hasCongressGov } from "../config.js";
import { db, initDb, sqlite } from "../db/client.js";
import { members, executiveOrders } from "../db/schema.js";
import { fetchExecutiveOrders } from "../sources/federalRegister.js";
import { fetchCurrentMembers } from "../sources/congressGov.js";
import { embedPending, type EmbedRow } from "./embedUtil.js";
import { ingestHouseVotes } from "./votes.js";

/** Presidents to ingest (Federal Register slugs). Override with INGEST_PRESIDENTS. */
const PRESIDENT_SLUGS = (process.env.INGEST_PRESIDENTS ?? "donald-trump")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_EOS = Number(process.env.INGEST_MAX_EOS ?? 300);

async function ingestExecutiveOrders() {
  for (const slug of PRESIDENT_SLUGS) {
    console.log(`\n[EO] Fetching executive orders for "${slug}"...`);
    const eos = await fetchExecutiveOrders(slug, MAX_EOS);
    console.log(`[EO] Got ${eos.length} executive orders.`);
    if (eos.length === 0) continue;

    const presidentName = eos.find((e) => e.presidentName)?.presidentName ?? slug;
    const presidentId = `potus-${slug}`;

    // Upsert the president as a "member" so they're searchable.
    db.insert(members)
      .values({
        id: presidentId,
        fullName: presidentName,
        chamber: "executive",
        role: "president",
        party: null,
        state: "United States",
        currentMember: false,
      })
      .onConflictDoUpdate({ target: members.id, set: { fullName: presidentName } })
      .run();

    for (const eo of eos) {
      db.insert(executiveOrders)
        .values({
          id: eo.documentNumber,
          eoNumber: eo.eoNumber,
          presidentId,
          presidentName,
          title: eo.title,
          signingDate: eo.signingDate,
          abstract: eo.abstract,
          htmlUrl: eo.htmlUrl,
          pdfUrl: eo.pdfUrl,
          topics: JSON.stringify(eo.topics),
        })
        .onConflictDoUpdate({
          target: executiveOrders.id,
          set: { title: eo.title, abstract: eo.abstract, presidentId },
        })
        .run();
    }
    console.log(`[EO] Stored ${eos.length} orders for ${presidentName}.`);
  }
}

async function ingestMembers() {
  if (!hasCongressGov()) {
    console.warn("[members] CONGRESS_GOV_API_KEY not set — skipping Congress member ingestion.");
    return;
  }
  console.log("\n[members] Fetching current members of Congress...");
  const list = await fetchCurrentMembers(600);
  console.log(`[members] Got ${list.length} members.`);
  for (const m of list) {
    if (!m.bioguideId || !m.chamber) continue;
    db.insert(members)
      .values({
        id: m.bioguideId,
        fullName: m.fullName,
        firstName: m.firstName,
        lastName: m.lastName,
        party: m.party,
        state: m.state,
        chamber: m.chamber,
        role: m.role ?? "representative",
        imageUrl: m.imageUrl,
        startYear: m.startYear,
        currentMember: true,
      })
      .onConflictDoUpdate({
        target: members.id,
        set: { party: m.party, state: m.state, chamber: m.chamber, currentMember: true },
      })
      .run();
  }
  console.log(`[members] Stored ${list.length} members.`);
}

/** Embed every executive order that doesn't yet have an embedding. */
async function embedExecutiveOrders() {
  const pending = sqlite
    .prepare(
      `SELECT eo.id AS id, eo.title AS title, eo.abstract AS abstract, eo.topics AS topics
       FROM executive_orders eo
       LEFT JOIN embedding_sources s ON s.source_type = 'executive_order' AND s.source_id = eo.id
       WHERE s.id IS NULL`,
    )
    .all() as Array<{ id: string; title: string; abstract: string | null; topics: string | null }>;
  const rows: EmbedRow[] = pending.map((r) => {
    const topics = r.topics ? (JSON.parse(r.topics) as string[]).join(", ") : "";
    return { sourceId: r.id, text: [r.title, r.abstract ?? "", topics].filter(Boolean).join("\n") };
  });
  await embedPending("executive_order", rows);
}

async function main() {
  initDb();
  console.log("=== policy-app ingestion ===");

  await ingestExecutiveOrders();
  await ingestMembers();
  await ingestHouseVotes();
  await embedExecutiveOrders();

  const c = (q: string) => (sqlite.prepare(q).get() as any).c;
  console.log("\n=== done ===", {
    members: c("SELECT COUNT(*) AS c FROM members"),
    executiveOrders: c("SELECT COUNT(*) AS c FROM executive_orders"),
    bills: c("SELECT COUNT(*) AS c FROM bills"),
    rollcalls: c("SELECT COUNT(*) AS c FROM rollcalls"),
    votes: c("SELECT COUNT(*) AS c FROM votes"),
    embeddings: c("SELECT COUNT(*) AS c FROM embedding_sources"),
  });
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
