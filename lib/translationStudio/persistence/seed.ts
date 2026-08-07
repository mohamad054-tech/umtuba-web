import { ingestAppShellCatalog } from "../ingestion/ingestAppShellCatalog";
import type { PersistedStudioState } from "../types";
import {
  TRANSLATION_STUDIO_SEED_ACTOR_V1,
  TRANSLATION_STUDIO_SEED_TIMESTAMP_V1,
} from "./seedConstants";

export {
  TRANSLATION_STUDIO_SEED_ACTOR_V1,
  TRANSLATION_STUDIO_SEED_TIMESTAMP_V1,
} from "./seedConstants";

/**
 * Initial persisted studio state = App Shell catalog ingestion.
 * Feature-domain catalogs are out of scope for this seed.
 *
 * Deterministic: same process and cross-process builds produce the same
 * write-normalized snapshot / fingerprint when using the default seed stamp.
 */
export function buildSeedPersistedState(
  now: string = TRANSLATION_STUDIO_SEED_TIMESTAMP_V1
): PersistedStudioState {
  return ingestAppShellCatalog(null, {
    now,
    actorId: TRANSLATION_STUDIO_SEED_ACTOR_V1,
  }).state;
}
