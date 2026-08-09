/**
 * Deterministic finding codes for UM Core catalog referential-integrity review.
 *
 * REFERENTIAL INTEGRITY REVIEW IS NOT DEPENDENCY RESOLUTION.
 * REFERENTIAL INTEGRITY REVIEW IS NOT REGISTRY MUTATION.
 * REFERENTIAL INTEGRITY REVIEW IS NOT HEALTH DIAGNOSTICS JOIN.
 */

export const UmReferentialIntegrityCode = {
  CAPABILITY_UNKNOWN_PLATFORM: "referential.capability.unknown_platform",
  CAPABILITY_UNKNOWN_FLAG: "referential.capability.unknown_flag",
  EVENT_TYPE_UNKNOWN_PRODUCER: "referential.event_type.unknown_producer",
  ROUTE_UNKNOWN_EVENT_TYPE: "referential.route.unknown_event_type",
  ROUTE_UNKNOWN_DESTINATION: "referential.route.unknown_destination",
  ROUTE_UNKNOWN_PRODUCER: "referential.route.unknown_producer",
  FLAG_UNKNOWN_PLATFORM: "referential.flag.unknown_platform",
  FLAG_UNKNOWN_LINKED_CAPABILITY:
    "referential.flag.unknown_linked_capability",
  DEPENDENCY_UNKNOWN_OWNER: "referential.dependency.unknown_owner",
  DEPENDENCY_UNKNOWN_PLATFORM_TARGET:
    "referential.dependency.unknown_platform_target",
  DEPENDENCY_UNKNOWN_CAPABILITY_TARGET:
    "referential.dependency.unknown_capability_target",
  HEALTH_DECLARATION_UNKNOWN_PLATFORM:
    "referential.health_declaration.unknown_platform",
  HEALTH_OBSERVATION_UNKNOWN_PLATFORM:
    "referential.health_observation.unknown_platform",
  HEALTH_OBSERVATION_UNKNOWN_CAPABILITY:
    "referential.health_observation.unknown_capability",
  HEALTH_OBSERVATION_UNKNOWN_DEPENDENCY_TARGET:
    "referential.health_observation.unknown_dependency_target",
} as const;

export type UmReferentialIntegrityCodeName =
  (typeof UmReferentialIntegrityCode)[keyof typeof UmReferentialIntegrityCode];
