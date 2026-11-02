"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import type { JobDetail as JobDetailData } from "@/features/jobs";
import { Skeleton } from "@/shared/components/ui/skeleton";

import type { BoardQuery } from "../lib/query";
import { JobDetail } from "./job-detail";
import { rememberRole, useRole } from "./role-store";

function PaneSkeleton() {
  return (
    <aside aria-busy className="rounded-2xl border bg-card px-6 py-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-xl" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="mt-4 h-8 w-4/5" />
      <div className="mt-4 flex gap-1.5">
        <Skeleton className="h-6 w-28 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-10 w-44 rounded-full" />
      <div className="mt-8 space-y-2.5">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-3.5" style={{ width: `${92 - index * 7}%` }} />
        ))}
      </div>
    </aside>
  );
}

// The detail pane follows ?job= in the URL. Rows change it with history.pushState, so picking a role
// fetches only that role instead of rendering the whole board again. `initial` is the role the
// server rendered for the URL the page was opened with.
export function RolePane({ initial, query }: { initial: JobDetailData | null; query: BoardQuery }) {
  const slug = useSearchParams().get("job");
  const fromServer = initial && initial.slug === slug ? initial : null;
  const entry = useRole(fromServer ? null : slug);

  useEffect(() => {
    if (initial) {
      rememberRole(initial);
    }
  }, [initial]);

  if (!slug) {
    return <JobDetail job={null} query={query} />;
  }
  if (fromServer) {
    return <JobDetail key={slug} job={fromServer} query={query} />;
  }
  if (entry?.status === "ready") {
    return <JobDetail key={slug} job={entry.job} query={query} />;
  }
  if (entry?.status === "missing") {
    return (
      <aside className="rounded-2xl border bg-card px-6 py-10 text-center">
        <h2 className="font-serif text-2xl tracking-tight">This role has closed</h2>
        <p className="mt-2 text-sm text-muted-foreground">It is no longer on the company&apos;s careers page.</p>
      </aside>
    );
  }
  return <PaneSkeleton />;
}
