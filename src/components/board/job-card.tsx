"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type { JobSummary } from "@/lib/board";
import { formatSalary, sourceLabel } from "@/lib/format";
import { pillClass } from "@/lib/pill";
import { cn } from "@/lib/utils";

export function JobCard({
  job,
  boardHref,
  selected,
  postedLabel,
}: {
  job: JobSummary;
  boardHref: string;
  selected: boolean;
  postedLabel: string;
}) {
  const router = useRouter();
  const place = job.isRemote ? "Remote" : (job.location ?? "Location not listed");
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <Link
      id={`job-${job.slug}`}
      href={`/jobs/${job.slug}`}
      scroll={false}
      onClick={(event) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        if (window.matchMedia("(min-width: 1024px)").matches) {
          event.preventDefault();
          router.push(boardHref, { scroll: false });
        }
      }}
      className={cn(
        "block rounded-2xl border px-5 py-4 transition-colors hover:bg-muted/40",
        selected && "border-foreground/20 bg-muted/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full text-sm",
            pillClass(job.companySlug),
          )}
          aria-hidden
        >
          {job.companyName.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">{job.companyName}</p>
          <h2 className="font-serif text-xl leading-snug tracking-tight">{job.title}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs", pillClass(place))}>
              {place}
            </span>
            {job.isRemote && job.location ? <span>{job.location}</span> : null}
            <span>{postedLabel}</span>
            <span>{sourceLabel(job.source)}</span>
            {salary ? <span>{salary}</span> : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
