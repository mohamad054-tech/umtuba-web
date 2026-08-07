/**
 * Serialize PersistedStudioState → translation_studio_upsert_snapshot payload.
 * Pure / deterministic. Does not touch network or disk.
 */

import type {
  AuditLogEntry,
  PersistedStudioState,
  StudioLanguage,
  StudioNamespace,
  StudioTranslationKey,
  StudioTranslationValue,
  TerminologyEntry,
  TranslationMemoryEntry,
  TranslationSuggestion,
  TranslationVersionRecord,
} from "../types";

/** Exact schemaVersion=1 snapshot shape expected by the write RPC. */
export type TranslationStudioWriteSnapshotV1 = {
  schemaVersion: 1;
  languages: StudioLanguage[];
  namespaces: StudioNamespace[];
  keys: StudioTranslationKey[];
  suggestions: TranslationSuggestion[];
  values: StudioTranslationValue[];
  versions: TranslationVersionRecord[];
  memory: TranslationMemoryEntry[];
  terminology: TerminologyEntry[];
  auditLog: AuditLogEntry[];
};

function byId<T extends { id: string }>(a: T, b: T): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function byCode(a: StudioLanguage, b: StudioLanguage): number {
  return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
}

/**
 * Map runtime persisted state to the RPC snapshot contract.
 * - Preserves stable string ids (`id` fields → RPC `stable_id` lookup).
 * - Preserves `suggestionId` on values (RPC → suggestion_stable_id).
 * - Preserves actor strings (`actorId`, `createdBy`, `updatedBy`, …);
 *   RPC derives actor_kind / actor_ref server-side from actorId.
 * - Omits `updatedAt` (persistence metadata; not part of RPC contract).
 * - Sorts entity arrays for deterministic payloads.
 */
export function toTranslationStudioWriteSnapshot(
  state: PersistedStudioState
): TranslationStudioWriteSnapshotV1 {
  if (state.schemaVersion !== 1) {
    throw new Error(
      `Unsupported PersistedStudioState.schemaVersion: ${String(
        (state as { schemaVersion?: unknown }).schemaVersion
      )}`
    );
  }

  return {
    schemaVersion: 1,
    languages: [...state.languages].sort(byCode),
    namespaces: [...state.namespaces].sort(byId),
    keys: [...state.keys].sort(byId),
    suggestions: [...state.suggestions].sort(byId),
    values: [...state.values].sort(byId),
    versions: [...state.versions].sort(byId),
    memory: [...state.memory].sort(byId),
    terminology: [...state.terminology].sort(byId),
    auditLog: [...state.auditLog].sort(byId),
  };
}
