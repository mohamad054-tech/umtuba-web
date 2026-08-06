/**
 * UM Core package identity constants.
 *
 * Spec: UM_CORE_SPECIFICATION_V1 — Core identity kernel.
 * Standards: UM_CORE_ENGINEERING_STANDARDS_V1 — naming / registration.
 *
 * No runtime behavior beyond immutable identity literals.
 */

/** Durable Core package identifier (machine ID). */
export const UM_CORE_PACKAGE_ID = "um.core" as const;

/** Foundation delivery phase for the contracts skeleton. */
export const UM_CORE_FOUNDATION_PHASE = "P1" as const;

/** Manifest validation foundation phase. */
export const UM_CORE_MANIFEST_VALIDATION_PHASE = "P2" as const;

/** Human-readable package label (not a machine ID). */
export const UM_CORE_PACKAGE_LABEL = "UM Core Platform" as const;
