import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { JobArticle } from "@/features/jobs/components";
import { jobMetadata, loadJob } from "@/features/jobs/server";
import { PageSkeleton } from "@/shared/components/page-skeleton";
import { SiteHeader } from "@/shared/components/site-header";

type JobPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { slug } = await params;
  return jobMetadata(slug);
}

async function JobContent({ params }: JobPageProps) {
  const { slug } = await params;
  const job = await loadJob(slug);
  if (!job) {
    notFound();
  }
  return <JobArticle job={job} />;
}

export default function JobPage({ params }: JobPageProps) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<PageSkeleton />}>
        <JobContent params={params} />
      </Suspense>
    </>
  );
}
