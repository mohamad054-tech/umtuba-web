import { ingestAppShellCatalog } from "../ingestion/ingestAppShellCatalog";
import type { PersistedStudioState } from "../types";

/**
 * Initial persisted studio state = App Shell catalog ingestion.
 * Feature-domain catalogs are out of scope for this seed.
 */
export function buildSeedPersistedState(
  now = new Date().toISOString()
): PersistedStudioState {
  return ingestAppShellCatalog(null, {
    now,
    actorId: "system:seed",
  }).state;
}
