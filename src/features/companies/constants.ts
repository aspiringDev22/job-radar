export const ATS_TYPES = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "smartrecruiters",
  "recruitee",
  "keka",
  "workday",
  "amazon",
] as const;

export type AtsType = (typeof ATS_TYPES)[number];
