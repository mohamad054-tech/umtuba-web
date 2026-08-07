/**
 * Deterministic fingerprint of a JSON-authoritative Studio snapshot.
 * Uses the write-RPC normalization (sorted, no top-level updatedAt).
 */

import { createHash } from "crypto";
import type { PersistedStudioState } from "../types";
import { toTranslationStudioWriteSnapshot } from "./writeRpcSnapshot";

/**
 * Stable SHA-256 hex of the normalized schemaVersion=1 snapshot.
 * Same logical content → same hash. No secrets.
 */
export function fingerprintStudioSnapshot(state: PersistedStudioState): string {
  const snapshot = toTranslationStudioWriteSnapshot(state);
  const canonical = JSON.stringify(snapshot);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/** Fingerprint an already-normalized write/read snapshot object. */
export function fingerprintNormalizedStudioSnapshot(snapshot: {
  schemaVersion: 1;
  languages: unknown[];
  namespaces: unknown[];
  keys: unknown[];
  suggestions: unknown[];
  values: unknown[];
  versions: unknown[];
  memory: unknown[];
  terminology: unknown[];
  auditLog: unknown[];
}): string {
  const canonical = JSON.stringify(snapshot);
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}
