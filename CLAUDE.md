# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A cross-platform app (Expo web + iOS/Android) that answers plain-English questions about U.S.
politicians' **actual records** — votes, sponsored bills, executive orders — grounded entirely in
real government data via RAG. The AI never speaks from memory; every claim cites a specific record.
See [README.md](README.md) for product detail (note: the README's repo-layout and data-model
sections are partly aspirational — trust the code below over them).

## Two halves, one repo

This is **two separate apps** that must both run during development:

- **Client** (repo root) — Expo SDK 54 + expo-router + react-native-web. Talks **only** to its own
  backend through [lib/api.ts](lib/api.ts); it never calls Gemini/Congress.gov directly.
- **Backend** (`server/`) — Express 5 + SQLite. Holds **all** API keys and serves JSON. This split
  exists so keys never ship in a client bundle.

The client finds the backend via `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:3000`).

## Git workflow

**Never commit or push directly to `main`.** Always create a feature branch
(`git checkout -b <name>`), commit there, and open a PR. (A local PreToolUse hook
enforces this by blocking `git commit`/`git push` while on `main`.)

## Commands

**Client** (run from repo root):
```bash
npm start              # Expo dev server (Metro) on :8081; press w for web
npm run web            # start straight into web
npm run lint           # expo lint (eslint)
npx tsc --noEmit       # typecheck the client
npx expo export --platform web   # static web build -> dist/
```

**Backend** (run from `server/`):
```bash
npm run dev            # tsx watch — API on :3000, reloads on change
npm start              # tsx, no watch (this is what Render runs)
npm run ingest         # populate server/data/policy.db from gov sources
npm run repair:bills   # backfill/repair bill rows
npm run typecheck      # tsc --noEmit
```

There is **no test suite** in this repo. Verify changes with `tsc --noEmit` (both halves),
`npm run lint`, and a web export for the client.

## Backend conventions that will bite you

- **ESM + `.js` import specifiers.** `server/package.json` is `"type": "module"`. TS source imports
  sibling modules with a `.js` extension even though the files are `.ts` (e.g.
  `import { config } from "../config.js"`). Match this or imports break at runtime.
- **No build step.** The server runs `.ts` directly via `tsx` (dev and prod). Don't add a `dist/`
  compile step; `npm start` is `tsx src/index.ts`.
- **The DB schema is hand-written DDL, not migrations.** Tables are created in `initDb()` in
  [server/src/db/client.ts](server/src/db/client.ts) with raw `CREATE TABLE IF NOT EXISTS`, plus an
  idempotent `ensureColumns()` for additive changes. [server/src/db/schema.ts](server/src/db/schema.ts)
  is the Drizzle schema used for **queries**. Changing a table means editing **both** — there is no
  migration tool. The `vec_items` virtual table (sqlite-vec) can't be expressed in Drizzle and is
  created via raw SQL.
- **Config is centralized** in [server/src/config.ts](server/src/config.ts) (`config.*`, plus
  `hasGemini()/hasCongressGov()/hasGoogleAuth()` feature gates). Read env through it, not
  `process.env` directly.
- **Native deps**: `better-sqlite3` + `sqlite-vec` are loaded in `db/client.ts`; the DB lives at
  `server/data/policy.db` and is **read-only at runtime** (populated by ingest, not by requests).

## The RAG ask flow

`POST /api/ask {memberId, question, history?}` → [routes/ask.ts](server/src/routes/ask.ts) →
`answerQuestion()` in [rag/ask.ts](server/src/rag/ask.ts):
1. Resolve the member and their **role**, which determines the record source —
   **legislators** answer from roll-call votes/bills; the **president** answers from executive orders.
2. Embed the question (`rag/gemini.ts`) and nearest-neighbor search the `vec_items` index
   (`rag/embeddingStore.ts`) to pull the relevant records.
3. Build a prompt containing **only** those records + strict "cite or say you don't know"
   instructions; Gemini returns prose + structured `citations` and (for legislators) a `Stance`.

Gemini calls are gated on `GEMINI_API_KEY`; without it `/api/ask` returns 503. Models default to
`gemini-2.5-flash` (generation) and `gemini-embedding-001` / 768-dim (embeddings).

Member name resolution expands nicknames/initialisms/state abbreviations via
[server/src/search/aliases.ts](server/src/search/aliases.ts) ("Bernie"→Bernard, "AOC", "NY"→New York).

## Client conventions

- **Routing**: file-based via expo-router. Real routes: `app/index.tsx` (home/search),
  `app/bills/index.tsx`, `app/bills/[id].tsx`, `app/members/[id].tsx`. Stack + global gradient +
  `AuthProvider` wrap in [app/_layout.tsx](app/_layout.tsx). There is **no** separate "ask" route —
  the AI Q&A is the [components/ChatBubble.tsx](components/ChatBubble.tsx) on the member profile.
- **Responsive breakpoints**: use `useWideLayout(px)` from [lib/useWideLayout.ts](lib/useWideLayout.ts),
  **not** raw `useWindowDimensions()`. The static web export pre-renders at a narrow viewport and
  hydration locks the markup, so deriving layout straight from `useWindowDimensions` leaves pages
  stuck in the mobile layout until a client navigation remounts them. The hook matches the static
  HTML on first paint, then forces one post-mount re-render with the real width.
- **Styling**: React Native `StyleSheet.create` at the bottom of each file; colors come from
  [lib/theme.ts](lib/theme.ts) (`colors`, `castColors`, `tempColors`, …) — don't hardcode hex.
- **Auth is optional and feature-gated.** Sign-in is hidden until `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
  is set. `Google.useAuthRequest` throws on web if `webClientId` is undefined, so it lives in a
  `GoogleAuthBridge` child mounted **only** when configured ([lib/auth.tsx](lib/auth.tsx)) — never
  call it unconditionally.

## Environment variables

Split across two files (both gitignored; see the `.env.example` pair):

- **Root `.env`** (client, `EXPO_PUBLIC_*` — baked into the bundle at build time):
  `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- **`server/.env`** (secrets): `CONGRESS_GOV_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`,
  `JWT_SECRET`, `PORT`, model overrides, and `INGEST_*` knobs.

`GOOGLE_CLIENT_ID` (server) and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (client) must be the **same** value.
Because `EXPO_PUBLIC_*` vars are compiled in, the web app must be **rebuilt** after changing one.

## Ingestion

`npm run ingest` (in `server/`) pulls from Congress.gov (members, bills, recent House roll calls) and
the Federal Register (executive orders, no key), normalizes into SQLite, and computes a Gemini
embedding per bill/EO. It is **throttled, 429-retrying, and resumable** — re-running only embeds
records lacking a vector, so adding `GEMINI_API_KEY` later and re-running backfills embeddings.
Coverage knobs (`INGEST_CONGRESSES`, `INGEST_MAX_ROLLCALLS`, …) live in `server/.env`.

## Deployment

Free-tier Render via [render.yaml](render.yaml) (blueprint: a Node web service for `server/` + a
static site for the web export) — full walkthrough in [DEPLOY.md](DEPLOY.md). The ~60 MB
`policy.db` is not committed; the backend build runs
[server/scripts/fetch-db.mjs](server/scripts/fetch-db.mjs) to download it from a GitHub Release asset
(`DB_DOWNLOAD_URL`). `EXPO_PUBLIC_*` values are baked in at build time, so changing them requires a
manual redeploy of the web service.
