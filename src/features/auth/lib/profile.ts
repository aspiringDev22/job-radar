import { z } from "zod";

export const remotePreferenceSchema = z.enum([
  "remote",
  "hybrid",
  "onsite",
  "any",
]);

export const profileSchema = z.object({
  titles: z.array(z.string()),
  skills: z.array(z.string()),
  yearsOfExperience: z.number().nonnegative().nullable(),
  locations: z.array(z.string()),
  remotePreference: remotePreferenceSchema,
});

export type Profile = z.infer<typeof profileSchema>;

export const preferencesSchema = z.object({
  locations: z.array(z.string()),
  remoteOnly: z.boolean(),
  seniorities: z.array(z.string()),
  postedWithinDays: z.number().int().positive().nullable(),
});

export type Preferences = z.infer<typeof preferencesSchema>;
