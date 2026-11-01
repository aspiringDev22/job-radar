export const MIN_SYNC_INTERVAL_MS = 4 * 60 * 60 * 1000;

export type CompanyOutcome =
  | { status: "skipped" }
  | { status: "failed"; error: string }
  | { status: "ok"; found: number; added: number; reopened: number; closed: number };

export type RunTotals = {
  companiesOk: number;
  companiesFailed: number;
  companiesSkipped: number;
  rolesAdded: number;
  rolesReopened: number;
  rolesClosed: number;
};

export function dueForSync(lastSuccessAt: Date | null, now: number, force: boolean): boolean {
  return force || !lastSuccessAt || now - lastSuccessAt.getTime() >= MIN_SYNC_INTERVAL_MS;
}

export function runTotals(outcomes: CompanyOutcome[]): RunTotals {
  const totals: RunTotals = {
    companiesOk: 0,
    companiesFailed: 0,
    companiesSkipped: 0,
    rolesAdded: 0,
    rolesReopened: 0,
    rolesClosed: 0,
  };
  for (const outcome of outcomes) {
    if (outcome.status === "skipped") {
      totals.companiesSkipped += 1;
    } else if (outcome.status === "failed") {
      totals.companiesFailed += 1;
    } else {
      totals.companiesOk += 1;
      totals.rolesAdded += outcome.added;
      totals.rolesReopened += outcome.reopened;
      totals.rolesClosed += outcome.closed;
    }
  }
  return totals;
}

export function pickCompanies<T extends { slug: string }>(
  rows: T[],
  only: string[],
): { picked: T[]; unknown: string[] } {
  if (only.length === 0) {
    return { picked: rows, unknown: [] };
  }
  const wanted = new Set(only.map((slug) => slug.trim().toLowerCase()).filter(Boolean));
  const known = new Set(rows.map((row) => row.slug));
  return {
    picked: rows.filter((row) => wanted.has(row.slug)),
    unknown: [...wanted].filter((slug) => !known.has(slug)),
  };
}

export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}

// A run with no finish time is still going, unless it started longer ago than any
// run can take (the scheduled job times out at 90 minutes), so the process died.
export const RUN_GIVE_UP_MS = 2 * 60 * 60 * 1000;

export type RunState = "finished" | "running" | "interrupted";

export function runState(startedAt: Date, finishedAt: Date | null, now: number): RunState {
  if (finishedAt) {
    return "finished";
  }
  return now - startedAt.getTime() < RUN_GIVE_UP_MS ? "running" : "interrupted";
}
