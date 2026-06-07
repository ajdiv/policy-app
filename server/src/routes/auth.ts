import { Router } from "express";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { config, hasGoogleAuth } from "../config.js";
import { db } from "../db/client.js";
import { users } from "../db/schema.js";

export const authRouter = Router();

function signToken(email: string): string {
  return jwt.sign({ email }, config.jwtSecret, { expiresIn: "30d" });
}

/** Verify an app session JWT; returns the payload or null. */
export function verifyToken(token: string): { email: string } | null {
  try {
    return jwt.verify(token, config.jwtSecret) as { email: string };
  } catch {
    return null;
  }
}

/**
 * POST /api/auth/google { accessToken }
 * Verifies the Google access token was issued for THIS app (audience check),
 * fetches the verified profile, upserts the user (email = unique id), and
 * returns an app session JWT.
 */
authRouter.post("/google", async (req, res) => {
  if (!hasGoogleAuth()) {
    return res.status(503).json({ error: "Google sign-in is not configured (set GOOGLE_CLIENT_ID)." });
  }
  const { accessToken } = req.body ?? {};
  if (!accessToken) return res.status(400).json({ error: "accessToken is required" });

  try {
    // 1. Audience check — confirm the token belongs to our OAuth client.
    const tokenInfo: any = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    ).then((r) => r.json());
    const aud = tokenInfo.aud ?? tokenInfo.azp;
    if (tokenInfo.error || !aud || aud !== config.googleClientId) {
      return res.status(401).json({ error: "Google token is invalid or was not issued for this app." });
    }

    // 2. Fetch the verified profile.
    const profile: any = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    }).then((r) => r.json());
    const email: string | undefined = profile.email;
    if (!email) return res.status(401).json({ error: "Google profile has no email." });

    const now = new Date().toISOString();
    db.insert(users)
      .values({
        email,
        name: profile.name ?? null,
        picture: profile.picture ?? null,
        googleSub: profile.sub ?? null,
        createdAt: now,
        lastLoginAt: now,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: { name: profile.name ?? null, picture: profile.picture ?? null, googleSub: profile.sub ?? null, lastLoginAt: now },
      })
      .run();

    res.json({
      token: signToken(email),
      user: { email, name: profile.name ?? null, picture: profile.picture ?? null },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message ?? "Authentication failed" });
  }
});

/** GET /api/auth/me — return the current user from the Bearer token. */
authRouter.get("/me", (req, res) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const payload = token ? verifyToken(token) : null;
  if (!payload) return res.status(401).json({ error: "Not authenticated" });
  const u = db.select().from(users).where(eq(users.email, payload.email)).get();
  if (!u) return res.status(401).json({ error: "User not found" });
  res.json({ user: { email: u.email, name: u.name, picture: u.picture } });
});
