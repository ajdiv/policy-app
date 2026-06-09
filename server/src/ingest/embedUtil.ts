import { hasGemini } from "../config.js";
import { embed } from "../rag/gemini.js";
import { upsertEmbedding } from "../rag/embeddingStore.js";

const EMBED_BATCH = 50;
// Free tier = 100 embed requests/min (per item); 50 items / 60s stays under.
const EMBED_DELAY_MS = Number(process.env.EMBED_DELAY_MS ?? 60000);

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Don't sleep longer than this on a single retry — a *daily* quota error can
// report a multi-hour retryDelay, which would hang an unattended run. If the
// suggested wait exceeds the cap, give up (caller stops gracefully + resumes later).
const MAX_RETRY_WAIT_MS = 90_000;

/** Embed a batch, retrying on transient errors using the delay the API suggests. */
async function embedBatchWithRetry(texts: string[], attempt = 0): Promise<number[][]> {
  try {
    return await embed(texts);
  } catch (e: any) {
    if (attempt < 6 && (e?.status === 429 || e?.status === 503 || e?.status === undefined)) {
      // 429 = rate limit (use API delay); otherwise transient network/overload backoff.
      const match = /"retryDelay":"(\d+)s"/.exec(String(e?.message ?? ""));
      const waitMs = e?.status === 429 ? (match ? Number(match[1]) : 60) * 1000 + 1500 : 2000 * 2 ** attempt;
      if (waitMs > MAX_RETRY_WAIT_MS) {
        throw new Error(`embedding rate limit needs ${Math.round(waitMs / 1000)}s wait (> cap) — likely a daily quota; stopping.`);
      }
      console.warn(`[embed] transient error (${e?.status ?? "network"}). Waiting ${Math.round(waitMs / 1000)}s…`);
      await sleep(waitMs);
      return embedBatchWithRetry(texts, attempt + 1);
    }
    throw e;
  }
}

export interface EmbedRow {
  sourceId: string;
  text: string;
}

/** Embed and store vectors for the given rows of a source type, paced for free tier. */
export async function embedPending(sourceType: string, rows: EmbedRow[]): Promise<void> {
  if (!hasGemini()) {
    console.warn(
      `\n[embed] GEMINI_API_KEY not set — skipping ${sourceType} embeddings. Set the key and re-run \`npm run ingest\`.`,
    );
    return;
  }
  if (rows.length === 0) {
    console.log(`[embed] no ${sourceType} records need embeddings.`);
    return;
  }
  console.log(`\n[embed] ${rows.length} ${sourceType} records need embeddings.`);
  for (let i = 0; i < rows.length; i += EMBED_BATCH) {
    const batch = rows.slice(i, i + EMBED_BATCH);
    const vectors = await embedBatchWithRetry(batch.map((r) => r.text));
    batch.forEach((r, j) => {
      const v = vectors[j];
      if (v && v.length) upsertEmbedding(sourceType, r.sourceId, r.text, v);
    });
    console.log(`[embed] ${sourceType}: ${Math.min(i + EMBED_BATCH, rows.length)}/${rows.length}`);
    if (i + EMBED_BATCH < rows.length) await sleep(EMBED_DELAY_MS);
  }
}
