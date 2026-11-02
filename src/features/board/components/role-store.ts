"use client";

import { useEffect, useSyncExternalStore } from "react";

import type { JobDetail } from "@/features/jobs";

// Roles the detail pane has fetched in this tab, by slug. Hovering a row starts the fetch,
// so a click usually finds the role here already. One request per role, shared by every caller.
export type RoleEntry = { status: "loading" } | { status: "ready"; job: JobDetail } | { status: "missing" };

const entries = new Map<string, RoleEntry>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The JSON carries dates as strings.
function revive(job: JobDetail): JobDetail {
  return { ...job, postedAt: job.postedAt ? new Date(job.postedAt) : null };
}

export function prefetchRole(slug: string): void {
  if (entries.has(slug)) {
    return;
  }
  entries.set(slug, { status: "loading" });
  fetch(`/api/roles/${encodeURIComponent(slug)}`)
    .then(async (response) => {
      if (response.status === 404) {
        entries.set(slug, { status: "missing" });
        return;
      }
      if (!response.ok) {
        throw new Error(`Role request failed with ${response.status}`);
      }
      entries.set(slug, { status: "ready", job: revive((await response.json()) as JobDetail) });
    })
    .catch(() => {
      // A network error is not a closed role: forget it so the next hover or click retries.
      entries.delete(slug);
    })
    .finally(emit);
}

// The role the server already rendered, so returning to it later needs no request.
export function rememberRole(job: JobDetail): void {
  if (entries.get(job.slug)?.status !== "ready") {
    entries.set(job.slug, { status: "ready", job });
    emit();
  }
}

export function useRole(slug: string | null): RoleEntry | null {
  const entry = useSyncExternalStore(
    subscribe,
    () => (slug ? (entries.get(slug) ?? null) : null),
    () => null,
  );
  useEffect(() => {
    if (slug) {
      prefetchRole(slug);
    }
  }, [slug]);
  return entry;
}
