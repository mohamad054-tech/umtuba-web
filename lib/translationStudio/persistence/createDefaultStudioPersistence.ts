/**
 * Default Studio persistence factory — mode gate + JSON adapter only.
 */

import {
  resolveTranslationStudioPersistenceMode,
  type PersistenceModeResolution,
} from "./mode";
import {
  createJsonStudioPersistence,
  createNonDurableStudioPersistence,
  type JsonStudioPersistenceOptions,
} from "./jsonStudioPersistence";
import type { StudioPersistencePort } from "./studioPersistencePort";

export type StudioPersistenceSelection = {
  resolution: PersistenceModeResolution;
  /** Always `json` in V1 — never a DB implementation. */
  implementation: "json";
  persistence: StudioPersistencePort;
};

export function createDefaultStudioPersistence(options?: {
  env?: Record<string, string | undefined>;
  dataDir?: string;
  /** When true, use non-durable port (tests). */
  ephemeral?: boolean;
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

  // V1: unsupported/invalid modes fail closed to the JSON adapter.
  // No DB adapter is constructed under any resolution.
  return {
    resolution,
    implementation: "json",
    persistence: createJsonStudioPersistence(jsonOptions),
  };
}
