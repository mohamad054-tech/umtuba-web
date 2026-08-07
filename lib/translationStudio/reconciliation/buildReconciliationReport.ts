/**
 * Build a read-only reconciliation report from local JSON + read RPC transport.
 */

import type { PersistedStudioState } from "../types";
import type { TranslationStudioReadRpcTransport } from "../persistence/readRpcTransport";
import {
  compareStudioSnapshots,
  createRemoteReadFailedReport,
  type ReconciliationReport,
} from "./compareStudioSnapshots";
import { assessShadowResubmitEligibility } from "./resubmitEligibility";
import { readPersistedStudioState } from "../persistence/fileStore";
import { resolveStudioDataDir } from "../persistence/fileStore";

export type BuildReconciliationReportResult = {
  report: ReconciliationReport;
  resubmit: ReturnType<typeof assessShadowResubmitEligibility>;
};

export async function buildStudioReconciliationReport(input: {
  local: PersistedStudioState;
  readTransport: TranslationStudioReadRpcTransport;
}): Promise<BuildReconciliationReportResult> {
  try {
    const remote = await input.readTransport.readSnapshot();
    const report = compareStudioSnapshots({
      local: input.local,
      remote,
    });
    return {
      report,
      resubmit: assessShadowResubmitEligibility({
        local: input.local,
        report,
      }),
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Remote read failed";
    const report = createRemoteReadFailedReport(input.local, message);
    return {
      report,
      resubmit: assessShadowResubmitEligibility({
        local: input.local,
        report,
      }),
    };
  }
}

/** Load local authoritative JSON from the normal store path (may be null). */
export function loadAuthoritativeStudioJson(
  dataDir?: string
): PersistedStudioState | null {
  return readPersistedStudioState(resolveStudioDataDir(dataDir));
}
