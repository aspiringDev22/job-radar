import { createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_REALM = "JobRadar admin";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value ? value : null;
}

/**
 * Checks an HTTP Basic `Authorization` header against `ADMIN_PASSWORD`.
 * Any user name is accepted; only the password is compared.
 */
export function adminAuthorized(header: string | null, password: string | null): boolean {
  if (!password || !header?.startsWith("Basic ")) {
    return false;
  }
  const decoded = Buffer.from(header.slice("Basic ".length), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator < 0) {
    return false;
  }
  return timingSafeEqual(digest(decoded.slice(separator + 1)), digest(password));
}
