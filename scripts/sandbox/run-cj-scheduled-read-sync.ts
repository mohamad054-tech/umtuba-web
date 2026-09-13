/**
 * Safe scheduled-sync entry point. Not wired to production cron.
 * Same fail-closed rules as the manual command. Does not load .env.local.
 *
 *   npx tsx scripts/sandbox/run-cj-scheduled-read-sync.ts
 */
import { runScheduledCjReadSync } from "../../lib/services/cj/readSync";

const result = runScheduledCjReadSync(process.env);
process.stdout.write(`OK=${result.ok}\n`);
process.stdout.write(`STATUS=${result.status}\n`);
process.stdout.write(`LIVE_CALLS=${result.live_calls}\n`);
process.stdout.write(`WRITE_CALLS=${result.write_calls}\n`);
if (!result.ok) {
  process.exitCode = 2;
}
