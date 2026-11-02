import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { atsTypeEnum, companies } from "../companies/schema.ts";
import { tsvector } from "../../shared/db/columns.ts";
import {
  CANONICAL_SENIORITIES,
  EMPLOYMENT_TYPES,
  JOB_STATUSES,
  ROLE_CATEGORIES,
  ROLE_FAMILIES,
  SENIORITIES,
  WORK_MODES,
} from "./constants.ts";

export const seniorityEnum = pgEnum("seniority", SENIORITIES);
export const canonicalSeniorityEnum = pgEnum("canonical_seniority", CANONICAL_SENIORITIES);
export const roleFamilyEnum = pgEnum("role_family", ROLE_FAMILIES);
export const roleCategoryEnum = pgEnum("role_category", ROLE_CATEGORIES);
export const workModeEnum = pgEnum("work_mode", WORK_MODES);
export const employmentTypeEnum = pgEnum("employment_type", EMPLOYMENT_TYPES);
export const jobStatusEnum = pgEnum("job_status", JOB_STATUSES);

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
    canonicalSeniority: canonicalSeniorityEnum("canonical_seniority").notNull().default("unknown"),
    roleFamily: roleFamilyEnum("role_family").notNull().default("other"),
    // The kind of work, from the title or else the feed's department. The board's Role filter.
    category: roleCategoryEnum("category").notNull().default("other"),
    city: text("city"),
    region: text("region"),
    country: text("country"),
    workMode: workModeEnum("work_mode").notNull().default("unknown"),
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
    status: jobStatusEnum("status").notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true, mode: "date" }),
    dedupeKey: text("dedupe_key"),
    // The feed's own department or category, as published. Amazon and Keka set it today.
    department: text("department"),
    embedding: vector("embedding", { dimensions: 1536 }),
    // Search weights: title A, location C, description D. The company name is B,
    // on companies.search_vector; the board matches each search word against either.
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce("title", '')), 'A') || setweight(to_tsvector('english', coalesce("location_normalized", '') || ' ' || coalesce("city", '') || ' ' || coalesce("region", '') || CASE WHEN "is_remote" THEN ' remote' ELSE '' END), 'C') || setweight(to_tsvector('english', coalesce("description_text", '')), 'D')`,
    ),
    // Title A and location C as whole words, without English stemming, which would make
    // "designer" match "Design Engineer" and "developer" match "Business Development".
    // Slashes split, so "UI/UX Designer" holds both words.
    titleVector: tsvector("title_vector").generatedAlwaysAs(
      sql`setweight(to_tsvector('simple', replace(coalesce("title", ''), '/', ' ')), 'A') || setweight(to_tsvector('simple', coalesce("location_normalized", '') || ' ' || coalesce("city", '') || ' ' || coalesce("region", '') || CASE WHEN "is_remote" THEN ' remote' ELSE '' END), 'C')`,
    ),
  },
  (table) => [
    uniqueIndex("jobs_company_external_id_idx").on(table.companyId, table.externalId),
    index("jobs_active_posted_idx").on(table.isActive, table.postedAt),
    index("jobs_dedupe_key_idx").on(table.dedupeKey),
    index("jobs_embedding_idx").using("hnsw", table.embedding.op("vector_cosine_ops")),
  ],
);
