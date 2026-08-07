/**
 * Default Studio persistence factory — mode gate + JSON / shadow / dual-read.
 *
 * Deletion/pruning note (shadow V1):
 * Remote DB remains append/upsert-only. JSON removals may leave stale DB rows.
 * DB is not authoritative; no prune/delete reconciliation in V1.
 *
 * Composition (no mode explosion):
 *   json → optional shadow_dual_write → optional dual_read observe nest
 * Mode `dual_read` alone = JSON + compare (no shadow writes).
 * Mode `shadow_dual_write` alone does NOT activate dual_read unless
 * UMTUBA_TRANSLATION_STUDIO_DUAL_READ_OBSERVE is set or enableDualRead option.
 */

import {
  isDualReadObserveEnabled,
  isExecutableDualReadMode,
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
import { createDualReadStudioPersistence } from "./dualReadStudioPersistence";
import type { StudioPersistencePort } from "./studioPersistencePort";
import type { StudioShadowObserver } from "./shadowObserver";
import type { StudioDualReadObserver } from "./dualReadObserver";
import type { TranslationStudioWriteRpcTransport } from "./writeRpcTransport";
import type { TranslationStudioReadRpcTransport } from "./readRpcTransport";

export type StudioPersistenceSelection = {
  resolution: PersistenceModeResolution;
  implementation: "json" | "shadow_dual_write" | "dual_read";
  persistence: StudioPersistencePort;
  /** True when dual-read wrapper is nested (mode dual_read or observe flag). */
  dualReadEnabled: boolean;
};

export function createDefaultStudioPersistence(options?: {
  env?: Record<string, string | undefined>;
  dataDir?: string;
  /** When true, use non-durable port (tests). */
  ephemeral?: boolean;
  /** Optional observer for shadow mode. */
  shadowObserver?: StudioShadowObserver;
  /** Optional dual-read observer. */
  dualReadObserver?: StudioDualReadObserver;
  /** Optional transport resolver (defaults to request ALS). */
  getShadowTransport?: () => TranslationStudioWriteRpcTransport | null;
  getDualReadTransport?: () => TranslationStudioReadRpcTransport | null;
  /**
   * Force dual-read nest (tests). When unset, uses mode=dual_read or
   * UMTUBA_TRANSLATION_STUDIO_DUAL_READ_OBSERVE.
   */
  enableDualRead?: boolean;
}): StudioPersistenceSelection {
  const env = options?.env ?? process.env;
  const resolution = resolveTranslationStudioPersistenceMode(env);
  if (options?.ephemeral) {
    return {
      resolution,
      implementation: "json",
      persistence: createNonDurableStudioPersistence(),
      dualReadEnabled: false,
    };
  }

  const jsonOptions: JsonStudioPersistenceOptions = {
    dataDir: options?.dataDir,
  };
  let persistence: StudioPersistencePort = createJsonStudioPersistence(jsonOptions);
  let implementation: StudioPersistenceSelection["implementation"] = "json";

  if (isExecutableShadowDualWriteMode(resolution)) {
    persistence = createShadowDualWriteStudioPersistence({
      json: persistence,
      observer: options?.shadowObserver,
      getTransport: options?.getShadowTransport,
      logToConsole: options?.shadowObserver == null,
      enableReconciliationJournal: true,
      journalDataDir: options?.dataDir,
    });
    implementation = "shadow_dual_write";
  }

  const wantDualRead =
    options?.enableDualRead === true ||
    isExecutableDualReadMode(resolution) ||
    (options?.enableDualRead !== false && isDualReadObserveEnabled(env));

  // Mode dual_read alone (no shadow): wrap JSON with dual-read.
  if (isExecutableDualReadMode(resolution) && implementation === "json") {
    persistence = createDualReadStudioPersistence({
      authoritative: persistence,
      getReadTransport: options?.getDualReadTransport,
      observer: options?.dualReadObserver,
      enableJournal: true,
      journalDataDir: options?.dataDir,
    });
    implementation = "dual_read";
    return {
      resolution,
      implementation,
      persistence,
      dualReadEnabled: true,
    };
  }

  // Optional nest over shadow (or json) when observe flag / enableDualRead.
  if (wantDualRead && !isExecutableDualReadMode(resolution)) {
    persistence = createDualReadStudioPersistence({
      authoritative: persistence,
      getReadTransport: options?.getDualReadTransport,
      observer: options?.dualReadObserver,
      enableJournal: true,
      journalDataDir: options?.dataDir,
    });
    return {
      resolution,
      implementation,
      persistence,
      dualReadEnabled: true,
    };
  }

  // unsupported/invalid → JSON fail-closed (already json unless shadow above)
  if (
    resolution.kind === "unsupported" ||
    resolution.kind === "invalid"
  ) {
    return {
      resolution,
      implementation: "json",
      persistence: createJsonStudioPersistence(jsonOptions),
      dualReadEnabled: false,
    };
  }

  return {
    resolution,
    implementation,
    persistence,
    dualReadEnabled: false,
  };
}
