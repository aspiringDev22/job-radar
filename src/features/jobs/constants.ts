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

export const CANONICAL_SENIORITIES = [
  "intern",
  "junior",
  "mid",
  "senior",
  "staff_plus",
  "manager",
  "unknown",
] as const;

export const ROLE_FAMILIES = [
  "backend",
  "frontend",
  "fullstack",
  "mobile",
  "data",
  "ml",
  "devops",
  "qa",
  "product",
  "design",
  "other",
] as const;

export const WORK_MODES = ["onsite", "hybrid", "remote", "unknown"] as const;

export const EMPLOYMENT_TYPES = [
  "full_time",
  "part_time",
  "contract",
  "internship",
  "temporary",
  "unknown",
] as const;

export const JOB_STATUSES = ["open", "closed"] as const;

export type Seniority = (typeof SENIORITIES)[number];
export type CanonicalSeniority = (typeof CANONICAL_SENIORITIES)[number];
export type RoleFamily = (typeof ROLE_FAMILIES)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];

// Amazon job categories the board shows by default. Every other Amazon category
// (operations, finance, HR, sales...) appears only with "Include Amazon operations".
// "Operations, IT, & Support Engineering" stays out: it is mostly data-centre and site roles.
export const AMAZON_TECHNICAL_DEPARTMENTS = [
  "Software Development",
  "Applied Science",
  "Research Science",
  "Project/Program/Product Management--Technical",
  "Solutions Architect",
  "Systems, Quality, & Security Engineering",
  "Hardware Development",
  "Database Administration",
  "Design",
  "Business Intelligence",
];
