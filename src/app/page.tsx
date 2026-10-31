import { Suspense } from "react";

import { Board } from "@/components/board/board";
import { BoardSkeleton } from "@/components/board/board-skeleton";
import { SiteHeader } from "@/components/layout/site-header";

export default function HomePage(props: PageProps<"/">) {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<BoardSkeleton />}>
        <Board searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
