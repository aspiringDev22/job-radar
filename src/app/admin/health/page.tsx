import type { Metadata } from "next";
import { Suspense } from "react";

import { RequireAdmin } from "@/features/admin/components";
import { FeedHealthReport } from "@/features/feed-health/components";
import { PageSkeleton } from "@/shared/components/page-skeleton";
import { SiteHeader } from "@/shared/components/site-header";

export const metadata: Metadata = {
  title: "Feed health",
  robots: { index: false, follow: false },
};

export default function AdminHealthPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<PageSkeleton />}>
        <RequireAdmin>
          <FeedHealthReport />
        </RequireAdmin>
      </Suspense>
    </>
  );
}
