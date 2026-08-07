/**
 * Failure recovery helper — does NOT invoke write RPC.
 * Advises whether current JSON is eligible for idempotent re-submit.
 */

import type { PersistedStudioState } from "../types";
import { fingerprintStudioSnapshot } from "../persistence/snapshotFingerprint";
import type { ReconciliationReport } from "./compareStudioSnapshots";

export type ShadowResubmitEligibility = {
  eligible: true;
  reason: string;
  localSnapshotHash: string;
  suggestedAction: "re_save_current_json_via_existing_write_rpc";
} | {
  eligible: false;
  reason: string;
  localSnapshotHash: string | null;
};

/**
 * Idempotent re-submit is safe when JSON exists and remote read either failed
 * or shows missing/mismatch (upsert will converge). Extra stale remote rows
 * alone do not block re-submit (no-prune).
 */
export function assessShadowResubmitEligibility(input: {
  local: PersistedStudioState | null;
  report?: ReconciliationReport | null;
}): ShadowResubmitEligibility {
  if (!input.local) {
    return {
      eligible: false,
      reason: "No authoritative JSON snapshot is loaded.",
      localSnapshotHash: null,
    };
  }
  const hash = fingerprintStudioSnapshot(input.local);
  const report = input.report;
  if (!report) {
    return {
      eligible: true,
      reason:
        "JSON snapshot present; operator may re-save to upsert shadow after a known shadow failure.",
      localSnapshotHash: hash,
      suggestedAction: "re_save_current_json_via_existing_write_rpc",
    };
  }
  if (report.status === "REMOTE_READ_FAILED") {
    return {
      eligible: true,
      reason:
        "Remote read failed; JSON remains authoritative. Re-save after connectivity/auth recovery.",
      localSnapshotHash: hash,
      suggestedAction: "re_save_current_json_via_existing_write_rpc",
    };
  }
  if (report.status === "IN_SYNC") {
    return {
      eligible: false,
      reason: "Report is IN_SYNC; re-submit not required.",
      localSnapshotHash: hash,
    };
  }
  const needsUpsert =
    report.counts.missing_remote > 0 ||
    report.counts.field_mismatch > 0 ||
    report.counts.audit_missing > 0;
  if (needsUpsert) {
    return {
      eligible: true,
      reason:
        "Drift includes missing or mismatched remote entities; existing write RPC upsert is idempotent.",
      localSnapshotHash: hash,
      suggestedAction: "re_save_current_json_via_existing_write_rpc",
    };
  }
  return {
    eligible: false,
    reason:
      "Only extra/stale remote rows detected (expected under no-prune). Re-submit will not remove them.",
    localSnapshotHash: hash,
  };
}
