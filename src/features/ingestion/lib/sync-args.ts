import { parseArgs } from "node:util";

import type { SyncTrigger } from "../constants.ts";

export type SyncOptions = {
  force: boolean;
  dryRun: boolean;
  trigger: SyncTrigger;
  only: string[];
};

// `pnpm sync -- --force` passes the `--` through, so a leading one is dropped.
export function parseSyncArgs(argv: string[]): SyncOptions {
  const args = argv[0] === "--" ? argv.slice(1) : argv;
  const { values } = parseArgs({
    args,
    strict: true,
    allowPositionals: false,
    options: {
      force: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      scheduled: { type: "boolean", default: false },
      only: { type: "string", multiple: true, default: [] },
    },
  });
  return {
    force: values.force,
    dryRun: values["dry-run"],
    trigger: values.scheduled ? "scheduled" : "manual",
    only: values.only.flatMap((value) => value.split(",")).map((slug) => slug.trim()).filter(Boolean),
  };
}
