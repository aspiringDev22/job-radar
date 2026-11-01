export const SYNC_TRIGGERS = ["manual", "scheduled"] as const;

export type SyncTrigger = (typeof SYNC_TRIGGERS)[number];
