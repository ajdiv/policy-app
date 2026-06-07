import { Router } from "express";
import { and, eq, like, or, desc, type SQL } from "drizzle-orm";
import { db, sqlite } from "../db/client.js";
import { members, executiveOrders } from "../db/schema.js";
import { expandNameQuery, resolveState } from "../search/aliases.js";

export const membersRouter = Router();

/** GET /api/members?q=&chamber=&state= — search by name, chamber, and/or state. */
membersRouter.get("/", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const chamber = String(req.query.chamber ?? "").trim();
  const state = String(req.query.state ?? "").trim();

  const conditions: SQL[] = [];
  if (q) {
    // Match the full name against the raw query plus nickname/initialism aliases.
    const nameOr = or(...expandNameQuery(q).map((t) => like(members.fullName, `%${t}%`)));
    if (nameOr) conditions.push(nameOr);
  }
  if (chamber) conditions.push(eq(members.chamber, chamber));
  if (state) conditions.push(like(members.state, `%${resolveState(state)}%`));

  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 250) : 250;

  const where = conditions.length ? and(...conditions) : undefined;
  const rows = db.select().from(members).where(where).limit(limit).all();
  res.json({ members: rows });
});

/** GET /api/members/:id — profile plus the politician's record. */
membersRouter.get("/:id", (req, res) => {
  const member = db.select().from(members).where(eq(members.id, req.params.id)).get();
  if (!member) return res.status(404).json({ error: "Member not found" });

  let records: Array<{ ref: string; title: string; date: string | null; url: string | null }> = [];
  let recordCount = 0;
  if (member.role === "president") {
    const eos = db
      .select()
      .from(executiveOrders)
      .where(eq(executiveOrders.presidentId, member.id))
      .orderBy(desc(executiveOrders.signingDate))
      .limit(100)
      .all();
    records = eos.map((e) => ({
      ref: e.eoNumber ? `EO ${e.eoNumber}` : `EO ${e.id}`,
      title: e.title,
      date: e.signingDate,
      url: e.htmlUrl,
    }));
    recordCount = records.length;
  } else {
    recordCount = (sqlite.prepare(`SELECT COUNT(*) AS c FROM votes WHERE member_id = ?`).get(member.id) as { c: number }).c;
  }

  res.json({
    member,
    recordType: member.role === "president" ? "executive_order" : "vote",
    recordCount,
    records,
  });
});
