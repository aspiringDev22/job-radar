import { z } from "zod";

import { fetchJson } from "../lib/http.ts";
import {
  detectRemote,
  guessEmployment,
  guessSeniority,
  htmlToText,
  normalizeLocation,
  parsePostedAt,
  parseSalary,
  decodeHtml,
} from "../lib/normalize.ts";
import { normalizedJobSchema, type Adapter, type NormalizedJob } from "../types.ts";

const greenhouseJobSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  absolute_url: z.string().min(1),
  location: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
  first_published: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
});

const greenhouseBoardSchema = z.object({
  jobs: z.array(z.unknown()),
});

export function parseGreenhouseBoard(payload: unknown): NormalizedJob[] {
  const board = greenhouseBoardSchema.safeParse(payload);
  if (!board.success) {
    throw new Error("Unexpected Greenhouse response");
  }

  const jobs: NormalizedJob[] = [];
  for (const item of board.data.jobs) {
    const parsed = greenhouseJobSchema.safeParse(item);
    if (!parsed.success) {
      continue;
    }
    const job = parsed.data;
    const html = job.content ? decodeHtml(job.content) : null;
    const text = html ? htmlToText(html) : null;
    const locationRaw = job.location?.name ?? null;
    const salary = parseSalary(text);
    const candidate = normalizedJobSchema.safeParse({
      externalId: String(job.id),
      title: job.title,
      descriptionHtml: html,
      descriptionText: text,
      locationRaw,
      locationNormalized: normalizeLocation(locationRaw),
      isRemote: detectRemote([locationRaw, job.title]),
      seniority: guessSeniority(job.title),
      employmentType: guessEmployment(null),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      applyUrl: job.absolute_url,
      source: "greenhouse",
      postedAt: parsePostedAt(job.first_published ?? job.updated_at),
    });
    if (candidate.success) {
      jobs.push(candidate.data);
    }
  }
  return jobs;
}

export const greenhouseAdapter: Adapter = {
  async fetchJobs(company) {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(company.atsSlug)}/jobs?content=true`;
    return parseGreenhouseBoard(await fetchJson(url));
  },
};
