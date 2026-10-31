import { readFile } from "node:fs/promises";
import path from "node:path";

import { and, eq, lt, sql } from "drizzle-orm";

import { closeDb, getDb } from "../src/db/client.ts";
import { companiesFileSchema } from "../src/db/company-seed.ts";
import { companies } from "../src/db/schema/companies.ts";
import { jobs } from "../src/db/schema/jobs.ts";
import { syncRuns } from "../src/db/schema/sync-runs.ts";
import { uniqueSlug } from "../src/db/slug.ts";
import { adapterFor } from "./adapters/index.ts";
import { keepListedLocation } from "./normalize.ts";
import type { NormalizedJob, SyncCompany } from "./types.ts";

const MIN_SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000;
const CONCURRENCY = 2;
const INSERT_BATCH = 40;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Sync failed";
}

function dedupeJobs(jobs: NormalizedJob[]): NormalizedJob[] {
  const byExternalId = new Map<string, NormalizedJob>();
  for (const job of jobs) {
    if (!byExternalId.has(job.externalId)) {
      byExternalId.set(job.externalId, job);
    }
  }
  return [...byExternalId.values()];
}

async function mapPool<T>(items: T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        return;
      }
      await task(next);
    }
  });
  await Promise.all(workers);
}

function jobSlug(companySlug: string, job: NormalizedJob, used: Set<string>): string {
  const title = job.title.toLowerCase().slice(0, 60);
  const externalBit = job.externalId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  return uniqueSlug(`${companySlug}-${title}`, externalBit || "job", used);
}

async function locationPolicies(): Promise<Map<string, "all" | "india_or_remote">> {
  const filePath = path.join(process.cwd(), "data", "companies.json");
  const parsed = companiesFileSchema.safeParse(JSON.parse(await readFile(filePath, "utf8")) as unknown);
  if (!parsed.success) {
    throw new Error("data/companies.json is invalid");
  }
  const policies = new Map<string, "all" | "india_or_remote">();
  for (const company of parsed.data) {
    if (company.locations) {
      policies.set(`${company.ats_type}:${company.ats_slug}`, company.locations);
    }
  }
  return policies;
}

async function syncCompany(
  company: SyncCompany,
  force: boolean,
  policies: Map<string, "all" | "india_or_remote">,
): Promise<void> {
  const db = getDb();
  const adapter = adapterFor(company.atsType);
  if (!adapter) {
    return;
  }

  if (!force && company.lastSyncedAt && Date.now() - company.lastSyncedAt.getTime() < MIN_SYNC_INTERVAL_MS) {
    console.log(`Skip ${company.name} (synced ${company.lastSyncedAt.toISOString()})`);
    return;
  }

  const startedAt = new Date();
  const [run] = await db
    .insert(syncRuns)
    .values({ source: `${company.atsType}:${company.atsSlug}`, startedAt })
    .returning({ id: syncRuns.id });

  if (!run) {
    throw new Error("Could not record sync run");
  }

  try {
    const policy = policies.get(`${company.atsType}:${company.atsSlug}`) ?? "all";
    const fetched = dedupeJobs(
      (await adapter.fetchJobs(company)).filter((job) => keepListedLocation(policy, job)),
    );
    const seenAt = new Date();
    const existing = await db
      .select({ externalId: jobs.externalId, slug: jobs.slug })
      .from(jobs)
      .where(eq(jobs.companyId, company.id));
    const slugByExternal = new Map(existing.map((row) => [row.externalId, row.slug]));
    const usedSlugs = new Set(existing.map((row) => row.slug));
    const jobsNew = fetched.filter((job) => !slugByExternal.has(job.externalId)).length;

    for (let index = 0; index < fetched.length; index += INSERT_BATCH) {
      const batch = fetched.slice(index, index + INSERT_BATCH);
      await db
        .insert(jobs)
        .values(
          batch.map((job) => ({
            companyId: company.id,
            externalId: job.externalId,
            title: job.title,
            slug: slugByExternal.get(job.externalId) ?? jobSlug(company.slug, job, usedSlugs),
            descriptionHtml: job.descriptionHtml,
            descriptionText: job.descriptionText,
            locationRaw: job.locationRaw,
            locationNormalized: job.locationNormalized,
            isRemote: job.isRemote,
            seniority: job.seniority,
            employmentType: job.employmentType,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            applyUrl: job.applyUrl,
            source: job.source,
            postedAt: job.postedAt,
            firstSeenAt: seenAt,
            lastSeenAt: seenAt,
            isActive: true,
          })),
        )
        .onConflictDoUpdate({
          target: [jobs.companyId, jobs.externalId],
          set: {
            title: sql`excluded.title`,
            descriptionHtml: sql`excluded.description_html`,
            descriptionText: sql`excluded.description_text`,
            locationRaw: sql`excluded.location_raw`,
            locationNormalized: sql`excluded.location_normalized`,
            isRemote: sql`excluded.is_remote`,
            seniority: sql`excluded.seniority`,
            employmentType: sql`excluded.employment_type`,
            salaryMin: sql`excluded.salary_min`,
            salaryMax: sql`excluded.salary_max`,
            salaryCurrency: sql`excluded.salary_currency`,
            applyUrl: sql`excluded.apply_url`,
            source: sql`excluded.source`,
            postedAt: sql`excluded.posted_at`,
            lastSeenAt: seenAt,
            isActive: true,
          },
        });
    }

    const closed =
      fetched.length === 0
        ? await db
            .update(jobs)
            .set({ isActive: false })
            .where(and(eq(jobs.companyId, company.id), eq(jobs.isActive, true)))
            .returning({ id: jobs.id })
        : await db
            .update(jobs)
            .set({ isActive: false })
            .where(and(eq(jobs.companyId, company.id), eq(jobs.isActive, true), lt(jobs.lastSeenAt, seenAt)))
            .returning({ id: jobs.id });

    await db
      .update(companies)
      .set({ lastSyncedAt: seenAt })
      .where(eq(companies.id, company.id));

    await db
      .update(syncRuns)
      .set({
        finishedAt: new Date(),
        jobsFound: fetched.length,
        jobsNew,
        jobsClosed: closed.length,
      })
      .where(eq(syncRuns.id, run.id));

    console.log(
      `${company.name}: ${fetched.length} found, ${jobsNew} new, ${closed.length} closed`,
    );
  } catch (error) {
    await db
      .update(syncRuns)
      .set({ finishedAt: new Date(), error: errorMessage(error) })
      .where(eq(syncRuns.id, run.id));
    console.error(`${company.name} failed: ${errorMessage(error)}`);
  }
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const db = getDb();
  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      atsType: companies.atsType,
      atsSlug: companies.atsSlug,
      lastSyncedAt: companies.lastSyncedAt,
    })
    .from(companies)
    .where(eq(companies.active, true));

  const supported = rows.filter((row) => adapterFor(row.atsType));
  const policies = await locationPolicies();
  console.log(`Syncing ${supported.length} companies${force ? " (force)" : ""}`);
  await mapPool(supported, CONCURRENCY, (company) => syncCompany(company, force, policies));
}

main()
  .catch((error: unknown) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
