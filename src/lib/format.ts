export function postedAgo(date: Date | null, now = new Date()): string {
  if (!date) {
    return "date unknown";
  }
  const days = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (days <= 0) {
    return "newest today";
  }
  if (days === 1) {
    return "newest yesterday";
  }
  if (days < 30) {
    return `newest ${days} days ago`;
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function updatedLabel(date: Date | null): string {
  if (!date) {
    return "Not synced yet.";
  }
  const formatted = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `Updated ${formatted}.`;
}

export function sourceLabel(source: string): string {
  if (source === "greenhouse") {
    return "Greenhouse";
  }
  if (source === "lever") {
    return "Lever";
  }
  if (source === "ashby") {
    return "Ashby";
  }
  if (source === "workable") {
    return "Workable";
  }
  if (source === "smartrecruiters") {
    return "SmartRecruiters";
  }
  if (source === "recruitee") {
    return "Recruitee";
  }
  if (source === "workday") {
    return "Workday";
  }
  if (source === "amazon") {
    return "Amazon";
  }
  return source;
}

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string | null {
  if (min == null || max == null) {
    return null;
  }
  const symbol =
    currency === "INR" ? "₹" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  const compact = (value: number) => {
    if (currency === "INR" && value >= 100000) {
      const lakhs = value / 100000;
      const rounded = Number.isInteger(lakhs) ? String(lakhs) : lakhs.toFixed(1);
      return `${symbol}${rounded}L`;
    }
    return value >= 1000 ? `${symbol}${Math.round(value / 1000)}k` : `${symbol}${value}`;
  };
  return `${compact(min)}–${compact(max)}`;
}

export function boardHref(input: {
  company?: string | null;
  job?: string | null;
  q?: string | null;
  location?: string | null;
  remote?: boolean;
  seniority?: string | null;
  source?: string | null;
  posted?: number | null;
}): string {
  const params = new URLSearchParams();
  if (input.q) {
    params.set("q", input.q);
  }
  if (input.location) {
    params.set("location", input.location);
  }
  if (input.remote) {
    params.set("remote", "1");
  }
  if (input.seniority) {
    params.set("seniority", input.seniority);
  }
  if (input.source) {
    params.set("source", input.source);
  }
  if (input.posted) {
    params.set("posted", String(input.posted));
  }
  if (input.company) {
    params.set("company", input.company);
  }
  if (input.job) {
    params.set("job", input.job);
  }
  const query = params.toString();
  return query.length > 0 ? `/?${query}` : "/";
}
