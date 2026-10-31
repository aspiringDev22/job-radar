import { connection } from "next/server";
import { and, desc, eq, gte, ilike, or, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/db/client";
import { companies } from "@/db/schema/companies";
import { SENIORITIES } from "@/db/schema/enums";
import { jobs } from "@/db/schema/jobs";
import { hasBoardFilters, locationTerms, searchTokens, type BoardQuery } from "@/lib/filters";

const LIST_LIMIT = 120;

const LEVEL_LABELS: Record<string, string> = {
  intern: "Intern",
  junior: "Junior",
  mid: "Mid",
  senior: "Senior",
  staff: "Staff",
  principal: "Principal",
  executive: "Executive",
};

export type CompanySummary = {
  name: string;
  slug: string;
  openRoles: number;
};

export type JobSummary = {
  slug: string;
  title: string;
  companyName: string;
  companySlug: string;
  location: string | null;
  isRemote: boolean;
  source: string;
  postedAt: Date | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
};

export type LevelPay = {
  label: string;
  count: number;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
};

export type JobDetail = JobSummary & {
  descriptionText: string | null;
  applyUrl: string | null;
  seniority: string | null;
  employmentType: string | null;
  levelPay: LevelPay | null;
};

export type JobRecord = JobDetail & {
  externalId: string;
  companyWebsite: string | null;
  firstSeenAt: Date;
};

export type BoardData = {
  companies: CompanySummary[];
  jobs: JobSummary[];
  selected: JobDetail | null;
  totalRoles: number;
  updatedAt: Date | null;
  truncated: boolean;
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

function asDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function likePattern(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
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
  const [row] = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
      low: sql<number | null>`percentile_cont(0.5) within group (order by ${jobs.salaryMin})`,
      high: sql<number | null>`percentile_cont(0.5) within group (order by ${jobs.salaryMax})`,
      currency: sql<string | null>`mode() within group (order by ${jobs.salaryCurrency})`,
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
    );
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

function matchClauses(query: BoardQuery): SQL[] {
  const clauses: SQL[] = [eq(jobs.isActive, true)];
  if (query.remote) {
    clauses.push(eq(jobs.isRemote, true));
  }
  if (query.seniority) {
    clauses.push(eq(jobs.seniority, query.seniority));
  }
  if (query.source) {
    clauses.push(eq(jobs.source, query.source));
  }
  if (query.q) {
    const tokens = searchTokens(query.q);
    const words = tokens.length > 0 ? tokens : [query.q];
    for (const word of words) {
      const pattern = likePattern(word);
      const contains = or(
        ilike(jobs.title, pattern),
        ilike(jobs.descriptionText, pattern),
        ilike(jobs.locationNormalized, pattern),
        ilike(companies.name, pattern),
      );
      if (contains) {
        clauses.push(contains);
      }
    }
  }
  if (query.postedWithinDays) {
    const since = new Date(Date.now() - query.postedWithinDays * 86_400_000);
    clauses.push(gte(jobs.postedAt, since));
  }
  if (query.location) {
    const terms = locationTerms(query.location);
    const freeText = terms.length === 1 && terms[0] === query.location.trim();
    const words = freeText ? searchTokens(query.location) : [];
    const locationMatch = freeText
      ? and(
          ...(words.length > 0 ? words : [query.location.trim()]).map((word) =>
            ilike(jobs.locationNormalized, likePattern(word)),
          ),
        )
      : or(...terms.map((term) => ilike(jobs.locationNormalized, likePattern(term))));
    if (locationMatch) {
      clauses.push(locationMatch);
    }
  }
  return clauses;
}

const jobColumns = {
  slug: jobs.slug,
  title: jobs.title,
  companyName: companies.name,
  companySlug: companies.slug,
  location: jobs.locationNormalized,
  isRemote: jobs.isRemote,
  source: jobs.source,
  postedAt: jobs.postedAt,
  salaryMin: jobs.salaryMin,
  salaryMax: jobs.salaryMax,
  salaryCurrency: jobs.salaryCurrency,
  seniority: jobs.seniority,
  employmentType: jobs.employmentType,
};

export async function loadBoard(query: BoardQuery): Promise<BoardData> {
  await connection();
  const db = getDb();
  const matches = matchClauses(query);

  const companyRows = await db
    .select({
      name: companies.name,
      slug: companies.slug,
      openRoles: sql<number>`cast(count(${jobs.id}) as int)`,
      latestSync: sql<Date | null>`max(${companies.lastSyncedAt})`,
    })
    .from(companies)
    .leftJoin(jobs, and(eq(jobs.companyId, companies.id), ...matches))
    .where(eq(companies.active, true))
    .groupBy(companies.id, companies.name, companies.slug)
    .orderBy(sql`count(${jobs.id}) desc`, companies.name);

  let companyList: CompanySummary[] = companyRows.map((row) => ({
    name: row.name,
    slug: row.slug,
    openRoles: asNumber(row.openRoles),
  }));
  if (hasBoardFilters(query)) {
    companyList = companyList.filter((company) => company.openRoles > 0);
  }

  const listFilters = [...matches, eq(companies.active, true)];
  if (query.company) {
    listFilters.push(eq(companies.slug, query.company));
  }

  const jobRows = await db
    .select(jobColumns)
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(...listFilters))
    .orderBy(desc(jobs.postedAt))
    .limit(LIST_LIMIT + 1);

  const truncated = jobRows.length > LIST_LIMIT;
  const list = jobRows.slice(0, LIST_LIMIT);

  let selected: JobDetail | null = null;
  if (query.job) {
    const [detail] = await db
      .select({
        ...jobColumns,
        descriptionText: jobs.descriptionText,
        applyUrl: jobs.applyUrl,
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(and(...listFilters, eq(jobs.slug, query.job)))
      .limit(1);
    selected = detail ? { ...detail, levelPay: await loadLevelPay(detail.companySlug, detail.seniority) } : null;
  }

  const updatedAt = companyRows.reduce<Date | null>((latest, row) => {
    const value = asDate(row.latestSync);
    if (!value) {
      return latest;
    }
    if (!latest || value > latest) {
      return value;
    }
    return latest;
  }, null);

  return {
    companies: companyList,
    jobs: list,
    selected,
    totalRoles: companyList.reduce((sum, company) => sum + company.openRoles, 0),
    updatedAt,
    truncated,
  };
}

export async function loadJob(slug: string): Promise<JobRecord | null> {
  await connection();
  const db = getDb();
  const [row] = await db
    .select({
      ...jobColumns,
      descriptionText: jobs.descriptionText,
      applyUrl: jobs.applyUrl,
      externalId: jobs.externalId,
      companyWebsite: companies.website,
      firstSeenAt: jobs.firstSeenAt,
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(eq(jobs.isActive, true), eq(companies.active, true), eq(jobs.slug, slug)))
    .limit(1);
  if (!row) {
    return null;
  }
  return { ...row, levelPay: await loadLevelPay(row.companySlug, row.seniority) };
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
    .where(and(eq(jobs.isActive, true), eq(companies.active, true)));

  return rows.map((row) => ({
    slug: row.slug,
    updatedAt: row.postedAt ?? row.lastSeenAt,
  }));
}
