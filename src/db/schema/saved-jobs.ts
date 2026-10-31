import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { users } from "./auth.ts";
import { savedJobStatusEnum } from "./enums.ts";
import { jobs } from "./jobs.ts";

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
