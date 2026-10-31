import { z } from "zod";

import { fetchJson } from "../http.ts";
import {
  decodeHtml,
  detectRemote,
  guessEmployment,
  guessSeniority,
  htmlToText,
  isIndiaPlace,
  normalizeLocation,
  parsePostedAt,
  parseSalary,
} from "../normalize.ts";
import { normalizedJobSchema, type Adapter, type NormalizedJob } from "../types.ts";

const PAGE_SIZE = 100;
const SEARCH_URL = "https://www.amazon.jobs/en/search.json";

const KEPT_CATEGORIES = new Set([
  "Software Development",
  "Applied Science",
  "Project/Program/Product Management--Technical",
  "Solutions Architect",
  "Systems, Quality, & Security Engineering",
  "Design",
  "Business Intelligence",
]);

const amazonJobSchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  id_icims: z.union([z.string(), z.number()]).optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  basic_qualifications: z.string().nullable().optional(),
  preferred_qualifications: z.string().nullable().optional(),
  normalized_location: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  country_code: z.string().nullable().optional(),
  job_category: z.string().nullable().optional(),
  job_path: z.string().nullable().optional(),
  posted_date: z.string().nullable().optional(),
  job_schedule_type: z.string().nullable().optional(),
  is_intern: z.boolean().nullable().optional(),
});

export function parseAmazonJob(payload: unknown): NormalizedJob | null {
  const parsed = amazonJobSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  const job = parsed.data;
  if (job.job_category && !KEPT_CATEGORIES.has(job.job_category)) {
    return null;
  }
  const locationRaw = normalizeLocation(job.normalized_location ?? job.location);
  const inIndia = job.country_code === "IND" || isIndiaPlace(locationRaw);
  if (!inIndia) {
    return null;
  }
  const html = [job.description, job.basic_qualifications, job.preferred_qualifications]
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => decodeHtml(part))
    .join("\n");
  const text = html ? htmlToText(html) : null;
  const salary = parseSalary(text);
  const externalId = String(job.id_icims ?? job.id ?? "");
  const candidate = normalizedJobSchema.safeParse({
    externalId,
    title: job.title,
    descriptionHtml: html || null,
    descriptionText: text,
    locationRaw,
    locationNormalized: locationRaw,
    isRemote: detectRemote([locationRaw, job.title]),
    seniority: guessSeniority(job.title),
    employmentType: job.is_intern ? "internship" : guessEmployment(job.job_schedule_type),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    applyUrl: job.job_path ? `https://www.amazon.jobs${job.job_path}` : null,
    source: "amazon",
    postedAt: parsePostedAt(job.posted_date),
  });
  return candidate.success ? candidate.data : null;
}

export function parseAmazonPage(payload: unknown): { hits: number; rawCount: number; jobs: NormalizedJob[] } {
  const parsed = z
    .object({
      error: z.string().nullable().optional(),
      hits: z.number().optional(),
      jobs: z.array(z.unknown()).nullable().optional(),
    })
    .safeParse(payload);
  if (!parsed.success || parsed.data.error) {
    throw new Error(parsed.success && parsed.data.error ? parsed.data.error : "Unexpected Amazon response");
  }
  const rows = parsed.data.jobs ?? [];
  const jobs: NormalizedJob[] = [];
  for (const item of rows) {
    const job = parseAmazonJob(item);
    if (job) {
      jobs.push(job);
    }
  }
  return { hits: parsed.data.hits ?? rows.length, rawCount: rows.length, jobs };
}

export const amazonAdapter: Adapter = {
  async fetchJobs() {
    const found = new Map<string, NormalizedJob>();
    let offset = 0;
    let hits = Number.POSITIVE_INFINITY;
    while (offset < hits && offset < 10_000) {
      const url = `${SEARCH_URL}?offset=${offset}&result_limit=${PAGE_SIZE}&sort=recent&country=IND`;
      const page = parseAmazonPage(await fetchJson(url));
      if (offset === 0) {
        hits = page.hits;
      }
      for (const job of page.jobs) {
        found.set(job.externalId, job);
      }
      if (page.rawCount < PAGE_SIZE) {
        break;
      }
      offset += PAGE_SIZE;
    }
    if (found.size === 0) {
      throw new Error("Amazon India search returned no engineering roles");
    }
    return [...found.values()];
  },
};
