"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import type { BoardQuery } from "@/lib/filters";
import { boardHref } from "@/lib/format";

export function BoardHotkeys({
  slugs,
  selectedSlug,
  query,
}: {
  slugs: string[];
  selectedSlug: string | null;
  query: BoardQuery;
}) {
  const router = useRouter();

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
      router.push(
        boardHref({
          ...query,
          posted: query.postedWithinDays,
          job: next,
        }),
        { scroll: false },
      );
      document.getElementById(`job-${next}`)?.scrollIntoView({ block: "nearest" });
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [query, router, selectedSlug, slugs]);

  return null;
}
