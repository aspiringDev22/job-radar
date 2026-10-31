import { z } from "zod";

import { ATS_TYPES, EMPLOYMENT_TYPES, SENIORITIES } from "../src/db/schema/enums.ts";

export const normalizedJobSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  descriptionHtml: z.string().nullable(),
  descriptionText: z.string().nullable(),
  locationRaw: z.string().nullable(),
  locationNormalized: z.string().nullable(),
  isRemote: z.boolean(),
  seniority: z.enum(SENIORITIES),
  employmentType: z.enum(EMPLOYMENT_TYPES).nullable(),
  salaryMin: z.number().int().nullable(),
  salaryMax: z.number().int().nullable(),
  salaryCurrency: z.string().nullable(),
  applyUrl: z.string().nullable(),
  source: z.enum(ATS_TYPES),
  postedAt: z.date().nullable(),
});

export type NormalizedJob = z.infer<typeof normalizedJobSchema>;

export type SyncCompany = {
  id: string;
  name: string;
  slug: string;
  atsType: (typeof ATS_TYPES)[number];
  atsSlug: string;
  lastSyncedAt: Date | null;
};

export interface Adapter {
  fetchJobs(company: SyncCompany): Promise<NormalizedJob[]>;
}
