import { AdSlot } from "@/features/ads/components";
import { postedAgo, type JobSummary } from "@/features/jobs";

import { boardHref } from "../lib/href";
import type { BoardQuery } from "../lib/query";
import { JobCard } from "./job-card";

export function JobList({
  jobs,
  query,
  selectedSlug,
  truncated,
  filtered,
}: {
  jobs: JobSummary[];
  query: BoardQuery;
  selectedSlug: string | null;
  truncated: boolean;
  filtered: boolean;
}) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border px-6 py-16 text-center">
        <p className="font-serif text-2xl">{filtered ? "No matching roles" : "No roles yet"}</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          {filtered
            ? "Try another city, or clear the filters."
            : "Roles show up here after startup career pages are read."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {truncated ? (
        <p className="text-sm text-muted-foreground">Showing the latest {jobs.length} roles.</p>
      ) : null}
      {jobs.map((job, index) => (
        <div key={job.slug}>
          {index === 6 ? <AdSlot placement="list" /> : null}
          <JobCard
            job={job}
            selected={job.slug === selectedSlug}
            postedLabel={postedAgo(job.postedAt)}
            boardHref={boardHref({
              ...query,
              posted: query.postedWithinDays,
              company: query.company,
              job: job.slug,
            })}
          />
        </div>
      ))}
    </div>
  );
}
