import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * Politicians: legislators (senate/house) and executives (president).
 * `id` is the Congress.gov bioguide id for legislators, or a synthetic
 * `potus-<slug>` id for presidents discovered via the Federal Register.
 */
export const members = sqliteTable("members", {
  id: text("id").primaryKey(),
  icpsr: integer("icpsr"), // Voteview id (filled in Phase 2)
  firstName: text("first_name"),
  lastName: text("last_name"),
  fullName: text("full_name").notNull(),
  party: text("party"),
  state: text("state"),
  chamber: text("chamber").notNull(), // 'senate' | 'house' | 'executive'
  role: text("role").notNull(), // 'senator' | 'representative' | 'president'
  imageUrl: text("image_url"),
  startYear: integer("start_year"),
  currentMember: integer("current_member", { mode: "boolean" }),
});

/** Bills (lightly used in Phase 1; populated fully in Phase 3). */
export const bills = sqliteTable("bills", {
  id: text("id").primaryKey(), // e.g. "118-hr-1234"
  congress: integer("congress"),
  billType: text("bill_type"),
  number: integer("number"),
  title: text("title").notNull(),
  summary: text("summary"),
  status: text("status"), // introduced | failed | enacted | ...
  sponsorId: text("sponsor_id"),
  subjects: text("subjects"), // JSON array
  introducedDate: text("introduced_date"),
});

/** A single roll-call vote event (Phase 2). */
export const rollcalls = sqliteTable("rollcalls", {
  id: text("id").primaryKey(),
  congress: integer("congress"),
  chamber: text("chamber"),
  number: integer("number"),
  date: text("date"),
  question: text("question"),
  result: text("result"),
  billId: text("bill_id"),
});

/** How a member voted on a roll call (Phase 2). */
export const votes = sqliteTable("votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rollcallId: text("rollcall_id").notNull(),
  memberId: text("member_id").notNull(),
  cast: text("cast"), // Yea | Nay | Present | Not Voting
});

/** Executive orders — the President's record. */
export const executiveOrders = sqliteTable("executive_orders", {
  id: text("id").primaryKey(), // Federal Register document_number
  eoNumber: integer("eo_number"),
  presidentId: text("president_id"), // FK -> members.id
  presidentName: text("president_name"),
  title: text("title").notNull(),
  signingDate: text("signing_date"),
  abstract: text("abstract"),
  htmlUrl: text("html_url"),
  pdfUrl: text("pdf_url"),
  topics: text("topics"), // JSON array
});

export type Member = typeof members.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type ExecutiveOrder = typeof executiveOrders.$inferSelect;
