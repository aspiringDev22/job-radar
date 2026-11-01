import { z } from "zod";

import { fetchJson } from "../lib/http.ts";
import {
  decodeHtml,
  detectRemote,
  guessEmployment,
  guessSeniority,
  htmlToText,
  normalizeLocation,
  parsePostedAt,
  parseSalary,
} from "../lib/normalize.ts";
import { normalizedJobSchema, type Adapter, type NormalizedJob } from "../types.ts";

const ashbyJobSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  employmentType: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  isListed: z.boolean().nullable().optional(),
  isRemote: z.boolean().nullable().optional(),
  workplaceType: z.string().nullable().optional(),
  jobUrl: z.string().nullable().optional(),
  applyUrl: z.string().nullable().optional(),
  descriptionHtml: z.string().nullable().optional(),
  descriptionPlain: z.string().nullable().optional(),
  compensation: z
    .object({
      scrapeableCompensationSalarySummary: z.string().nullable().optional(),
      compensationTierSummary: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export function parseAshbyBoard(payload: unknown): NormalizedJob[] {
  const board = z.object({ jobs: z.array(z.unknown()) }).safeParse(payload);
  if (!board.success) {
    throw new Error("Unexpected Ashby response");
  }

  const jobs: NormalizedJob[] = [];
  for (const item of board.data.jobs) {
    const parsed = ashbyJobSchema.safeParse(item);
    if (!parsed.success || parsed.data.isListed === false) {
      continue;
    }
    const job = parsed.data;
    const html = job.descriptionHtml ? decodeHtml(job.descriptionHtml) : null;
    const text = job.descriptionPlain?.trim() || (html ? htmlToText(html) : null);
    const salaryText = [
      job.compensation?.scrapeableCompensationSalarySummary,
      job.compensation?.compensationTierSummary,
      text,
    ]
      .filter(Boolean)
      .join("\n");
    const salary = parseSalary(salaryText);
    const workplace = job.workplaceType ?? null;
    const candidate = normalizedJobSchema.safeParse({
      externalId: job.id,
      title: job.title,
      descriptionHtml: html,
      descriptionText: text,
      locationRaw: job.location ?? null,
      locationNormalized: normalizeLocation(job.location),
      isRemote: detectRemote(
        [job.location, workplace, job.title],
        job.isRemote === true || workplace?.toLowerCase() === "remote",
      ),
      seniority: guessSeniority(job.title),
      employmentType: guessEmployment(job.employmentType),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      applyUrl: job.applyUrl ?? job.jobUrl ?? null,
      source: "ashby",
      postedAt: parsePostedAt(job.publishedAt),
    });
    if (candidate.success) {
      jobs.push(candidate.data);
    }
  }
  return jobs;
}

export const ashbyAdapter: Adapter = {
  async fetchJobs(company) {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(company.atsSlug)}?includeCompensation=true`;
    return parseAshbyBoard(await fetchJson(url));
  },
};
