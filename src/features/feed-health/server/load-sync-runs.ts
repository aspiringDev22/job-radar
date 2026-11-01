import { connection } from "next/server";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";

import { companies } from "@/features/companies/schema";
import { runState, type RunState, type SyncTrigger } from "@/features/ingestion";
import { companySyncs, syncRuns } from "@/features/ingestion/schema";
import { getDb } from "@/shared/db/client";

export type SyncRunRow = {
  id: string;
  trigger: SyncTrigger;
  forced: boolean;
  startedAt: Date;
  finishedAt: Date | null;
  companiesOk: number;
  companiesFailed: number;
  companiesSkipped: number;
  rolesAdded: number;
  rolesReopened: number;
  rolesClosed: number;
  error: string | null;
  state: RunState;
  failures: { name: string; error: string }[];
};

export async function loadRecentSyncRuns(limit = 10): Promise<SyncRunRow[]> {
  await connection();
  const db = getDb();
  const runs = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(limit);
  if (runs.length === 0) {
    return [];
  }

  const failures = await db
    .select({
      runId: companySyncs.runId,
      source: companySyncs.source,
      name: companies.name,
      error: companySyncs.error,
    })
    .from(companySyncs)
    .leftJoin(companies, eq(companies.id, companySyncs.companyId))
    .where(
      and(
        inArray(
          companySyncs.runId,
          runs.map((run) => run.id),
        ),
        isNotNull(companySyncs.error),
      ),
    );

  const now = Date.now();
  return runs.map((run) => ({
    ...run,
    state: runState(run.startedAt, run.finishedAt, now),
    failures: failures
      .filter((failure) => failure.runId === run.id)
      .map((failure) => ({ name: failure.name ?? failure.source, error: failure.error ?? "" })),
  }));
}
