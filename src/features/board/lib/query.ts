import { z } from "zod";

import { CANONICAL_SENIORITIES, ROLE_CATEGORIES, type CanonicalSeniority, type RoleCategory } from "../../jobs/index.ts";

export const BOARD_SOURCES = ["greenhouse", "lever", "ashby", "workable", "smartrecruiters", "recruitee", "workday", "amazon", "keka"] as const;
const POSTED = ["1", "7", "30"] as const;

export const PAGE_SIZE = 50;

// Levels from before the filter used the level read from the title.
const LEGACY_SENIORITIES: Record<string, CanonicalSeniority> = {
  staff: "staff_plus",
  principal: "staff_plus",
  executive: "manager",
};

export type BoardQuery = {
  q: string | null;
  location: string | null;
  remote: boolean;
  // The kind of work (`role` in the URL).
  category: RoleCategory | null;
  // Read from the title, so "Sr. Engineer" is senior even when the feed sends no level.
  seniority: CanonicalSeniority | null;
  source: (typeof BOARD_SOURCES)[number] | null;
  postedWithinDays: number | null;
  company: string | null;
  job: string | null;
  // 1-based. The loader clamps it to the last page.
  page: number;
  // Scope toggles. Off by default: India roles only, Amazon technical roles only.
  worldwide: boolean;
  operations: boolean;
  // Search words may match the description too, not only the title, company and location.
  descriptions: boolean;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw;
}

function textOrNull(value: string | undefined, max: number): string | null {
  const parsed = z.string().trim().min(1).max(max).safeParse(value ?? "");
  return parsed.success ? parsed.data : null;
}

export function parseBoardQuery(
  params: Record<string, string | string[] | undefined>,
): BoardQuery {
  const rawSeniority = firstParam(params.seniority);
  const seniority = z.enum(CANONICAL_SENIORITIES).safeParse(LEGACY_SENIORITIES[rawSeniority ?? ""] ?? rawSeniority);
  const category = z.enum(ROLE_CATEGORIES).safeParse(firstParam(params.role));
  const source = z.enum(BOARD_SOURCES).safeParse(firstParam(params.source));
  const posted = z.enum(POSTED).safeParse(firstParam(params.posted));
  const remote = z.literal("1").safeParse(firstParam(params.remote));
  const worldwide = z.literal("1").safeParse(firstParam(params.worldwide));
  const operations = z.literal("1").safeParse(firstParam(params.ops));
  const descriptions = z.literal("1").safeParse(firstParam(params.desc));
  const page = z.string().regex(/^[1-9][0-9]{0,3}$/).safeParse(firstParam(params.page));

  return {
    q: textOrNull(firstParam(params.q), 80),
    location: textOrNull(firstParam(params.location), 80),
    remote: remote.success,
    category: category.success ? category.data : null,
    seniority: seniority.success ? seniority.data : null,
    source: source.success ? source.data : null,
    postedWithinDays: posted.success ? Number(posted.data) : null,
    company: textOrNull(firstParam(params.company), 120),
    job: textOrNull(firstParam(params.job), 180),
    page: page.success ? Number(page.data) : 1,
    worldwide: worldwide.success,
    operations: operations.success,
    descriptions: descriptions.success,
  };
}

export function hasBoardFilters(query: BoardQuery): boolean {
  return Boolean(
    query.q ||
      query.location ||
      query.remote ||
      query.category ||
      query.seniority ||
      query.source ||
      query.postedWithinDays,
  );
}

const SEARCH_STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "for",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export function searchTokens(value: string): string[] {
  const tokens: string[] = [];
  for (const part of value.toLowerCase().split(/\s+/)) {
    const token = part.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, "");
    if (token.length < 2 || SEARCH_STOP_WORDS.has(token) || tokens.includes(token)) {
      continue;
    }
    tokens.push(token);
    if (tokens.length === 6) {
      break;
    }
  }
  return tokens;
}
