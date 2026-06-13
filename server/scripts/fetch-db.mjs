// Downloads the prebuilt SQLite dataset into server/data/policy.db at build time.
//
// Set DB_DOWNLOAD_URL (e.g. a GitHub Release asset URL) in the host's env.
// If the var is missing the build still succeeds and the server boots with an
// empty (freshly-created) database — handy for a first deploy before the data
// is published. If the file already exists, we leave it alone.
import { mkdir, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
const dbPath = join(dataDir, "policy.db");

const url = process.env.DB_DOWNLOAD_URL;
if (!url) {
  console.log("[fetch-db] DB_DOWNLOAD_URL not set — skipping. Server will create an empty DB.");
  process.exit(0);
}

try {
  const existing = await stat(dbPath);
  if (existing.size > 0) {
    console.log(`[fetch-db] ${dbPath} already present (${existing.size} bytes) — skipping download.`);
    process.exit(0);
  }
} catch {
  // not present — proceed to download
}

await mkdir(dataDir, { recursive: true });
console.log(`[fetch-db] Downloading dataset from ${url} ...`);

const res = await fetch(url, { redirect: "follow" });
if (!res.ok || !res.body) {
  console.error(`[fetch-db] Download failed: HTTP ${res.status}`);
  process.exit(1);
}

await pipeline(Readable.fromWeb(res.body), createWriteStream(dbPath));
const written = await stat(dbPath);
console.log(`[fetch-db] Wrote ${dbPath} (${written.size} bytes).`);
