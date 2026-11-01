import { formatDuration } from "@/features/ingestion";
import { cn } from "@/shared/lib/utils";

import type { FeedStatus } from "../lib/feed-health";
import { loadFeedHealth, type FeedHealthRow } from "../server/load-feed-health";
import { loadRecentSyncRuns, type SyncRunRow } from "../server/load-sync-runs";

const STATUS_LABEL: Record<FeedStatus, string> = { stale: "Stale", failing: "Failing", ok: "OK" };

const STATUS_CLASS: Record<FeedStatus, string> = {
  stale: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
  failing: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  ok: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
};

function when(date: Date | null, withTime = true): string {
  if (!date) {
    return "Never";
  }
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" } : {}),
  });
}

function shortError(message: string): string {
  return message.length > 120 ? `${message.slice(0, 117)}…` : message;
}

function FeedRow({ feed }: { feed: FeedHealthRow }) {
  return (
    <tr className="border-t align-top">
      <td className="py-3 pr-4">
        <p className="font-medium">{feed.name}</p>
        <p className="text-xs text-muted-foreground">{feed.source}</p>
      </td>
      <td className="py-3 pr-4">
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs", STATUS_CLASS[feed.health.status])}>
          {STATUS_LABEL[feed.health.status]}
        </span>
        {feed.health.reasons.map((reason) => (
          <p key={reason} className="mt-1 text-xs text-muted-foreground">
            {reason}
          </p>
        ))}
      </td>
      <td className="py-3 pr-4 tabular-nums">
        {feed.openRoles.toLocaleString("en-IN")}
        {feed.lastRoleCount !== null && feed.lastRoleCount !== feed.openRoles ? (
          <p className="text-xs text-muted-foreground">{feed.lastRoleCount} in last feed</p>
        ) : null}
      </td>
      <td className="py-3 pr-4 whitespace-nowrap">{when(feed.newestPostedAt, false)}</td>
      <td className="py-3 pr-4 whitespace-nowrap">{when(feed.lastSuccessAt)}</td>
      <td className="py-3 pr-4 whitespace-nowrap">{when(feed.lastSyncedAt)}</td>
      <td className="py-3 pr-4 tabular-nums">{feed.consecutiveFailures}</td>
      <td className="py-3 text-xs text-muted-foreground" title={feed.lastError ?? undefined}>
        {feed.lastError ? shortError(feed.lastError) : "None"}
      </td>
    </tr>
  );
}

function RunRow({ run }: { run: SyncRunRow }) {
  return (
    <tr className="border-t align-top">
      <td className="py-3 pr-4 whitespace-nowrap">{when(run.startedAt)}</td>
      <td className="py-3 pr-4">
        {run.trigger === "scheduled" ? "Scheduled" : "Manual"}
        {run.forced ? <p className="text-xs text-muted-foreground">Forced</p> : null}
      </td>
      <td className="py-3 pr-4 whitespace-nowrap tabular-nums">
        {run.finishedAt
          ? formatDuration(run.finishedAt.getTime() - run.startedAt.getTime())
          : run.state === "interrupted"
            ? "Did not finish"
            : "Running"}
      </td>
      {run.state === "finished" ? (
        <>
          <td className="py-3 pr-4 whitespace-nowrap tabular-nums">
            {run.companiesOk} ok · {run.companiesFailed} failed · {run.companiesSkipped} skipped
          </td>
          <td className="py-3 pr-4 whitespace-nowrap tabular-nums">
            {run.rolesAdded} added · {run.rolesReopened} reopened · {run.rolesClosed} closed
          </td>
        </>
      ) : (
        <td colSpan={2} className="py-3 pr-4 text-muted-foreground">
          Totals are written when the run ends
        </td>
      )}
      <td className="py-3 text-xs text-muted-foreground">
        {run.error ? <p title={run.error}>{shortError(run.error)}</p> : null}
        {run.failures.map((failure) => (
          <p key={failure.name} title={failure.error}>
            {failure.name}: {shortError(failure.error)}
          </p>
        ))}
        {!run.error && run.failures.length === 0 ? "None" : null}
      </td>
    </tr>
  );
}

function RecentSyncs({ runs }: { runs: SyncRunRow[] }) {
  if (runs.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">No runs recorded yet.</p>;
  }
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="pb-2 pr-4 font-normal">Started</th>
            <th className="pb-2 pr-4 font-normal">Trigger</th>
            <th className="pb-2 pr-4 font-normal">Took</th>
            <th className="pb-2 pr-4 font-normal">Companies</th>
            <th className="pb-2 pr-4 font-normal">Roles</th>
            <th className="pb-2 font-normal">Errors</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <RunRow key={run.id} run={run} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export async function FeedHealthReport() {
  const [feeds, runs] = await Promise.all([loadFeedHealth(), loadRecentSyncRuns()]);
  const stale = feeds.filter((feed) => feed.health.status === "stale").length;
  const failing = feeds.filter((feed) => feed.health.status === "failing").length;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="text-sm text-muted-foreground">Internal</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Feed health</h1>
      <p className="mt-4 text-base leading-7 text-muted-foreground">
        {feeds.length} feeds · {stale} stale · {failing} failing. Stale means three failed syncs in a row, no open
        roles, or no role posted in the last 12 months. Times are IST.
      </p>
      <h2 className="mt-10 font-serif text-2xl tracking-tight">Recent syncs</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Scheduled every 6 hours. A company synced in the last 4 hours is skipped.
      </p>
      <RecentSyncs runs={runs} />
      <h2 className="mt-10 font-serif text-2xl tracking-tight">Feeds</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="pb-2 pr-4 font-normal">Company</th>
              <th className="pb-2 pr-4 font-normal">Health</th>
              <th className="pb-2 pr-4 font-normal">Open roles</th>
              <th className="pb-2 pr-4 font-normal">Newest posting</th>
              <th className="pb-2 pr-4 font-normal">Last success</th>
              <th className="pb-2 pr-4 font-normal">Last attempt</th>
              <th className="pb-2 pr-4 font-normal">Failures</th>
              <th className="pb-2 font-normal">Last error</th>
            </tr>
          </thead>
          <tbody>
            {feeds.map((feed) => (
              <FeedRow key={feed.slug} feed={feed} />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
