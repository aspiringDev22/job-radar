import { pgEnum } from "drizzle-orm/pg-core";

export const ATS_TYPES = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "recruitee",
  "keka",
  "workday",
  "amazon",
] as const;

export const SENIORITIES = [
  "intern",
  "junior",
  "mid",
  "senior",
  "staff",
  "principal",
  "executive",
  "unknown",
] as const;

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
  "unknown",
] as const;

export const SAVED_JOB_STATUSES = [
  "saved",
  "applied",
  "interview",
  "rejected",
] as const;

export const atsTypeEnum = pgEnum("ats_type", ATS_TYPES);
export const seniorityEnum = pgEnum("seniority", SENIORITIES);
export const employmentTypeEnum = pgEnum("employment_type", EMPLOYMENT_TYPES);
export const savedJobStatusEnum = pgEnum("saved_job_status", SAVED_JOB_STATUSES);
