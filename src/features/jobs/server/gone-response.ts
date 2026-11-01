import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/shared/db/client";

import { roleAvailability } from "../lib/role-status";
import { jobs } from "../schema";

const GONE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<title>No longer accepting applications · JobRadar</title>
</head>
<body style="font-family: Georgia, serif; margin: 4rem auto; max-width: 36rem; padding: 0 1.5rem;">
<h1>No longer accepting applications</h1>
<p>This role has been closed for more than 30 days.</p>
<p><a href="/">Back to roles</a></p>
</body>
</html>`;

/**
 * A 410 page for a role closed more than 30 days ago, or null to let the
 * request through. `slug` is the raw, still-encoded path segment.
 */
export async function goneJobResponse(slug: string): Promise<NextResponse | null> {
  try {
    const db = getDb();
    const [row] = await db
      .select({ status: jobs.status, closedAt: jobs.closedAt })
      .from(jobs)
      .where(eq(jobs.slug, decodeURIComponent(slug)))
      .limit(1);
    if (!row || roleAvailability(row.status, row.closedAt) !== "gone") {
      return null;
    }
  } catch (error) {
    console.error(error);
    return null;
  }

  return new NextResponse(GONE_HTML, {
    status: 410,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex",
    },
  });
}
