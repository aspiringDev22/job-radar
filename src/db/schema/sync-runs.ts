import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const syncRuns = pgTable("sync_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true, mode: "date" }),
  jobsFound: integer("jobs_found").notNull().default(0),
  jobsNew: integer("jobs_new").notNull().default(0),
  jobsClosed: integer("jobs_closed").notNull().default(0),
  error: text("error"),
});
