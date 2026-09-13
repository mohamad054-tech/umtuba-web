/**
 * Manual read-only CJ sync for the 59-product candidate.
 * Does NOT load .env.local (old key must not be reused).
 * Fail-closed unless CJ_API_KEY_ROTATED=true and a server CJ_API_KEY is present.
 * This task never executes live CJ traffic.
 *
 *   npx tsx scripts/sandbox/run-cj-read-sync-candidate.ts
 */
import { runCjReadSyncFailClosed } from "../../lib/services/cj/readSync";

const result = runCjReadSyncFailClosed(process.env);
process.stdout.write(`OK=${result.ok}\n`);
process.stdout.write(`STATUS=${result.status}\n`);
process.stdout.write(`LIVE_CALLS=${result.live_calls}\n`);
process.stdout.write(`WRITE_CALLS=${result.write_calls}\n`);
if (!result.ok) {
  process.exitCode = 2;
}
