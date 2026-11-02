"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, use, useCallback, useMemo, useTransition, type ComponentProps, type MouseEvent, type ReactNode } from "react";

import { cn } from "@/shared/lib/utils";

type BoardNavigation = {
  pending: boolean;
  navigate: (href: string, options?: { scroll?: boolean }) => void;
};

const BoardNavigationContext = createContext<BoardNavigation>({
  pending: false,
  navigate: () => {},
});

export function useBoardNavigation(): BoardNavigation {
  return use(BoardNavigationContext);
}

// Board navigations (filters, companies, pages, search) run in one transition, so the board can
// show that a click registered while the server renders the new list.
export function BoardNavigationProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = useCallback(
    (href: string, options?: { scroll?: boolean }) => {
      startTransition(() => {
        router.push(href, { scroll: options?.scroll ?? true });
      });
    },
    [router],
  );
  const value = useMemo(() => ({ pending, navigate }), [pending, navigate]);

  return (
    <BoardNavigationContext value={value}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none fixed inset-x-0 top-16 z-50 h-0.5 overflow-hidden transition-opacity duration-200",
          pending ? "opacity-100 delay-100" : "opacity-0",
        )}
      >
        <div className="h-full w-1/3 rounded-full bg-signal shadow-[0_0_10px_var(--signal)] motion-safe:animate-[board-progress_1.1s_ease-in-out_infinite]" />
      </div>
      <div data-pending={pending ? "" : undefined} aria-busy={pending} className="group/board">
        {children}
      </div>
    </BoardNavigationContext>
  );
}

function plainClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0);
}

// A Link whose navigation joins the board transition. Modified clicks still open new tabs.
export function BoardLink({ href, scroll, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  const { navigate } = useBoardNavigation();
  return (
    <Link
      href={href}
      scroll={scroll}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || !plainClick(event)) {
          return;
        }
        event.preventDefault();
        navigate(href, { scroll: scroll ?? true });
      }}
      {...props}
    />
  );
}

// The search form, sent through the same transition. Empty fields are left out of the URL.
export function BoardSearchForm({ children, className }: { children: ReactNode; className?: string }) {
  const { navigate } = useBoardNavigation();
  return (
    <form
      action="/"
      role="search"
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams();
        for (const [name, value] of new FormData(event.currentTarget)) {
          if (typeof value === "string" && value.trim() !== "") {
            params.set(name, value.trim());
          }
        }
        const search = params.toString();
        navigate(search ? `/?${search}` : "/");
      }}
    >
      {children}
    </form>
  );
}
