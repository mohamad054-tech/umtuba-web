import "server-only";

/**
 * Non-blocking dual-read observation schedule for authenticated Studio admin pages.
 * Uses next/server `after()` so page render is not blocked on remote compare.
 */

import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  claimDualReadObservationSlot,
  createSupabaseReadRpcTransport,
  fingerprintStudioSnapshot,
  getTranslationStudioWorkflow,
  isDualReadObserveEnabled,
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
 * No-op when observe flag is off. Never throws into the page.
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
    if (!isDualReadObserveEnabled(env)) return;

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
