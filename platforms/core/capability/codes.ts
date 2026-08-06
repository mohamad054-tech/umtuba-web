/**
 * Deterministic capability registry finding codes (UM Core P5).
 */

export const UmCapabilityRegistryCode = {
  UNKNOWN_PLATFORM: "capability.registry.unknown_platform",
  UNKNOWN_MODULE: "capability.registry.unknown_module",
  DUPLICATE_CAPABILITY_ID: "capability.registry.duplicate_id",
  PLATFORM_NAMESPACE: "capability.registry.platform_namespace",
  SIDE_EFFECT_INVALID: "capability.registry.side_effect_invalid",
  SIDE_EFFECT_REQUIRED: "capability.registry.side_effect_required",
  SIDE_EFFECT_DUPLICATE: "capability.registry.side_effect_duplicate",
  VERSION_INVALID: "capability.registry.version_invalid",
  VERSION_REQUIRED: "capability.registry.version_required",
  OWNERSHIP_INVALID: "capability.registry.ownership_invalid",
  AUTH_CLASS_INVALID: "capability.registry.auth_class_invalid",
  STABILITY_INVALID: "capability.registry.stability_invalid",
  DISPLAY_NAME_REQUIRED: "capability.registry.display_name_required",
  CAPABILITY_ID_REQUIRED: "capability.registry.id_required",
  CAPABILITY_ID_NAMING: "capability.registry.id_naming",
  MODULE_CAPABILITY_REF_MISMATCH:
    "capability.registry.module_capability_ref_mismatch",
  REGISTERED: "capability.registry.registered",
} as const;

export type UmCapabilityRegistryCodeName =
  (typeof UmCapabilityRegistryCode)[keyof typeof UmCapabilityRegistryCode];
