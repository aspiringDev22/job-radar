import type { CSSProperties } from "react";

import { cn } from "@/shared/lib/utils";

// A stable hue per company, so the same company always gets the same tile.
function hueFor(key: string): number {
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}

// The company's first letter on a tinted tile. Every tile shares one lightness, so the list stays calm.
export function CompanyMark({ name, slug, className }: { name: string; slug: string; className?: string }) {
  const style = { "--mark-hue": hueFor(slug) } as CSSProperties;
  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl text-[0.95rem] font-semibold",
        "bg-[oklch(0.94_0.045_var(--mark-hue))] text-[oklch(0.38_0.09_var(--mark-hue))]",
        "dark:bg-[oklch(0.3_0.05_var(--mark-hue))] dark:text-[oklch(0.88_0.08_var(--mark-hue))]",
        className,
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
