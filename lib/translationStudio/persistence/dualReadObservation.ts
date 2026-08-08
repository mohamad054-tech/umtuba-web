/**
 * Dual-read automatic observation runner V1.
 * Uses runStudioDualReadCompare. Never mutates JSON. Never writes DB.
 */

import type { PersistedStudioState } from "../types";
import { fingerprintStudioSnapshot } from "./snapshotFingerprint";
import {
  runStudioDualReadCompare,
  SHADOW_DUAL_READ_SETTLE_WINDOW_MS,
  type DualReadCompareResult,
} from "./dualReadCompare";
import type { TranslationStudioReadRpcTransport } from "./readRpcTransport";
import {
  createShadowReconciliationJournal,
  resolveShadowReconciliationJournalPath,
  type ShadowReconciliationJournal,
  type ShadowReconciliationJournalEntryV1,
} from "./shadowReconciliationJournal";
import { isDualReadObserveEnabled } from "./mode";
import {
  getDualReadObservationBreaker,
  isDualReadObservationBreakerOpen,
  recordDualReadObservationResult,
  type DualReadObservationBreakerSnapshot,
} from "./dualReadObservationBreaker";
import type { DualReadJournalOutcome } from "./dualReadJournal";
import {
  evaluateDualReadObserveScheduleGate,
  type DualReadObserveReadinessReport,
} from "./dualReadObserveReadiness";
import {
  classifyShadowLagForCompare,
  sanitizeActionableFindingsForJournal,
  shadowPendingForHash,
} from "./shadowLagClassification";

export type DualReadObservationSurface =
  | "landing"
  | "key_detail"
  | "diagnostics"
  | (string & {});

export type DualReadObservationRunResult = {
  skipped: boolean;
  skip_reason?:
    | "observe_disabled"
    | "breaker_open"
    | "no_local"
    | "deduped"
    | "activation_unsafe";
  result?: DualReadCompareResult;
  breaker: DualReadObservationBreakerSnapshot;
  correlation_id: string;
  surface: string;
  readiness?: DualReadObserveReadinessReport;
  /** Present when a bounded settle re-read ran. */
  settle_outcome?: ShadowReconciliationJournalEntryV1["settle_outcome"];
};

const pendingKeys = new Set<string>();

function appendJournal(
  journal: ShadowReconciliationJournal | undefined,
  entry: ShadowReconciliationJournalEntryV1
): void {
  if (!journal) return;
  try {
    journal.append(entry);
  } catch {
    // never fail callers
  }
}

function journalRow(
  outcome: DualReadJournalOutcome,
  fields: {
    snapshot_hash: string;
    compare_status?: string;
    duration_ms?: number;
    counts?: Record<string, number>;
    category?: ShadowReconciliationJournalEntryV1["category"];
    correlation_id?: string;
    message?: string;
    overlap_class?: ShadowReconciliationJournalEntryV1["overlap_class"];
    shadow_save_seq?: number;
    shadow_hash?: string;
    settle_outcome?: ShadowReconciliationJournalEntryV1["settle_outcome"];
    rpc_inserted?: number;
    rpc_updated?: number;
    rpc_skipped?: number;
    actionable_findings?: ShadowReconciliationJournalEntryV1["actionable_findings"];
  }
): ShadowReconciliationJournalEntryV1 {
  return {
    schemaVersion: 1,
    event_family: "dual_read",
    timestamp: new Date().toISOString(),
    save_seq_local: 0,
    outcome,
    snapshot_hash: fields.snapshot_hash,
    compare_status: fields.compare_status,
    duration_ms: fields.duration_ms,
    counts: fields.counts,
    category: fields.category,
    correlation_id: fields.correlation_id,
    message: fields.message?.slice(0, 300),
    overlap_class: fields.overlap_class,
    shadow_save_seq: fields.shadow_save_seq,
    shadow_hash: fields.shadow_hash,
    settle_outcome: fields.settle_outcome,
    rpc_inserted: fields.rpc_inserted,
    rpc_updated: fields.rpc_updated,
    rpc_skipped: fields.rpc_skipped,
    actionable_findings: fields.actionable_findings,
  };
}

function settleOutcomeFromStatus(
  status: DualReadCompareResult["status"]
): NonNullable<ShadowReconciliationJournalEntryV1["settle_outcome"]> {
  switch (status) {
    case "IN_SYNC":
      return "in_sync";
    case "TRANSIENT_LAG":
      return "transient_lag";
    case "DRIFT_DETECTED":
      return "drift_detected";
    case "STALE_DISCARDED":
      return "stale_discarded";
    case "REMOTE_READ_UNAVAILABLE":
      return "unavailable";
    default:
      return "failed";
  }
}

/**
 * One bounded wait while shadow remains pending for hash, then stop.
 * No unbounded polling: at most `maxWaitMs` with a small number of sleeps.
 */
async function waitForShadowTerminalOrTimeout(input: {
  getEntries: () => ShadowReconciliationJournalEntryV1[];
  snapshotHash: string;
  maxWaitMs: number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
}): Promise<void> {
  const deadline = input.now() + Math.max(0, input.maxWaitMs);
  const slice = Math.min(50, Math.max(1, Math.floor(input.maxWaitMs / 4) || 1));
  while (input.now() < deadline) {
    if (!shadowPendingForHash(input.getEntries(), input.snapshotHash)) {
      return;
    }
    const remaining = deadline - input.now();
    if (remaining <= 0) return;
    await input.sleep(Math.min(slice, remaining));
  }
}

/**
 * Run one dual-read observation. Never throws for remote failures.
 */
export async function runTranslationStudioDualReadObservation(options: {
  readTransport: TranslationStudioReadRpcTransport | null;
  local: PersistedStudioState;
  surface: DualReadObservationSurface;
  ignoreObserveFlag?: boolean;
  bypassBreaker?: boolean;
  /**
   * Bypass composition activation gate (tests / explicit diagnostics only).
   * Does not weaken actionable drift detection when compare runs.
   */
  ignoreActivationGate?: boolean;
  getCurrentLocalHash?: () => string;
  journal?: ShadowReconciliationJournal;
  correlationId?: string;
  env?: Record<string, string | undefined>;
  now?: () => number;
  shadowSettleWindowMs?: number;
  /** Inject sleep for settle wait (tests). */
  sleep?: (ms: number) => Promise<void>;
  /** Disable settle re-read (tests of first-pass lag only). */
  disableSettleReread?: boolean;
}): Promise<DualReadObservationRunResult> {
  const now = options.now ?? (() => Date.now());
  const sleep =
    options.sleep ??
    ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const settleWindowMs =
    options.shadowSettleWindowMs ?? SHADOW_DUAL_READ_SETTLE_WINDOW_MS;

  const correlation_id =
    options.correlationId ??
    `dual_obs_${options.surface}_${Date.now().toString(36)}`;
  const breaker = getDualReadObservationBreaker();
  const local_hash = fingerprintStudioSnapshot(options.local);

  const env = options.env ?? process.env;
  if (!options.ignoreObserveFlag && !isDualReadObserveEnabled(env)) {
    return {
      skipped: true,
      skip_reason: "observe_disabled",
      breaker,
      correlation_id,
      surface: options.surface,
      readiness: evaluateDualReadObserveScheduleGate({
        env,
        readTransportAvailable: Boolean(options.readTransport),
      }).report,
    };
  }

  // Activation-safety gate: prefer shadow_dual_write + observe; refuse JSON-only.
  // Tests may pass ignoreObserveFlag + bypass composition via ignoreActivationGate.
  if (!options.ignoreActivationGate) {
    const gate = evaluateDualReadObserveScheduleGate({
      env,
      readTransportAvailable: Boolean(options.readTransport),
    });
    if (!gate.maySchedule) {
      return {
        skipped: true,
        skip_reason:
          gate.reason === "breaker_open"
            ? "breaker_open"
            : gate.reason === "observe_flag_off"
              ? "observe_disabled"
              : "activation_unsafe",
        breaker: getDualReadObservationBreaker(),
        correlation_id,
        surface: options.surface,
        readiness: gate.report,
      };
    }
  }

  const journal =
    options.journal ??
    createShadowReconciliationJournal({
      filePath: resolveShadowReconciliationJournalPath(),
    });

  if (!options.bypassBreaker && isDualReadObservationBreakerOpen()) {
    appendJournal(
      journal,
      journalRow("dual_read_breaker_skipped", {
        snapshot_hash: local_hash,
        compare_status: "BREAKER_OPEN",
        correlation_id,
        message: `surface=${options.surface};reason=${breaker.reason ?? "open"}`,
      })
    );
    return {
      skipped: true,
      skip_reason: "breaker_open",
      breaker: getDualReadObservationBreaker(),
      correlation_id,
      surface: options.surface,
      readiness: evaluateDualReadObserveScheduleGate({
        env,
        readTransportAvailable: Boolean(options.readTransport),
      }).report,
    };
  }

  appendJournal(
    journal,
    journalRow("dual_read_auto_compare_started", {
      snapshot_hash: local_hash,
      correlation_id,
      message: `surface=${options.surface}`,
    })
  );

  const getEntries = () => journal.readEntries();

  let result: DualReadCompareResult;
  try {
    result = await runStudioDualReadCompare({
      local: options.local,
      readTransport: options.readTransport,
      getCurrentLocalHash: options.getCurrentLocalHash,
      getShadowJournalEntries: getEntries,
      dualReadJournal: undefined,
      correlationId: correlation_id,
      now,
      shadowSettleWindowMs: settleWindowMs,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message.slice(0, 300) : "observation failed";
    result = {
      status: "REMOTE_READ_FAILED",
      local_hash,
      remote_hash: null,
      duration_ms: 0,
      counts: {},
      category: "transport",
      message,
      correlation_id,
    };
  }

  let settle_outcome: ShadowReconciliationJournalEntryV1["settle_outcome"] =
    "skipped";

  // Settle-before-breaker: one bounded re-read when first pass is race-shaped lag.
  if (
    result.status === "TRANSIENT_LAG" &&
    options.readTransport &&
    !options.disableSettleReread
  ) {
    const lag =
      result.shadow_lag ??
      classifyShadowLagForCompare({
        entries: getEntries(),
        snapshotHash: local_hash,
        compareStartedAtMs: now(),
        settleWindowMs,
      });

    appendJournal(
      journal,
      journalRow("dual_read_transient_lag", {
        snapshot_hash: local_hash,
        compare_status: "TRANSIENT_LAG",
        duration_ms: result.duration_ms,
        counts: result.counts as Record<string, number>,
        correlation_id,
        overlap_class: lag.overlap_class,
        shadow_save_seq: lag.shadow_save_seq ?? undefined,
        shadow_hash: lag.shadow_hash ?? undefined,
        rpc_inserted: lag.rpc_inserted ?? undefined,
        rpc_updated: lag.rpc_updated ?? undefined,
        rpc_skipped: lag.rpc_skipped ?? undefined,
        actionable_findings: sanitizeActionableFindingsForJournal(
          result.report
        ),
        message: `surface=${options.surface};settle_pending`,
      })
    );

    // If still queued, wait at most the settle window once (bounded).
    await waitForShadowTerminalOrTimeout({
      getEntries,
      snapshotHash: local_hash,
      maxWaitMs: settleWindowMs,
      now,
      sleep,
    });

    let settled: DualReadCompareResult;
    try {
      settled = await runStudioDualReadCompare({
        local: options.local,
        readTransport: options.readTransport,
        getCurrentLocalHash: options.getCurrentLocalHash,
        getShadowJournalEntries: getEntries,
        dualReadJournal: undefined,
        correlationId: `${correlation_id}_settle`,
        now,
        // After explicit wait, do not re-apply post-success settle lag on
        // the re-read — require durable classification unless still pending.
        shadowSettleWindowMs: 0,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message.slice(0, 300) : "settle failed";
      settled = {
        status: "REMOTE_READ_FAILED",
        local_hash,
        remote_hash: null,
        duration_ms: 0,
        counts: {},
        category: "transport",
        message,
        correlation_id: `${correlation_id}_settle`,
      };
    }

    // If re-read still pending-only lag, keep as TRANSIENT_LAG (no breaker).
    // With settleWindowMs=0, only pending qualifies — success after wait → real drift or IN_SYNC.
    settle_outcome = settleOutcomeFromStatus(settled.status);
    appendJournal(
      journal,
      journalRow("dual_read_settle_reread", {
        snapshot_hash: local_hash,
        compare_status: settled.status,
        duration_ms: settled.duration_ms,
        counts: settled.counts as Record<string, number>,
        correlation_id,
        overlap_class: settled.overlap_class ?? "none",
        shadow_save_seq: settled.shadow_lag?.shadow_save_seq ?? undefined,
        shadow_hash: settled.shadow_lag?.shadow_hash ?? undefined,
        settle_outcome,
        rpc_inserted: settled.shadow_lag?.rpc_inserted ?? undefined,
        rpc_updated: settled.shadow_lag?.rpc_updated ?? undefined,
        rpc_skipped: settled.shadow_lag?.rpc_skipped ?? undefined,
        actionable_findings: sanitizeActionableFindingsForJournal(
          settled.report
        ),
        message: `surface=${options.surface};settle=${settle_outcome}`,
      })
    );

    result = settled;
  }

  // Do not open breaker on TRANSIENT_LAG (recordDualReadObservationResult already).
  const trip = recordDualReadObservationResult(result);

  if (
    result.status === "IN_SYNC" ||
    result.status === "TRANSIENT_LAG" ||
    result.status === "STALE_DISCARDED"
  ) {
    appendJournal(
      journal,
      journalRow("dual_read_auto_compare_succeeded", {
        snapshot_hash: local_hash,
        compare_status: result.status,
        duration_ms: result.duration_ms,
        counts: result.counts as Record<string, number>,
        correlation_id,
        overlap_class: result.overlap_class,
        shadow_save_seq: result.shadow_lag?.shadow_save_seq ?? undefined,
        shadow_hash: result.shadow_lag?.shadow_hash ?? undefined,
        settle_outcome,
        rpc_inserted: result.shadow_lag?.rpc_inserted ?? undefined,
        rpc_updated: result.shadow_lag?.rpc_updated ?? undefined,
        rpc_skipped: result.shadow_lag?.rpc_skipped ?? undefined,
        message: `surface=${options.surface}`,
      })
    );
  } else {
    appendJournal(
      journal,
      journalRow("dual_read_auto_compare_failed", {
        snapshot_hash: local_hash,
        compare_status: result.status,
        duration_ms: result.duration_ms,
        counts: result.counts as Record<string, number>,
        category: result.category,
        correlation_id,
        overlap_class: result.overlap_class ?? "none",
        shadow_save_seq: result.shadow_lag?.shadow_save_seq ?? undefined,
        shadow_hash: result.shadow_lag?.shadow_hash ?? undefined,
        settle_outcome,
        actionable_findings: sanitizeActionableFindingsForJournal(
          result.report
        ),
        message: `surface=${options.surface};${result.message ?? ""}`.slice(
          0,
          300
        ),
      })
    );
  }

  if (trip.opened) {
    appendJournal(
      journal,
      journalRow("dual_read_breaker_opened", {
        snapshot_hash: local_hash,
        compare_status: result.status,
        category: result.category,
        correlation_id,
        settle_outcome,
        actionable_findings: sanitizeActionableFindingsForJournal(
          result.report
        ),
        message: `surface=${options.surface};reason=${trip.snapshot.reason ?? "opened"}`,
      })
    );
  }

  return {
    skipped: false,
    result,
    breaker: getDualReadObservationBreaker(),
    correlation_id,
    surface: options.surface,
    settle_outcome,
  };
}

export function claimDualReadObservationSlot(key: string): boolean {
  if (pendingKeys.has(key)) return false;
  pendingKeys.add(key);
  return true;
}

export function releaseDualReadObservationSlot(key: string): void {
  pendingKeys.delete(key);
}

export function __clearDualReadObservationSlotsForTests(): void {
  pendingKeys.clear();
}
