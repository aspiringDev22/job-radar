import { z } from "zod";

import { SENIORITIES } from "../../jobs/index.ts";

const SOURCES = ["greenhouse", "lever", "ashby", "workable", "smartrecruiters", "recruitee", "workday", "amazon", "keka"] as const;
const POSTED = ["1", "7", "30"] as const;

export type BoardQuery = {
  q: string | null;
  location: string | null;
  remote: boolean;
  seniority: (typeof SENIORITIES)[number] | null;
  source: (typeof SOURCES)[number] | null;
  postedWithinDays: number | null;
  company: string | null;
  job: string | null;
  // Scope toggles. Off by default: India roles only, Amazon technical roles only.
  worldwide: boolean;
  operations: boolean;
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
  const seniority = z.enum(SENIORITIES).safeParse(firstParam(params.seniority));
  const source = z.enum(SOURCES).safeParse(firstParam(params.source));
  const posted = z.enum(POSTED).safeParse(firstParam(params.posted));
  const remote = z.literal("1").safeParse(firstParam(params.remote));
  const worldwide = z.literal("1").safeParse(firstParam(params.worldwide));
  const operations = z.literal("1").safeParse(firstParam(params.ops));

  return {
    q: textOrNull(firstParam(params.q), 80),
    location: textOrNull(firstParam(params.location), 80),
    remote: remote.success,
    seniority: seniority.success ? seniority.data : null,
    source: source.success ? source.data : null,
    postedWithinDays: posted.success ? Number(posted.data) : null,
    company: textOrNull(firstParam(params.company), 120),
    job: textOrNull(firstParam(params.job), 180),
    worldwide: worldwide.success,
    operations: operations.success,
  };
}

export function hasBoardFilters(query: BoardQuery): boolean {
  return Boolean(
    query.q ||
      query.location ||
      query.remote ||
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
