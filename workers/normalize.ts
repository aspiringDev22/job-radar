import { EMPLOYMENT_TYPES, SENIORITIES } from "../src/db/schema/enums.ts";

export type Seniority = (typeof SENIORITIES)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

export function htmlToText(html: string): string {
  const decoded = decodeHtml(html);
  return decoded
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h[1-6]|div|li)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function normalizeLocation(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (cleaned.length === 0 || /^(n\/a|na|location|tbd|none|null|-)$/i.test(cleaned)) {
    return null;
  }
  return cleaned;
}

const REMOTE_PATTERN = /\b(remote|anywhere|distributed|work from home|wfh)\b/i;
const INDIA_PLACE =
  /(?:^|[^a-z])(?:india|bengaluru|bangalore|hyderabad|pune|chennai|noida|gurugram|gurgaon|mumbai|kolkata|ahmedabad|jaipur|kochi|chandigarh|indore)(?:[^a-z]|$)/i;

export function isIndiaPlace(value: string | null | undefined): boolean {
  return Boolean(value && INDIA_PLACE.test(value));
}

export function keepListedLocation(
  policy: "all" | "india_or_remote",
  job: { isRemote: boolean; locationRaw: string | null; locationNormalized: string | null },
): boolean {
  if (policy !== "india_or_remote") {
    return true;
  }
  return job.isRemote || isIndiaPlace(job.locationNormalized) || isIndiaPlace(job.locationRaw);
}

export function detectRemote(
  parts: Array<string | null | undefined>,
  explicit = false,
): boolean {
  if (explicit) {
    return true;
  }
  return parts.some((part) => (part ? REMOTE_PATTERN.test(part) : false));
}

export function guessSeniority(title: string): Seniority {
  const text = title.toLowerCase();
  if (/\b(intern|internship)\b/.test(text)) {
    return "intern";
  }
  if (/\bprincipal\b/.test(text)) {
    return "principal";
  }
  if (/\bstaff\b/.test(text)) {
    return "staff";
  }
  if (/\b(director|vice president|\bvp\b|head of|chief|cto|ceo|cfo|coo|cmo)\b/.test(text)) {
    return "executive";
  }
  if (/\b(senior|sr\.?)\b/.test(text)) {
    return "senior";
  }
  if (/\b(junior|jr\.?|entry[- ]level|associate)\b/.test(text)) {
    return "junior";
  }
  if (/\b(mid[- ]level|intermediate)\b/.test(text)) {
    return "mid";
  }
  return "unknown";
}

export function guessEmployment(value: string | null | undefined): EmploymentType | null {
  if (!value) {
    return null;
  }
  const text = value.toLowerCase().replace(/[_-]+/g, " ");
  if (text.includes("intern")) {
    return "internship";
  }
  if (text.includes("part")) {
    return "part_time";
  }
  if (text.includes("contract")) {
    return "contract";
  }
  if (text.includes("temp")) {
    return "temporary";
  }
  if (text.includes("full") || text.includes("permanent")) {
    return "full_time";
  }
  return "unknown";
}

export function parsePostedAt(value: string | number | null | undefined): Date | null {
  if (value == null || value === "") {
    return null;
  }
  const date =
    typeof value === "number"
      ? new Date(value < 1_000_000_000_000 ? value * 1000 : value)
      : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const SALARY_RANGE =
  /([$€£₹])\s?(\d{1,3}(?:,\d{2,3})+|\d{4,7})\s?(?:-|–|—|to)\s?(?:[$€£₹]\s?)?(\d{1,3}(?:,\d{2,3})+|\d{4,7})/i;

export function parseSalary(text: string | null | undefined): {
  min: number | null;
  max: number | null;
  currency: string | null;
} {
  if (!text) {
    return { min: null, max: null, currency: null };
  }
  const match = SALARY_RANGE.exec(text);
  if (!match) {
    return { min: null, max: null, currency: null };
  }
  const symbol = match[1] ?? "";
  const min = Number((match[2] ?? "").replaceAll(",", ""));
  const max = Number((match[3] ?? "").replaceAll(",", ""));
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: null, max: null, currency: null };
  }
  const currency =
    symbol === "€" ? "EUR" : symbol === "£" ? "GBP" : symbol === "₹" ? "INR" : "USD";
  return min <= max
    ? { min, max, currency }
    : { min: max, max: min, currency };
}
