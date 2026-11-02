import { readFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";

import { companies } from "../../companies/schema.ts";
import { getDb, withDirectConnection } from "../../../shared/db/client.ts";

import { adapterFor } from "../adapters/index.ts";
import { companiesFileSchema } from "../lib/company-file.ts";
import { mapPool } from "../lib/pool.ts";
import type { SyncOptions } from "../lib/sync-args.ts";
import {
  dueForSync,
  formatDuration,
  pickCompanies,
  runTotals,
  type CompanyOutcome,
  type RunTotals,
} from "../lib/sync-run.ts";
import { syncRuns } from "../schema.ts";
import type { SyncCompany } from "../types.ts";

import { errorMessage, syncCompany, type LocationPolicies } from "./sync-company.ts";

const CONCURRENCY = 2;
// Session advisory lock, so a manual run and a scheduled run never overlap.
const LOCK_NAME = "jobradar:sync";

type CompanyResult = { company: SyncCompany; outcome: CompanyOutcome };

async function locationPolicies(): Promise<LocationPolicies> {
  const filePath = path.join(process.cwd(), "data", "companies.json");
  const parsed = companiesFileSchema.safeParse(JSON.parse(await readFile(filePath, "utf8")) as unknown);
  if (!parsed.success) {
    throw new Error("data/companies.json is invalid");
  }
  const policies: LocationPolicies = new Map();
  for (const company of parsed.data) {
    if (company.locations) {
      policies.set(`${company.ats_type}:${company.ats_slug}`, company.locations);
    }
  }
  return policies;
}

async function loadCompanies(only: string[]): Promise<SyncCompany[]> {
  const rows = await getDb()
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      atsType: companies.atsType,
      atsSlug: companies.atsSlug,
      lastSuccessAt: companies.lastSuccessAt,
      lastRoleCount: companies.lastRoleCount,
    })
    .from(companies)
    .where(eq(companies.active, true));
  const { picked, unknown } = pickCompanies(
    rows.filter((row) => adapterFor(row.atsType)),
    only,
  );
  if (unknown.length > 0) {
    throw new Error(`No active company with a supported feed matches --only ${unknown.join(", ")}`);
  }
  return picked;
}

async function syncAll(list: SyncCompany[], options: SyncOptions, runId: string | null): Promise<CompanyResult[]> {
  const policies = await locationPolicies();
  const now = Date.now();
  const results: CompanyResult[] = [];
  console.log(
    `Syncing ${list.length} companies (${options.trigger})${options.force ? " (force)" : ""}${options.dryRun ? " (dry-run)" : ""}`,
  );
  await mapPool(list, CONCURRENCY, async (company) => {
    if (!dueForSync(company.lastSuccessAt, now, options.force)) {
      console.log(`Skip ${company.name} (synced ${company.lastSuccessAt?.toISOString()})`);
      results.push({ company, outcome: { status: "skipped" } });
      return;
    }
    let outcome: CompanyOutcome;
    try {
      outcome = await syncCompany(company, { runId, dryRun: options.dryRun, policies });
    } catch (error) {
      // Recording the outcome failed. Count it and keep going with the other companies.
      outcome = { status: "failed", error: errorMessage(error) };
      console.error(`${company.name} failed: ${outcome.error}`);
    }
    results.push({ company, outcome });
  });
  return results;
}

function printSummary(results: CompanyResult[], totals: RunTotals, startedAt: number, dryRun: boolean): void {
  const prefix = dryRun ? "[dry-run] " : "";
  console.log(
    `${prefix}Run finished in ${formatDuration(Date.now() - startedAt)}: ${totals.companiesOk} ok, ${totals.companiesFailed} failed, ${totals.companiesSkipped} skipped; ${totals.rolesAdded} added, ${totals.rolesReopened} reopened, ${totals.rolesClosed} closed`,
  );
  for (const { company, outcome } of results) {
    if (outcome.status === "failed") {
      console.log(`${prefix}  failed: ${company.name} — ${outcome.error}`);
    }
  }
}

async function recordedRun(options: SyncOptions): Promise<RunTotals> {
  const db = getDb();
  const startedAt = new Date();
  const [run] = await db
    .insert(syncRuns)
    .values({ trigger: options.trigger, forced: options.force, startedAt })
    .returning({ id: syncRuns.id });
  if (!run) {
    throw new Error("Could not record sync run");
  }

  try {
    const results = await syncAll(await loadCompanies(options.only), options, run.id);
    const totals = runTotals(results.map((result) => result.outcome));
    await db
      .update(syncRuns)
      .set({ finishedAt: new Date(), ...totals })
      .where(eq(syncRuns.id, run.id));
    printSummary(results, totals, startedAt.getTime(), false);
    return totals;
  } catch (error) {
    await db
      .update(syncRuns)
      .set({ finishedAt: new Date(), error: errorMessage(error) })
      .where(eq(syncRuns.id, run.id));
    throw error;
  }
}

// Returns null when another run holds the lock. Company failures are counted, never thrown.
export async function runSync(options: SyncOptions): Promise<RunTotals | null> {
  if (options.dryRun) {
    const startedAt = Date.now();
    const results = await syncAll(await loadCompanies(options.only), options, null);
    const totals = runTotals(results.map((result) => result.outcome));
    printSummary(results, totals, startedAt, true);
    return totals;
  }

  // The lock lives on its own direct connection; closing it also releases the lock.
  return withDirectConnection(async (lock) => {
    const [row] = await lock<{ locked: boolean }[]>`select pg_try_advisory_lock(hashtext(${LOCK_NAME})) as locked`;
    if (!row?.locked) {
      console.log("Another sync is running. Nothing to do.");
      return null;
    }
    try {
      return await recordedRun(options);
    } finally {
      await lock`select pg_advisory_unlock(hashtext(${LOCK_NAME}))`;
    }
  });
}
