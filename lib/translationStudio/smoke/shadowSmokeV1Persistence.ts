/**
 * Isolated JSON persistence for shadow smoke V1.
 * Never reads/writes the normal store.json used by Translation Studio UI.
 */

import { join } from "path";
import type { PersistedStudioState } from "../types";
import type { StudioPersistencePort } from "../persistence/studioPersistencePort";
import {
  readPersistedStudioStateFromFile,
  removePersistedStudioStateFile,
  resolveStudioDataDir,
  studioStorePath,
  writePersistedStudioStateToFile,
} from "../persistence/fileStore";
import { SHADOW_SMOKE_V1_JSON_FILENAME } from "./shadowSmokeV1Constants";

export function resolveShadowSmokeV1JsonPath(dataDir?: string): string {
  return join(resolveStudioDataDir(dataDir), SHADOW_SMOKE_V1_JSON_FILENAME);
}

/** Absolute path of the normal Studio store (for isolation assertions). */
export function resolveNormalStudioStoreJsonPath(dataDir?: string): string {
  return studioStorePath(resolveStudioDataDir(dataDir));
}

export function createShadowSmokeV1JsonPersistence(options?: {
  dataDir?: string;
  /** Inject absolute file path (tests). */
  filePath?: string;
}): StudioPersistencePort & { readonly filePath: string } {
  const filePath =
    options?.filePath ?? resolveShadowSmokeV1JsonPath(options?.dataDir);

  return {
    filePath,
    load() {
      return readPersistedStudioStateFromFile(filePath);
    },
    save(state: PersistedStudioState) {
      writePersistedStudioStateToFile(filePath, state);
    },
  };
}

/**
 * Remove only the isolated smoke JSON file.
 * Never deletes store.json or remote rows.
 */
export function cleanupShadowSmokeV1JsonLocal(options?: {
  dataDir?: string;
  filePath?: string;
}): { removed: boolean; path: string } {
  const path =
    options?.filePath ?? resolveShadowSmokeV1JsonPath(options?.dataDir);
  const removed = removePersistedStudioStateFile(path);
  return { removed, path };
}
