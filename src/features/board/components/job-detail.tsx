import Link from "next/link";

import {
  formatSalary,
  listPlaceLabel,
  postedAgo,
  sourceLabel,
  type JobDetail as JobDetailData,
} from "@/features/jobs";
import { JobLocations, LevelPayNote } from "@/features/jobs/components";

import { boardHref } from "../lib/href";
import type { BoardQuery } from "../lib/query";

function levelLabel(value: string | null): string | null {
  if (!value || value === "unknown") {
    return null;
  }
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

export function JobDetail({
  job,
  query,
}: {
  job: JobDetailData | null;
  query: BoardQuery;
}) {
  if (!job) {
    return (
      <aside className="hidden rounded-2xl border px-5 py-8 lg:block">
        <h2 className="font-serif text-2xl tracking-tight">Select a role</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The description and apply link open here.
        </p>
      </aside>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const place = listPlaceLabel(job);
  const level = levelLabel(job.seniority);
  const manyLocations = job.locations.length > 1;

  return (
    <aside className="rounded-2xl border px-5 py-6 lg:sticky lg:top-8">
      <Link
        href={boardHref({ ...query, posted: query.postedWithinDays, job: null })}
        className="text-sm text-muted-foreground lg:hidden"
      >
        Back to roles
      </Link>
      <p className="mt-3 text-sm text-muted-foreground lg:mt-0">{job.companyName}</p>
      <h2 className="mt-1 font-serif text-3xl leading-tight tracking-tight">{job.title}</h2>
      <p className="mt-3 text-sm text-muted-foreground">
        {place}
        {!manyLocations && job.isRemote && job.location ? ` · ${job.location}` : ""} · {postedAgo(job.postedAt)} ·{" "}
        {sourceLabel(job.source)}
        {level ? ` · ${level}` : ""}
        {salary ? ` · ${salary}` : ""}
      </p>
      <LevelPayNote companyName={job.companyName} pay={job.levelPay} />
      <Link href={`/jobs/${job.slug}`} className="mt-3 inline-block text-sm text-muted-foreground">
        Full page
      </Link>
      <JobLocations locations={job.locations} />
      {!manyLocations && job.applyUrl ? (
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm text-background"
        >
          Apply
        </a>
      ) : null}
      <div className="mt-6 max-h-[70vh] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
        {job.descriptionText ?? "No description was published for this role."}
      </div>
    </aside>
  );
}
