"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { boardHref } from "../lib/href";
import type { BoardQuery } from "../lib/query";
import { prefetchRole } from "./role-store";

// Up and down step through the roles on the page, opening each in the pane as a click would.
export function BoardHotkeys({
  slugs,
  query,
}: {
  slugs: string[];
  query: BoardQuery;
}) {
  const selectedSlug = useSearchParams().get("job");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        document.getElementById("role-search")?.focus();
        return;
      }

      if (typing || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
        return;
      }
      if (slugs.length === 0) {
        return;
      }

      event.preventDefault();
      const index = selectedSlug ? slugs.indexOf(selectedSlug) : -1;
      const nextIndex =
        event.key === "ArrowDown"
          ? Math.min(index + 1, slugs.length - 1)
          : Math.max(index <= 0 ? 0 : index - 1, 0);
      const next = slugs[nextIndex];
      if (!next || next === selectedSlug) {
        return;
      }
      prefetchRole(next);
      window.history.pushState(null, "", boardHref({ ...query, posted: query.postedWithinDays, job: next }));
      document.getElementById(`job-${next}`)?.scrollIntoView({ block: "nearest" });
      // Warm the role after it too, so holding the key stays quick.
      const after = slugs[event.key === "ArrowDown" ? nextIndex + 1 : nextIndex - 1];
      if (after) {
        prefetchRole(after);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query, selectedSlug, slugs]);

  return null;
}
