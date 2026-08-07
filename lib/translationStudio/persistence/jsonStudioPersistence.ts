/**
 * JSON file StudioPersistencePort — current V1 durable store.
 */

import type { PersistedStudioState } from "../types";
import {
  readPersistedStudioState,
  resolveStudioDataDir,
  writePersistedStudioState,
} from "./fileStore";
import type { StudioPersistencePort } from "./studioPersistencePort";

export type JsonStudioPersistenceOptions = {
  /** Explicit data directory (wins over env / default). */
  dataDir?: string;
};

export function createJsonStudioPersistence(
  options: JsonStudioPersistenceOptions = {}
): StudioPersistencePort {
  const dataDir = resolveStudioDataDir(options.dataDir);
  return {
    load() {
      return readPersistedStudioState(dataDir);
    },
    save(state: PersistedStudioState) {
      writePersistedStudioState(dataDir, state);
    },
  };
}

/** In-memory port for tests — never touches disk. */
export function createEphemeralStudioPersistence(): StudioPersistencePort {
  let memory: PersistedStudioState | null = null;
  return {
    load() {
      return memory;
    },
    save(state: PersistedStudioState) {
      memory = state;
    },
  };
}

/**
 * Ephemeral port that never retains saves — matches prior `ephemeral: true`
 * workflow behavior (seed each load; mutations stay in workflow RAM only).
 */
export function createNonDurableStudioPersistence(): StudioPersistencePort {
  return {
    load() {
      return null;
    },
    save() {
      // intentionally no-op
    },
  };
}
