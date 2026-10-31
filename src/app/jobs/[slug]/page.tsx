import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { BoardSkeleton } from "@/components/board/board-skeleton";
import { LevelPayNote } from "@/components/board/level-pay";
import { SiteHeader } from "@/components/layout/site-header";
import { loadJob } from "@/lib/board";
import { formatSalary, postedAgo, sourceLabel } from "@/lib/format";
import { jobPostingJsonLd, serializeJsonLd } from "@/lib/job-posting";
import { siteUrl } from "@/lib/site";

type JobPageProps = {
  params: Promise<{ slug: string }>;
};

function descriptionFor(text: string | null, title: string, company: string): string {
  const flat = text?.replace(/\s+/g, " ").trim();
  if (!flat) {
    return `${title} at ${company}.`;
  }
  return flat.length > 160 ? `${flat.slice(0, 157)}…` : flat;
}

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { slug } = await params;
  const job = await loadJob(slug);
  if (!job) {
    return { title: "Role not found" };
  }
  const title = `${job.title} at ${job.companyName}`;
  const description = descriptionFor(job.descriptionText, job.title, job.companyName);
  const canonical = `${siteUrl()}/jobs/${job.slug}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
  };
}

async function JobArticle({ slug }: { slug: string }) {
  const job = await loadJob(slug);
  if (!job) {
    notFound();
  }

  const place = job.isRemote ? "Remote" : (job.location ?? "Location not listed");
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
  const pageUrl = `${siteUrl()}/jobs/${job.slug}`;
  const jsonLd = serializeJsonLd(
    jobPostingJsonLd({
      title: job.title,
      descriptionText: job.descriptionText,
      postedAt: job.postedAt,
      firstSeenAt: job.firstSeenAt,
      location: job.location,
      isRemote: job.isRemote,
      employmentType: job.employmentType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      applyUrl: job.applyUrl,
      companyName: job.companyName,
      companyWebsite: job.companyWebsite,
      externalId: job.externalId,
      pageUrl,
    }),
  );

  return (
    <article className="mx-auto max-w-3xl px-6 py-10">
      <Link href={`/?company=${encodeURIComponent(job.companySlug)}`} className="text-sm text-muted-foreground">
        More roles at {job.companyName}
      </Link>
      <p className="mt-6 text-sm text-muted-foreground">{job.companyName}</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight tracking-tight md:text-5xl">{job.title}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {place}
        {job.isRemote && job.location ? ` · ${job.location}` : ""} · {postedAgo(job.postedAt)} ·{" "}
        {sourceLabel(job.source)}
        {salary ? ` · ${salary}` : ""}
      </p>
      <LevelPayNote companyName={job.companyName} pay={job.levelPay} />
      {job.applyUrl ? (
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

export default async function JobPage({ params }: JobPageProps) {
  const { slug } = await params;
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<BoardSkeleton />}>
        <JobArticle slug={slug} />
      </Suspense>
    </>
  );
}
