/**
 * Dual-read journal entries — schemaVersion 1 with event_family discriminator.
 * Shadow write entries omit event_family (or use implicit shadow).
 */

import type { DualReadCompareStatus, DualReadCountSummary } from "./dualReadObserver";
import type { StudioShadowErrorCategory } from "./shadowObserver";

export const DUAL_READ_JOURNAL_EVENT_FAMILY = "dual_read" as const;

export type DualReadJournalOutcome =
  | "dual_read_succeeded"
  | "dual_read_drift_detected"
  | "dual_read_transient_lag"
  | "dual_read_failed"
  | "dual_read_unavailable"
  | "dual_read_stale_discarded";

export type DualReadJournalEntryV1 = {
  schemaVersion: 1;
  event_family: typeof DUAL_READ_JOURNAL_EVENT_FAMILY;
  timestamp: string;
  /** Always 0 for dual-read (no shadow save_seq). Keeps parser compatibility. */
  save_seq_local: 0;
  outcome: DualReadJournalOutcome;
  snapshot_hash: string;
  compare_status: DualReadCompareStatus;
  duration_ms?: number;
  counts?: DualReadCountSummary;
  category?: StudioShadowErrorCategory | "unavailable";
  correlation_id?: string;
  message?: string;
};

export function isDualReadJournalEntry(
  entry: unknown
): entry is DualReadJournalEntryV1 {
  return (
    typeof entry === "object" &&
    entry !== null &&
    (entry as { event_family?: unknown }).event_family ===
      DUAL_READ_JOURNAL_EVENT_FAMILY
  );
}
