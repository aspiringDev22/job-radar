"use client";

import { MapPinIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { formatSalary, listPlaceLabel, type JobSummary } from "@/features/jobs";
import { CompanyMark } from "@/shared/components/company-mark";
import { cn } from "@/shared/lib/utils";

// One compact row: title and age on the first line, company, place and pay on the second.
// Colour is kept for what helps a scan: new roles, remote roles and published pay.
export function JobCard({
  job,
  boardHref,
  selected,
  postedLabel,
  fresh,
}: {
  job: JobSummary;
  boardHref: string;
  selected: boolean;
  postedLabel: string;
  // Posted in the last two days.
  fresh: boolean;
}) {
  const router = useRouter();
  // A remote role shows its listed place, if any, beside the Remote chip.
  const place = job.locationCount === 1 && job.isRemote ? job.location : listPlaceLabel(job);
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <Link
      id={`job-${job.slug}`}
      href={`/jobs/${job.slug}`}
      scroll={false}
      aria-current={selected ? "true" : undefined}
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
        "group relative flex items-start gap-3.5 px-4 py-3.5 transition-colors hover:bg-muted/50",
        selected && "bg-signal/[0.07] hover:bg-signal/[0.07]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-3 left-0 w-[3px] rounded-r-full bg-signal transition-opacity",
          selected ? "opacity-100" : "opacity-0",
        )}
      />
      <CompanyMark name={job.companyName} slug={job.companySlug} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <h2 className="line-clamp-2 min-w-0 flex-1 font-serif text-[1.08rem] leading-snug tracking-tight">
            {job.title}
          </h2>
          <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            {fresh ? (
              <span className="rounded-full bg-signal/12 px-1.5 py-px text-[0.7rem] font-semibold text-signal">
                New
              </span>
            ) : null}
            {postedLabel}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.82rem] text-muted-foreground">
          <span className="font-medium text-foreground/80">{job.companyName}</span>
          {place ? (
            <span className="flex min-w-0 items-center gap-1">
              <MapPinIcon className="size-3.5 shrink-0 opacity-70" />
              <span className="truncate">{place}</span>
            </span>
          ) : null}
          {job.isRemote ? (
            <span className="rounded-full bg-sky-500/10 px-2 py-px text-xs font-medium text-sky-700 dark:text-sky-300">
              Remote
            </span>
          ) : null}
          {salary ? (
            <span className="rounded-full bg-signal/10 px-2 py-px text-xs font-medium text-signal">{salary}</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
