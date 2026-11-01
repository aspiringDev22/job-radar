import type { Metadata } from "next";
import { Suspense } from "react";

import { RequireAdmin } from "@/features/admin/components";
import { SuggestionList } from "@/features/suggestions/components";
import { PageSkeleton } from "@/shared/components/page-skeleton";
import { SiteHeader } from "@/shared/components/site-header";

export const metadata: Metadata = {
  title: "Company suggestions",
  robots: { index: false, follow: false },
};

export default function AdminSuggestionsPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<PageSkeleton />}>
        <RequireAdmin>
          <SuggestionList />
        </RequireAdmin>
      </Suspense>
    </>
  );
}
