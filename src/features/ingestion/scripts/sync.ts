import { closeDb } from "../../../shared/db/client.ts";

import { parseSyncArgs } from "../lib/sync-args.ts";
import { runSync } from "../server/run-sync.ts";
import { errorMessage } from "../server/sync-company.ts";

// Exits non-zero only when the run itself fails (bad flags, database, companies file).
// A failing company is recorded in sync_runs and company_syncs and the run carries on.
async function main(): Promise<void> {
  await runSync(parseSyncArgs(process.argv.slice(2)));
}

main()
  .catch((error: unknown) => {
    console.error(errorMessage(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
