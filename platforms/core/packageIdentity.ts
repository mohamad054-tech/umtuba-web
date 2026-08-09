/**
 * UM Core package identity constants.
 *
 * Spec: UM_CORE_SPECIFICATION_V1 â€” Core identity kernel.
 * Standards: UM_CORE_ENGINEERING_STANDARDS_V1 â€” naming / registration.
 *
 * No runtime behavior beyond immutable identity literals.
 */

/** Durable Core package identifier (machine ID). */
export const UM_CORE_PACKAGE_ID = "um.core" as const;

/** Foundation delivery phase for the contracts skeleton. */
export const UM_CORE_FOUNDATION_PHASE = "P1" as const;

/** Manifest validation foundation phase. */
export const UM_CORE_MANIFEST_VALIDATION_PHASE = "P2" as const;

/** Compliance engine foundation phase. */
export const UM_CORE_COMPLIANCE_ENGINE_PHASE = "P3" as const;

/** Platform registry foundation phase. */
export const UM_CORE_REGISTRY_FOUNDATION_PHASE = "P4" as const;

/** Capability registry foundation phase. */
export const UM_CORE_CAPABILITY_REGISTRY_PHASE = "P5" as const;

/** Event type registry foundation phase. */
export const UM_CORE_EVENT_TYPE_REGISTRY_PHASE = "P6" as const;

/** Event routing foundation phase. */
export const UM_CORE_EVENT_ROUTING_PHASE = "P7" as const;

/** Feature flag registry foundation phase. */
export const UM_CORE_FEATURE_FLAG_REGISTRY_PHASE = "P8" as const;

/** Dependency registry foundation phase. */
export const UM_CORE_DEPENDENCY_REGISTRY_PHASE = "P9" as const;

/** Health declaration catalog foundation phase. */
export const UM_CORE_HEALTH_DECLARATION_CATALOG_PHASE = "P10" as const;

/** Naming registry foundation phase. */
export const UM_CORE_NAMING_REGISTRY_PHASE = "P11" as const;

/** Aggregate registry facade foundation phase. */
export const UM_CORE_AGGREGATE_REGISTRY_FACADE_PHASE = "P12" as const;

/** Validator composition foundation phase. */
export const UM_CORE_VALIDATOR_COMPOSITION_PHASE = "P13" as const;

/** Flag evaluator foundation phase. */
export const UM_CORE_FLAG_EVALUATOR_PHASE = "P14" as const;

/** Capability asserter foundation phase. */
export const UM_CORE_CAPABILITY_ASSERTER_PHASE = "P15" as const;

/** Event publisher foundation phase. */
export const UM_CORE_EVENT_PUBLISHER_PHASE = "P16" as const;

/** Health reporter foundation phase. */
export const UM_CORE_HEALTH_REPORTER_PHASE = "P17" as const;

/** Health diagnostics join foundation phase. */
export const UM_CORE_HEALTH_DIAGNOSTICS_JOIN_PHASE = "P18" as const;

/** Dependency validator foundation phase. */
export const UM_CORE_DEPENDENCY_VALIDATOR_PHASE = "P19" as const;

/** Fleet health aggregation foundation phase. */
export const UM_CORE_FLEET_HEALTH_AGGREGATION_PHASE = "P20" as const;

/** SDK client factory foundation phase. */
export const UM_CORE_SDK_CLIENT_FACTORY_PHASE = "P21" as const;

/** Bounded health observation history foundation phase. */
export const UM_CORE_BOUNDED_HEALTH_HISTORY_PHASE = "P22" as const;


/** Human-readable package label (not a machine ID). */
export const UM_CORE_PACKAGE_LABEL = "UM Core Platform" as const;
