import Link from "next/link";

import { siteUrl } from "@/shared/lib/site";

import { formatSalary, postedAgo, sourceLabel } from "../lib/format";
import { jobPostingJsonLd, serializeJsonLd } from "../lib/job-posting";
import { listPlaceLabel } from "../lib/listing";
import type { JobRecord } from "../types";
import { JobLocations } from "./job-locations";
import { LevelPayNote } from "./level-pay";

// The route loads the role, so this file stays free of server code and the components entry
// stays safe to import from client components.
export function JobArticle({ job }: { job: JobRecord }) {
  const place = listPlaceLabel(job);
  const manyLocations = job.locations.length > 1;
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const pageUrl = `${siteUrl()}/jobs/${job.slug}`;
  const jsonLd = serializeJsonLd(
    jobPostingJsonLd({
      title: job.title,
      descriptionText: job.descriptionText,
      postedAt: job.postedAt,
      firstSeenAt: job.firstSeenAt,
      location: job.location,
      locations: job.locations,
      isRemote: job.isRemote,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      applyUrl: job.status === "closed" ? null : job.applyUrl,
      companyName: job.companyName,
      companyWebsite: job.companyWebsite,
      externalId: job.externalId,
      pageUrl,
      closedAt: job.closedAt,
    }),
  );

  return (
    <article className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/?company=${encodeURIComponent(job.companySlug)}`} className="text-sm text-muted-foreground">
        More roles at {job.companyName}
      </Link>
      <p className="mt-6 text-sm text-muted-foreground">{job.companyName}</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight md:text-5xl">{job.title}</h1>
      {job.status === "closed" ? (
        <p role="status" className="mt-6 rounded-2xl border bg-muted px-4 py-3 text-sm">
          No longer accepting applications
        </p>
      ) : null}
      <p className="mt-4 text-sm text-muted-foreground">
        {place}
        {!manyLocations && job.isRemote && job.location ? ` · ${job.location}` : ""} · {postedAgo(job.postedAt)} ·{" "}
        {sourceLabel(job.source)}
        {salary ? ` · ${salary}` : ""}
      </p>
      <LevelPayNote companyName={job.companyName} pay={job.levelPay} />
      {job.status === "open" ? <JobLocations locations={job.locations} /> : null}
      {job.status === "open" && !manyLocations && job.applyUrl ? (
        <a
          href={job.applyUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-flex h-10 items-center rounded-full bg-signal px-5 text-sm font-medium text-signal-foreground transition-[filter] hover:brightness-110"
        >
          Apply
        </a>
      ) : null}
      <div className="mt-8 text-[0.95rem] leading-7 whitespace-pre-wrap text-foreground/80">
        {job.descriptionText ?? "No description was published for this role."}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </article>
  );
}
