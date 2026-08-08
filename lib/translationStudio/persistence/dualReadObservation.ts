/**
 * Dual-read automatic observation runner V1.
 * Uses runStudioDualReadCompare. Never mutates JSON. Never writes DB.
 */

import type { PersistedStudioState } from "../types";
import { fingerprintStudioSnapshot } from "./snapshotFingerprint";
import {
  runStudioDualReadCompare,
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
  };
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
}): Promise<DualReadObservationRunResult> {
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

  let result: DualReadCompareResult;
  try {
    result = await runStudioDualReadCompare({
      local: options.local,
      readTransport: options.readTransport,
      getCurrentLocalHash: options.getCurrentLocalHash,
      getShadowJournalEntries: () => journal.readEntries(),
      dualReadJournal: undefined,
      correlationId: correlation_id,
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
