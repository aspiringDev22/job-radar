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

import { hasBoardFilters, PAGE_SIZE, searchTokens, type BoardQuery } from "../lib/query";
import {
  FAMILY_BOOST,
  FIELD_SCORES,
  PHRASE_BOOST,
  rankGroups,
  searchPlan,
  titleForms,
  type SearchGroup,
  type SearchPlan,
} from "../lib/search";
import type { BoardData, CompanySummary } from "../types";

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

// Stemmed, for the description and the company name.
function englishQuery(group: SearchGroup): SQL {
  return sql`(${sql.join(
    group.words.map((word) => sql`phraseto_tsquery('english', ${word})`),
    sql` || `,
  )})`;
}

// Whole words, for jobs.title_vector (title and location).
function titleQuery(group: SearchGroup): SQL {
  return sql`(${sql.join(
    titleForms(group.words).map((word) => sql`phraseto_tsquery('simple', ${word})`),
    sql` || `,
  )})`;
}

// Every group must match the title, company or location. A skill may match the description instead.
// With descriptions on, any group may match the description.
function searchMatch(plan: SearchPlan, descriptions: boolean): SQL {
  return sql.join(
    plan.groups.map((group) => {
      const english = englishQuery(group);
      const anywhere = descriptions || group.skill ? sql` OR ${jobs.searchVector} @@ ${english}` : sql``;
      return sql`(${jobs.titleVector} @@ ${titleQuery(group)} OR ${companies.searchVector} @@ ${english}${anywhere})`;
    }),
    sql` AND `,
  );
}

function score(value: number): SQL {
  return sql.raw(String(value));
}

// Each group scores by the best field it matched. The whole query in order in the title adds a boost,
// and so does the family the query implies.
function searchScore(plan: SearchPlan): SQL<number> {
  const terms = plan.groups.map((group) => {
    const title = titleQuery(group);
    return sql`CASE
      WHEN ts_filter(${jobs.titleVector}, '{a}') @@ ${title} THEN ${score(FIELD_SCORES.a)}
      WHEN ${companies.searchVector} @@ ${englishQuery(group)} THEN ${score(FIELD_SCORES.b)}
      WHEN ${jobs.titleVector} @@ ${title} THEN ${score(FIELD_SCORES.c)}
      ELSE ${score(FIELD_SCORES.d)} END`;
  });
  const [first, ...rest] = plan.groups;
  const phrase =
    first && rest.length > 0
      ? sql` + CASE WHEN ts_filter(${jobs.titleVector}, '{a}') @@ ${rest.reduce(
          (query, group) => sql`tsquery_phrase(${query}, ${titleQuery(group)})`,
          titleQuery(first),
        )} THEN ${score(PHRASE_BOOST)} ELSE 0 END`
      : sql``;
  const family = plan.family
    ? sql` + CASE WHEN ${jobs.roleFamily} = ${plan.family} THEN ${score(FAMILY_BOOST)} ELSE 0 END`
    : sql``;
  return sql<number>`(${sql.join(terms, sql` + `)})${phrase}${family}`.mapWith(Number);
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
  if (query.category) {
    clauses.push(eq(jobs.category, query.category));
  }
  if (query.seniority) {
    clauses.push(eq(jobs.canonicalSeniority, query.seniority));
  }
  if (query.source) {
    clauses.push(eq(jobs.source, query.source));
  }
  if (plan) {
    clauses.push(searchMatch(plan, query.descriptions));
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

// SQL counts of listings, made the way groupListings makes them: rows share a listing key when they
// are one posting, and the posting is one listing when it names two or more places, else one per row.
const LISTING_KEY = sql`coalesce(${jobs.dedupeKey}, 'slug:' || ${jobs.slug})`;
const LISTING_PLACE = sql`coalesce(nullif(${jobs.city}, ''), nullif(${jobs.locationNormalized}, ''), CASE WHEN ${jobs.isRemote} THEN 'Remote' ELSE '' END)`;

function listingCount(members: SQL, places: SQL): SQL {
  return sql`sum(CASE WHEN ${places} >= 2 THEN 1 ELSE ${members} END)`;
}

function countClauses(query: BoardQuery, plan: SearchPlan | null): SQL[] {
  const clauses = [...matchClauses(query, plan), eq(companies.active, true)];
  if (query.company) {
    clauses.push(eq(companies.slug, query.company));
  }
  return clauses;
}

// Listings that match only because a search word is in the description.
async function countDescriptionMatches(query: BoardQuery, plan: SearchPlan): Promise<number> {
  const db = getDb();
  const strict = searchMatch(plan, false);
  const buckets = db
    .select({
      members: sql<number>`count(*)`.as("members"),
      places: sql<number>`count(DISTINCT ${LISTING_PLACE})`.as("places"),
      strictMembers: sql<number>`count(*) FILTER (WHERE ${strict})`.as("strict_members"),
      strictPlaces: sql<number>`count(DISTINCT ${LISTING_PLACE}) FILTER (WHERE ${strict})`.as("strict_places"),
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(...countClauses({ ...query, descriptions: true }, plan)))
    .groupBy(LISTING_KEY)
    .as("buckets");
  const [row] = await db
    .select({
      count: sql<number>`coalesce(${listingCount(sql`${buckets.members}`, sql`${buckets.places}`)} - ${listingCount(
        sql`${buckets.strictMembers}`,
        sql`${buckets.strictPlaces}`,
      )}, 0)`.mapWith(Number),
    })
    .from(buckets);
  return row?.count ?? 0;
}

// Listings per category under every filter except the category itself, for the Role filter.
async function countByCategory(query: BoardQuery, plan: SearchPlan | null): Promise<BoardData["categoryCounts"]> {
  const db = getDb();
  const buckets = db
    .select({
      category: jobs.category,
      members: sql<number>`count(*)`.as("members"),
      places: sql<number>`count(DISTINCT ${LISTING_PLACE})`.as("places"),
    })
    .from(jobs)
    .innerJoin(companies, eq(jobs.companyId, companies.id))
    .where(and(...countClauses({ ...query, category: null }, plan)))
    .groupBy(jobs.category, LISTING_KEY)
    .as("buckets");
  const rows = await db
    .select({
      category: buckets.category,
      count: sql<number>`${listingCount(sql`${buckets.members}`, sql`${buckets.places}`)}`.mapWith(Number),
    })
    .from(buckets)
    .groupBy(buckets.category);
  return Object.fromEntries(rows.map((row) => [row.category, row.count]));
}

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

  const [companyMeta, jobRows, descriptionMatches, categoryCounts] = await Promise.all([
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
    plan && !query.descriptions ? countDescriptionMatches(query, plan) : Promise.resolve(0),
    countByCategory(query, plan),
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
  // The picked company stays listed at 0, so the list still shows what is selected.
  if (hasBoardFilters(query)) {
    companyList = companyList.filter((item) => item.openRoles > 0 || item.slug === query.company);
  }

  const listGroups = query.company
    ? groups.filter((group) => group.representative.companySlug === query.company)
    : groups;
  const weekAgo = Date.now() - 7 * 86_400_000;
  const newThisWeek = listGroups.filter((group) => (group.representative.postedAt?.getTime() ?? 0) >= weekAgo).length;
  const pageCount = Math.max(1, Math.ceil(listGroups.length / PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const list = listGroups
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((group) => toSummary(group.representative, group.locationCount));

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
    listTotal: listGroups.length,
    descriptionMatches,
    categoryCounts,
    newThisWeek,
    page,
    pageCount,
  };
}
