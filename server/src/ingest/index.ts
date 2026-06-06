import { eq } from "drizzle-orm";
import { config, hasGemini, hasCongressGov } from "../config.js";
import { db, initDb, sqlite } from "../db/client.js";
import { members, executiveOrders } from "../db/schema.js";
import { fetchExecutiveOrders } from "../sources/federalRegister.js";
import { fetchCurrentMembers } from "../sources/congressGov.js";
import { embed } from "../rag/gemini.js";
import { upsertEmbedding } from "../rag/embeddingStore.js";

/** Presidents to ingest (Federal Register slugs). Override with INGEST_PRESIDENTS. */
const PRESIDENT_SLUGS = (process.env.INGEST_PRESIDENTS ?? "donald-trump")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_EOS = Number(process.env.INGEST_MAX_EOS ?? 300);
const EMBED_BATCH = 50;
// Delay between embedding batches. Free tier = 100 requests/min (per item),
// so 50 items / 60s stays comfortably under. Lower it (e.g. 0) on a paid tier.
const EMBED_DELAY_MS = Number(process.env.EMBED_DELAY_MS ?? 60000);

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
async function embedRecords() {
  if (!hasGemini()) {
    console.warn(
      "\n[embed] GEMINI_API_KEY not set — skipping embeddings. Data is loaded, but semantic search/AI answers won't work until you set the key and re-run `npm run ingest`.",
    );
    return;
  }
  const pending = sqlite
    .prepare(
      `SELECT eo.id, eo.eo_number AS eoNumber, eo.title, eo.abstract, eo.topics
       FROM executive_orders eo
       LEFT JOIN embedding_sources s
         ON s.source_type = 'executive_order' AND s.source_id = eo.id
       WHERE s.id IS NULL`,
    )
    .all() as Array<{ id: string; eoNumber: number | null; title: string; abstract: string | null; topics: string | null }>;

  console.log(`\n[embed] ${pending.length} executive orders need embeddings.`);
  for (let i = 0; i < pending.length; i += EMBED_BATCH) {
    const batch = pending.slice(i, i + EMBED_BATCH);
    const texts = batch.map((r) => {
      const topics = r.topics ? (JSON.parse(r.topics) as string[]).join(", ") : "";
      return [r.title, r.abstract ?? "", topics].filter(Boolean).join("\n");
    });
    const vectors = await embedBatchWithRetry(texts);
    batch.forEach((r, j) => {
      const v = vectors[j];
      if (v && v.length) upsertEmbedding("executive_order", r.id, texts[j], v);
    });
    console.log(`[embed] Embedded ${Math.min(i + EMBED_BATCH, pending.length)}/${pending.length}`);
    // Pace to stay under the free-tier limit (100 embed requests/min, counted per item).
    if (i + EMBED_BATCH < pending.length) await sleep(EMBED_DELAY_MS);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Embed a batch, retrying on 429 using the delay the API suggests. */
async function embedBatchWithRetry(texts: string[], attempt = 0): Promise<number[][]> {
  try {
    return await embed(texts);
  } catch (e: any) {
    if (e?.status === 429 && attempt < 6) {
      const match = /"retryDelay":"(\d+)s"/.exec(String(e?.message ?? ""));
      const waitMs = (match ? Number(match[1]) : 60) * 1000 + 1500;
      console.warn(
        `[embed] rate limited (free tier). Waiting ${Math.round(waitMs / 1000)}s then retrying…`,
      );
      await sleep(waitMs);
      return embedBatchWithRetry(texts, attempt + 1);
    }
    throw e;
  }
}

async function main() {
  initDb();
  console.log("=== policy-app ingestion ===");
  console.log(`Presidents: ${PRESIDENT_SLUGS.join(", ")} | max EOs each: ${MAX_EOS}`);

  await ingestExecutiveOrders();
  await ingestMembers();
  await embedRecords();

  const counts = {
    members: (sqlite.prepare("SELECT COUNT(*) AS c FROM members").get() as any).c,
    executiveOrders: (sqlite.prepare("SELECT COUNT(*) AS c FROM executive_orders").get() as any).c,
    embeddings: (sqlite.prepare("SELECT COUNT(*) AS c FROM embedding_sources").get() as any).c,
  };
  console.log("\n=== done ===", counts);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
