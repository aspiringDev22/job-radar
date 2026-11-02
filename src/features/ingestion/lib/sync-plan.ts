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

// A feed that suddenly lists nothing is more often broken than empty. Above this many
// open roles, an empty successful fetch closes nothing until the next sync agrees.
export const EMPTY_FEED_GUARD_MIN_OPEN = 10;

// lastRoleCount is what the previous sync saw: 0 there means this run is the second one
// to find the feed empty, so the roles really are gone.
export function holdEmptyFeed(fetchedCount: number, openCount: number, lastRoleCount: number | null): boolean {
  return fetchedCount === 0 && openCount > EMPTY_FEED_GUARD_MIN_OPEN && lastRoleCount !== 0;
}
