/**
 * Deterministic finding codes for UM Core P19 dependency requirement validation.
 *
 * DEPENDENCY VALIDATION IS NOT DEPENDENCY RESOLUTION.
 * DEPENDENCY VALIDATION IS NOT P13 COMPLETENESS/DRIFT REVIEW.
 * DEPENDENCY VALIDATION IS NOT CATALOG REFERENTIAL INTEGRITY.
 *
 * Codes intentionally use the `dependency.validator.*` namespace — distinct from
 * `dependency.validation.*` (P13) and `referential.*` (RI).
 */

export const UmDependencyValidatorCode = {
  UNKNOWN_PLATFORM: "dependency.validator.unknown_platform",
  TARGET_KIND_INVALID: "dependency.validator.target_kind_invalid",
  TARGET_ID_REQUIRED: "dependency.validator.target_id_required",
  TARGET_ID_NAMING: "dependency.validator.target_id_naming",
  STRENGTH_INVALID: "dependency.validator.strength_invalid",
  REASON_REQUIRED: "dependency.validator.reason_required",
  DUPLICATE_REQUIREMENT: "dependency.validator.duplicate_requirement",
  UNKNOWN_PLATFORM_TARGET: "dependency.validator.unknown_platform_target",
  UNKNOWN_CAPABILITY_TARGET: "dependency.validator.unknown_capability_target",
  REQUIRED_PLATFORM_CYCLE: "dependency.validator.required_platform_cycle",
} as const;

export type UmDependencyValidatorCodeName =
  (typeof UmDependencyValidatorCode)[keyof typeof UmDependencyValidatorCode];
