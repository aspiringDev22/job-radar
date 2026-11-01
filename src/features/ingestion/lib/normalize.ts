import {
  CANONICAL_SENIORITIES,
  EMPLOYMENT_TYPES,
  ROLE_FAMILIES,
  SENIORITIES,
  WORK_MODES,
} from "../../jobs/index.ts";

export type Seniority = (typeof SENIORITIES)[number];
export type CanonicalSeniority = (typeof CANONICAL_SENIORITIES)[number];
export type RoleFamily = (typeof ROLE_FAMILIES)[number];
export type WorkMode = (typeof WORK_MODES)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export type ClassifiedPlace = {
  city: string | null;
  region: string | null;
  country: string | null;
  workMode: WorkMode;
};

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

const LEVEL_MARK = /\b(?:engineer|scientist|sde|swe|developer)[\s-]*(iii|ii|i|3|2|1)\b/i;

function levelMark(title: string): "iii" | "ii" | "i" | null {
  const mark = LEVEL_MARK.exec(title)?.[1]?.toLowerCase();
  if (mark === "iii" || mark === "3") {
    return "iii";
  }
  if (mark === "ii" || mark === "2") {
    return "ii";
  }
  if (mark === "i" || mark === "1") {
    return "i";
  }
  return null;
}

export function classifySeniority(title: string): CanonicalSeniority {
  const text = title.toLowerCase();
  if (/\bintern(?:ship)?s?\b/.test(text)) {
    return "intern";
  }
  if (/\b(?:manager|director|head of)\b/.test(text)) {
    return "manager";
  }
  if (/\b(?:staff|principal)\b/.test(text) || /\b(?:level[\s-]*[6-9]|l[6-9])\b/.test(text)) {
    return "staff_plus";
  }
  const level = levelMark(title);
  if (level === "iii" || /\b(?:senior|sr\.?)\b/.test(text)) {
    return "senior";
  }
  if (level === "ii") {
    return "mid";
  }
  if (level === "i" || /\b(?:junior|jr\.?|associate)\b/.test(text)) {
    return "junior";
  }
  return "unknown";
}

export function classifyFamily(title: string): RoleFamily {
  const text = title.toLowerCase();
  if (/full[\s-]*stack/.test(text)) {
    return "fullstack";
  }
  if (/\b(?:designer|ux|ui\/ux)\b/.test(text)) {
    return "design";
  }
  if (/\b(?:android|ios|flutter|react native|mobile)\b/.test(text)) {
    return "mobile";
  }
  if (/\b(?:machine learning|applied scientist|ml)\b/.test(text) || /ai\s*\/\s*ml/.test(text)) {
    return "ml";
  }
  if (/front[\s-]*end/.test(text) || /\breact\b/.test(text)) {
    return "frontend";
  }
  if (/back[\s-]*end/.test(text)) {
    return "backend";
  }
  if (/\b(?:data|analytics|business intelligence|business intel)\b/.test(text)) {
    return "data";
  }
  if (/\b(?:devops|sre|site reliability)\b/.test(text)) {
    return "devops";
  }
  if (/\b(?:qa|sdet|quality assurance)\b/.test(text)) {
    return "qa";
  }
  if (/\b(?:product manager|product owner|product management|apm)\b/.test(text)) {
    return "product";
  }
  return "other";
}

const CITY_RULES: Array<{ pattern: RegExp; city: string; region: string | null }> = [
  { pattern: /\bbengaluru\b|\bbangalore\b/i, city: "Bengaluru", region: null },
  { pattern: /\bgurugram\b|\bgurgaon\b/i, city: "Gurugram", region: "Delhi NCR" },
  { pattern: /\bnoida\b/i, city: "Noida", region: "Delhi NCR" },
  { pattern: /\bghaziabad\b/i, city: "Ghaziabad", region: "Delhi NCR" },
  { pattern: /\bfaridabad\b/i, city: "Faridabad", region: "Delhi NCR" },
  { pattern: /\bnew delhi\b/i, city: "Delhi", region: "Delhi NCR" },
  { pattern: /\bdelhi\b/i, city: "Delhi", region: "Delhi NCR" },
  { pattern: /\bhyderabad\b/i, city: "Hyderabad", region: null },
  { pattern: /\bpune\b/i, city: "Pune", region: null },
  { pattern: /\bmumbai\b|\bbombay\b/i, city: "Mumbai", region: null },
  { pattern: /\bchennai\b|\bmadras\b/i, city: "Chennai", region: null },
  { pattern: /\bkolkata\b|\bcalcutta\b/i, city: "Kolkata", region: null },
  { pattern: /\bahmedabad\b/i, city: "Ahmedabad", region: null },
  { pattern: /\bjaipur\b/i, city: "Jaipur", region: null },
  { pattern: /\bkochi\b|\bcochin\b/i, city: "Kochi", region: null },
  { pattern: /\bchandigarh\b/i, city: "Chandigarh", region: null },
  { pattern: /\bindore\b/i, city: "Indore", region: null },
];

function firstCity(value: string): { city: string; region: string | null } | null {
  let best: { index: number; city: string; region: string | null } | null = null;
  for (const rule of CITY_RULES) {
    const match = rule.pattern.exec(value);
    if (!match || match.index === undefined) {
      continue;
    }
    if (!best || match.index < best.index) {
      best = { index: match.index, city: rule.city, region: rule.region };
    }
  }
  return best ? { city: best.city, region: best.region } : null;
}

// States and smaller cities that mark a place as India without a city rule of their own.
const INDIAN_PLACE =
  /\b(?:karnataka|maharashtra|telangana|tamil nadu|uttar pradesh|haryana|gujarat|kerala|west bengal|rajasthan|punjab|madhya pradesh|andhra pradesh|odisha|goa|bihar|jharkhand|assam|uttarakhand|chhattisgarh|delhi ncr|lucknow|patna|guntur|vijayawada|visakhapatnam|vizag|bhubaneswar|coimbatore|thiruvananthapuram|trivandrum|mysuru|mysore|nagpur|surat|vadodara|bhopal|ranchi|dehradun|mohali|gift city)\b/i;

// India when the place names India, an Indian state or one of the cities above,
// anywhere in a multi-location list, so a role open in India and abroad counts as India.
function countryOf(value: string): string | null {
  if (
    /(?:^|[^a-z])india(?:[^a-z]|$)/i.test(value) ||
    /\bind\b/i.test(value) ||
    INDIAN_PLACE.test(value) ||
    CITY_RULES.some((rule) => rule.pattern.test(value))
  ) {
    return "India";
  }
  if (/\bunited states\b|\busa\b|\bu\.s\.a\.?\b/i.test(value)) {
    return "United States";
  }
  return null;
}

export function classifyPlace(location: string | null | undefined, isRemote = false): ClassifiedPlace {
  const value = normalizeLocation(location) ?? "";
  const firstSegment = value.split(" · ")[0] ?? "";
  const found = firstCity(firstSegment);
  const country = countryOf(value);
  const region = found?.region ?? (/\bdelhi ncr\b/i.test(value) ? "Delhi NCR" : null);
  let workMode: WorkMode = "unknown";
  if (/\bhybrid\b/i.test(value)) {
    workMode = "hybrid";
  } else if (isRemote || REMOTE_PATTERN.test(value)) {
    workMode = "remote";
  } else if (found) {
    workMode = "onsite";
  }
  return {
    city: found?.city ?? null,
    region,
    country,
    workMode,
  };
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
