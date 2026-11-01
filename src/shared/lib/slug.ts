export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function uniqueSlug(name: string, atsSlug: string, used: Set<string>): string {
  const base = slugify(name) || slugify(atsSlug) || "company";
  if (!used.has(base)) {
    used.add(base);
    return base;
  }

  const withSource = `${base}-${slugify(atsSlug) || "company"}`;
  if (!used.has(withSource)) {
    used.add(withSource);
    return withSource;
  }

  let suffix = 2;
  let candidate = `${withSource}-${suffix}`;
  while (used.has(candidate)) {
    suffix += 1;
    candidate = `${withSource}-${suffix}`;
  }
  used.add(candidate);
  return candidate;
}
