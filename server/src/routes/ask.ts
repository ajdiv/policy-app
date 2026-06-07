import { Router } from "express";
import { hasGemini } from "../config.js";
import { answerQuestion, type ChatTurn } from "../rag/ask.js";

export const askRouter = Router();

/** POST /api/ask { memberId, question, history? } -> grounded, conversation-aware answer + citations. */
askRouter.post("/", async (req, res) => {
  const { memberId, question, history } = req.body ?? {};
  if (!memberId || !question) {
    return res.status(400).json({ error: "memberId and question are required" });
  }
  if (!hasGemini()) {
    return res
      .status(503)
      .json({ error: "AI is not configured. Set GEMINI_API_KEY in server/.env and restart." });
  }

  // Sanitize + cap the client-supplied conversation history.
  const turns: ChatTurn[] = Array.isArray(history)
    ? history
        .filter((h: any) => h && (h.role === "user" || h.role === "assistant") && typeof h.content === "string")
        .slice(-8)
        .map((h: any) => ({ role: h.role, content: String(h.content).slice(0, 2000) }))
    : [];

  try {
    const result = await answerQuestion(String(memberId), String(question), turns);
    res.json(result);
  } catch (e: any) {
    res.status(e.status ?? 500).json({ error: e.message ?? "Internal error" });
  }
});
