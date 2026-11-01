import type { Metadata } from "next";
import { Suspense } from "react";

import { JobArticle } from "@/features/jobs/components";
import { jobMetadata } from "@/features/jobs/server";
import { PageSkeleton } from "@/shared/components/page-skeleton";
import { SiteHeader } from "@/shared/components/site-header";

type JobPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: JobPageProps): Promise<Metadata> {
  const { slug } = await params;
  return jobMetadata(slug);
}

export default function JobPage({ params }: JobPageProps) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<PageSkeleton />}>
        <JobArticle params={params} />
      </Suspense>
    </>
  );
}
