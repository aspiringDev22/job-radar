import type { JobStatus } from "../../jobs/index.ts";

export type TrackedRole = {
  externalId: string;
  slug: string;
  title: string;
  isActive: boolean;
  status: JobStatus;
};

export type SyncPlan = {
  closing: TrackedRole[];
  reopening: TrackedRole[];
  adding: string[];
};

export function planSuccessfulSync(existing: TrackedRole[], seenExternalIds: Iterable<string>): SyncPlan {
  const seen = new Set(seenExternalIds);
  const known = new Set(existing.map((role) => role.externalId));
  return {
    closing: existing.filter((role) => role.isActive && !seen.has(role.externalId)),
    reopening: existing.filter((role) => seen.has(role.externalId) && (!role.isActive || role.status === "closed")),
    adding: [...seen].filter((externalId) => !known.has(externalId)),
  };
}

export function rolesClosedAfterFetch(
  fetchSucceeded: boolean,
  existing: TrackedRole[],
  seenExternalIds: Iterable<string>,
): TrackedRole[] {
  if (!fetchSucceeded) {
    return [];
  }
  return planSuccessfulSync(existing, seenExternalIds).closing;
}
