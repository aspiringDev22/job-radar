import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  BriefcaseIcon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  formatSalary,
  listPlaceLabel,
  postedAgo,
  sourceLabel,
  type JobDetail as JobDetailData,
} from "@/features/jobs";
import { JobLocations, LevelPayNote } from "@/features/jobs/components";
import { CompanyMark } from "@/shared/components/company-mark";
import { Radar } from "@/shared/components/radar";

import { boardHref } from "../lib/href";
import type { BoardQuery } from "../lib/query";

function levelLabel(value: string | null): string | null {
  if (!value || value === "unknown") {
    return null;
  }
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-foreground/80 [&_svg]:size-3.5 [&_svg]:text-muted-foreground">
      {icon}
      {children}
    </span>
  );
}

const kbdClass = "inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1 font-sans text-[0.7rem]";

export function JobDetail({
  job,
  query,
}: {
  job: JobDetailData | null;
  query: BoardQuery;
}) {
  if (!job) {
    return (
      <aside className="hidden overflow-hidden rounded-2xl border bg-card px-6 py-10 text-center lg:block">
        <Radar className="mx-auto w-28 opacity-80" />
        <h2 className="mt-6 font-serif text-2xl tracking-tight">Pick a role to see it here</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          The description, pay and apply link open beside the list.
        </p>
        <p className="mt-5 flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <kbd className={kbdClass}>↑</kbd>
            <kbd className={kbdClass}>↓</kbd>
            step through roles
          </span>
          <span className="inline-flex items-center gap-1.5">
            <kbd className={kbdClass}>/</kbd>
            search
          </span>
        </p>
      </aside>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const place = listPlaceLabel(job);
  const level = levelLabel(job.seniority);
  const manyLocations = job.locations.length > 1;

  return (
    // The board pins this pane beside the list. Long descriptions scroll inside it, under a pinned header.
    <aside className="overflow-hidden rounded-2xl border bg-card shadow-sm shadow-black/[0.03] lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overscroll-contain lg:scrollbar-thin">
      <div className="border-b bg-card/95 px-6 pt-5 pb-5 backdrop-blur lg:sticky lg:top-0 lg:z-10">
        <Link
          href={boardHref({ ...query, posted: query.postedWithinDays, job: null })}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground lg:hidden"
        >
          <ArrowLeftIcon className="size-4" />
          Back to roles
        </Link>
        <div className="flex items-center gap-3">
          <CompanyMark name={job.companyName} slug={job.companySlug} className="size-9 text-sm" />
          <p className="text-sm font-medium text-muted-foreground">{job.companyName}</p>
        </div>
        <h2 className="mt-3 font-serif text-[1.75rem] leading-tight tracking-tight">{job.title}</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Fact icon={<MapPinIcon />}>
            {place}
            {!manyLocations && job.isRemote && job.location ? ` · ${job.location}` : ""}
          </Fact>
          <Fact icon={<ClockIcon />}>{postedAgo(job.postedAt)}</Fact>
          {level ? <Fact icon={<BriefcaseIcon />}>{level}</Fact> : null}
          {salary ? <Fact icon={<BanknoteIcon />}>{salary}</Fact> : null}
          <Fact icon={<ExternalLinkIcon />}>via {sourceLabel(job.source)}</Fact>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!manyLocations && job.applyUrl ? (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-signal px-5 text-sm font-medium text-signal-foreground transition-[filter] hover:brightness-110"
            >
              Apply on {job.companyName}
              <ArrowUpRightIcon className="size-4" />
            </a>
          ) : null}
          <Link
            href={`/jobs/${job.slug}`}
            className="inline-flex h-10 items-center rounded-full border px-4 text-sm text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
          >
            Open full page
          </Link>
        </div>
      </div>
      <div className="px-6 pt-2 pb-8">
        <LevelPayNote companyName={job.companyName} pay={job.levelPay} />
        <JobLocations locations={job.locations} />
        <div className="mt-5 text-[0.94rem] leading-7 whitespace-pre-wrap text-foreground/80">
          {job.descriptionText ?? "No description was published for this role."}
        </div>
      </div>
    </aside>
  );
}
