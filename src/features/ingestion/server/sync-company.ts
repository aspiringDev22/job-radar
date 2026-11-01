import { and, eq, inArray, sql } from "drizzle-orm";

import { companies } from "../../companies/schema.ts";
import { jobs } from "../../jobs/schema.ts";
import { getDb } from "../../../shared/db/client.ts";
import { uniqueSlug } from "../../../shared/lib/slug.ts";

import { adapterFor } from "../adapters/index.ts";
import { dedupeKey } from "../lib/dedupe-key.ts";
import { classifyFamily, classifyPlace, classifySeniority, keepListedLocation } from "../lib/normalize.ts";
import { planSuccessfulSync } from "../lib/sync-plan.ts";
import type { CompanyOutcome } from "../lib/sync-run.ts";
import { companySyncs } from "../schema.ts";
import type { NormalizedJob, SyncCompany } from "../types.ts";

const INSERT_BATCH = 40;
const CLOSE_BATCH = 200;

export type LocationPolicies = Map<string, "all" | "india_or_remote">;

export type CompanySyncContext = {
  runId: string | null;
  dryRun: boolean;
  policies: LocationPolicies;
};

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Sync failed";
}

function classifiedJob(company: SyncCompany, job: NormalizedJob) {
  const place = classifyPlace(job.locationNormalized, job.isRemote);
  return {
    canonicalSeniority: classifySeniority(job.title),
    roleFamily: classifyFamily(job.title),
    city: place.city,
    region: place.region,
    country: place.country,
    workMode: place.workMode,
    dedupeKey: dedupeKey(company.slug, job.title, place.city, job.locationNormalized, job.descriptionText),
  };
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

function jobSlug(companySlug: string, job: NormalizedJob, used: Set<string>): string {
  const title = job.title.toLowerCase().slice(0, 60);
  const externalBit = job.externalId.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase();
  return uniqueSlug(`${companySlug}-${title}`, externalBit || "job", used);
}

async function closeMissingRoles(companyId: string, externalIds: string[], closedAt: Date): Promise<void> {
  const db = getDb();
  for (let index = 0; index < externalIds.length; index += CLOSE_BATCH) {
    const batch = externalIds.slice(index, index + CLOSE_BATCH);
    await db
      .update(jobs)
      .set({ isActive: false, status: "closed", closedAt })
      .where(and(eq(jobs.companyId, companyId), eq(jobs.isActive, true), inArray(jobs.externalId, batch)));
  }
}

function printDryRun(
  companyName: string,
  found: number,
  plan: ReturnType<typeof planSuccessfulSync>,
): void {
  console.log(
    `[dry-run] ${companyName}: ${found} found, ${plan.adding.length} new, ${plan.reopening.length} would reopen, ${plan.closing.length} would close`,
  );
  const shown = plan.closing.slice(0, 50);
  for (const role of shown) {
    console.log(`  close ${role.slug} — ${role.title}`);
  }
  if (plan.closing.length > shown.length) {
    console.log(`  … ${plan.closing.length - shown.length} more`);
  }
  for (const role of plan.reopening.slice(0, 20)) {
    console.log(`  reopen ${role.slug} — ${role.title}`);
  }
}

export async function syncCompany(company: SyncCompany, context: CompanySyncContext): Promise<CompanyOutcome> {
  const db = getDb();
  const { dryRun, policies, runId } = context;
  const adapter = adapterFor(company.atsType);
  if (!adapter) {
    return { status: "skipped" };
  }

  let companySyncId: string | undefined;
  if (!dryRun) {
    const [row] = await db
      .insert(companySyncs)
      .values({
        runId,
        companyId: company.id,
        source: `${company.atsType}:${company.atsSlug}`,
        startedAt: new Date(),
      })
      .returning({ id: companySyncs.id });
    if (!row) {
      throw new Error("Could not record company sync");
    }
    companySyncId = row.id;
  }

  try {
    const policy = policies.get(`${company.atsType}:${company.atsSlug}`) ?? "all";
    const fetched = dedupeJobs(
      (await adapter.fetchJobs(company)).filter((job) => keepListedLocation(policy, job)),
    );
    const seenAt = new Date();
    const existing = await db
      .select({
        externalId: jobs.externalId,
        slug: jobs.slug,
        title: jobs.title,
        isActive: jobs.isActive,
        status: jobs.status,
      })
      .from(jobs)
      .where(eq(jobs.companyId, company.id));
    const plan = planSuccessfulSync(
      existing,
      fetched.map((job) => job.externalId),
    );
    const outcome: CompanyOutcome = {
      status: "ok",
      found: fetched.length,
      added: plan.adding.length,
      reopened: plan.reopening.length,
      closed: plan.closing.length,
    };
    if (dryRun) {
      printDryRun(company.name, fetched.length, plan);
      return outcome;
    }

    const slugByExternal = new Map(existing.map((row) => [row.externalId, row.slug]));
    const usedSlugs = new Set(existing.map((row) => row.slug));

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
            ...classifiedJob(company, job),
            employmentType: job.employmentType,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            applyUrl: job.applyUrl,
            source: job.source,
            postedAt: job.postedAt,
            department: job.department ?? null,
            firstSeenAt: seenAt,
            lastSeenAt: seenAt,
            isActive: true,
            status: "open" as const,
            closedAt: null,
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
            canonicalSeniority: sql`excluded.canonical_seniority`,
            roleFamily: sql`excluded.role_family`,
            city: sql`excluded.city`,
            region: sql`excluded.region`,
            country: sql`excluded.country`,
            workMode: sql`excluded.work_mode`,
            dedupeKey: sql`excluded.dedupe_key`,
            employmentType: sql`excluded.employment_type`,
            salaryMin: sql`excluded.salary_min`,
            salaryMax: sql`excluded.salary_max`,
            salaryCurrency: sql`excluded.salary_currency`,
            applyUrl: sql`excluded.apply_url`,
            source: sql`excluded.source`,
            postedAt: sql`excluded.posted_at`,
            department: sql`excluded.department`,
            lastSeenAt: seenAt,
            isActive: true,
            status: "open",
            closedAt: null,
          },
        });
    }

    await closeMissingRoles(
      company.id,
      plan.closing.map((role) => role.externalId),
      seenAt,
    );

    await db
      .update(companies)
      .set({
        lastSyncedAt: seenAt,
        lastSuccessAt: seenAt,
        lastError: null,
        consecutiveFailures: 0,
        lastRoleCount: fetched.length,
      })
      .where(eq(companies.id, company.id));

    if (companySyncId) {
      await db
        .update(companySyncs)
        .set({
          finishedAt: new Date(),
          jobsFound: outcome.found,
          jobsNew: outcome.added,
          jobsReopened: outcome.reopened,
          jobsClosed: outcome.closed,
        })
        .where(eq(companySyncs.id, companySyncId));
    }

    console.log(
      `${company.name}: ${fetched.length} found, ${plan.adding.length} new, ${plan.reopening.length} reopened, ${plan.closing.length} closed`,
    );
    return outcome;
  } catch (error) {
    const message = errorMessage(error);
    if (dryRun || !companySyncId) {
      console.error(`${dryRun ? "[dry-run] " : ""}${company.name} failed: ${message} (no roles closed)`);
      return { status: "failed", error: message };
    }
    const failedAt = new Date();
    await db
      .update(companySyncs)
      .set({ finishedAt: failedAt, error: message })
      .where(eq(companySyncs.id, companySyncId));
    await db
      .update(companies)
      .set({
        lastSyncedAt: failedAt,
        lastError: message,
        consecutiveFailures: sql`${companies.consecutiveFailures} + 1`,
      })
      .where(eq(companies.id, company.id));
    console.error(`${company.name} failed: ${message}`);
    return { status: "failed", error: message };
  }
}
