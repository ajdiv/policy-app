import { GoogleGenAI, type Schema } from "@google/genai";
import { config, hasGemini } from "../config.js";

let client: GoogleGenAI | null = null;
function ai(): GoogleGenAI {
  if (!hasGemini()) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to server/.env to enable embeddings and AI answers.",
    );
  }
  if (!client) client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return client;
}

/** Embed a batch of strings. Returns one (unit-normalized) number[] per input, in order. */
export async function embed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const res = await ai().models.embedContent({
    model: config.embeddingModel,
    contents: texts,
    // gemini-embedding-001 defaults to 3072 dims; we request 768 to match the
    // vec table. Reduced-dimension outputs aren't pre-normalized, so we do it.
    config: { outputDimensionality: config.embeddingDim },
  });
  const embeddings = res.embeddings ?? [];
  return embeddings.map((e) => normalize(e.values ?? []));
}

/** Scale a vector to unit length (for cosine-equivalent L2 search). */
function normalize(v: number[]): number[] {
  let sum = 0;
  for (const x of v) sum += x * x;
  const norm = Math.sqrt(sum);
  return norm === 0 ? v : v.map((x) => x / norm);
}

/** Embed a single string. */
export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embed([text]);
  return v ?? [];
}

/** Generate a grounded answer from a fully-formed prompt. Retries transient errors. */
export async function generate(prompt: string): Promise<string> {
  const res = await withRetry(() =>
    ai().models.generateContent({ model: config.generationModel, contents: prompt }),
  );
  return res.text ?? "";
}

/** Generate a JSON object matching `schema`. Retries transient errors. */
export async function generateStructured<T>(prompt: string, schema: Schema): Promise<T> {
  const res = await withRetry(() =>
    ai().models.generateContent({
      model: config.generationModel,
      contents: prompt,
      config: { responseMimeType: "application/json", responseSchema: schema },
    }),
  );
  return JSON.parse(res.text ?? "{}") as T;
}

/** Retry on transient 503 (overloaded) / 429 (rate limit) with backoff. */
async function withRetry<T>(fn: () => Promise<T>, attempt = 0): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    const status = e?.status;
    if ((status === 503 || status === 429) && attempt < 4) {
      const match = /"retryDelay":"(\d+)s"/.exec(String(e?.message ?? ""));
      const waitMs = match ? Number(match[1]) * 1000 + 500 : Math.min(2000 * 2 ** attempt, 16000);
      await new Promise((r) => setTimeout(r, waitMs));
      return withRetry(fn, attempt + 1);
    }
    throw e;
  }
}

/** Convert an embedding to the Float32 BLOB sqlite-vec expects. */
export function toVecBlob(vector: number[]): Buffer {
  return Buffer.from(new Float32Array(vector).buffer);
}
