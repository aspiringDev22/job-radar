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

const leverJobSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  categories: z
    .object({
      commitment: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  description: z.string().nullable().optional(),
  descriptionPlain: z.string().nullable().optional(),
  additionalPlain: z.string().nullable().optional(),
  hostedUrl: z.string().nullable().optional(),
  applyUrl: z.string().nullable().optional(),
  createdAt: z.number().nullable().optional(),
  workplaceType: z.string().nullable().optional(),
});

export function parseLeverPostings(payload: unknown): NormalizedJob[] {
  const board = z.array(z.unknown()).safeParse(payload);
  if (!board.success) {
    throw new Error("Unexpected Lever response");
  }

  const jobs: NormalizedJob[] = [];
  for (const item of board.data) {
    const parsed = leverJobSchema.safeParse(item);
    if (!parsed.success) {
      continue;
    }
    const job = parsed.data;
    const html = job.description ? decodeHtml(job.description) : null;
    const text = job.descriptionPlain?.trim() || (html ? htmlToText(html) : null);
    const locationRaw = job.categories?.location ?? null;
    const workplace = job.workplaceType ?? null;
    const salary = parseSalary([job.additionalPlain, text].filter(Boolean).join("\n"));
    const candidate = normalizedJobSchema.safeParse({
      externalId: job.id,
      title: job.text,
      descriptionHtml: html,
      descriptionText: text,
      locationRaw,
      locationNormalized: normalizeLocation(locationRaw),
      isRemote: detectRemote([locationRaw, workplace, job.text], workplace?.toLowerCase() === "remote"),
      seniority: guessSeniority(job.text),
      employmentType: guessEmployment(job.categories?.commitment),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      applyUrl: job.applyUrl ?? job.hostedUrl ?? null,
      source: "lever",
      postedAt: parsePostedAt(job.createdAt),
    });
    if (candidate.success) {
      jobs.push(candidate.data);
    }
  }
  return jobs;
}

export const leverAdapter: Adapter = {
  async fetchJobs(company) {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(company.atsSlug)}?mode=json`;
    return parseLeverPostings(await fetchJson(url));
  },
};
