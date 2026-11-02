import {
  CANONICAL_SENIORITIES,
  EMPLOYMENT_TYPES,
  ROLE_CATEGORIES,
  ROLE_FAMILIES,
  SENIORITIES,
  WORK_MODES,
} from "../../jobs/index.ts";

export type Seniority = (typeof SENIORITIES)[number];
export type CanonicalSeniority = (typeof CANONICAL_SENIORITIES)[number];
export type RoleFamily = (typeof ROLE_FAMILIES)[number];
export type RoleCategory = (typeof ROLE_CATEGORIES)[number];
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

// "Product Manager" and its kin own work, not people, so the rest of the title sets the level:
// "Senior Product Manager" is senior. "Group Product Manager" does manage people.
const INDIVIDUAL_MANAGER =
  /\b(?:product|program|programme|project|account|relationship|customer success|success|partner|partnerships|marketing|community|content|category|campaign|brand|growth)\s+manager\b/g;

export function classifySeniority(title: string): CanonicalSeniority {
  const text = title.toLowerCase();
  if (/\bintern(?:ship)?s?\b/.test(text)) {
    return "intern";
  }
  if (/\b(?:director|head of|group product manager)\b/.test(text)) {
    return "manager";
  }
  if (/\bmanager\b/.test(text.replace(INDIVIDUAL_MANAGER, " "))) {
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
  if (level === "i" || /\b(?:junior|jr\.?|associate|apm)\b/.test(text)) {
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

// First match wins. Job names come before subject words, so "Product Manager - Credit Risk" is product
// and "SDE II, Fintech TAX" is engineering, and the narrow kinds of engineer come before the
// catch-all "engineer": "Sales Engineer" is solutions, "Design Verification Engineer" is hardware.
const CATEGORY_RULES: Array<[RoleCategory, RegExp]> = [
  ["marketing", /\bproduct marketing\b/],
  ["product", /\b(?:product managers?|product owner|product management|product lead|product head|head of product|(?:director|vp|head)\W+product\b(?! (?:design|marketing))|chief product|apm|group pm)\b/],
  ["program", /\b(?:program(?:me)?s? managers?|projects? managers?|program(?:me)? management|project management|project\/ ?program|programs? lead|projects? lead|tpm|delivery manager|scrum master|agile coach|pmo|project coordinator|program(?:me)? (?:specialist|coordinator|director|head))\b/],
  ["people", /\b(?:recruit(?:er|ers|ing|ment)|talent (?:acquisition|partner|management|development)|sourcer|hrbp|hr (?:manager|executive|generalist|business partner|bp|operations|ops|specialist|lead|head|intern|associate|analyst|partner|coordinator|onboarding)|head (?:of )?hr|human resources?|people (?:partner|operations|ops|business partner|experience|analytics|team)|learning (?:and|&) development|l&d)\b/],
  ["security", /\b(?:soc analyst|security|cyber ?security|infosec|appsec|secops|devsecops|penetration|pentest(?:er|ing)?|threat|vulnerability|incident response|red team|identity (?:and|&) access|csirt|forensics?|vigilance)\b/],
  ["hardware", /\b(?:vlsi|asic|soc|rtl|fpga|dft|eda|physical design|design verification|verification engineer|analog|mixed[\s-]signal|silicon|semiconductor|pcb|circuit|hardware|firmware|embedded|board design|signal integrity|power integrity|(?:pre|post)[\s-]silicon|mechanical|electrical|electronics|thermal|layout engineer|chip|cpu|timing engineer|emulation)\b/],
  ["ml", /\b(?:machine learning|ml|mlops|applied scien(?:ce|tist|tists)|research scientists?|data scien(?:tist|tists|ce)|deep learning|computer vision|nlp|llms?|algorithms?|ai(?:\/ml)? (?:engineer|developer|architect|researcher|research|scientist|specialist|lead)|gen ?ai (?:engineer|developer|architect|scientist)|artificial intelligence)\b/],
  ["infrastructure", /\b(?:devops|sre|hpc|site reliability|platform engineer(?:ing)?|cloud (?:engineer|architect|ops|operations|infrastructure|support|administrator)|infrastructure|infra|network (?:engineer|administrator|architect|operations|specialist)|noc|system administrator|sysadmin|systems engineer|linux (?:admin|administrator|engineer)|database administrator|dba|data cent(?:er|re)|rack|release engineer|build engineer|it (?:support|engineer|administrator|operations|infrastructure|specialist|technician|analyst|manager|helpdesk))\b/],
  ["data", /\b(?:data (?:engineer|engineering|engineers|analyst|analysts|analytics|architect|platform|warehouse|governance|quality|modeler|modeller|ops|lake|pipeline)|big data|analytics engineer|business intelligence|bi (?:developer|engineer|analyst)|etl)\b/],
  ["qa", /\b(?:qa|sdet|quality assurance|quality engineer(?:ing)?|test(?:ing)? (?:engineer|automation|lead|analyst|architect|manager|specialist)|automation (?:engineer|tester)|tester|software engineer in test)\b/],
  ["design", /\b(?:designer|designers|ux|ui ux|user experience|user research(?:er)?|product research(?:er)?|interaction design|visual design|product design|design)\b/],
  ["solutions", /\b(?:solutions? (?:architect|engineer|engineering|consultant|specialist|lead|manager|director|partner)|sales engineer|pre[\s-]?sales|technical consultant|consultant|consulting|implementation|professional services|technical account manager|customer engineer|field applications? engineer|deployment engineer|forward deployed|deployment strategist|success architect|technical architect|engagement (?:manager|lead)|transformation)\b/],
  ["engineering", /\b(?:software|developer|developers|development engineer|sde|programmer|engineering (?:manager|lead|director|head)|head of engineering|vp,? engineering|(?:staff|principal) engineer|back[\s-]?end|front[\s-]?end|full[\s-]?stack|mobile|android|ios|mts|smts|lmts|member of technical staff)\b/],
  ["people", /\b(?:benefits|payroll|compensation|industrial relations|immigration|global mobility)\b/],
  ["sales", /\b(?:sales|account executive|business development|bdr|sdr|kam|key account)\b/],
  ["finance", /\b(?:financ(?:e|ial)|insurance|accountant|accounting|accounts (?:payable|receivable)|tax|taxation|audit(?:or|ing)?|fp&a|treasury|controller(?:ship)?|risk|compliance|legal|counsel|lawyer|attorney|paralegal|company secretary|investor relations|corporate development|credit|underwrit(?:er|ing)|collections?|fraud|kyc|aml|trust (?:and|&) safety|investigat(?:or|ion|ions)|loss prevention|sox|finops|billing|regulatory)\b/],
  ["customer", /\b(?:customer (?:success|support|service|services|experience|care)|(?:client|partner|product|merchant|technical) (?:success|services|support|servicing)|support (?:engineer|analyst|specialist|advisor|associate|executive|agent|lead|representative)|technical support|help ?desk|service desk|cx|onboarding|trainer)\b/],
  ["sales", /\b(?:sales|business development|biz development|bdr|sdr|bde|bdm|account executive|account (?:manager|management|director|lead)|accounts director|key account|inside sales|telesales|partnerships?|partner (?:manager|management|development)|alliances|channel (?:partner|sales|manager)|revenue|relationship manager|enterprise account|new business|deal desk|enablement|business head)\b/],
  ["marketing", /\b(?:marketing|growth|brand|content|seo|sem|social media|community|communications?|strategist|content creator|pr|public relations|copy|copy ?writer|campaign|demand generation|events?|creative|video editor|post[\s-]production|writer|editor|editorial|affiliate|influencer|thought leadership)\b/],
  ["operations", /\b(?:operations?|ops|supply|supply chain|logistics|procurement|purchasing|vendor|warehouse|fulfil?ment|facilities|facility|maintenance|real estate|admin|administrative|administrator|executive assistant|office (?:manager|assistant|administrator)|strategy|chief of staff|ceo'?s office|founder'?s office|process (?:associate|assistant|executive|specialist)|category (?:manager|management|lead)|merchandis(?:er|ing)|buyer|planner|planning|transcri\w*|annotat\w*|inventory|instock|transportation|fleet|delivery|store (?:manager|keeper)|city (?:manager|head)|area manager|cluster manager|last mile|dispatch|data entry|safety|ehs|whs|hygien\w*|workforce management|reservations|ticketing|supervisor|spare parts|service (?:head|manager))\b/],
  ["engineering", /\b(?:engineer|engineers|engineering|architect|tech lead|technical lead|web|technology|r&d|cto|technologist)\b/],
  ["data", /\b(?:analyst|analysts|analytics)\b/],
  ["solutions", /\bsolutions?\b/],
  ["program", /\bprogram(?:me)?s?\b/],
];

// Feed departments, for titles that name no kind of work: "Senior Associate" in Amazon's
// "Fulfillment & Operations Management" is operations.
const DEPARTMENT_RULES: Array<[RoleCategory, RegExp]> = [
  ["program", /\bproject\/program\/product management\b/],
  ["people", /\b(?:human resources|hr|people|talent|leadership development)\b/],
  ["finance", /\b(?:financ|accounting|legal|investigation|loss prevention|risk|compliance)/],
  ["ml", /\b(?:applied science|research science|data science|machine learning)\b/],
  ["data", /\b(?:business intelligence|analytics|data)\b/],
  ["design", /\bdesign\b/],
  ["solutions", /\b(?:solutions? architect|consult|professional services)/],
  ["infrastructure", /\b(?:it|database administration)\b/],
  ["customer", /\b(?:customer|cs and onboarding|merchant success|product success|support)\b/],
  ["sales", /\b(?:sales|business development|merchant development|account management|telesales)\b/],
  ["marketing", /\b(?:marketing|growth|content|editorial|brand|pr)\b/],
  ["operations", /\b(?:operation|fulfil|supply chain|transportation|facilities|real estate|administrative|buying|planning|instock|warehouse|procurement|delivery|fleet)/],
  ["product", /\bproduct\b/],
  ["hardware", /\bhardware\b/],
  ["security", /\bsecurity\b/],
  ["engineering", /\b(?:software|engineering|technology|tech)\b/],
];

function firstCategory(rules: Array<[RoleCategory, RegExp]>, text: string): RoleCategory | null {
  for (const [category, pattern] of rules) {
    if (pattern.test(text)) {
      return category;
    }
  }
  return null;
}

export function classifyCategory(title: string, department: string | null = null): RoleCategory {
  return (
    firstCategory(CATEGORY_RULES, title.toLowerCase()) ??
    (department ? firstCategory(DEPARTMENT_RULES, department.toLowerCase()) : null) ??
    "other"
  );
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
