import { ingestAppShellCatalog } from "../ingestion/ingestAppShellCatalog";
import { ingestLearningCatalog } from "../ingestion/ingestLearningCatalog";
import type { PersistedStudioState } from "../types";

/**
 * Initial persisted studio state = App Shell + Learning platform UI catalogs.
 * Course content / media translation remain out of scope.
 */
export function buildSeedPersistedState(
  now = new Date().toISOString()
): PersistedStudioState {
  const appShell = ingestAppShellCatalog(null, {
    now,
    actorId: "system:seed",
  });
  return ingestLearningCatalog(appShell.state, {
    now,
    actorId: "system:seed",
    ephemeralIntelligence: true,
  }).state;
}
