import { connection } from "next/server";
import { and, eq, sql } from "drizzle-orm";

import { companies } from "@/features/companies/schema";
import { jobs } from "@/features/jobs/schema";
import { getDb } from "@/shared/db/client";

import { compareFeedHealth, feedHealth, type FeedHealth } from "../lib/feed-health";

export type FeedHealthRow = {
  name: string;
  slug: string;
  source: string;
  lastSyncedAt: Date | null;
  lastSuccessAt: Date | null;
  lastError: string | null;
  consecutiveFailures: number;
  lastRoleCount: number | null;
  openRoles: number;
  datedRoles: number;
  newestPostedAt: Date | null;
  health: FeedHealth;
};

export async function loadFeedHealth(): Promise<FeedHealthRow[]> {
  await connection();
  const db = getDb();
  const rows = await db
    .select({
      name: companies.name,
      slug: companies.slug,
      atsType: companies.atsType,
      atsSlug: companies.atsSlug,
      lastSyncedAt: companies.lastSyncedAt,
      lastSuccessAt: companies.lastSuccessAt,
      lastError: companies.lastError,
      consecutiveFailures: companies.consecutiveFailures,
      lastRoleCount: companies.lastRoleCount,
      openRoles: sql<number>`cast(count(${jobs.id}) as int)`,
      datedRoles: sql<number>`cast(count(${jobs.postedAt}) as int)`,
      newestPostedAt: sql<Date | null>`max(${jobs.postedAt})`.mapWith(jobs.postedAt),
    })
    .from(companies)
    .leftJoin(jobs, and(eq(jobs.companyId, companies.id), eq(jobs.isActive, true)))
    .where(eq(companies.active, true))
    .groupBy(companies.id);

  const now = Date.now();
  return rows
    .map(({ atsType, atsSlug, ...row }) => ({
      ...row,
      source: `${atsType}:${atsSlug}`,
      health: feedHealth(row, now),
    }))
    .sort(compareFeedHealth);
}
