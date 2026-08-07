/**
 * Deterministic health declaration catalog finding codes (UM Core P10).
 */

export const UmHealthRegistryCode = {
  UNKNOWN_PLATFORM: "health.registry.unknown_platform",
  MANIFEST_MISMATCH: "health.registry.manifest_mismatch",
  DUPLICATE_PLATFORM: "health.registry.duplicate_platform",
  PLATFORM_ID_REQUIRED: "health.registry.platform_id_required",
  PLATFORM_ID_NAMING: "health.registry.platform_id_naming",
  REPORTS_STATUS_INVALID: "health.registry.reports_status_invalid",
  REGISTERED: "health.registry.registered",
} as const;

export type UmHealthRegistryCodeName =
  (typeof UmHealthRegistryCode)[keyof typeof UmHealthRegistryCode];
