/**
 * Deterministic finding / NOT_READY reason codes for UM Core readiness (P23).
 *
 * HEALTH STATUS TOKEN "ready" IS NOT LIFECYCLE READINESS.
 * Namespace must not collide with health.report.* / health.fleet.* / health.registry.*.
 */

export const UmPlatformReadinessCode = {
  PLATFORM_ID_REQUIRED: "readiness.platform_id_required",
  PLATFORM_ID_NAMING: "readiness.platform_id_naming",
  NOT_REGISTERED: "readiness.not_registered",
  VALIDATION_NOT_OK: "readiness.validation_not_ok",
  NOT_COMPLIANT: "readiness.not_compliant",
  HEALTH_UNDECLARED: "readiness.health_undeclared",
  HEALTH_UNOBSERVED: "readiness.health_unobserved",
  HEALTH_DEGRADED: "readiness.health_degraded",
  HEALTH_UNAVAILABLE: "readiness.health_unavailable",
  ORPHAN_OBSERVATION: "readiness.orphan_observation",
  INPUT_INVALID: "readiness.input_invalid",
} as const;

export type UmPlatformReadinessCodeName =
  (typeof UmPlatformReadinessCode)[keyof typeof UmPlatformReadinessCode];
