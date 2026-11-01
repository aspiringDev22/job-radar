import { z } from "zod";

import { fetchJson } from "../lib/http.ts";
import {
  decodeHtml,
  detectRemote,
  guessSeniority,
  htmlToText,
  normalizeLocation,
  parsePostedAt,
} from "../lib/normalize.ts";
import { normalizedJobSchema, type Adapter, type NormalizedJob } from "../types.ts";

// Keka boards live at https://{slug}.keka.com/careers. Their robots.txt allows only /careers,
// and the jobs list their careers app reads sits under it. Salary ranges are not imported:
// most are 0 and the units vary.

export function kekaJobsUrl(slug: string): string {
  return `https://${encodeURIComponent(slug)}.keka.com/careers/api/jobs/default/active`;
}

const nullableText = z.string().nullable().optional();

const kekaJobSchema = z.object({
  id: z.union([z.number(), z.string()]),
  title: z.string().min(1),
  description: nullableText,
  departmentName: nullableText,
  jobLocations: z
    .array(z.object({ name: nullableText, city: nullableText, state: nullableText, countryName: nullableText }))
    .nullable()
    .optional(),
  publishedOn: nullableText,
});

function kekaLocation(locations: z.infer<typeof kekaJobSchema>["jobLocations"]): string | null {
  const places = (locations ?? [])
    .map((place) => [place.city ?? place.name, place.state, place.countryName].filter(Boolean).join(", "))
    .filter(Boolean);
  return places.length > 0 ? [...new Set(places)].join(" · ") : null;
}

export function parseKekaJobs(payload: unknown, slug: string): NormalizedJob[] {
  const list = z.array(z.unknown()).safeParse(payload);
  if (!list.success) {
    throw new Error("Unexpected Keka response");
  }

  const jobs: NormalizedJob[] = [];
  for (const item of list.data) {
    const parsed = kekaJobSchema.safeParse(item);
    if (!parsed.success) {
      continue;
    }
    const job = parsed.data;
    const html = job.description ? decodeHtml(job.description) : null;
    const location = kekaLocation(job.jobLocations);
    const candidate = normalizedJobSchema.safeParse({
      externalId: String(job.id),
      title: job.title.trim(),
      descriptionHtml: html,
      descriptionText: html ? htmlToText(html) : null,
      locationRaw: location,
      locationNormalized: normalizeLocation(location),
      // A location named "Remote" can still carry a city, so its name is checked too.
      isRemote: detectRemote([location, job.title, ...(job.jobLocations ?? []).map((place) => place.name)]),
      seniority: guessSeniority(job.title),
      // Keka's jobType is 2 on every board seen so far, so it says nothing; only a title says "intern".
      employmentType: /\bintern(ship)?\b/i.test(job.title) ? "internship" : null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      applyUrl: `https://${slug}.keka.com/careers/jobdetails/${job.id}`,
      source: "keka",
      postedAt: parsePostedAt(job.publishedOn),
      department: job.departmentName?.trim() || null,
    });
    if (candidate.success) {
      jobs.push(candidate.data);
    }
  }
  return jobs;
}

export const kekaAdapter: Adapter = {
  async fetchJobs(company) {
    return parseKekaJobs(await fetchJson(kekaJobsUrl(company.atsSlug)), company.atsSlug);
  },
};
