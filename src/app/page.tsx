import { Suspense } from "react";

import { Board } from "@/features/board/components";
import { PageSkeleton } from "@/shared/components/page-skeleton";
import { SiteHeader } from "@/shared/components/site-header";

export default function HomePage(props: PageProps<"/">) {
  return (
    <>
      <SiteHeader wide />
      <Suspense fallback={<PageSkeleton wide />}>
        <Board searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
