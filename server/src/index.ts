import express from "express";
import cors from "cors";
import { config, hasGemini, hasCongressGov, hasGoogleAuth } from "./config.js";
import { initDb } from "./db/client.js";
import { membersRouter } from "./routes/members.js";
import { askRouter } from "./routes/ask.js";
import { billsRouter } from "./routes/bills.js";
import { authRouter } from "./routes/auth.js";

initDb();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, gemini: hasGemini(), congressGov: hasCongressGov(), googleAuth: hasGoogleAuth() });
});

app.use("/api/members", membersRouter);
app.use("/api/ask", askRouter);
app.use("/api/bills", billsRouter);
app.use("/api/auth", authRouter);

app.listen(config.port, () => {
  console.log(`policy-app server listening on http://localhost:${config.port}`);
  if (!hasGemini()) console.warn("  [warn] GEMINI_API_KEY not set — /api/ask and embeddings are disabled.");
  if (!hasCongressGov()) console.warn("  [warn] CONGRESS_GOV_API_KEY not set — Congress member ingestion is disabled.");
});
