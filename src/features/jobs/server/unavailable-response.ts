import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getDb } from "@/shared/db/client";

import { roleAvailability } from "../lib/role-status";
import { jobs } from "../schema";

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · JobRadar</title>
</head>
<body style="font-family: Georgia, serif; margin: 4rem auto; max-width: 36rem; padding: 0 1.5rem;">
<h1>${title}</h1>
<p>${body}</p>
<p><a href="/">Back to roles</a></p>
</body>
</html>`;
}

const GONE_HTML = page("No longer accepting applications", "This role has been closed for more than 30 days.");
const MISSING_HTML = page("Role not found", "This role is not on JobRadar. It may have been removed by the company.");

function htmlResponse(html: string, status: number): NextResponse {
  return new NextResponse(html, {
    status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex",
    },
  });
}

/**
 * The page streams from a Suspense boundary, so it cannot change its own status once
 * it starts. This runs in the proxy first: 404 for a slug that was never stored, 410 for
 * a role closed more than 30 days ago, or null to let the request through.
 * `slug` is the raw, still-encoded path segment.
 */
export async function unavailableJobResponse(slug: string): Promise<NextResponse | null> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    // Broken percent-encoding cannot name a stored role.
    return htmlResponse(MISSING_HTML, 404);
  }
  try {
    const db = getDb();
    const [row] = await db
      .select({ status: jobs.status, closedAt: jobs.closedAt })
      .from(jobs)
      .where(eq(jobs.slug, decoded))
      .limit(1);
    if (!row) {
      return htmlResponse(MISSING_HTML, 404);
    }
    if (roleAvailability(row.status, row.closedAt) === "gone") {
      return htmlResponse(GONE_HTML, 410);
    }
    return null;
  } catch (error) {
    // A database hiccup: let the page render, with its own not-found UI if need be.
    console.error(error);
    return null;
  }
}
