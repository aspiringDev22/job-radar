import type { JobDetail, JobSummary, RoleCategory } from "../jobs/index.ts";

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
  // Roles in the list under the filters and company pick, across every page.
  listTotal: number;
  // Roles hidden because the search words appear only in their descriptions. 0 with descriptions on.
  descriptionMatches: number;
  // Roles per category under every other filter, for the Role filter. Categories with none are left out.
  categoryCounts: Partial<Record<RoleCategory, number>>;
  // Listings in the list posted in the last 7 days.
  newThisWeek: number;
  page: number;
  pageCount: number;
};
