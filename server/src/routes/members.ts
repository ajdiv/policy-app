import { Router } from "express";
import { and, eq, like, desc } from "drizzle-orm";
import { db, sqlite } from "../db/client.js";
import { members, executiveOrders } from "../db/schema.js";

export const membersRouter = Router();

/** GET /api/members?q=&chamber=&state= — search by name, chamber, and/or state. */
membersRouter.get("/", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const chamber = String(req.query.chamber ?? "").trim();
  const state = String(req.query.state ?? "").trim();

  const conditions = [];
  if (q) conditions.push(like(members.fullName, `%${q}%`));
  if (chamber) conditions.push(eq(members.chamber, chamber));
  if (state) conditions.push(like(members.state, `%${state}%`));

  const where = conditions.length ? and(...conditions) : undefined;
  const rows = db.select().from(members).where(where).limit(250).all();
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
