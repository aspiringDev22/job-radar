import { connection } from "next/server";
import { and, eq, gte, or, sql } from "drizzle-orm";

import { companies } from "@/features/companies/schema";
import { getDb } from "@/shared/db/client";

import { SENIORITIES } from "../constants";
import { groupListings, postingLocations, type JobLocation } from "../lib/listing";
import { CLOSED_ROLE_VISIBLE_MS } from "../lib/role-status";
import { jobs } from "../schema";
import type { JobRecord, LevelPay } from "../types";

const LEVEL_LABELS: Record<string, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
  executive: "Executive",
};

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function loadLevelPay(
  companySlug: string,
  seniority: string | null,
): Promise<LevelPay | null> {
  const label = seniority ? LEVEL_LABELS[seniority] : undefined;
  if (!label) {
    return null;
  }
  const db = getDb();
  // Medians are taken within one currency, the one most of these roles publish in
  // (INR on a tie). Ranges in other currencies are left out, not converted.
  const [row] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
      low: sql<number | null>`percentile_cont(0.5) within group (order by ${jobs.salaryMin})`,
      high: sql<number | null>`percentile_cont(0.5) within group (order by ${jobs.salaryMax})`,
      currency: jobs.salaryCurrency,
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(
      and(
        eq(companies.slug, companySlug),
        eq(jobs.seniority, seniority as (typeof SENIORITIES)[number]),
        eq(jobs.isActive, true),
        sql`${jobs.salaryMin} is not null`,
        sql`${jobs.salaryMax} is not null`,
        sql`${jobs.salaryCurrency} is not null`,
      ),
    )
    .groupBy(jobs.salaryCurrency)
    .orderBy(sql`count(*) desc`, sql`${jobs.salaryCurrency} = 'INR' desc`)
    .limit(1);
  const count = asNumber(row?.count);
  const salaryMin = Math.round(asNumber(row?.low));
  const salaryMax = Math.round(asNumber(row?.high));
  if (!row?.currency || count < 2 || salaryMin <= 0 || salaryMax < salaryMin) {
    return null;
  }
  return {
    label,
    count,
    salaryMin,
    salaryMax,
    salaryCurrency: row.currency,
  };
}

export const jobSummaryColumns = {
  slug: jobs.slug,
  title: jobs.title,
  companyName: companies.name,
  companySlug: companies.slug,
  location: jobs.locationNormalized,
  city: jobs.city,
  isRemote: jobs.isRemote,
  dedupeKey: jobs.dedupeKey,
  applyUrl: jobs.applyUrl,
  source: jobs.source,
  postedAt: jobs.postedAt,
  salaryMin: jobs.salaryMin,
  salaryMax: jobs.salaryMax,
  salaryCurrency: jobs.salaryCurrency,
  seniority: jobs.seniority,
  employmentType: jobs.employmentType,
};

export async function loadJob(slug: string): Promise<JobRecord | null> {
  await connection();
  const db = getDb();
  const [row] = await db
    .select({
      ...jobSummaryColumns,
      companyId: jobs.companyId,
      descriptionText: jobs.descriptionText,
      externalId: jobs.externalId,
      companyWebsite: companies.website,
      firstSeenAt: jobs.firstSeenAt,
      status: jobs.status,
      closedAt: jobs.closedAt,
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(
      and(
        eq(jobs.slug, slug),
        or(
          and(eq(jobs.isActive, true), eq(companies.active, true)),
          and(
            eq(jobs.status, "closed"),
            gte(jobs.closedAt, new Date(Date.now() - CLOSED_ROLE_VISIBLE_MS)),
          ),
        ),
      ),
    )
    .limit(1);
  if (!row) {
    return null;
  }

  let locationCount = 1;
  let locations: JobLocation[] = [];
  if (row.status === "open" && row.dedupeKey) {
    const siblings = await db
      .select({
        slug: jobs.slug,
        dedupeKey: jobs.dedupeKey,
        city: jobs.city,
        location: jobs.locationNormalized,
        isRemote: jobs.isRemote,
        postedAt: jobs.postedAt,
        applyUrl: jobs.applyUrl,
      })
      .from(jobs)
      .where(and(eq(jobs.dedupeKey, row.dedupeKey), eq(jobs.companyId, row.companyId), eq(jobs.isActive, true)));
    const group = groupListings(siblings).find((item) => item.members.some((member) => member.slug === slug));
    if (group && group.locationCount > 1) {
      locationCount = group.locationCount;
      locations = postingLocations(group.members);
    }
  }

  return {
    slug: row.slug,
    title: row.title,
    companyName: row.companyName,
    companySlug: row.companySlug,
    location: row.location,
    isRemote: row.isRemote,
    locationCount,
    source: row.source,
    postedAt: row.postedAt,
    salaryMin: row.salaryMin,
    salaryMax: row.salaryMax,
    salaryCurrency: row.salaryCurrency,
    descriptionText: row.descriptionText,
    applyUrl: row.applyUrl,
    seniority: row.seniority,
    employmentType: row.employmentType,
    locations,
    externalId: row.externalId,
    companyWebsite: row.companyWebsite,
    firstSeenAt: row.firstSeenAt,
    status: row.status,
    closedAt: row.closedAt,
    levelPay: await loadLevelPay(row.companySlug, row.seniority),
  };
}

export async function loadSitemapJobs(): Promise<{ slug: string; updatedAt: Date }[]> {
  await connection();
  const db = getDb();
  const rows = await db
    .select({
      slug: jobs.slug,
      postedAt: jobs.postedAt,
      lastSeenAt: jobs.lastSeenAt,
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(eq(jobs.isActive, true), eq(jobs.status, "open"), eq(companies.active, true)));

  return rows.map((row) => ({
    slug: row.slug,
    updatedAt: row.postedAt ?? row.lastSeenAt,
  }));
}
