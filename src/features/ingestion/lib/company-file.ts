import { z } from "zod";

import { ATS_TYPES } from "../../companies/index.ts";

export const companySeedSchema = z.object({
  name: z.string().trim().min(1),
  ats_type: z.enum(ATS_TYPES),
  ats_slug: z.string().trim().min(1),
  website: z.url().optional(),
  locations: z.enum(["all", "india_or_remote"]).optional(),
});

export const companiesFileSchema = z.array(companySeedSchema);

export type CompanySeed = z.infer<typeof companySeedSchema>;
