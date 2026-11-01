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

const offerSchema = z.object({
  id: z.union([z.string().min(1), z.number()]),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  requirements: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  remote: z.boolean().nullable().optional(),
  published_at: z.string().nullable().optional(),
  careers_url: z.string().nullable().optional(),
  careers_apply_url: z.string().nullable().optional(),
  employment_type_code: z.string().nullable().optional(),
});

export function parseRecruiteeOffers(payload: unknown): NormalizedJob[] {
  const board = z
    .object({
      offers: z.array(z.unknown()),
    })
    .safeParse(payload);
  if (!board.success) {
    throw new Error("Unexpected Recruitee response");
  }

  const jobs: NormalizedJob[] = [];
  for (const item of board.data.offers) {
    const parsed = offerSchema.safeParse(item);
    if (!parsed.success) {
      continue;
    }
    const offer = parsed.data;
    const html = [offer.description, offer.requirements].filter(Boolean).join("\n");
    const decoded = html.length > 0 ? decodeHtml(html) : null;
    const text = decoded ? htmlToText(decoded) : null;
    const locationRaw = normalizeLocation(
      offer.location ?? [offer.city, offer.country].filter(Boolean).join(", "),
    );
    const salary = parseSalary(text);
    const candidate = normalizedJobSchema.safeParse({
      externalId: String(offer.id),
      title: offer.title,
      descriptionHtml: decoded,
      descriptionText: text,
      locationRaw,
      locationNormalized: locationRaw,
      isRemote: detectRemote([locationRaw, offer.title], offer.remote === true),
      seniority: guessSeniority(offer.title),
      employmentType: guessEmployment(offer.employment_type_code),
      salaryMin: salary.min,
      salaryMax: salary.max,
      salaryCurrency: salary.currency,
      applyUrl: offer.careers_apply_url ?? offer.careers_url ?? null,
      source: "recruitee",
      postedAt: parsePostedAt(offer.published_at),
    });
    if (candidate.success) {
      jobs.push(candidate.data);
    }
  }
  return jobs;
}

export const recruiteeAdapter: Adapter = {
  async fetchJobs(company) {
    const url = `https://${encodeURIComponent(company.atsSlug)}.recruitee.com/api/offers/`;
    return parseRecruiteeOffers(await fetchJson(url));
  },
};
