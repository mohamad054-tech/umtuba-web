/**
 * Default Studio persistence factory — mode gate + JSON adapter only.
 * DB adapter (`createDbStudioPersistence`) is intentionally not selected here.
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
  /**
   * Runtime default remains `json` only.
   * DB adapter is injectable separately; never auto-selected by this factory.
   */
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

  // Unsupported/invalid modes fail closed to JSON.
  // Never construct or activate the DB adapter from the default factory.
  return {
    resolution,
    implementation: "json",
    persistence: createJsonStudioPersistence(jsonOptions),
  };
}
