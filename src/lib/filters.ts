import { z } from "zod";

import { SENIORITIES } from "@/db/schema/enums";

const SOURCES = ["greenhouse", "lever", "ashby", "workable", "smartrecruiters", "recruitee", "workday", "amazon"] as const;
const POSTED = ["1", "7", "30"] as const;

export const LOCATION_GROUPS = [
  { id: "bengaluru", label: "Bengaluru", terms: ["bengaluru", "bangalore"] },
  { id: "hyderabad", label: "Hyderabad", terms: ["hyderabad"] },
  { id: "mumbai", label: "Mumbai", terms: ["mumbai"] },
  { id: "pune", label: "Pune", terms: ["pune"] },
  { id: "chennai", label: "Chennai", terms: ["chennai"] },
  {
    id: "delhi-ncr",
    label: "Delhi NCR",
    terms: ["delhi", "gurgaon", "gurugram", "noida", "ncr", "ghaziabad", "faridabad"],
  },
  {
    id: "india",
    label: "India",
    terms: [
      "india",
      "bengaluru",
      "bangalore",
      "hyderabad",
      "mumbai",
      "pune",
      "chennai",
      "delhi",
      "gurgaon",
      "gurugram",
      "noida",
      "ncr",
      "ghaziabad",
      "faridabad",
      "kolkata",
      "ahmedabad",
      "jaipur",
      "kochi",
      "chandigarh",
      "indore",
      "coimbatore",
      "thiruvananthapuram",
      "trivandrum",
    ],
  },
] as const;

export type BoardQuery = {
  q: string | null;
  location: string | null;
  remote: boolean;
  seniority: (typeof SENIORITIES)[number] | null;
  source: (typeof SOURCES)[number] | null;
  postedWithinDays: number | null;
  company: string | null;
  job: string | null;
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

  return {
    q: textOrNull(firstParam(params.q), 80),
    location: textOrNull(firstParam(params.location), 80),
    remote: remote.success,
    seniority: seniority.success ? seniority.data : null,
    source: source.success ? source.data : null,
    postedWithinDays: posted.success ? Number(posted.data) : null,
    company: textOrNull(firstParam(params.company), 120),
    job: textOrNull(firstParam(params.job), 180),
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

export function locationTerms(input: string): string[] {
  const key = input.trim().toLowerCase();
  const named = LOCATION_GROUPS.find(
    (group) => group.id === key || group.label.toLowerCase() === key,
  );
  if (named) {
    return [...named.terms];
  }
  const exact = LOCATION_GROUPS.filter((group) =>
    group.terms.some((term) => term === key),
  ).sort((a, b) => a.terms.length - b.terms.length)[0];
  return exact ? [...exact.terms] : [input.trim()];
}

export function activeLocationId(value: string | null): string | null {
  if (!value) {
    return null;
  }
  const key = value.trim().toLowerCase();
  const named = LOCATION_GROUPS.find(
    (group) => group.id === key || group.label.toLowerCase() === key,
  );
  if (named) {
    return named.id;
  }
  const exact = LOCATION_GROUPS.filter((group) =>
    group.terms.some((term) => term === key),
  ).sort((a, b) => a.terms.length - b.terms.length)[0];
  return exact?.id ?? null;
}

export function locationInIndia(location: string | null): boolean {
  if (!location) {
    return false;
  }
  const haystack = location.toLowerCase();
  return LOCATION_GROUPS.find((group) => group.id === "india")?.terms.some((term) =>
    haystack.includes(term),
  ) ?? false;
}
