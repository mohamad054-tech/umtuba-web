/**
 * Deterministic capability-compatibility finding codes (UM Core foundation).
 *
 * CAPABILITY COMPATIBILITY IS NOT RUNTIME HEALTH.
 * CAPABILITY COMPATIBILITY IS NOT LIFECYCLE READINESS.
 * CAPABILITY COMPATIBILITY IS NOT SERVICE DISCOVERY.
 * CAPABILITY COMPATIBILITY IS NOT FLAG / ASSERTION AVAILABILITY (P15).
 */

export const UmCapabilityCompatibilityCode = {
  PLATFORM_ID_REQUIRED: "capability.compat.platform_id_required",
  PLATFORM_ID_NAMING: "capability.compat.platform_id_naming",
  CAPABILITY_ID_REQUIRED: "capability.compat.capability_id_required",
  CAPABILITY_ID_NAMING: "capability.compat.capability_id_naming",
  UNKNOWN_PLATFORM: "capability.compat.unknown_platform",
  REQUIRED_CAPABILITY_MISSING: "capability.compat.required_capability_missing",
  REQUIRED_CAPABILITY_UNDECLARED:
    "capability.compat.required_capability_undeclared",
  REQUIRED_CAPABILITY_EXISTS: "capability.compat.required_capability_exists",
  PLATFORM_DECLARES_CAPABILITY:
    "capability.compat.platform_declares_capability",
  COMPATIBLE: "capability.compat.compatible",
  INPUT_INVALID: "capability.compat.input_invalid",
} as const;

export type UmCapabilityCompatibilityCodeName =
  (typeof UmCapabilityCompatibilityCode)[keyof typeof UmCapabilityCompatibilityCode];
