import "server-only";

/**
 * Non-blocking dual-read observation schedule for authenticated Studio admin pages.
 * Uses next/server `after()` so page render is not blocked on remote compare.
 *
 * Fail-closed: schedules only when activation-safety gate permits
 * (prefer shadow_dual_write + observe). Unsafe/OFF → sanitized no-op.
 */

import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimDualReadObservationSlot,
  createSupabaseReadRpcTransport,
  evaluateDualReadObserveScheduleGate,
  fingerprintStudioSnapshot,
  getTranslationStudioWorkflow,
  releaseDualReadObservationSlot,
  runTranslationStudioDualReadObservation,
  type DualReadObservationSurface,
} from "../../../lib/translationStudio";

function authoritativeLocalFromWorkflow() {
  const snap = getTranslationStudioWorkflow().getSnapshot();
  return {
    schemaVersion: 1 as const,
    updatedAt: new Date().toISOString(),
    ...snap,
  };
}

/**
 * Schedule at most one dual-read observation for this page/request.
 * No-op when observe flag is off or activation gate refuses. Never throws into the page.
 */
export function scheduleTranslationStudioDualReadObservation(input: {
  supabase: SupabaseClient;
  surface: DualReadObservationSurface;
  /** Inject deferral for tests (default: next/server after). */
  defer?: (task: () => void | Promise<void>) => void;
  env?: Record<string, string | undefined>;
}): void {
  try {
    const env = input.env ?? process.env;
    const gate = evaluateDualReadObserveScheduleGate({
      env,
      // Transport is created only after gate passes — mark available when supabase present.
      readTransportAvailable: Boolean(input.supabase),
    });
    if (!gate.maySchedule) {
      return;
    }

    const local = authoritativeLocalFromWorkflow();
    const localHash = fingerprintStudioSnapshot(local);
    const slotKey = `obs:${input.surface}:${localHash}`;
    if (!claimDualReadObservationSlot(slotKey)) return;

    const transport = createSupabaseReadRpcTransport(input.supabase);
    const defer = input.defer ?? after;

    defer(() => {
      void (async () => {
        try {
          await runTranslationStudioDualReadObservation({
            readTransport: transport,
            local,
            surface: input.surface,
            env,
            getCurrentLocalHash: () =>
              fingerprintStudioSnapshot(authoritativeLocalFromWorkflow()),
          });
        } catch {
          // never surface to page / request
        } finally {
          releaseDualReadObservationSlot(slotKey);
        }
      })();
    });
  } catch {
    // never fail page render
  }
}
