// Public API of the jobs feature: types, constants and pure helpers.
// Safe to import from client components, server code and Node scripts.
export {
  AMAZON_TECHNICAL_DEPARTMENTS,
  CANONICAL_SENIORITIES,
  EMPLOYMENT_TYPES,
  ROLE_CATEGORIES,
  ROLE_FAMILIES,
  SENIORITIES,
  WORK_MODES,
  type CanonicalSeniority,
  type JobStatus,
  type RoleCategory,
  type RoleFamily,
  type Seniority,
} from "./constants.ts";
export { ROLE_CATEGORY_LABELS, formatSalary, postedAgo, postedWithin, sourceLabel } from "./lib/format.ts";
export {
  groupListings,
  listPlaceLabel,
  postingLocations,
  type JobLocation,
  type ListingGroup,
  type ListingMember,
} from "./lib/listing.ts";
export { LOCATION_GROUPS, activeLocationId, locationTerms } from "./lib/locations.ts";
export type { JobDetail, JobSummary } from "./types.ts";
