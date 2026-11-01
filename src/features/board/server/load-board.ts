import { connection } from "next/server";
import { and, eq, gte, ilike, inArray, isNull, ne, or, sql, type SQL } from "drizzle-orm";

import { companies } from "@/features/companies/schema";
import {
  AMAZON_TECHNICAL_DEPARTMENTS,
  groupListings,
  locationTerms,
  postingLocations,
  type JobDetail,
  type JobSummary,
  type ListingMember,
} from "@/features/jobs";
import { jobs } from "@/features/jobs/schema";
import { jobSummaryColumns, loadLevelPay } from "@/features/jobs/server";
import { getDb } from "@/shared/db/client";

import { hasBoardFilters, searchTokens, type BoardQuery } from "../lib/query";
import { FAMILY_BOOST, FIELD_SCORES, rankGroups, searchPlan, type SearchPlan } from "../lib/search";
import type { BoardData, CompanySummary } from "../types";

const LIST_LIMIT = 120;

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

function groupQuery(alternatives: string[]): SQL {
  return sql`(${sql.join(
    alternatives.map((word) => sql`plainto_tsquery('english', ${word})`),
    sql` || `,
  )})`;
}

// A role matches when every search group matches its title, company, location or description.
// Testing the two vectors separately is about three times faster than concatenating them.
function searchMatch(plan: SearchPlan): SQL {
  return sql.join(
    plan.groups.map((group) => {
      const query = groupQuery(group);
      return sql`(${jobs.searchVector} @@ ${query} OR ${companies.searchVector} @@ ${query})`;
    }),
    sql` AND `,
  );
}

function score(value: number): SQL {
  return sql.raw(String(value));
}

// Each group scores by the best field it matched, plus a boost for the family the query implies.
function searchScore(plan: SearchPlan): SQL<number> {
  const terms = plan.groups.map((group) => {
    const query = groupQuery(group);
    return sql`CASE
      WHEN ts_filter(${jobs.searchVector}, '{a}') @@ ${query} THEN ${score(FIELD_SCORES.a)}
      WHEN ${companies.searchVector} @@ ${query} THEN ${score(FIELD_SCORES.b)}
      WHEN ts_filter(${jobs.searchVector}, '{c}') @@ ${query} THEN ${score(FIELD_SCORES.c)}
      ELSE ${score(FIELD_SCORES.d)} END`;
  });
  const family = plan.family
    ? sql` + CASE WHEN ${jobs.roleFamily} = ${plan.family} THEN ${score(FAMILY_BOOST)} ELSE 0 END`
    : sql``;
  return sql<number>`(${sql.join(terms, sql` + `)})${family}`.mapWith(Number);
}

// India roles only, unless the searcher includes remote roles from anywhere.
// Onsite roles outside India never show on the board.
function scopeClauses(query: BoardQuery): SQL[] {
  const inIndia = eq(jobs.country, "India");
  const place = query.worldwide ? or(inIndia, eq(jobs.isRemote, true)) : inIndia;
  const clauses: SQL[] = place ? [place] : [];
  if (!query.operations) {
    const technical = or(
      ne(jobs.source, "amazon"),
      isNull(jobs.department),
      inArray(jobs.department, AMAZON_TECHNICAL_DEPARTMENTS),
    );
    if (technical) {
      clauses.push(technical);
    }
  }
  return clauses;
}

function matchClauses(query: BoardQuery, plan: SearchPlan | null): SQL[] {
  const clauses: SQL[] = [eq(jobs.isActive, true), ...scopeClauses(query)];
  if (query.remote) {
    clauses.push(eq(jobs.isRemote, true));
  }
  if (query.seniority) {
    clauses.push(eq(jobs.seniority, query.seniority));
  }
  if (query.source) {
    clauses.push(eq(jobs.source, query.source));
  }
  if (plan) {
    clauses.push(searchMatch(plan));
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

type BoardJobRow = ListingMember & {
  title: string;
  companyName: string;
  companySlug: string;
  source: string;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  seniority: string | null;
  employmentType: string | null;
};

function toSummary(row: BoardJobRow, locationCount: number): JobSummary {
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
  };
}

export async function loadBoard(query: BoardQuery): Promise<BoardData> {
  await connection();
  const db = getDb();
  const plan = query.q ? searchPlan(query.q) : null;
  const matches = matchClauses(query, plan);

  const [companyMeta, jobRows] = await Promise.all([
    db
      .select({
        name: companies.name,
        slug: companies.slug,
        latestSync: companies.lastSuccessAt,
      })
      .from(companies)
      .where(eq(companies.active, true)),
    db
      .select({
        ...jobSummaryColumns,
        score: plan ? searchScore(plan) : sql<number>`0`.mapWith(Number),
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(and(...matches, eq(companies.active, true))),
  ]);

  const groups = plan ? rankGroups(groupListings(jobRows), (row) => row.score) : groupListings(jobRows);
  const openRoles = new Map<string, number>();
  for (const group of groups) {
    const slug = group.representative.companySlug;
    openRoles.set(slug, (openRoles.get(slug) ?? 0) + 1);
  }

  let companyList: CompanySummary[] = companyMeta
    .map((company) => ({
      name: company.name,
      slug: company.slug,
      openRoles: openRoles.get(company.slug) ?? 0,
    }))
    .sort((left, right) => right.openRoles - left.openRoles || left.name.localeCompare(right.name, "en"));
  const company = query.company ? (companyList.find((item) => item.slug === query.company) ?? null) : null;
  if (hasBoardFilters(query)) {
    companyList = companyList.filter((company) => company.openRoles > 0);
  }

  const listGroups = query.company
    ? groups.filter((group) => group.representative.companySlug === query.company)
    : groups;
  const truncated = listGroups.length > LIST_LIMIT;
  const list = listGroups.slice(0, LIST_LIMIT).map((group) => toSummary(group.representative, group.locationCount));

  let selected: JobDetail | null = null;
  if (query.job) {
    const group = listGroups.find((item) => item.members.some((member) => member.slug === query.job));
    if (group) {
      const shown =
        group.locationCount > 1
          ? group.representative
          : (group.members.find((member) => member.slug === query.job) ?? group.representative);
      const [copy] = await db
        .select({ descriptionText: jobs.descriptionText })
        .from(jobs)
        .where(eq(jobs.slug, shown.slug))
        .limit(1);
      selected = {
        ...toSummary(shown, group.locationCount),
        descriptionText: copy?.descriptionText ?? null,
        applyUrl: shown.applyUrl,
        seniority: shown.seniority,
        employmentType: shown.employmentType,
        locations: group.locationCount > 1 ? postingLocations(group.members) : [],
        levelPay: await loadLevelPay(shown.companySlug, shown.seniority),
      };
    }
  }

  const updatedAt = companyMeta.reduce<Date | null>((latest, row) => {
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
    company,
    totalRoles: companyList.reduce((sum, item) => sum + item.openRoles, 0),
    updatedAt,
    truncated,
  };
}
