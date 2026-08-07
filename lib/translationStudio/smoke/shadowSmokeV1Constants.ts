/**
 * Isolated shadow dual-write smoke V1 — reserved identities & env gates.
 * Not a general Studio create-key feature.
 */

export const SHADOW_SMOKE_V1_PREFIX = "__shadow_smoke_v1__" as const;

/** Opt-in for the isolated smoke path only. Does NOT enable shadow persistence. */
export const SHADOW_SMOKE_ALLOW_ENV =
  "UMTUBA_TRANSLATION_STUDIO_ALLOW_SHADOW_SMOKE" as const;

/** Isolated JSON filename under the Studio data dir (never store.json). */
export const SHADOW_SMOKE_V1_JSON_FILENAME = "shadow-smoke-v1.json" as const;

/** Default bounded drain for controlled smoke (ms). */
export const SHADOW_SMOKE_V1_DEFAULT_DRAIN_MS = 20_000;

export const SHADOW_SMOKE_V1_IDS = Object.freeze({
  namespace: `${SHADOW_SMOKE_V1_PREFIX}namespace`,
  key: `${SHADOW_SMOKE_V1_PREFIX}key`,
  /** Catalog key string — deliberately non-App-Shell. */
  keyName: `${SHADOW_SMOKE_V1_PREFIX}probe`,
  valueEn: `${SHADOW_SMOKE_V1_PREFIX}value_en`,
  audit: `${SHADOW_SMOKE_V1_PREFIX}audit`,
} as const);

export type ShadowSmokeV1IdKey = keyof typeof SHADOW_SMOKE_V1_IDS;
