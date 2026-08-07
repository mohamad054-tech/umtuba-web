/**
 * Deterministic finding codes for UM Core P13 dependency completeness/drift review.
 *
 * VALIDATOR COMPOSITION IS NOT DEPENDENCY RESOLUTION.
 */

export const UmDependencyValidationCode = {
  UNKNOWN_PLATFORM: "dependency.validation.unknown_platform",
  MISSING_CATALOG_EDGE: "dependency.validation.missing_catalog_edge",
  STALE_CATALOG_EDGE: "dependency.validation.stale_catalog_edge",
  UNKNOWN_PLATFORM_TARGET: "dependency.validation.unknown_platform_target",
  UNKNOWN_CAPABILITY_TARGET: "dependency.validation.unknown_capability_target",
} as const;

export type UmDependencyValidationCodeName =
  (typeof UmDependencyValidationCode)[keyof typeof UmDependencyValidationCode];
