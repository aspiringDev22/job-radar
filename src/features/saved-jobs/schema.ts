import { pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "../auth/schema.ts";
import { jobs } from "../jobs/schema.ts";
import { SAVED_JOB_STATUSES } from "./constants.ts";

export const savedJobStatusEnum = pgEnum("saved_job_status", SAVED_JOB_STATUSES);

export const savedJobs = pgTable(
  "saved_jobs",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    status: savedJobStatusEnum("status").notNull().default("saved"),
    notes: text("notes"),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.userId, table.jobId] })],
);
