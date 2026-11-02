import { SearchXIcon } from "lucide-react";
import Link from "next/link";

import { AdSlot } from "@/features/ads/components";
import { postedAgo, postedWithin, type JobSummary } from "@/features/jobs";

import { boardHref } from "../lib/href";
import type { BoardQuery } from "../lib/query";
import { JobCard } from "./job-card";

// Roles posted this recently get a "New" badge.
const FRESH_DAYS = 2;

export function JobList({
  jobs,
  query,
  selectedSlug,
  filtered,
  descriptionMatches,
  descriptionsHref,
}: {
  jobs: JobSummary[];
  query: BoardQuery;
  selectedSlug: string | null;
  filtered: boolean;
  descriptionMatches: number;
  descriptionsHref: string;
}) {
  if (jobs.length === 0 && descriptionMatches > 0) {
    return (
      <div className="rounded-2xl border bg-card px-6 py-16 text-center">
        <SearchXIcon className="mx-auto size-8 text-muted-foreground/60" />
        <p className="mt-4 font-serif text-2xl">No titles match</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          {descriptionMatches.toLocaleString("en-IN")} {descriptionMatches === 1 ? "role mentions" : "roles mention"} your
          search in the description.
        </p>
        <Link
          href={descriptionsHref}
          className="mt-5 inline-flex h-9 items-center rounded-full bg-signal px-4 text-sm font-medium text-signal-foreground hover:brightness-110"
        >
          Show them
        </Link>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="rounded-2xl border bg-card px-6 py-16 text-center">
        <SearchXIcon className="mx-auto size-8 text-muted-foreground/60" />
        <p className="mt-4 font-serif text-2xl">{filtered ? "No matching roles" : "No roles yet"}</p>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          {filtered
            ? "Try another city, or clear the filters."
            : "Roles show up here after startup career pages are read."}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm shadow-black/[0.03]">
      {jobs.map((job, index) => (
        <li key={job.slug}>
          {index === 6 ? <AdSlot placement="list" /> : null}
          <JobCard
            job={job}
            selected={job.slug === selectedSlug}
            postedLabel={postedAgo(job.postedAt)}
            fresh={postedWithin(job.postedAt, FRESH_DAYS)}
            boardHref={boardHref({
              ...query,
              posted: query.postedWithinDays,
              company: query.company,
              job: job.slug,
            })}
          />
        </li>
      ))}
    </ul>
  );
}
