/**
 * Shadow ↔ dual-read race / settle-window classification V1.
 *
 * Ties TRANSIENT_LAG only to concrete shadow lifecycle evidence for the same
 * snapshot hash lineage — never broad time-based suppression of arbitrary drift.
 */

import type { ShadowReconciliationJournalEntryV1 } from "./shadowReconciliationJournal";

/** Default post-success settle window (ms). Tightly bounded; tests may override. */
export const SHADOW_DUAL_READ_SETTLE_WINDOW_MS = 3_000 as const;

const TERMINAL_SHADOW = new Set([
  "succeeded",
  "failed",
  "skipped",
  "superseded",
]);

export type ShadowLagOverlapClass =
  | "pending"
  | "overlap_in_flight"
  | "post_success_settle"
  | "none";

export type ShadowLagEvidence = {
  qualifies: boolean;
  overlap_class: ShadowLagOverlapClass;
  shadow_save_seq: number | null;
  shadow_hash: string | null;
  shadow_outcome: string | null;
  /** ISO timestamp of matching shadow succeeded row when known. */
  shadow_succeeded_at: string | null;
  /** RPC counts from succeeded journal row when present. */
  rpc_inserted: number | null;
  rpc_updated: number | null;
  rpc_skipped: number | null;
};

function isShadowWriteEntry(
  e: ShadowReconciliationJournalEntryV1
): boolean {
  return (e as { event_family?: string }).event_family !== "dual_read";
}

function parseIsoMs(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * True while the latest shadow write event for `hash` is still `queued`
 * (no terminal outcome yet). Preserved for callers/tests.
 */
export function shadowPendingForHash(
  entries: ShadowReconciliationJournalEntryV1[],
  hash: string
): boolean {
  const shadow = entries.filter(
    (e) => e.snapshot_hash === hash && isShadowWriteEntry(e)
  );
  if (shadow.length === 0) return false;
  for (let i = shadow.length - 1; i >= 0; i--) {
    const o = shadow[i]!.outcome;
    if (TERMINAL_SHADOW.has(o)) return false;
    if (o === "queued") return true;
  }
  return false;
}

/**
 * Classify whether actionable drift for `snapshotHash` should be treated as
 * TRANSIENT_LAG given shadow journal evidence and compare timing.
 *
 * Qualifies when:
 * - shadow still pending (queued) for this hash, OR
 * - compare started before a same-hash shadow success completed (overlap), OR
 * - compare started within settleWindowMs after same-hash shadow success
 */
export function classifyShadowLagForCompare(input: {
  entries: ShadowReconciliationJournalEntryV1[];
  snapshotHash: string;
  compareStartedAtMs: number;
  /** Unused for qualification today; reserved for diagnostics / future. */
  compareEndedAtMs?: number;
  settleWindowMs?: number;
}): ShadowLagEvidence {
  const settleWindowMs =
    input.settleWindowMs ?? SHADOW_DUAL_READ_SETTLE_WINDOW_MS;
  const empty: ShadowLagEvidence = {
    qualifies: false,
    overlap_class: "none",
    shadow_save_seq: null,
    shadow_hash: null,
    shadow_outcome: null,
    shadow_succeeded_at: null,
    rpc_inserted: null,
    rpc_updated: null,
    rpc_skipped: null,
  };

  const shadow = input.entries.filter(
    (e) => e.snapshot_hash === input.snapshotHash && isShadowWriteEntry(e)
  );
  if (shadow.length === 0) return empty;

  // Walk from the end to find the latest write cycle for this hash.
  let latestQueued: ShadowReconciliationJournalEntryV1 | null = null;
  let latestTerminal: ShadowReconciliationJournalEntryV1 | null = null;

  for (let i = shadow.length - 1; i >= 0; i--) {
    const e = shadow[i]!;
    if (!latestTerminal && TERMINAL_SHADOW.has(e.outcome)) {
      latestTerminal = e;
      continue;
    }
    if (latestTerminal && e.outcome === "queued") {
      // queued belonging to this terminal cycle (same save_seq preferred)
      if (
        latestQueued == null ||
        e.save_seq_local === latestTerminal.save_seq_local
      ) {
        latestQueued = e;
        if (e.save_seq_local === latestTerminal.save_seq_local) break;
      }
    }
    if (!latestTerminal && e.outcome === "queued") {
      latestQueued = e;
      break;
    }
  }

  // Pending: queued with no later terminal for this hash
  if (shadowPendingForHash(input.entries, input.snapshotHash)) {
    const queued =
      [...shadow].reverse().find((e) => e.outcome === "queued") ?? null;
    return {
      qualifies: true,
      overlap_class: "pending",
      shadow_save_seq: queued?.save_seq_local ?? null,
      shadow_hash: input.snapshotHash,
      shadow_outcome: "queued",
      shadow_succeeded_at: null,
      rpc_inserted: null,
      rpc_updated: null,
      rpc_skipped: null,
    };
  }

  if (!latestTerminal || latestTerminal.outcome !== "succeeded") {
    return empty;
  }

  const succeededAtMs = parseIsoMs(latestTerminal.timestamp);
  if (succeededAtMs == null) return empty;

  const rpc_inserted =
    typeof latestTerminal.rpc_inserted === "number"
      ? latestTerminal.rpc_inserted
      : null;
  const rpc_updated =
    typeof latestTerminal.rpc_updated === "number"
      ? latestTerminal.rpc_updated
      : null;
  const rpc_skipped =
    typeof latestTerminal.rpc_skipped === "number"
      ? latestTerminal.rpc_skipped
      : null;

  const base = {
    shadow_save_seq: latestTerminal.save_seq_local,
    shadow_hash: input.snapshotHash,
    shadow_outcome: "succeeded" as const,
    shadow_succeeded_at: latestTerminal.timestamp,
    rpc_inserted,
    rpc_updated,
    rpc_skipped,
  };

  // Overlap: compare began while write was still in flight
  if (input.compareStartedAtMs < succeededAtMs) {
    return {
      qualifies: true,
      overlap_class: "overlap_in_flight",
      ...base,
    };
  }

  // Post-success settle window (same hash lineage only)
  const age = input.compareStartedAtMs - succeededAtMs;
  if (age >= 0 && age <= settleWindowMs) {
    return {
      qualifies: true,
      overlap_class: "post_success_settle",
      ...base,
    };
  }

  return {
    qualifies: false,
    overlap_class: "none",
    ...base,
  };
}

/** Sanitize actionable findings for journal (ids + fields only; no text/payloads). */
export function sanitizeActionableFindingsForJournal(
  report:
    | {
        findings: Array<{
          category: string;
          entityType: string;
          identity: string;
          fields?: string[];
          smokeResidue?: boolean;
        }>;
      }
    | null
    | undefined
): Array<{
  category: string;
  entityType: string;
  identity: string;
  fields?: string[];
}> {
  if (!report) return [];
  const out: Array<{
    category: string;
    entityType: string;
    identity: string;
    fields?: string[];
  }> = [];
  for (const f of report.findings) {
    if (f.category === "harmless_representation_difference") continue;
    if (
      (f.category === "extra_remote" || f.category === "audit_extra") &&
      f.smokeResidue
    ) {
      continue;
    }
    if (
      f.category === "missing_remote" ||
      f.category === "field_mismatch" ||
      f.category === "audit_missing" ||
      f.category === "extra_remote" ||
      f.category === "audit_extra"
    ) {
      out.push({
        category: f.category,
        entityType: f.entityType,
        identity: String(f.identity).slice(0, 160),
        ...(f.fields?.length
          ? { fields: f.fields.map((x) => String(x).slice(0, 64)).slice(0, 20) }
          : {}),
      });
    }
  }
  return out.slice(0, 40);
}
