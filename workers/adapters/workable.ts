import { z } from "zod";

import { fetchJson } from "../http.ts";
import {
  decodeHtml,
  detectRemote,
  guessEmployment,
  guessSeniority,
  htmlToText,
  normalizeLocation,
  parsePostedAt,
  parseSalary,
} from "../normalize.ts";
import { normalizedJobSchema, type Adapter, type NormalizedJob } from "../types.ts";

const workableJobSchema = z.object({
  title: z.string().min(1),
  shortcode: z.string().min(1),
  employment_type: z.string().nullable().optional(),
  telecommuting: z.boolean().nullable().optional(),
  url: z.string().nullable().optional(),
  application_url: z.string().nullable().optional(),
  published_on: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  location: z.unknown().optional(),
  locations: z.unknown().optional(),
});

const workablePlaceSchema = z.object({
  country: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  region: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
});

export function parseWorkableAccount(payload: unknown): NormalizedJob[] {
  const board = z
    .object({
      jobs: z.array(z.unknown()),
    })
    .safeParse(payload);
  if (!board.success) {
    throw new Error("Unexpected Workable response");
  }

  const jobs: NormalizedJob[] = [];
  const indexById = new Map<string, number>();
  for (const item of board.data.jobs) {
    const parsed = workableJobSchema.safeParse(item);
    if (!parsed.success) {
      continue;
    }
    const job = parsed.data;
    const html = job.description ? decodeHtml(job.description) : null;
    const text = html ? htmlToText(html) : null;
    const locationRaw = workableLocation(job);
    const salary = parseSalary(text);
    const seen = indexById.get(job.shortcode);
    if (seen !== undefined) {
      const current = jobs[seen];
      if (current) {
        const location = joinLocation(current.locationRaw, locationRaw);
        jobs[seen] = {
          ...current,
          locationRaw: location,
          locationNormalized: location,
          isRemote: current.isRemote || detectRemote([locationRaw, job.title], job.telecommuting === true),
        };
      }
      continue;
    }
    const candidate = normalizedJobSchema.safeParse({
      externalId: job.shortcode,
      title: job.title,
      descriptionHtml: html,
      descriptionText: text,
      locationRaw,
      locationNormalized: locationRaw,
      isRemote: detectRemote([locationRaw, job.title], job.telecommuting === true),
      seniority: guessSeniority(job.title),
      employmentType: guessEmployment(job.employment_type),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      applyUrl: job.application_url ?? job.url ?? null,
      source: "workable",
      postedAt: parsePostedAt(job.published_on),
    });
    if (candidate.success) {
      indexById.set(job.shortcode, jobs.length);
      jobs.push(candidate.data);
    }
  }
  return jobs;
}

function placeLine(place: z.infer<typeof workablePlaceSchema>): string | null {
  return normalizeLocation(
    [place.city, place.region ?? place.state, place.country]
      .filter((part) => part && part.trim().length > 0)
      .join(", "),
  );
}

function workableLocation(job: z.infer<typeof workableJobSchema>): string | null {
  const lines: string[] = [];
  const direct = placeLine({ city: job.city, state: job.state, country: job.country });
  if (direct) {
    lines.push(direct);
  }
  const nested = job.locations ?? job.location;
  const places = Array.isArray(nested) ? nested : nested ? [nested] : [];
  for (const place of places) {
    const parsed = workablePlaceSchema.safeParse(place);
    const line = parsed.success ? placeLine(parsed.data) : null;
    if (line && !lines.includes(line)) {
      lines.push(line);
    }
  }
  return lines.length > 0 ? lines.join(" · ") : null;
}

function joinLocation(current: string | null, next: string | null): string | null {
  if (!next) {
    return current;
  }
  if (!current) {
    return next;
  }
  if (current.split(" · ").includes(next)) {
    return current;
  }
  return `${current} · ${next}`;
}

export const workableAdapter: Adapter = {
  async fetchJobs(company) {
    const url = `https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(company.atsSlug)}?details=true`;
    return parseWorkableAccount(await fetchJson(url));
  },
};
