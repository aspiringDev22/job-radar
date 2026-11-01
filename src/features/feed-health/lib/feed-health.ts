export const STALE_AFTER_FAILURES = 3;
export const STALE_POSTING_MS = 365 * 24 * 60 * 60 * 1000;

export type FeedStatus = "stale" | "failing" | "ok";

export type FeedHealthInput = {
  name: string;
  consecutiveFailures: number;
  openRoles: number;
  datedRoles: number;
  newestPostedAt: Date | null;
};

export type FeedHealth = {
  status: FeedStatus;
  reasons: string[];
};

const STATUS_ORDER: Record<FeedStatus, number> = { stale: 0, failing: 1, ok: 2 };

function failureLabel(count: number): string {
  return count === 1 ? "Last sync failed" : `Last ${count} syncs failed`;
}

/**
 * A feed is stale after three failed syncs in a row, or when none of its open
 * roles was posted in the last 12 months. A board with no open roles counts
 * as stale. A board whose roles carry no posting date is not judged on age.
 */
export function feedHealth(input: FeedHealthInput, now = Date.now()): FeedHealth {
  const reasons: string[] = [];
  let stale = false;

  if (input.consecutiveFailures >= STALE_AFTER_FAILURES) {
    stale = true;
    reasons.push(failureLabel(input.consecutiveFailures));
  }

  if (input.openRoles === 0) {
    stale = true;
    reasons.push("No open roles");
  } else if (input.datedRoles > 0) {
    const newest = input.newestPostedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    if (now - newest > STALE_POSTING_MS) {
      stale = true;
      reasons.push("No role posted in the last 12 months");
    }
  } else {
    reasons.push("Roles carry no posting date");
  }

  if (stale) {
    return { status: "stale", reasons };
  }
  if (input.consecutiveFailures > 0) {
    return { status: "failing", reasons: [failureLabel(input.consecutiveFailures), ...reasons] };
  }
  return { status: "ok", reasons };
}

function newestTime(value: Date | null): number {
  return value?.getTime() ?? Number.NEGATIVE_INFINITY;
}

export function compareFeedHealth<T extends FeedHealthInput & { health: FeedHealth }>(left: T, right: T): number {
  return (
    STATUS_ORDER[left.health.status] - STATUS_ORDER[right.health.status] ||
    right.consecutiveFailures - left.consecutiveFailures ||
    newestTime(left.newestPostedAt) - newestTime(right.newestPostedAt) ||
    left.name.localeCompare(right.name, "en")
  );
}
