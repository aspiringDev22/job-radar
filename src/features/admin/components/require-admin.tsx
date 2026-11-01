import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { adminAuthorized, adminPassword } from "../lib/admin-auth";

/**
 * Renders its children only for a request that carries the admin password.
 * The proxy already guards /admin; this repeats the check where the data is
 * read, so a matcher change cannot expose it. Render inside <Suspense>.
 */
export async function RequireAdmin({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  if (!adminAuthorized(requestHeaders.get("authorization"), adminPassword())) {
    notFound();
  }
  return children;
}
