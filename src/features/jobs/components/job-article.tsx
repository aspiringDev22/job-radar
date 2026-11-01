import Link from "next/link";
import { notFound } from "next/navigation";

import { siteUrl } from "@/shared/lib/site";

import { formatSalary, postedAgo, sourceLabel } from "../lib/format";
import { jobPostingJsonLd, serializeJsonLd } from "../lib/job-posting";
import { listPlaceLabel } from "../lib/listing";
import { loadJob } from "../server/queries";
import { JobLocations } from "./job-locations";
import { LevelPayNote } from "./level-pay";

export async function JobArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const job = await loadJob(slug);
  if (!job) {
    notFound();
  }

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
          className="mt-6 inline-flex h-9 items-center rounded-full bg-foreground px-4 text-sm text-background"
        >
          Apply
        </a>
      ) : null}
      <div className="mt-8 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
        {job.descriptionText ?? "No description was published for this role."}
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </article>
  );
}
