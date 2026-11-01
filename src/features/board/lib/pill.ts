const PILLS = [
  "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
  "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
  "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
  "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-100",
  "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-100",
] as const;

export function pillClass(key: string): string {
  let hash = 0;
  for (const char of key) {
    hash = (hash + char.charCodeAt(0)) % PILLS.length;
  }
  return PILLS[hash] ?? PILLS[0];
}
