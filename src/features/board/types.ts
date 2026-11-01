import type { JobDetail, JobSummary } from "../jobs/index.ts";

export type CompanySummary = {
  name: string;
  slug: string;
  openRoles: number;
};

export type BoardData = {
  companies: CompanySummary[];
  jobs: JobSummary[];
  selected: JobDetail | null;
  // The company picked with ?company=, with its count under the active filters.
  company: CompanySummary | null;
  totalRoles: number;
  updatedAt: Date | null;
  truncated: boolean;
};
