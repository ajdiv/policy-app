import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";
import { config } from "../config.js";
import * as schema from "./schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "..", "data");
mkdirSync(dataDir, { recursive: true });

export const sqlite = new Database(join(dataDir, "policy.db"));
sqlite.pragma("journal_mode = WAL");

// Load the sqlite-vec extension so we get the vec0 virtual table for ANN search.
sqliteVec.load(sqlite);

export const db = drizzle(sqlite, { schema });

/**
 * Create all tables if they don't exist. We use raw DDL on boot (kept in sync
 * with schema.ts) so there's no separate migration step for the MVP, plus the
 * sqlite-vec virtual table which Drizzle can't express.
 */
export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      icpsr INTEGER,
      first_name TEXT,
      last_name TEXT,
      full_name TEXT NOT NULL,
      party TEXT,
      state TEXT,
      chamber TEXT NOT NULL,
      role TEXT NOT NULL,
      image_url TEXT,
      start_year INTEGER,
      current_member INTEGER
    );

    CREATE TABLE IF NOT EXISTS bills (
      id TEXT PRIMARY KEY,
      congress INTEGER,
      bill_type TEXT,
      number INTEGER,
      title TEXT NOT NULL,
      summary TEXT,
      status TEXT,
      sponsor_id TEXT,
      subjects TEXT,
      introduced_date TEXT
    );

    CREATE TABLE IF NOT EXISTS rollcalls (
      id TEXT PRIMARY KEY,
      congress INTEGER,
      chamber TEXT,
      number INTEGER,
      date TEXT,
      question TEXT,
      result TEXT,
      bill_id TEXT
    );

    CREATE TABLE IF NOT EXISTS votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rollcall_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      cast TEXT
    );

    CREATE TABLE IF NOT EXISTS executive_orders (
      id TEXT PRIMARY KEY,
      eo_number INTEGER,
      president_id TEXT,
      president_name TEXT,
      title TEXT NOT NULL,
      signing_date TEXT,
      abstract TEXT,
      html_url TEXT,
      pdf_url TEXT,
      topics TEXT
    );

    -- Source rows behind each embedding vector (one row per embedded record).
    CREATE TABLE IF NOT EXISTS embedding_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_type TEXT NOT NULL,   -- 'executive_order' | 'bill'
      source_id TEXT NOT NULL,
      content TEXT,
      UNIQUE (source_type, source_id)
    );

    CREATE INDEX IF NOT EXISTS idx_members_chamber ON members(chamber);
    CREATE INDEX IF NOT EXISTS idx_eo_president ON executive_orders(president_id);
    CREATE INDEX IF NOT EXISTS idx_votes_member ON votes(member_id);
  `);

  // sqlite-vec virtual table. Its implicit `rowid` is set equal to
  // embedding_sources.id at insert time (bound as BigInt — vec0 requires an
  // integer-typed primary key, which better-sqlite3 only guarantees for BigInt).
  sqlite.exec(
    `CREATE VIRTUAL TABLE IF NOT EXISTS vec_items USING vec0(
       embedding float[${config.embeddingDim}]
     );`,
  );
}
