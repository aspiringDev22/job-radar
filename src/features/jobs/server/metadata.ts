import type { Metadata } from "next";

import { siteUrl } from "@/shared/lib/site";

import { loadJob } from "./queries";

function descriptionFor(text: string | null, title: string, company: string): string {
  const flat = text?.replace(/\s+/g, " ").trim();
  if (!flat) {
    return `${title} at ${company}.`;
  }
  return flat.length > 160 ? `${flat.slice(0, 157)}…` : flat;
}

export async function jobMetadata(slug: string): Promise<Metadata> {
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
    robots: job.status === "closed" ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: canonical, type: "website" },
  };
}
