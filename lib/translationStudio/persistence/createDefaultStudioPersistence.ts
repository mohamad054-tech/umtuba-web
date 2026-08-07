/**
 * Default Studio persistence factory — mode gate + JSON or shadow dual-write.
 *
 * Deletion/pruning note (shadow V1):
 * Remote DB remains append/upsert-only. JSON removals may leave stale DB rows.
 * DB is not authoritative; no prune/delete reconciliation in V1.
 */

import {
  isExecutableShadowDualWriteMode,
  resolveTranslationStudioPersistenceMode,
  type PersistenceModeResolution,
} from "./mode";
import {
  createJsonStudioPersistence,
  createNonDurableStudioPersistence,
  type JsonStudioPersistenceOptions,
} from "./jsonStudioPersistence";
import { createShadowDualWriteStudioPersistence } from "./shadowDualWriteStudioPersistence";
import type { StudioPersistencePort } from "./studioPersistencePort";
import type { StudioShadowObserver } from "./shadowObserver";
import type { TranslationStudioWriteRpcTransport } from "./writeRpcTransport";

export type StudioPersistenceSelection = {
  resolution: PersistenceModeResolution;
  implementation: "json" | "shadow_dual_write";
  persistence: StudioPersistencePort;
};

export function createDefaultStudioPersistence(options?: {
  env?: Record<string, string | undefined>;
  dataDir?: string;
  /** When true, use non-durable port (tests). */
  ephemeral?: boolean;
  /** Optional observer for shadow mode. */
  shadowObserver?: StudioShadowObserver;
  /** Optional transport resolver (defaults to request ALS). */
  getShadowTransport?: () => TranslationStudioWriteRpcTransport | null;
}): StudioPersistenceSelection {
  const resolution = resolveTranslationStudioPersistenceMode(options?.env);
  if (options?.ephemeral) {
    return {
      resolution,
      implementation: "json",
      persistence: createNonDurableStudioPersistence(),
    };
  }

  const jsonOptions: JsonStudioPersistenceOptions = {
    dataDir: options?.dataDir,
  };
  const json = createJsonStudioPersistence(jsonOptions);

  if (isExecutableShadowDualWriteMode(resolution)) {
    return {
      resolution,
      implementation: "shadow_dual_write",
      persistence: createShadowDualWriteStudioPersistence({
        json,
        observer: options?.shadowObserver,
        getTransport: options?.getShadowTransport,
        logToConsole: options?.shadowObserver == null,
        enableReconciliationJournal: true,
        journalDataDir: options?.dataDir,
      }),
    };
  }

  // unsupported/invalid → JSON fail-closed
  return {
    resolution,
    implementation: "json",
    persistence: json,
  };
}
