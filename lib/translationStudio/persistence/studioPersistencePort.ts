/**
 * Studio persistence port — load/save only.
 * Keeps DB concepts out of workflow/domain code.
 */

import type { PersistedStudioState } from "../types";

export type StudioPersistencePort = {
  /** Returns null when no durable state exists (caller seeds). */
  load(): PersistedStudioState | null;
  save(state: PersistedStudioState): void;
};
