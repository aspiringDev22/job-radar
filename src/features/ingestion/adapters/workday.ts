import { z } from "zod";

import { fetchJson } from "../lib/http.ts";
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
} from "../lib/normalize.ts";
import { normalizedJobSchema, type Adapter, type NormalizedJob } from "../types.ts";

const INDIA_QUERIES = [
  "India",
  "Bangalore",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Noida",
  "Gurugram",
  "Gurgaon",
  "Mumbai",
];

const PAGE_SIZE = 20;
const MAX_PAGES = 20;
const MAX_DETAILS = 350;

const listJobSchema = z.object({
  title: z.string().min(1),
  externalPath: z.string().min(1),
  locationsText: z.string().nullable().optional(),
});

const postingSchema = z.object({
  jobPostingInfo: z.object({
    id: z.union([z.string(), z.number()]).optional(),
    title: z.string().min(1),
    jobDescription: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    startDate: z.string().nullable().optional(),
    timeType: z.string().nullable().optional(),
    jobReqId: z.string().nullable().optional(),
    externalUrl: z.string().nullable().optional(),
    country: z
      .union([z.string(), z.object({ descriptor: z.string().nullable().optional() })])
      .nullable()
      .optional(),
  }),
});

type WorkdayBoard = {
  cluster: string;
  tenant: string;
  site: string;
};

type ListedJob = {
  title: string;
  externalPath: string;
  locationsText: string | null;
};

export { isIndiaPlace };

export function parseWorkdayPosting(payload: unknown): NormalizedJob | null {
  const parsed = postingSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  const info = parsed.data.jobPostingInfo;
  const country = countryName(info.country);
  const locationRaw = normalizeLocation(info.location);
  if (country !== "India" && !isIndiaPlace(locationRaw) && !isIndiaPlace(country)) {
    return null;
  }
  const html = info.jobDescription ? decodeHtml(info.jobDescription) : null;
  const text = html ? htmlToText(html) : null;
  const salary = parseSalary(text);
  const externalId = info.jobReqId || (info.id == null ? "" : String(info.id));
  const candidate = normalizedJobSchema.safeParse({
    externalId,
    title: info.title,
    descriptionHtml: html,
    descriptionText: text,
    locationRaw,
    locationNormalized: locationRaw,
    isRemote: detectRemote([locationRaw, info.title]),
    seniority: guessSeniority(info.title),
    employmentType: guessEmployment(info.timeType),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    applyUrl: info.externalUrl ?? null,
    source: "workday",
    postedAt: parsePostedAt(info.startDate),
  });
  return candidate.success ? candidate.data : null;
}

function countryName(country: z.infer<typeof postingSchema>["jobPostingInfo"]["country"]): string | null {
  if (!country) {
    return null;
  }
  if (typeof country === "string") {
    return country;
  }
  return country.descriptor ?? null;
}

function boardFromSlug(slug: string): WorkdayBoard | null {
  const match = /^(wd\d+)\/([^/]+)\/([^/]+)$/.exec(slug);
  if (!match?.[1] || !match[2] || !match[3]) {
    return null;
  }
  return { cluster: match[1], tenant: match[2], site: match[3] };
}

function boardUrl(board: WorkdayBoard, suffix: string): string {
  return `https://${board.tenant}.${board.cluster}.myworkdayjobs.com/wday/cxs/${board.tenant}/${board.site}${suffix}`;
}

async function listPage(
  url: string,
  offset: number,
  searchText: string,
  appliedFacets: Record<string, string[]>,
): Promise<{ total: number; jobs: ListedJob[]; indiaFacet: { key: string; id: string } | null }> {
  const payload = await fetchJson(url, {
    appliedFacets,
    limit: PAGE_SIZE,
    offset,
    searchText,
  });
  const parsed = z
    .object({
      total: z.number().optional(),
      jobPostings: z.array(z.unknown()).optional(),
      facets: z
        .array(
          z.object({
            facetParameter: z.string().optional(),
            values: z
              .array(
                z.object({
                  descriptor: z.string().optional(),
                  id: z.string().optional(),
                }),
              )
              .optional(),
          }),
        )
        .optional(),
    })
    .safeParse(payload);
  if (!parsed.success || !parsed.data.jobPostings) {
    throw new Error("Unexpected Workday response");
  }
  const jobs: ListedJob[] = [];
  for (const item of parsed.data.jobPostings) {
    const row = listJobSchema.safeParse(item);
    if (row.success) {
      jobs.push({
        title: row.data.title,
        externalPath: row.data.externalPath,
        locationsText: row.data.locationsText ?? null,
      });
    }
  }
  let indiaFacet: { key: string; id: string } | null = null;
  for (const facet of parsed.data.facets ?? []) {
    if (!facet.facetParameter) {
      continue;
    }
    const india = facet.values?.find((value) => value.descriptor?.trim().toLowerCase() === "india" && value.id);
    if (india?.id) {
      indiaFacet = { key: facet.facetParameter, id: india.id };
      break;
    }
  }
  return { total: parsed.data.total ?? jobs.length, jobs, indiaFacet };
}

async function collectListed(url: string, searchText: string, appliedFacets: Record<string, string[]>): Promise<ListedJob[]> {
  const found: ListedJob[] = [];
  const seen = new Set<string>();
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  for (let page = 0; page < MAX_PAGES && offset < total; page += 1) {
    const listed = await listPage(url, offset, searchText, appliedFacets);
    if (page === 0) {
      total = listed.total;
    }
    if (listed.jobs.length === 0) {
      break;
    }
    for (const job of listed.jobs) {
      if (seen.has(job.externalPath)) {
        continue;
      }
      seen.add(job.externalPath);
      found.push(job);
    }
    offset += listed.jobs.length;
  }
  return found;
}

export const workdayAdapter: Adapter = {
  async fetchJobs(company) {
    const board = boardFromSlug(company.atsSlug);
    if (!board) {
      throw new Error("Workday slug must look like wd5/tenant/site");
    }
    const url = boardUrl(board, "/jobs");
    const first = await listPage(url, 0, "", {});
    const queries = first.indiaFacet ? [""] : INDIA_QUERIES;
    const facets = first.indiaFacet ? { [first.indiaFacet.key]: [first.indiaFacet.id] } : {};
    const listed = new Map<string, ListedJob>();
    for (const query of queries) {
      const rows = query === "" && first.indiaFacet ? await collectListed(url, "", facets) : await collectListed(url, query, facets);
      for (const row of rows) {
        listed.set(row.externalPath, row);
      }
    }

    const ordered = [...listed.values()].sort(
      (left, right) => Number(isIndiaPlace(right.locationsText)) - Number(isIndiaPlace(left.locationsText)),
    );
    const jobs: NormalizedJob[] = [];
    for (const row of ordered.slice(0, MAX_DETAILS)) {
      let payload: unknown;
      try {
        payload = await fetchJson(boardUrl(board, row.externalPath));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.includes("HTTP 404")) {
          continue;
        }
        throw error;
      }
      const job = parseWorkdayPosting(payload);
      if (job) {
        jobs.push(job);
      }
    }
    return jobs;
  },
};
