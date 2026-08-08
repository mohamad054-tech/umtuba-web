/**
 * Dual-read compare engine V1.
 * Orchestrates existing read transport + reconciliation comparator.
 * Never mutates authoritative JSON. Never writes to DB.
 */

import type { PersistedStudioState } from "../types";
import type { TranslationStudioReadRpcTransport } from "./readRpcTransport";
import { fingerprintStudioSnapshot } from "./snapshotFingerprint";
import {
  compareStudioSnapshots,
  type ReconciliationReport,
} from "../reconciliation/compareStudioSnapshots";
import { classifyStudioShadowError } from "./shadowErrorClassification";
import type {
  DualReadCompareStatus,
  DualReadCountSummary,
  DualReadErrorCategory,
  StudioDualReadObserver,
} from "./dualReadObserver";
import { noopStudioDualReadObserver } from "./dualReadObserver";
import type {
  ShadowReconciliationJournal,
  ShadowReconciliationJournalEntryV1,
} from "./shadowReconciliationJournal";
import type { DualReadJournalEntryV1 } from "./dualReadJournal";
import {
  SHADOW_DUAL_READ_SETTLE_WINDOW_MS,
  classifyShadowLagForCompare,
  sanitizeActionableFindingsForJournal,
  shadowPendingForHash,
  type ShadowLagEvidence,
  type ShadowLagOverlapClass,
} from "./shadowLagClassification";

export type DualReadCompareResult = {
  status: DualReadCompareStatus;
  local_hash: string;
  remote_hash: string | null;
  duration_ms: number;
  counts: DualReadCountSummary;
  category?: Exclude<DualReadErrorCategory, "success">;
  message?: string;
  correlation_id?: string;
  report?: ReconciliationReport;
  /** Present when lag classification ran. */
  shadow_lag?: ShadowLagEvidence;
  overlap_class?: ShadowLagOverlapClass;
};

export type RunStudioDualReadCompareOptions = {
  local: PersistedStudioState;
  /** Explicit transport; null → UNAVAILABLE. */
  readTransport: TranslationStudioReadRpcTransport | null;
  /** Return current authoritative hash after await (stale detection). */
  getCurrentLocalHash?: () => string;
  /** Shadow journal entries for transient-lag detection. */
  getShadowJournalEntries?: () => ShadowReconciliationJournalEntryV1[];
  dualReadJournal?: ShadowReconciliationJournal;
  observer?: StudioDualReadObserver;
  correlationId?: string;
  now?: () => number;
  /** Override settle window (tests). Default SHADOW_DUAL_READ_SETTLE_WINDOW_MS. */
  shadowSettleWindowMs?: number;
};

export { shadowPendingForHash, SHADOW_DUAL_READ_SETTLE_WINDOW_MS };
export type { ShadowLagEvidence, ShadowLagOverlapClass };

/** Actionable findings under dual-read policy (smoke extras accepted). */
export function hasActionableDualReadDrift(
  report: ReconciliationReport
): boolean {
  return report.findings.some((f) => {
    if (
      f.category === "missing_remote" ||
      f.category === "field_mismatch" ||
      f.category === "audit_missing"
    ) {
      return true;
    }
    if (
      (f.category === "extra_remote" || f.category === "audit_extra") &&
      !f.smokeResidue
    ) {
      return true;
    }
    return false;
  });
}

function countsFromReport(report: ReconciliationReport): DualReadCountSummary {
  return { ...report.counts };
}

function appendDualReadJournal(
  journal: ShadowReconciliationJournal | undefined,
  entry: DualReadJournalEntryV1 & Partial<ShadowReconciliationJournalEntryV1>
): void {
  if (!journal) return;
  try {
    journal.append(entry as unknown as ShadowReconciliationJournalEntryV1);
  } catch {
    // never fail JSON / compare caller
  }
}

/**
 * Run one dual-read comparison. Never mutates `local`. Never writes remotely.
 */
export async function runStudioDualReadCompare(
  options: RunStudioDualReadCompareOptions
): Promise<DualReadCompareResult> {
  const nowMs = options.now ?? (() => Date.now());
  const observer = options.observer ?? noopStudioDualReadObserver;
  const started = nowMs();
  const local_hash = fingerprintStudioSnapshot(options.local);
  const correlation_id = options.correlationId;
  const timestamp = new Date(started).toISOString();

  observer.onEvent({
    type: "started",
    timestamp,
    local_hash,
    correlation_id,
  });

  if (!options.readTransport) {
    const result: DualReadCompareResult = {
      status: "REMOTE_READ_UNAVAILABLE",
      local_hash,
      remote_hash: null,
      duration_ms: nowMs() - started,
      counts: {},
      category: "unavailable",
      message: "No request-scoped dual-read transport",
      correlation_id,
    };
    observer.onEvent({
      type: "unavailable",
      timestamp: new Date().toISOString(),
      local_hash,
      compare_status: "REMOTE_READ_UNAVAILABLE",
      correlation_id,
      reason: result.message,
    });
    appendDualReadJournal(options.dualReadJournal, {
      schemaVersion: 1,
      event_family: "dual_read",
      timestamp: new Date().toISOString(),
      save_seq_local: 0,
      outcome: "dual_read_unavailable",
      snapshot_hash: local_hash,
      compare_status: "REMOTE_READ_UNAVAILABLE",
      category: "unavailable",
      correlation_id,
      message: result.message,
    });
    return result;
  }

  let remoteSnap;
  try {
    remoteSnap = await options.readTransport.readSnapshot();
  } catch (err) {
    const classified = classifyStudioShadowError(err);
    const duration_ms = nowMs() - started;
    const message =
      err instanceof Error ? err.message.slice(0, 300) : "remote read failed";
    const result: DualReadCompareResult = {
      status: "REMOTE_READ_FAILED",
      local_hash,
      remote_hash: null,
      duration_ms,
      counts: {},
      category: classified.category,
      message,
      correlation_id,
    };
    observer.onEvent({
      type: "failed",
      timestamp: new Date().toISOString(),
      local_hash,
      compare_status: "REMOTE_READ_FAILED",
      duration_ms,
      category: classified.category,
      message,
      correlation_id,
    });
    appendDualReadJournal(options.dualReadJournal, {
      schemaVersion: 1,
      event_family: "dual_read",
      timestamp: new Date().toISOString(),
      save_seq_local: 0,
      outcome: "dual_read_failed",
      snapshot_hash: local_hash,
      compare_status: "REMOTE_READ_FAILED",
      duration_ms,
      category: classified.category,
      correlation_id,
      message,
    });
    return result;
  }

  const currentHash = options.getCurrentLocalHash?.() ?? local_hash;
  if (currentHash !== local_hash) {
    const duration_ms = nowMs() - started;
    const result: DualReadCompareResult = {
      status: "STALE_DISCARDED",
      local_hash,
      remote_hash: null,
      duration_ms,
      counts: {},
      correlation_id,
      message: `local hash moved ${local_hash.slice(0, 12)}→${currentHash.slice(0, 12)}`,
    };
    observer.onEvent({
      type: "stale_discarded",
      timestamp: new Date().toISOString(),
      local_hash,
      compare_status: "STALE_DISCARDED",
      duration_ms,
      current_hash: currentHash,
      correlation_id,
    });
    appendDualReadJournal(options.dualReadJournal, {
      schemaVersion: 1,
      event_family: "dual_read",
      timestamp: new Date().toISOString(),
      save_seq_local: 0,
      outcome: "dual_read_stale_discarded",
      snapshot_hash: local_hash,
      compare_status: "STALE_DISCARDED",
      duration_ms,
      correlation_id,
      message: result.message,
    });
    return result;
  }

  const report = compareStudioSnapshots({
    local: options.local,
    remote: remoteSnap,
  });

  const compareEndedAtMs = nowMs();
  const duration_ms = compareEndedAtMs - started;
  const counts = countsFromReport(report);
  let status: DualReadCompareStatus = hasActionableDualReadDrift(report)
    ? "DRIFT_DETECTED"
    : "IN_SYNC";

  let shadow_lag: ShadowLagEvidence | undefined;
  if (options.getShadowJournalEntries) {
    shadow_lag = classifyShadowLagForCompare({
      entries: options.getShadowJournalEntries(),
      snapshotHash: local_hash,
      compareStartedAtMs: started,
      compareEndedAtMs,
      settleWindowMs: options.shadowSettleWindowMs,
    });
    if (status === "DRIFT_DETECTED" && shadow_lag.qualifies) {
      status = "TRANSIENT_LAG";
    }
  }

  const actionable_findings = sanitizeActionableFindingsForJournal(report);

  const result: DualReadCompareResult = {
    status,
    local_hash,
    remote_hash: report.remoteSnapshotHash,
    duration_ms,
    counts,
    correlation_id,
    report,
    shadow_lag,
    overlap_class: shadow_lag?.overlap_class,
  };

  observer.onEvent({
    type: "succeeded",
    timestamp: new Date().toISOString(),
    local_hash,
    compare_status: status as "IN_SYNC" | "DRIFT_DETECTED" | "TRANSIENT_LAG",
    duration_ms,
    counts,
    correlation_id,
  });
  appendDualReadJournal(options.dualReadJournal, {
    schemaVersion: 1,
    event_family: "dual_read",
    timestamp: new Date().toISOString(),
    save_seq_local: 0,
    outcome:
      status === "IN_SYNC"
        ? "dual_read_succeeded"
        : status === "TRANSIENT_LAG"
          ? "dual_read_transient_lag"
          : "dual_read_drift_detected",
    snapshot_hash: local_hash,
    compare_status: status,
    duration_ms,
    counts,
    correlation_id,
    overlap_class: shadow_lag?.overlap_class ?? "none",
    shadow_save_seq: shadow_lag?.shadow_save_seq ?? undefined,
    shadow_hash: shadow_lag?.shadow_hash ?? undefined,
    rpc_inserted: shadow_lag?.rpc_inserted ?? undefined,
    rpc_updated: shadow_lag?.rpc_updated ?? undefined,
    rpc_skipped: shadow_lag?.rpc_skipped ?? undefined,
    actionable_findings:
      status === "DRIFT_DETECTED" || status === "TRANSIENT_LAG"
        ? actionable_findings
        : undefined,
    message:
      shadow_lag && shadow_lag.overlap_class !== "none"
        ? `overlap=${shadow_lag.overlap_class}`
        : undefined,
  });
  return result;
}
