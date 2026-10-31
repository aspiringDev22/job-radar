import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

import { companies } from "./companies.ts";
import { atsTypeEnum, employmentTypeEnum, seniorityEnum } from "./enums.ts";

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    descriptionHtml: text("description_html"),
    descriptionText: text("description_text"),
    locationRaw: text("location_raw"),
    locationNormalized: text("location_normalized"),
    isRemote: boolean("is_remote").notNull().default(false),
    seniority: seniorityEnum("seniority"),
    employmentType: employmentTypeEnum("employment_type"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    applyUrl: text("apply_url"),
    source: atsTypeEnum("source").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true, mode: "date" }),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    isActive: boolean("is_active").notNull().default(true),
    embedding: vector("embedding", { dimensions: 1536 }),
  },
  (table) => [
    uniqueIndex("jobs_company_external_id_idx").on(table.companyId, table.externalId),
    index("jobs_active_posted_idx").on(table.isActive, table.postedAt),
    index("jobs_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);
