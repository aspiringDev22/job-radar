import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";

import { boardHref } from "../lib/href";
import type { BoardQuery } from "../lib/query";

const linkClass =
  "inline-flex h-9 items-center gap-1 rounded-full border bg-card px-3.5 text-sm transition-colors hover:border-signal/40 hover:text-foreground";

// Previous and next keep the filters and the open role, and jump back to the top of the list.
export function BoardPagination({
  query,
  page,
  pageCount,
}: {
  query: BoardQuery;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) {
    return null;
  }
  const href = (target: number) => `${boardHref({ ...query, posted: query.postedWithinDays, page: target })}#roles`;

  return (
    <nav aria-label="Pages" className="mt-4 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass}>
          <ChevronLeftIcon className="size-4" />
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-muted-foreground tabular-nums">
        Page <span className="font-medium text-foreground">{page}</span> of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className={linkClass}>
          Next
          <ChevronRightIcon className="size-4" />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
