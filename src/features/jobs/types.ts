import type { JobStatus } from "./constants.ts";
import type { JobLocation } from "./lib/listing.ts";

export type JobSummary = {
  slug: string;
  title: string;
  companyName: string;
  companySlug: string;
  location: string | null;
  isRemote: boolean;
  locationCount: number;
  source: string;
  postedAt: Date | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
};

export type LevelPay = {
  label: string;
  count: number;
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
};

export type JobDetail = JobSummary & {
  descriptionText: string | null;
  applyUrl: string | null;
  seniority: string | null;
  employmentType: string | null;
  locations: JobLocation[];
  levelPay: LevelPay | null;
};

export type JobRecord = JobDetail & {
  externalId: string;
  companyWebsite: string | null;
  firstSeenAt: Date;
  status: JobStatus;
  closedAt: Date | null;
};
