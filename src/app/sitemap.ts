import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { loadSitemapJobs } from "@/features/jobs/server";
import { siteUrl } from "@/shared/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const jobs = await loadSitemapJobs();
  const base = siteUrl();

  return [
    {
      url: base,
      changeFrequency: "hourly",
      priority: 1,
    },
    ...jobs.map((job) => ({
      url: `${base}/jobs/${job.slug}`,
      lastModified: job.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
