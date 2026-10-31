import type { ATS_TYPES } from "../../src/db/schema/enums.ts";

import { amazonAdapter } from "./amazon.ts";
import { ashbyAdapter } from "./ashby.ts";
import { greenhouseAdapter } from "./greenhouse.ts";
import { leverAdapter } from "./lever.ts";
import { recruiteeAdapter } from "./recruitee.ts";
import { smartRecruitersAdapter } from "./smartrecruiters.ts";
import { workableAdapter } from "./workable.ts";
import { workdayAdapter } from "./workday.ts";
import type { Adapter } from "../types.ts";

type SupportedAts = Extract<
  (typeof ATS_TYPES)[number],
  "greenhouse" | "lever" | "ashby" | "workable" | "smartrecruiters" | "recruitee" | "workday" | "amazon"
>;

const adapters: Record<SupportedAts, Adapter> = {
  greenhouse: greenhouseAdapter,
  lever: leverAdapter,
  ashby: ashbyAdapter,
  workable: workableAdapter,
  smartrecruiters: smartRecruitersAdapter,
  recruitee: recruiteeAdapter,
  workday: workdayAdapter,
  amazon: amazonAdapter,
};

export function adapterFor(atsType: string): Adapter | null {
  if (
    atsType === "greenhouse" ||
    atsType === "lever" ||
    atsType === "ashby" ||
    atsType === "workable" ||
    atsType === "smartrecruiters" ||
    atsType === "recruitee" ||
    atsType === "workday" ||
    atsType === "amazon"
  ) {
    return adapters[atsType];
  }
  return null;
}
