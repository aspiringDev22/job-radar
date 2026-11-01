export const SUGGESTION_STATUSES = ["new", "added", "rejected"] as const;

export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];
