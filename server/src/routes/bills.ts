import { Router } from "express";
import { sqlite } from "../db/client.js";
import { temperatureFromPartyTotals } from "../temperature.js";

export const billsRouter = Router();

interface RcRow {
  id: string;
  date: string | null;
  result: string | null;
  party_totals: string | null;
  number: number;
}

function rcTotal(r: RcRow): number {
  let tot = 0;
  try {
    const pt = JSON.parse(r.party_totals || "{}");
    for (const p of Object.values(pt) as any[]) tot += (p.Yea || 0) + (p.Nay || 0);
  } catch {
    /* ignore */
  }
  return tot;
}

/**
 * The "primary" roll call best representing the bill: prefer a passage vote
 * ("Passed"/"Agreed to") over procedural motions; among those, the one with the
 * most votes. Falls back to the largest vote overall (e.g. a failed passage).
 */
function primaryRollcall(billId: string): RcRow | undefined {
  const rcs = sqlite
    .prepare(`SELECT id, date, result, party_totals, number FROM rollcalls WHERE bill_id = ?`)
    .all(billId) as RcRow[];
  const passed = rcs.filter((r) => /pass|agreed/i.test(r.result || ""));
  const pool = passed.length ? passed : rcs;
  let best: RcRow | undefined;
  let bestTotal = -1;
  for (const r of pool) {
    const t = rcTotal(r);
    if (t > bestTotal) {
      bestTotal = t;
      best = r;
    }
  }
  return best;
}

/** GET /api/bills?q=&policyArea=&limit= — search bills with a headline temperature. */
billsRouter.get("/", (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const policyArea = String(req.query.policyArea ?? "").trim();
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50;

  const conds: string[] = [];
  const params: any[] = [];
  if (q) {
    conds.push("title LIKE ?");
    params.push(`%${q}%`);
  }
  if (policyArea) {
    conds.push("policy_area = ?");
    params.push(policyArea);
  }
  const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";
  const rows = sqlite
    .prepare(
      `SELECT id, title, policy_area AS policyArea, bill_type AS billType, number, url, congress
       FROM bills ${where} ORDER BY congress DESC, number DESC LIMIT ?`,
    )
    .all(...params, limit) as any[];

  const bills = rows.map((b) => {
    const rc = primaryRollcall(b.id);
    return {
      ...b,
      result: rc?.result ?? null,
      date: rc?.date ?? null,
      temperature: rc ? temperatureFromPartyTotals(rc.party_totals) : null,
    };
  });
  res.json({ bills });
});

/** GET /api/bills/policy-areas — distinct policy areas for filter chips. (Before /:id!) */
billsRouter.get("/policy-areas", (_req, res) => {
  const rows = sqlite
    .prepare(`SELECT DISTINCT policy_area AS name FROM bills WHERE policy_area IS NOT NULL ORDER BY policy_area`)
    .all() as Array<{ name: string }>;
  res.json({ policyAreas: rows.map((r) => r.name) });
});

/** GET /api/bills/:id — full detail: temperature, party breakdown, who voted. */
billsRouter.get("/:id", (req, res) => {
  const bill = sqlite
    .prepare(
      `SELECT id, title, policy_area AS policyArea, bill_type AS billType, number, url, congress FROM bills WHERE id = ?`,
    )
    .get(req.params.id) as any;
  if (!bill) return res.status(404).json({ error: "Bill not found" });

  const rcs = sqlite
    .prepare(`SELECT id, date, result, party_totals AS partyTotals, number FROM rollcalls WHERE bill_id = ? ORDER BY date`)
    .all(bill.id) as Array<{ id: string; date: string | null; result: string | null; partyTotals: string | null; number: number }>;
  const rollcalls = rcs.map((r) => ({
    id: r.id,
    date: r.date,
    result: r.result,
    number: r.number,
    temperature: temperatureFromPartyTotals(r.partyTotals),
  }));

  const primary = primaryRollcall(bill.id);
  const temperature = primary ? temperatureFromPartyTotals(primary.party_totals) : null;

  let votes: any[] = [];
  if (primary) {
    votes = sqlite
      .prepare(
        `SELECT v.cast AS cast, m.id AS id, m.full_name AS name, m.party AS party, m.state AS state
         FROM votes v JOIN members m ON m.id = v.member_id
         WHERE v.rollcall_id = ? AND v.cast IN ('Yea','Nay')
         ORDER BY v.cast, m.party, m.full_name`,
      )
      .all(primary.id) as any[];
  }

  res.json({
    bill,
    temperature,
    primaryResult: primary?.result ?? null,
    primaryDate: primary?.date ?? null,
    rollcalls,
    votes,
  });
});
