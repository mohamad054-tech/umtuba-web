/**
 * Deterministic event type registry finding codes (UM Core P6).
 */

export const UmEventTypeRegistryCode = {
  UNKNOWN_PRODUCER: "event_type.registry.unknown_producer",
  DUPLICATE_EVENT_TYPE: "event_type.registry.duplicate_id",
  PLATFORM_NAMESPACE: "event_type.registry.platform_namespace",
  SCHEMA_VERSION_REQUIRED: "event_type.registry.schema_version_required",
  SCHEMA_VERSION_INVALID: "event_type.registry.schema_version_invalid",
  STABILITY_INVALID: "event_type.registry.stability_invalid",
  COMPATIBILITY_INVALID: "event_type.registry.compatibility_invalid",
  PII_CLASS_INVALID: "event_type.registry.pii_class_invalid",
  DELIVERY_EXPECTATION_INVALID: "event_type.registry.delivery_expectation_invalid",
  PAYLOAD_SCHEMA_REF_REQUIRED: "event_type.registry.payload_schema_ref_required",
  OWNERSHIP_MISSING: "event_type.registry.ownership_missing",
  MANIFEST_MISMATCH: "event_type.registry.manifest_mismatch",
  EVENT_TYPE_REQUIRED: "event_type.registry.id_required",
  EVENT_TYPE_NAMING: "event_type.registry.id_naming",
  SUBJECT_REF_EXPECTATIONS_REQUIRED:
    "event_type.registry.subject_ref_expectations_required",
  SUBJECT_REF_EXPECTATION_INVALID:
    "event_type.registry.subject_ref_expectation_invalid",
  REGISTERED: "event_type.registry.registered",
} as const;

export type UmEventTypeRegistryCodeName =
  (typeof UmEventTypeRegistryCode)[keyof typeof UmEventTypeRegistryCode];
