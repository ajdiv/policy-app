# policy-app

An app for understanding what U.S. politicians **actually did** — not what they say, but
the bills they sponsored, the votes they cast, and the executive orders they signed. Ask a
plain-English question like *"What are Trump's views on guns?"* and get an answer grounded
**entirely in real government records**, with every claim citing a specific bill or executive
order you can click through to verify.

> **Core principle:** the AI never speaks from memory. Every answer is generated from real data
> fetched from official U.S. government sources at query time (a technique called **RAG** —
> Retrieval-Augmented Generation). If there's no record to back a claim, the app says so rather
> than guessing.

---

## Table of contents

- [What it does](#what-it-does)
- [Scope: MVP vs. later](#scope-mvp-vs-later)
- [How the AI works (RAG, not training)](#how-the-ai-works-rag-not-training)
- [Legislators vs. executives](#legislators-vs-executives)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Data sources](#data-sources)
- [Getting your API keys (step by step)](#getting-your-api-keys-step-by-step)
- [Local setup & running](#local-setup--running)
- [Running on a phone](#running-on-a-phone)
- [Repository layout](#repository-layout)
- [Data model](#data-model)
- [Partisan "temperature"](#partisan-temperature)
- [Build roadmap](#build-roadmap)
- [Legal & attribution](#legal--attribution)

---

## What it does

1. **Search politicians** by name, position/role, and/or state they represent.
2. **Browse Congress** organized by chamber — **Senate** and **House of Representatives**.
3. **Politician profiles** showing their real record: sponsored bills, roll-call votes (for, against,
   abstained), and — for executives — executive orders.
4. **Ask the AI** a natural-language question about any politician's position on a topic. The answer
   is assembled from that politician's actual legislative/executive record, with inline citations.
5. **Search bills** (proposed, failed, and signed into law) and see **which politicians voted for or
   against** each one.
6. **Partisan temperature** — a read on how partisan or bipartisan a given bill's vote was.

---

## Scope: MVP vs. later

| Phase | Coverage |
|-------|----------|
| **MVP** | Federal level — U.S. Congress (Senate + House) and the President. Full historical vote record. |
| **MVP+** | Local elections / state & municipal officials. (Deferred — data is far more fragmented; see [roadmap](#build-roadmap).) |

**Decisions locked for the MVP** (from project kickoff):

- **AI provider:** Google **Gemini** (via RAG)
- **Executives:** included via **executive orders** + bills signed/vetoed (this is what powers the Trump example)
- **Vote coverage:** **full historical record** (Voteview bulk data + Congress.gov API)
- **Platforms:** **cross-platform** — runs on phone (iOS/Android via Expo Go) **and** localhost (web)
- **Backend:** a **separate Node server** that holds all API keys and serves data to the app
- **Database:** **SQLite** (single local file)
- **Search:** **semantic (embedding) search from the first pass** — via the `sqlite-vec` extension + Gemini embeddings (no separate vector DB, no extra key)
- **Build order:** a **thin vertical slice first** (one end-to-end path), then expand

---

## How the AI works (RAG, not training)

The app does **not** fine-tune or "train" a model on government data. Instead, for every question:

```
User question ──▶ 1. Resolve the politician and their role
                  2. Retrieve their relevant real records from the DB
                     (votes, sponsored bills, and/or executive orders on the topic)
                  3. Build a prompt containing ONLY those records + strict instructions
                  4. Gemini writes the answer, citing each record explicitly
                  5. App returns prose + a structured list of citations the UI links
```

The model is instructed: *"Answer only from the records provided. Cite the specific bill number
or executive order for every claim. If the records don't address the question, say so."* This keeps
answers truthful, current, and verifiable — and it's why we never need to retrain anything.

**Topic matching uses semantic (embedding) search from the first pass.** During ingestion, each bill
and executive order's text (title + summary/abstract + subjects/topics) is converted to an
**embedding vector** using Gemini's embedding model and stored in a vector index. At query time the
question is embedded too, and we retrieve the records whose meaning is closest — so *"views on guns"*
surfaces a firearms-background-check bill even though it never uses the word "guns." The government's
own **subject tags** (Congress.gov bill subjects, Federal Register topics) and keyword search are kept
as complementary filters to sharpen results.

---

## Legislators vs. executives

A politician's "actions" come from **different sources depending on their role** — this is central to
the design:

| Role | Where their record comes from |
|------|-------------------------------|
| Senator / Representative | Roll-call **votes** + **bills sponsored/cosponsored** |
| **President** | **Executive orders** (Federal Register) + bills **signed or vetoed** |

> The President was never in Congress and casts no votes — so *"What are Trump's views on guns?"* is
> answered from **executive orders**, not roll-call votes. The app detects the role and retrieves
> from the right source automatically.

---

## Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────────────┐
│   Expo app (client)         │  HTTPS  │   Node server (backend)               │
│   iOS · Android · Web       │ ──────▶ │   - holds ALL API keys (never the app)│
│   - search & browse UI      │         │   - /api/members, /api/bills          │
│   - politician profiles     │ ◀────── │   - /api/ask  → RAG → Gemini          │
│   - "Ask the AI" screen     │  JSON   │   - serves data from SQLite           │
└─────────────────────────────┘         └───────────────┬──────────────────────┘
                                                         │
                              ┌──────────────────────────┼───────────────────────┐
                              ▼                          ▼                        ▼
                       Congress.gov API          Federal Register API      Voteview bulk data
                       (members, bills,           (executive orders,        (full historical
                        recent House votes)        no key needed)            roll-call votes)
                                                                                   │
                                                         ┌─────────────────────────┘
                                                         ▼
                                              Ingestion scripts populate SQLite
                                              (run once / on a schedule)
```

**Why a separate backend?** API keys (Gemini, Congress.gov) must **never** ship inside a mobile or
web client — anyone could extract them. The Node server is the only thing that knows the keys; the
app only ever talks to our own server.

---

## Tech stack

- **Client:** Expo (SDK 54) + Expo Router (file-based routing), React Native — runs on iOS, Android, and web from one codebase.
- **Backend:** Node + TypeScript, Express (or Fastify) — REST API.
- **Database:** SQLite via Drizzle ORM (`better-sqlite3`). One file, zero setup, easy to migrate to Postgres later.
- **Vector search:** the [`sqlite-vec`](https://github.com/asg017/sqlite-vec) extension stores and queries embeddings **inside the same SQLite file** — no separate vector database to run.
- **AI:** Google Gemini via `@google/genai` SDK — `gemini-2.5-flash` for **answer generation** and `gemini-embedding-001` (768-dim) for **embeddings**, both reusing one `GEMINI_API_KEY`. (Model names are configurable in `.env`; these two are confirmed available on the free tier — `gemini-2.0-flash` is not.)
- **Data ingestion:** TypeScript scripts that pull from the sources below, normalize into SQLite, and compute embeddings for each bill/executive order.

---

## Data sources

| Source | Used for | API key? |
|--------|----------|----------|
| **[Congress.gov API](https://api.congress.gov/)** | Current member metadata, bills (text, status, sponsors, subjects), recent House roll-call votes (2023→) | **Yes** (free) |
| **[Voteview](https://voteview.com/data)** | **Full historical** roll-call votes for **both chambers** (1789→), member IDs, ideology scores | No (bulk download) |
| **[Federal Register API](https://www.federalregister.gov/developers/documentation/api/v1)** | **Executive orders** (the President's record) | **No** (open) |

Notes:
- ProPublica's Congress API (the old standard for votes-by-member) was **discontinued** — no new keys. We use Voteview + Congress.gov instead.
- The Congress.gov API only has member-level votes for the **House, from 2023 on**. Voteview fills in the **Senate** and **all history**.
- Voteview keys members by `ICPSR` id; Congress.gov uses `bioguide` id. The ingestion layer maintains a crosswalk between them.

---

## Getting your API keys (step by step)

You need **two** keys. The third source (Federal Register) needs none.

### 1. Congress.gov API key  *(free, instant)*

1. Go to **https://api.congress.gov/sign-up/**.
2. Enter your **name** and **email** in the sign-up form and submit.
3. Check your email — the API key is delivered **immediately** by message from api.data.gov.
   (Congress.gov uses the shared api.data.gov key system.)
4. Copy the key. Rate limit is **5,000 requests/hour**, which is plenty for this app.
5. Paste it into `server/.env` as `CONGRESS_GOV_API_KEY` (see [setup](#local-setup--running)).

### 2. Google Gemini API key  *(free tier available)*

1. Go to **https://aistudio.google.com/app/apikey** and sign in with a Google account.
2. Click **"Create API key"**.
3. Choose an existing Google Cloud project, or let it create one for you.
4. Copy the generated key.
5. Paste it into `server/.env` as `GEMINI_API_KEY`.

> Gemini has a free tier suitable for development. Check current limits/pricing at
> https://ai.google.dev/gemini-api/docs/pricing. **Never** commit this key or put it in the Expo app.

> **Free-tier notes (already handled in code):**
> - Embeddings are capped at ~100 requests/min, so `npm run ingest` paces batches and auto-retries on
>   429. It's resumable — re-running only embeds records that don't have a vector yet.
> - Not every model has free-tier quota. This app defaults to `gemini-2.5-flash` (generation) and
>   `gemini-embedding-001` (embeddings), which work on the free tier; `gemini-2.0-flash` does not.
>   Generation auto-retries transient 503/429s.

### 3. Federal Register  *(no key)*

Nothing to do — the executive-orders API is fully open. The ingestion script just calls it.

### 4. Voteview data  *(no key)*

Nothing to do — the ingestion script downloads the public bulk CSVs from voteview.com/data.

---

## Local setup & running

> Prerequisites: **Node 18+** (you have 20), npm, and the **Expo Go** app on your phone (optional, for device testing).

```bash
# 1. Install the app (client) dependencies
npm install

# 2. Install and configure the backend
cd server
npm install
cp .env.example .env          # then paste your two API keys into server/.env

# 3. Ingest government data into SQLite
#    - Executive orders (Federal Register) load even with NO keys.
#    - Members load if CONGRESS_GOV_API_KEY is set.
#    - Embeddings (semantic search) are computed only if GEMINI_API_KEY is set.
#    If you add the Gemini key later, just re-run this to backfill embeddings.
npm run ingest                # populates server/data/policy.db

# 4. Start the backend (terminal 1)
npm run dev                   # serves the API on http://localhost:3000

# 5. Start the Expo app (terminal 2, from the project root)
cd ..
npm start                     # Metro bundler on http://localhost:8081
```

Then press **`w`** in the Expo terminal to open the web app on localhost, or scan the QR code with
your phone (see below).

**Environment variables** (`server/.env`):

```
CONGRESS_GOV_API_KEY=your_congress_key_here
GEMINI_API_KEY=your_gemini_key_here
PORT=3000
```

The Expo app reads the backend URL from `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:3000`).
For phone testing on the same Wi-Fi, set it to your computer's LAN address (e.g. `http://192.168.1.203:3000`).

---

## Running on a phone

1. Install **Expo Go** from the App Store (iOS) or Play Store (Android).
2. Make sure your phone and computer are on the **same Wi-Fi network**.
3. Run `npm start` and scan the QR code (iPhone: Camera app; Android: Expo Go → Scan).
4. So the phone can reach your backend, set `EXPO_PUBLIC_API_URL` to your computer's LAN IP
   (not `localhost`, which on the phone means the phone itself).
5. If the QR won't connect (firewall/locked-down network), use tunnel mode: `npm start -- --tunnel`.

If port 8081 is taken: free it, or run `npm start -- --port 8082`.

---

## Repository layout

```
policy-app/
├── app/                      # Expo Router screens (the client)
│   ├── index.tsx             # Home + search (name / position / state)
│   ├── congress/             # Browse by chamber (Senate, House)
│   ├── members/[id].tsx      # Politician profile + record + "Ask" entry point
│   ├── bills/                # Bill search + bill detail (who voted, temperature)
│   └── ask/                  # AI question screen with cited answers
├── components/               # Shared UI
├── lib/                      # Client-side API client (talks to the backend)
├── server/                   # ── Separate Node backend ──
│   ├── src/
│   │   ├── index.ts          # Express app + route mounting
│   │   ├── routes/           # /api/members, /api/bills, /api/ask, ...
│   │   ├── db/               # Drizzle schema + SQLite connection
│   │   ├── sources/          # Clients for Congress.gov, Federal Register, Voteview
│   │   ├── ingest/           # Bulk download + normalize → SQLite
│   │   └── rag/              # Retrieval + Gemini prompt building + citation parsing
│   ├── data/                 # policy.db (SQLite) + downloaded bulk files  (gitignored)
│   ├── .env.example
│   └── package.json
├── .env / server/.env        # secrets (gitignored)
└── README.md
```

---

## Data model

Core SQLite tables (via Drizzle):

- **members** — `bioguide_id`, `icpsr_id`, name, party, state, chamber, role (rep/senator/president), terms served.
- **bills** — `congress`, `bill_type`, `number`, title, summary, status (introduced/failed/enacted), `sponsor_id`, subjects, dates.
- **rollcalls** — a single vote event: `congress`, chamber, number, date, question, result, linked `bill_id`.
- **votes** — the big join table: `rollcall_id`, `member_id`, `cast` (Yea/Nay/Present/Not Voting).
- **executive_orders** — `eo_number`, president, title, signing date, abstract, full-text URL, topics.
- **member_id_crosswalk** — maps Voteview `ICPSR` ↔ Congress.gov `bioguide`.
- **embeddings** — a `sqlite-vec` virtual table holding the vector for each bill/executive order, keyed back to its source row (`source_type`, `source_id`). Queried by cosine/L2 nearest-neighbor at question time.

---

## Partisan "temperature"

For any bill's roll-call vote, we compute how party-line vs. bipartisan it was:

- Look at the fraction of **Democrats** voting *Yea* vs. the fraction of **Republicans** voting *Yea*.
- A large gap (e.g. 95% D yea, 4% R yea) = **highly partisan**.
- A small gap (most of both parties agree) = **bipartisan**.
- Surface this as a labeled gauge on the bill detail page (e.g. "🔴 Party-line" → "🟢 Strongly bipartisan").

(Exact formula finalized during implementation; a simple version is `1 − |demYeaFrac − repYeaFrac|`.)

---

## Build roadmap

> **Status:** Phases 1–2 are **implemented**.
> - **Phase 1:** executive orders (Federal Register) + members (Congress.gov), Gemini embeddings, RAG ask.
> - **Phase 2:** real **House roll-call votes** (Congress.gov, 2023+) — roll calls, the bills they're on,
>   and how every member voted. The legislator Ask path does semantic search over the bills a member
>   voted on, then returns a **stance label + confidence**, a grounded summary, and **per-vote evidence
>   citations** ("why this vote matters" + a Congress.gov link).
> - **Client:** redesigned to the "Political Voting Record Analyzer" look — gradient landing, a
>   two-column analysis + evidence layout (responsive: stacked on phones), stance badges, and vote
>   citation cards. Typechecks and bundles for web and mobile.
>
> The AI answer step activates once `GEMINI_API_KEY` is set and `npm run ingest` has been run.

**Phase 1 — Vertical slice (first deliverable).**
One working end-to-end path proving the whole stack:
- Backend skeleton + SQLite schema **with the `sqlite-vec` vector table**.
- Ingest a focused slice: current Congress members + the President's executive orders (Federal Register), **computing an embedding for each record**.
- **Semantic retrieval** in the Ask flow: embed the question, nearest-neighbor search the records, feed matches to Gemini.
- Screens: search a member by name/state/chamber → profile → **Ask the AI** → cited answer.
- Demo target: *"What are Trump's views on guns?"* answered from semantically-matched real executive orders with citations.

**Phase 2 — Real House votes. ✅ Implemented (current).**
- Ingest Congress.gov House roll-call votes (118th/119th, 2023+): roll calls, their bills (title +
  policy area), and every member's vote. Ingestion is throttled, retries transient failures, and is
  resumable. Tune coverage with `INGEST_MAX_ROLLCALLS`.
- Legislator Ask path: semantic search over the bills a member voted on → structured stance label +
  Laplace-smoothed confidence + per-vote rationale, with Congress.gov citations.
- *Later:* Senate votes and full pre-2023 history (e.g. via Voteview bulk data + an ICPSR↔bioguide crosswalk).

**Phase 3 — Bills explorer + temperature.**
- Bill search (proposed/failed/enacted) and "who voted how" per bill.
- Partisan temperature gauge (party `votePartyTotal` data is already captured per roll call).

**Phase 4 — Polish & scale.**
- Re-embed/backfill embeddings as the full historical corpus grows; tune retrieval (chunking, hybrid keyword+vector).
- Caching, pagination, mobile UI polish.

**MVP+ — Local elections.**
- State legislatures via the Open States (Plural) API; municipal data is largely manual/fragmented and scoped per-locality.

---

## Authentication (Google SSO)

Optional Google sign-in identifies users by **email** (the unique id). It's purely additive —
the app is fully usable signed-out, and the **Sign in** button stays hidden until a client ID is set.

**Flow:** the web client uses `expo-auth-session` (Google) to get an access token → the backend
verifies it was issued for *this* OAuth client (audience check) and fetches the verified profile →
upserts a `users` row (`email` PK, name, picture, google sub) → returns a signed app **JWT** the
client stores. Endpoints: `POST /api/auth/google`, `GET /api/auth/me`.

**Set it up (web):**
1. Google Cloud Console → create a project → **OAuth consent screen** (External; scopes
   `userinfo.email`, `userinfo.profile`, `openid`; add yourself as a test user).
2. **Credentials → Create OAuth client ID → Web application.** Authorized JavaScript origins **and**
   redirect URIs: `http://localhost:8081` (add your production URL later). Copy the **Client ID**.
3. Env:
   - root `.env`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<client id>`
   - `server/.env`: `GOOGLE_CLIENT_ID=<same client id>` and `JWT_SECRET=<random string>`
4. Restart the web app and backend (env is read at startup).

> Native (iOS/Android) sign-in is a later step — it needs additional iOS/Android OAuth clients; the
> `expo-auth-session` setup already supports adding them.

## Legal & attribution

- **Congress.gov** data is U.S. government work (public domain); follow their API terms and rate limits.
- **Voteview** data should be cited per their guidance on https://voteview.com/about (Lewis et al., Voteview).
- **Federal Register** content is public domain.
- This app is an educational tool. AI answers are generated from cited primary sources, but users
  should verify via the linked official records.
