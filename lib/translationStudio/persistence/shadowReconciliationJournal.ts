/**
 * Append-only local shadow reconciliation journal V1.
 * Path: data/translation-studio/shadow-reconciliation-v1.jsonl (gitignored).
 * Journal write failures must never fail JSON-authoritative saves.
 */

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
} from "fs";
import { dirname, join } from "path";
import { resolveStudioDataDir } from "./fileStore";
import type { StudioShadowEntityCounts } from "./shadowObserver";
import type { StudioShadowErrorCategory } from "./shadowObserver";

export const SHADOW_RECONCILIATION_JOURNAL_V1_FILENAME =
  "shadow-reconciliation-v1.jsonl" as const;

export const SHADOW_RECONCILIATION_JOURNAL_SCHEMA_VERSION = 1 as const;

export type ShadowJournalOutcome =
  | "queued"
  | "superseded"
  | "succeeded"
  | "failed"
  | "skipped"
  | "journal_error"
  | "dual_read_succeeded"
  | "dual_read_drift_detected"
  | "dual_read_transient_lag"
  | "dual_read_failed"
  | "dual_read_unavailable"
  | "dual_read_stale_discarded";

export type ShadowReconciliationJournalEntryV1 = {
  schemaVersion: typeof SHADOW_RECONCILIATION_JOURNAL_SCHEMA_VERSION;
  timestamp: string;
  save_seq_local: number;
  outcome: ShadowJournalOutcome;
  /** Discriminator for dual-read journal rows. Absent on shadow write rows. */
  event_family?: "dual_read";
  category?: StudioShadowErrorCategory | "unavailable";
  attempt?: number;
  duration_ms?: number;
  entity_counts?: StudioShadowEntityCounts;
  snapshot_hash: string;
  correlation_id?: string;
  superseded_by?: number;
  message?: string;
  compare_status?: string;
  counts?: Record<string, number>;
};

export type ShadowReconciliationJournal = {
  readonly filePath: string;
  append(entry: ShadowReconciliationJournalEntryV1): void;
  readEntries(): ShadowReconciliationJournalEntryV1[];
};

export function resolveShadowReconciliationJournalPath(
  dataDir?: string
): string {
  return join(
    resolveStudioDataDir(dataDir),
    SHADOW_RECONCILIATION_JOURNAL_V1_FILENAME
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseShadowReconciliationJournalLine(
  line: string
): ShadowReconciliationJournalEntryV1 | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (!isPlainObject(parsed)) return null;
  if (parsed.schemaVersion !== 1) return null;
  if (typeof parsed.timestamp !== "string" || !parsed.timestamp) return null;
  if (typeof parsed.outcome !== "string") return null;
  if (typeof parsed.snapshot_hash !== "string") return null;

  // Dual-read entries use save_seq_local=0; still require a number for compat.
  if (typeof parsed.save_seq_local !== "number") {
    if (parsed.event_family === "dual_read") {
      parsed.save_seq_local = 0;
    } else {
      return null;
    }
  }

  // Reject obvious secret-bearing keys if ever present
  for (const banned of [
    "token",
    "cookie",
    "authorization",
    "password",
    "service_role",
    "apikey",
  ]) {
    if (banned in parsed) return null;
  }

  return parsed as ShadowReconciliationJournalEntryV1;
}

export function createShadowReconciliationJournal(options?: {
  dataDir?: string;
  filePath?: string;
  /** Inject clock for tests. */
  now?: () => string;
  /** Inject append for failure tests. */
  appendImpl?: (path: string, line: string) => void;
}): ShadowReconciliationJournal {
  const filePath =
    options?.filePath ?? resolveShadowReconciliationJournalPath(options?.dataDir);
  const now = options?.now ?? (() => new Date().toISOString());
  const appendImpl =
    options?.appendImpl ??
    ((path: string, line: string) => {
      mkdirSync(dirname(path), { recursive: true });
      appendFileSync(path, line, "utf8");
    });

  return {
    filePath,
    append(entry) {
      const line =
        JSON.stringify({
          ...entry,
          schemaVersion: 1,
          timestamp: entry.timestamp || now(),
        }) + "\n";
      appendImpl(filePath, line);
    },
    readEntries() {
      if (!existsSync(filePath)) return [];
      let raw: string;
      try {
        raw = readFileSync(filePath, "utf8");
      } catch {
        return [];
      }
      const out: ShadowReconciliationJournalEntryV1[] = [];
      for (const line of raw.split(/\r?\n/)) {
        const entry = parseShadowReconciliationJournalLine(line);
        if (entry) out.push(entry);
      }
      return out;
    },
  };
}

/**
 * Observer adapter: maps shadow events → journal entries.
 * Never throws to the shadow pipeline.
 */
export function createJournalingShadowObserver(options: {
  journal: ShadowReconciliationJournal;
  /** Resolve snapshot hash / correlation for a save_seq. */
  getMeta: (save_seq: number) => {
    snapshot_hash: string;
    correlation_id?: string;
  } | null;
  onJournalError?: (err: unknown) => void;
}): import("./shadowObserver").StudioShadowObserver {
  const { journal, getMeta, onJournalError } = options;

  function safeAppend(entry: ShadowReconciliationJournalEntryV1) {
    try {
      journal.append(entry);
    } catch (err) {
      try {
        onJournalError?.(err);
        journal.append({
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          save_seq_local: entry.save_seq_local,
          outcome: "journal_error",
          snapshot_hash: entry.snapshot_hash || "unknown",
          message:
            err instanceof Error ? err.message.slice(0, 200) : "journal_append_failed",
        });
      } catch (inner) {
        onJournalError?.(inner);
        console.warn(
          "[translation-studio-shadow-journal]",
          inner instanceof Error ? inner.message : "journal_failed"
        );
      }
    }
  }

  return {
    onEvent(event) {
      const meta = getMeta(event.save_seq);
      const snapshot_hash =
        ("snapshot_hash" in event && event.snapshot_hash) ||
        meta?.snapshot_hash ||
        "";
      const correlation_id =
        ("correlation_id" in event && event.correlation_id) ||
        meta?.correlation_id;

      if (event.type === "queued") {
        safeAppend({
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          save_seq_local: event.save_seq,
          outcome: "queued",
          entity_counts: event.entity_counts,
          snapshot_hash,
          correlation_id,
        });
        return;
      }
      if (event.type === "superseded") {
        safeAppend({
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          save_seq_local: event.save_seq,
          outcome: "superseded",
          superseded_by: event.superseded_by,
          snapshot_hash,
          correlation_id,
        });
        return;
      }
      if (event.type === "skipped") {
        safeAppend({
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          save_seq_local: event.save_seq,
          outcome: "skipped",
          category: event.category,
          snapshot_hash,
          correlation_id,
          message: event.reason,
        });
        return;
      }
      if (event.type === "succeeded") {
        safeAppend({
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          save_seq_local: event.save_seq,
          outcome: "succeeded",
          attempt: event.attempt,
          duration_ms: event.duration_ms,
          snapshot_hash,
          correlation_id,
        });
        return;
      }
      if (event.type === "failed") {
        safeAppend({
          schemaVersion: 1,
          timestamp: new Date().toISOString(),
          save_seq_local: event.save_seq,
          outcome: "failed",
          category: event.category,
          attempt: event.attempt,
          duration_ms: event.duration_ms,
          snapshot_hash,
          correlation_id,
          message: event.message.slice(0, 300),
        });
        return;
      }
      // started / retry — not required in journal minimum; skip
    },
  };
}

/** Compose observers; each is isolated from others' throws. */
export function composeStudioShadowObservers(
  ...observers: Array<import("./shadowObserver").StudioShadowObserver | null | undefined>
): import("./shadowObserver").StudioShadowObserver {
  const list = observers.filter(
    (o): o is import("./shadowObserver").StudioShadowObserver => o != null
  );
  return {
    onEvent(event) {
      for (const obs of list) {
        try {
          obs.onEvent(event);
        } catch {
          // never break the shadow pipeline
        }
      }
    },
  };
}
