import { boolean, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { tsvector } from "../../shared/db/columns.ts";

import { ATS_TYPES } from "./constants.ts";

export const atsTypeEnum = pgEnum("ats_type", ATS_TYPES);

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    website: text("website"),
    logoUrl: text("logo_url"),
    atsType: atsTypeEnum("ats_type").notNull(),
    atsSlug: text("ats_slug").notNull(),
    active: boolean("active").notNull().default(true),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true, mode: "date" }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true, mode: "date" }),
    lastError: text("last_error"),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastRoleCount: integer("last_role_count"),
    // Weight B in job search; see jobs.search_vector.
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce("name", '')), 'B')`,
    ),
  },
  (table) => [unique("companies_ats_type_ats_slug_key").on(table.atsType, table.atsSlug)],
);
