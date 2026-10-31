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

const idSchema = z.union([z.string().min(1), z.number()]).transform((value) => String(value));

const listItemSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
});

const sectionSchema = z
  .object({
    text: z.string().nullable().optional(),
  })
  .nullable()
  .optional();

const postingSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  releasedDate: z.string().nullable().optional(),
  applyUrl: z.string().nullable().optional(),
  postingUrl: z.string().nullable().optional(),
  company: z
    .object({
      identifier: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  location: z
    .object({
      city: z.string().nullable().optional(),
      region: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      remote: z.boolean().nullable().optional(),
      fullLocation: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  typeOfEmployment: z
    .object({
      label: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  experienceLevel: z
    .object({
      id: z.string().nullable().optional(),
      label: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  jobAd: z
    .object({
      sections: z
        .object({
          companyDescription: sectionSchema,
          jobDescription: sectionSchema,
          qualifications: sectionSchema,
          additionalInformation: sectionSchema,
        })
        .nullable()
        .optional(),
    })
    .nullable()
    .optional(),
});

const listSchema = z.object({
  totalFound: z.number().optional(),
  content: z.array(z.unknown()),
});

const EXPERIENCE: Record<string, NormalizedJob["seniority"]> = {
  internship: "intern",
  entry_level: "junior",
  associate: "junior",
  mid_senior_level: "mid",
  director: "executive",
  executive: "executive",
};

function cleanLocation(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const cleaned = value.replace(/,\s*,/g, ",").replace(/,\s*$/g, "").trim();
  return normalizeLocation(cleaned);
}

export function parseSmartRecruitersList(payload: unknown): { totalFound: number; ids: string[] } {
  const parsed = listSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Unexpected SmartRecruiters response");
  }
  const ids: string[] = [];
  for (const item of parsed.data.content) {
    const row = listItemSchema.safeParse(item);
    if (row.success) {
      ids.push(row.data.id);
    }
  }
  return { totalFound: parsed.data.totalFound ?? ids.length, ids };
}

export function parseSmartRecruitersPosting(payload: unknown): NormalizedJob | null {
  const parsed = postingSchema.safeParse(payload);
  if (!parsed.success) {
    return null;
  }
  const job = parsed.data;
  const sections = [
    job.jobAd?.sections?.companyDescription?.text,
    job.jobAd?.sections?.jobDescription?.text,
    job.jobAd?.sections?.qualifications?.text,
    job.jobAd?.sections?.additionalInformation?.text,
  ].filter((section): section is string => Boolean(section));
  const html = sections.length > 0 ? decodeHtml(sections.join("\n")) : null;
  const text = html ? htmlToText(html) : null;
  const locationRaw = cleanLocation(
    job.location?.fullLocation ??
      [job.location?.city, job.location?.region, job.location?.country].filter(Boolean).join(", "),
  );
  const fromTitle = guessSeniority(job.name);
  const fromLevel = job.experienceLevel?.id ? EXPERIENCE[job.experienceLevel.id] : undefined;
  const salary = parseSalary(text);
  const identifier = job.company?.identifier;
  const applyUrl =
    job.applyUrl ??
    job.postingUrl ??
    (identifier ? `https://jobs.smartrecruiters.com/${identifier}/${job.id}` : null);
  const candidate = normalizedJobSchema.safeParse({
    externalId: job.id,
    title: job.name,
    descriptionHtml: html,
    descriptionText: text,
    locationRaw,
    locationNormalized: locationRaw,
    isRemote: detectRemote(
      [locationRaw, job.location?.city, job.name],
      job.location?.remote === true,
    ),
    seniority: fromTitle !== "unknown" ? fromTitle : (fromLevel ?? "unknown"),
    employmentType: guessEmployment(job.typeOfEmployment?.label),
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryCurrency: salary.currency,
    applyUrl,
    source: "smartrecruiters",
    postedAt: parsePostedAt(job.releasedDate),
  });
  return candidate.success ? candidate.data : null;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 20;

export const smartRecruitersAdapter: Adapter = {
  async fetchJobs(company) {
    const base = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(company.atsSlug)}/postings`;
    const ids: string[] = [];
    let totalFound = Number.POSITIVE_INFINITY;

    for (let page = 0; page < MAX_PAGES && ids.length < totalFound; page += 1) {
      const payload = await fetchJson(`${base}?limit=${PAGE_SIZE}&offset=${ids.length}`);
      const list = parseSmartRecruitersList(payload);
      totalFound = list.totalFound;
      if (list.ids.length === 0) {
        break;
      }
      ids.push(...list.ids);
    }

    const jobs: NormalizedJob[] = [];
    for (const id of ids) {
      try {
        const detail = await fetchJson(`${base}/${encodeURIComponent(id)}`);
        const job = parseSmartRecruitersPosting(detail);
        if (job) {
          jobs.push(job);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (message.startsWith("HTTP 404")) {
          continue;
        }
        throw error;
      }
    }
    return jobs;
  },
};
