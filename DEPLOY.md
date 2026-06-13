# Deploying policy-app (free, on Render)

This deploys the whole app on Render's free tier — no credit card:

- **`policy-app-api`** — the Node backend (Express + SQLite + Gemini RAG)
- **`policy-app-web`** — the Expo static web frontend

Both are defined in [`render.yaml`](render.yaml), so Render sets them up in one shot.

> **Heads up on the free tier:** the backend **sleeps after ~15 min idle** and
> takes ~50s to wake on the next request. Totally fine for casual testers — just
> warn them the first load can be slow.

---

## One-time prep: publish the dataset

The backend reads a ~60 MB SQLite file (`server/data/policy.db`) that's **not in
git**. Upload it once as a GitHub Release asset; the build downloads it.

From the repo root (needs the [GitHub CLI](https://cli.github.com/)):

```bash
gh release create data-v1 server/data/policy.db \
  --title "Dataset v1" \
  --notes "Prebuilt SQLite dataset for the backend"
```

Then grab the asset's download URL — you'll paste it into Render as
`DB_DOWNLOAD_URL`:

```bash
gh release view data-v1 --json assets --jq '.assets[].url'
# -> https://github.com/ajdiv/policy-app/releases/download/data-v1/policy.db
```

To refresh the data later: re-run your ingest locally, then
`gh release upload data-v1 server/data/policy.db --clobber` and redeploy the API.

---

## Get the API keys (both free)

- **Congress.gov** — instant: https://api.congress.gov/sign-up/
- **Gemini** — free tier: https://aistudio.google.com/app/apikey

---

## Deploy

1. Push this branch (with `render.yaml`, `DEPLOY.md`, `server/scripts/fetch-db.mjs`) to GitHub.
2. Go to **https://render.com** → sign up with GitHub (free).
3. **New → Blueprint** → pick this repo. Render reads `render.yaml` and shows
   both services.
4. Fill the env vars it asks for (the ones marked `sync: false`):
   - `CONGRESS_GOV_API_KEY`
   - `GEMINI_API_KEY`
   - `DB_DOWNLOAD_URL` — the release asset URL from above
   - `GOOGLE_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — leave **blank**
     unless you're enabling sign-in (see *Optional: Google sign-in* below).
   - (`JWT_SECRET` is auto-generated; leave it.)
5. Click **Apply**. First build takes a few minutes (it compiles native modules
   and downloads the dataset).

When it's done:

- API: `https://policy-app-api.onrender.com` — check `…/api/health` returns
  `{"ok":true,...}`.
- App: `https://policy-app-web.onrender.com` — **share this link with testers.**

---

## If Render gives the API a different hostname

`render.yaml` hardcodes the API URL the frontend talks to
(`EXPO_PUBLIC_API_URL: https://policy-app-api.onrender.com`). If the name was
taken and Render appended a suffix, open the **policy-app-web** service →
**Environment** → set `EXPO_PUBLIC_API_URL` to the real API URL → redeploy. (The
frontend bakes this in at build time, so it must be set before the build.)

---

## Optional: Google sign-in

The app runs fully without it — the sign-in button stays hidden until a client
ID is set. To enable it, register a Google OAuth **Web application** client. The
app uses the implicit (token) flow, so you only need a **client ID — no client
secret**.

1. **[console.cloud.google.com](https://console.cloud.google.com)** → create or
   pick a project.
2. **APIs & Services → OAuth consent screen** → User type **External**. Fill the
   app name + support email. The app only requests `openid`, `profile`, `email`
   (non-sensitive — no Google verification needed). Then set **Publishing
   status**:
   - **Testing** → only emails you add under *Test users* can sign in (≤100).
   - **Publish to production** → anyone with a Google account can sign in. Allowed
     without review since the scopes are basic. Pick this for open testing.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID →
   Web application.** Add:

   **Authorized JavaScript origins** (no path / trailing slash):
   ```
   https://policy-app-web.onrender.com
   http://localhost:8081
   ```
   **Authorized redirect URIs** (exact match — keep the trailing slash):
   ```
   https://policy-app-web.onrender.com/
   http://localhost:8081/
   ```
   > If sign-in fails with **`redirect_uri_mismatch`**, copy the exact
   > `redirect_uri` from Google's error page into the list. (`8081` is the Expo
   > web dev port; older setups use `19006`.)
4. Copy the **Client ID** (`…apps.googleusercontent.com`). Ignore the secret.
5. Set the **same** value in both Render services, then **redeploy the web
   service** (the web var is baked in at build time):

   | Service | Env var |
   |---------|---------|
   | `policy-app-api` | `GOOGLE_CLIENT_ID` |
   | `policy-app-web` | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` |

   For local dev, set the same pair in `server/.env` and the root `.env`.

---

## Notes

- CORS is already open on the backend, so the cross-origin frontend works as-is.
- The DB is read-only at runtime, so Render's ephemeral disk is fine — the file
  is re-fetched on every build.
