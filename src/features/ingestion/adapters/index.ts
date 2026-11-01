import type { AtsType } from "../../companies/index.ts";

import { amazonAdapter } from "./amazon.ts";
import { ashbyAdapter } from "./ashby.ts";
import { greenhouseAdapter } from "./greenhouse.ts";
import { kekaAdapter } from "./keka.ts";
import { leverAdapter } from "./lever.ts";
import { recruiteeAdapter } from "./recruitee.ts";
import { smartRecruitersAdapter } from "./smartrecruiters.ts";
import { workableAdapter } from "./workable.ts";
import { workdayAdapter } from "./workday.ts";
import type { Adapter } from "../types.ts";

type SupportedAts = Extract<
  AtsType,
  "greenhouse" | "lever" | "ashby" | "workable" | "smartrecruiters" | "recruitee" | "workday" | "amazon" | "keka"
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
  keka: kekaAdapter,
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
    atsType === "amazon" ||
    atsType === "keka"
  ) {
    return adapters[atsType];
  }
  return null;
}
