import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { SUGGESTION_STATUSES } from "./constants.ts";

export const suggestionStatusEnum = pgEnum("suggestion_status", SUGGESTION_STATUSES);

// "Suggest a company" submissions, one row per site. Reviewed by hand: run pnpm discover
// on the domain, add a confirmed feed to data/companies.json, then set the status.
export const companySuggestions = pgTable("company_suggestions", {
  id: uuid("id").primaryKey().defaultRandom(),
  url: text("url").notNull(),
  host: text("host").notNull().unique(),
  note: text("note"),
  status: suggestionStatusEnum("status").notNull().default("new"),
  timesSuggested: integer("times_suggested").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  lastSuggestedAt: timestamp("last_suggested_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
