import { createHash } from "node:crypto";

const DESCRIPTION_IDENTITY_LENGTH = 80;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeIdentity(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("\u00a0", " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Identity of one posting at one company.
 * A long description identifies the posting, so the same role in several
 * cities shares a key and the board can show it once. A short description
 * falls back to company + title + city. The company is always part of the
 * key, so roles never merge across companies.
 */
export function dedupeKey(
  companySlug: string,
  title: string,
  city: string | null,
  location: string | null,
  description: string | null,
): string {
  const company = normalizeIdentity(companySlug);
  const normalizedTitle = normalizeIdentity(title);
  const body = normalizeIdentity(description ?? "");
  const place = normalizeIdentity(city ?? location ?? "");
  const identity = body.length >= DESCRIPTION_IDENTITY_LENGTH ? body : `city:${place}`;
  return digest(`${company}\n${normalizedTitle}\n${identity}`);
}
