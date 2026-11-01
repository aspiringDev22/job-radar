// Job boards and aggregators. A suggestion should point at the company's own site.
const BLOCKED_HOSTS = [
  "linkedin.com",
  "naukri.com",
  "indeed.com",
  "glassdoor.com",
  "glassdoor.co.in",
  "ambitionbox.com",
  "foundit.in",
  "instahyre.com",
  "wellfound.com",
  "angel.co",
];

export const NOTE_MAX = 500;
const URL_MAX = 300;

export type ParsedSuggestion = { ok: true; url: string; host: string } | { ok: false; error: string };

export function suggestionHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export function parseSuggestionUrl(input: string): ParsedSuggestion {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter the company's website or careers page." };
  }
  if (trimmed.length > URL_MAX) {
    return { ok: false, error: "That link is too long." };
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "That does not look like a web address." };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: "That does not look like a web address." };
  }
  const host = suggestionHost(url.hostname);
  if (!host.includes(".") || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || host.endsWith(".local")) {
    return { ok: false, error: "Use the company's public website." };
  }
  if (BLOCKED_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`))) {
    return { ok: false, error: "Link the company's own website or careers page, not a job board." };
  }
  url.hash = "";
  return { ok: true, url: url.toString(), host };
}

export function cleanNote(input: string): string | null {
  const note = input.replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);
  return note || null;
}
