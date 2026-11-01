import type { JobStatus } from "../constants.ts";

export const CLOSED_ROLE_VISIBLE_MS = 30 * 24 * 60 * 60 * 1000;

export function roleAvailability(
  status: JobStatus,
  closedAt: Date | null,
  now = Date.now(),
): "open" | "closed" | "gone" {
  if (status !== "closed") {
    return "open";
  }
  if (closedAt && now - closedAt.getTime() > CLOSED_ROLE_VISIBLE_MS) {
    return "gone";
  }
  return "closed";
}
