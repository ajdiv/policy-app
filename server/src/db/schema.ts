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

/** Bills tied to roll-call votes. */
export const bills = sqliteTable("bills", {
  id: text("id").primaryKey(), // e.g. "118-HR-1234"
  congress: integer("congress"),
  billType: text("bill_type"), // HR, HRES, S, ...
  number: integer("number"),
  title: text("title").notNull(),
  policyArea: text("policy_area"), // Congress.gov's single policy-area label
  summary: text("summary"),
  status: text("status"), // introduced | failed | enacted | ...
  sponsorId: text("sponsor_id"),
  subjects: text("subjects"), // JSON array
  introducedDate: text("introduced_date"),
  url: text("url"), // congress.gov human URL
});

/** A single House roll-call vote event. */
export const rollcalls = sqliteTable("rollcalls", {
  id: text("id").primaryKey(), // "{congress}-{session}-{rollCallNumber}"
  congress: integer("congress"),
  session: integer("session"),
  chamber: text("chamber"), // 'house' (senate later)
  number: integer("number"), // rollCallNumber
  date: text("date"),
  question: text("question"),
  result: text("result"),
  voteType: text("vote_type"),
  legislationType: text("legislation_type"),
  legislationNumber: text("legislation_number"),
  billId: text("bill_id"),
  partyTotals: text("party_totals"), // JSON: per-party yea/nay totals (for partisan temperature)
  url: text("url"),
});

/** How a member voted on a roll call (Phase 2). */
export const votes = sqliteTable("votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  rollcallId: text("rollcall_id").notNull(),
  memberId: text("member_id").notNull(),
  cast: text("cast"), // Yea | Nay | Present | Not Voting
});

/**
 * Presidential actions — the President's record. Despite the table name, this
 * holds every Federal Register presidential document (executive orders,
 * memoranda, proclamations, determinations); `subtype` distinguishes them and
 * `eoNumber` is only set for executive orders.
 */
export const executiveOrders = sqliteTable("executive_orders", {
  id: text("id").primaryKey(), // Federal Register document_number
  eoNumber: integer("eo_number"),
  subtype: text("subtype"), // "Executive Order" | "Memorandum" | "Proclamation" | …
  presidentId: text("president_id"), // FK -> members.id
  presidentName: text("president_name"),
  title: text("title").notNull(),
  signingDate: text("signing_date"),
  abstract: text("abstract"),
  htmlUrl: text("html_url"),
  pdfUrl: text("pdf_url"),
  topics: text("topics"), // JSON array
});

/** Authenticated app users (Google SSO). Email is the unique id. */
export const users = sqliteTable("users", {
  email: text("email").primaryKey(),
  name: text("name"),
  picture: text("picture"),
  googleSub: text("google_sub"),
  createdAt: text("created_at"),
  lastLoginAt: text("last_login_at"),
});

export type Member = typeof members.$inferSelect;
export type User = typeof users.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type ExecutiveOrder = typeof executiveOrders.$inferSelect;
