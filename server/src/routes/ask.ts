import { Router } from "express";
import { hasGemini } from "../config.js";
import { answerQuestion } from "../rag/ask.js";

export const askRouter = Router();

/** POST /api/ask { memberId, question } -> grounded answer + citations. */
askRouter.post("/", async (req, res) => {
  const { memberId, question } = req.body ?? {};
  if (!memberId || !question) {
    return res.status(400).json({ error: "memberId and question are required" });
  }
  if (!hasGemini()) {
    return res
      .status(503)
      .json({ error: "AI is not configured. Set GEMINI_API_KEY in server/.env and restart." });
  }
  try {
    const result = await answerQuestion(String(memberId), String(question));
    res.json(result);
  } catch (e: any) {
    res.status(e.status ?? 500).json({ error: e.message ?? "Internal error" });
  }
});
