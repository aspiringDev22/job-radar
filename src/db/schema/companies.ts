import { boolean, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { atsTypeEnum } from "./enums.ts";

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
  },
  (table) => [unique("companies_ats_type_ats_slug_key").on(table.atsType, table.atsSlug)],
);
