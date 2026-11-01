import { boolean, index, integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { companies } from "../companies/schema.ts";

import { SYNC_TRIGGERS } from "./constants.ts";

export const syncTriggerEnum = pgEnum("sync_trigger", SYNC_TRIGGERS);

// One row per `pnpm sync` invocation.
export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  trigger: syncTriggerEnum("trigger").notNull().default("manual"),
  forced: boolean("forced").notNull().default(false),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
  companiesOk: integer("companies_ok").notNull().default(0),
  companiesFailed: integer("companies_failed").notNull().default(0),
  companiesSkipped: integer("companies_skipped").notNull().default(0),
  rolesAdded: integer("roles_added").notNull().default(0),
  rolesReopened: integer("roles_reopened").notNull().default(0),
  rolesClosed: integer("roles_closed").notNull().default(0),
  error: text("error"),
});

// One row per company a run fetched. Rows from before run-level tracking have no run_id.
export const companySyncs = pgTable(
  "company_syncs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id").references(() => syncRuns.id, { onDelete: "cascade" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    source: text("source").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
    jobsFound: integer("jobs_found").notNull().default(0),
    jobsNew: integer("jobs_new").notNull().default(0),
    jobsReopened: integer("jobs_reopened").notNull().default(0),
    jobsClosed: integer("jobs_closed").notNull().default(0),
    error: text("error"),
  },
  (table) => [index("company_syncs_run_id_idx").on(table.runId)],
);
