export const SAVED_JOB_STATUSES = [
  "saved",
  "applied",
  "interview",
  "rejected",
] as const;

export type SavedJobStatus = (typeof SAVED_JOB_STATUSES)[number];
