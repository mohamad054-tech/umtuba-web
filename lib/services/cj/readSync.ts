/**
 * Fail-closed read-only sync entry.
 * Never loads `.env.local`. Never uses a key unless rotation is acknowledged.
 * Fulfillment remaining enabled would still not permit provider writes.
 */

import { createCjLaunchReadSyncPlan } from "./launchSync";
import { canUseLiveCjReadSync, liveCjReadSyncBlockReason } from "./keyRotation";
import { isCjOrderFulfillmentEnabled } from "./fulfillmentGuard";

export type ReadSyncRunResult =
  | {
      ok: false;
      status: "PENDING_KEY_ROTATION" | "MISSING_SERVER_KEY";
      live_calls: 0;
      write_calls: 0;
    }
  | {
      ok: true;
      status: "AUTHORIZED_NOT_EXECUTED_IN_THIS_TASK";
      live_calls: 0;
      write_calls: 0;
      plan: ReturnType<typeof createCjLaunchReadSyncPlan>;
    };

export function runCjReadSyncFailClosed(
  env: Record<string, string | undefined> = process.env
): ReadSyncRunResult {
  const blocked = liveCjReadSyncBlockReason(env);
  if (blocked) {
    return { ok: false, status: blocked, live_calls: 0, write_calls: 0 };
  }
  if (!canUseLiveCjReadSync(env)) {
    return { ok: false, status: "PENDING_KEY_ROTATION", live_calls: 0, write_calls: 0 };
  }

  const plan = createCjLaunchReadSyncPlan();
  if (isCjOrderFulfillmentEnabled(env)) {
    // Still read-only. This task never executes live traffic.
  }
  return {
    ok: true,
    status: "AUTHORIZED_NOT_EXECUTED_IN_THIS_TASK",
    live_calls: 0,
    write_calls: 0,
    plan,
  };
}

/** Later cron hook. Not scheduled. Same fail-closed rules. */
export function runScheduledCjReadSync(
  env: Record<string, string | undefined> = process.env
): ReadSyncRunResult {
  return runCjReadSyncFailClosed(env);
}
