/**
 * Deterministic dependency registry finding codes (UM Core P9).
 */

export const UmDependencyRegistryCode = {
  UNKNOWN_OWNER_PLATFORM: "dependency.registry.unknown_owner_platform",
  UNKNOWN_PLATFORM_TARGET: "dependency.registry.unknown_platform_target",
  UNKNOWN_CAPABILITY_TARGET: "dependency.registry.unknown_capability_target",
  MANIFEST_MISMATCH: "dependency.registry.manifest_mismatch",
  DUPLICATE_EDGE: "dependency.registry.duplicate_edge",
  FROM_PLATFORM_REQUIRED: "dependency.registry.from_platform_required",
  FROM_PLATFORM_NAMING: "dependency.registry.from_platform_naming",
  TARGET_KIND_INVALID: "dependency.registry.target_kind_invalid",
  TARGET_ID_REQUIRED: "dependency.registry.target_id_required",
  TARGET_ID_NAMING: "dependency.registry.target_id_naming",
  STRENGTH_INVALID: "dependency.registry.strength_invalid",
  REASON_REQUIRED: "dependency.registry.reason_required",
  REQUIRED_PLATFORM_CYCLE: "dependency.registry.required_platform_cycle",
  REGISTERED: "dependency.registry.registered",
} as const;

export type UmDependencyRegistryCodeName =
  (typeof UmDependencyRegistryCode)[keyof typeof UmDependencyRegistryCode];
