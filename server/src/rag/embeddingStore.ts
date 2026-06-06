import { sqlite } from "../db/client.js";
import { toVecBlob } from "./gemini.js";

/**
 * Store/replace the embedding for one source record. The vec_items rowid is
 * kept equal to embedding_sources.id so we can join the two.
 */
export function upsertEmbedding(
  sourceType: string,
  sourceId: string,
  content: string,
  vector: number[],
): void {
  const tx = sqlite.transaction(() => {
    sqlite
      .prepare(
        `INSERT INTO embedding_sources (source_type, source_id, content)
         VALUES (?, ?, ?)
         ON CONFLICT(source_type, source_id) DO UPDATE SET content = excluded.content`,
      )
      .run(sourceType, sourceId, content);
    const row = sqlite
      .prepare(`SELECT id FROM embedding_sources WHERE source_type = ? AND source_id = ?`)
      .get(sourceType, sourceId) as { id: number };
    // Replace any existing vector for this rowid, then insert the new one.
    sqlite.prepare(`DELETE FROM vec_items WHERE rowid = ?`).run(BigInt(row.id));
    sqlite
      .prepare(`INSERT INTO vec_items (rowid, embedding) VALUES (?, ?)`)
      .run(BigInt(row.id), toVecBlob(vector));
  });
  tx();
}

/** True if a given source record already has an embedding stored. */
export function hasEmbedding(sourceType: string, sourceId: string): boolean {
  const row = sqlite
    .prepare(`SELECT 1 FROM embedding_sources WHERE source_type = ? AND source_id = ?`)
    .get(sourceType, sourceId);
  return !!row;
}

export interface RetrievedRecord {
  sourceType: string;
  sourceId: string;
  content: string;
  distance: number;
}

/**
 * Nearest-neighbor search over all embeddings, optionally narrowed to a
 * source type and/or a candidate set of source ids (e.g. one president's EOs).
 * We over-fetch `k` globally then post-filter — fine for the MVP corpus.
 */
export function search(
  queryVector: number[],
  opts: { k?: number; sourceType?: string; sourceIds?: string[]; limit?: number } = {},
): RetrievedRecord[] {
  const k = opts.k ?? 100;
  const limit = opts.limit ?? 8;
  const rows = sqlite
    .prepare(
      `SELECT s.source_type AS sourceType, s.source_id AS sourceId, s.content AS content, v.distance AS distance
       FROM vec_items v
       JOIN embedding_sources s ON s.id = v.rowid
       WHERE v.embedding MATCH ? AND k = ?
       ORDER BY v.distance`,
    )
    .all(toVecBlob(queryVector), k) as RetrievedRecord[];

  const idSet = opts.sourceIds ? new Set(opts.sourceIds) : null;
  return rows
    .filter((r) => (opts.sourceType ? r.sourceType === opts.sourceType : true))
    .filter((r) => (idSet ? idSet.has(r.sourceId) : true))
    .slice(0, limit);
}
