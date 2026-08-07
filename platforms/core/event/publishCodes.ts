/**
 * Deterministic finding codes for UM Core P16 event publish admission.
 *
 * EVENT PUBLISHING IS NOT EVENT DELIVERY.
 * EVENT PUBLISHING IS NOT AN EVENT BUS.
 */

export const UmEventPublishCode = {
  UNKNOWN_TYPE: "event.publish.unknown_type",
  PRODUCER_MISMATCH: "event.publish.producer_mismatch",
  SCHEMA_VERSION_MISMATCH: "event.publish.schema_version_mismatch",
  ENVELOPE_INVALID: "event.publish.envelope_invalid",
  SUBJECT_KIND_UNEXPECTED: "event.publish.subject_kind_unexpected",
} as const;

export type UmEventPublishCodeName =
  (typeof UmEventPublishCode)[keyof typeof UmEventPublishCode];
