/**
 * Capability compatibility matrix contracts (UM Core foundation).
 *
 * Pure declaration/presence review over P4 platform catalogs + optional P5
 * capability registry + optional P9 dependency catalog.
 *
 * CAPABILITY COMPATIBILITY IS NOT RUNTIME HEALTH.
 * CAPABILITY COMPATIBILITY IS NOT LIFECYCLE READINESS.
 * CAPABILITY COMPATIBILITY IS NOT SERVICE DISCOVERY.
 * CAPABILITY COMPATIBILITY IS NOT P15 ASSERTION / FLAG EVALUATION.
 * minCompatibility strings are NEVER evaluated (pass-through only elsewhere).
 *
 * @see UM_CORE_SPECIFICATION_V1
 * @see UM_CORE_ENGINEERING_STANDARDS_V1 (§4 capability / §7 dependency)
 */

import type { UmCapabilityId, UmPlatformId } from "../identity/types";
import type { UmCapabilityRegistry } from "./types";
import type { UmDependencyRegistry } from "../dependency/types";
import type { UmPlatformRegistry } from "../registry/interfaces";

/**
 * Local foundation phase constant — packageIdentity wiring deferred to avoid
 * shared-export collisions with parallel Core lanes.
 */
export const UM_CORE_PLATFORM_CAPABILITY_COMPATIBILITY_PHASE = "P24" as const;

export type UmCapabilityCompatibilityStatus =
  | "COMPATIBLE"
  | "INCOMPATIBLE";

export type UmCapabilityCompatibilityFindingSeverity =
  | "error"
  | "warning"
  | "info";

export interface UmCapabilityCompatibilityFinding {
  readonly code: string;
  readonly severity: UmCapabilityCompatibilityFindingSeverity;
  readonly message: string;
  readonly path?: string;
  readonly capabilityId?: UmCapabilityId;
  readonly standardRef?: string;
}

/**
 * One deterministic compatibility result for a platform + required set.
 */
export interface UmCapabilityCompatibilityResult {
  readonly platformId: UmPlatformId;
  readonly status: UmCapabilityCompatibilityStatus;
  readonly registered: boolean;
  /** Capabilities declared by the registered platform catalog (P4). */
  readonly declaredCapabilityIds: readonly UmCapabilityId[];
  /** Required capability ids under review (explicit or dependency-derived). */
  readonly requiredCapabilityIds: readonly UmCapabilityId[];
  /** Required ids that failed the active satisfaction rule. */
  readonly missingRequiredCapabilityIds: readonly UmCapabilityId[];
  readonly findings: readonly UmCapabilityCompatibilityFinding[];
}

/**
 * Matrix cell: does platform declare capability?
 * Foundation surface only — no runtime probes.
 */
export interface UmCapabilityCompatibilityMatrixCell {
  readonly platformId: UmPlatformId;
  readonly capabilityId: UmCapabilityId;
  readonly declared: boolean;
}

/**
 * Deterministic declaration matrix over registered platforms × known capability ids.
 */
export interface UmCapabilityCompatibilityMatrix {
  readonly platformIds: readonly UmPlatformId[];
  readonly capabilityIds: readonly UmCapabilityId[];
  readonly cells: readonly UmCapabilityCompatibilityMatrixCell[];
  readonly rows: readonly UmCapabilityCompatibilityResult[];
}

export interface UmCapabilityCompatibilityDeps {
  readonly platforms: UmPlatformRegistry;
  /** Optional P5 catalog — preferred source for "required capability exists". */
  readonly capabilities?: UmCapabilityRegistry;
  /** Optional P9 catalog — preferred source for consumer required capability deps. */
  readonly dependencies?: UmDependencyRegistry;
}

/**
 * Pure in-process capability compatibility evaluator.
 * Read-only over injected catalogs; never mutates, networks, or probes.
 */
export interface UmCapabilityCompatibilityEvaluator {
  /** True when a registered platform declares the capability in its P4 catalog. */
  platformDeclaresCapability(
    platformId: string,
    capabilityId: string,
  ): boolean;

  /**
   * True when the capability exists in P5 (preferred) or is declared by any
   * registered platform catalog when P5 is not supplied.
   */
  requiredCapabilityExists(capabilityId: string): boolean;

  /**
   * Provider-side compatibility: platform must declare every required id.
   * Unknown platform → INCOMPATIBLE (fail closed).
   */
  evaluatePlatformProvides(
    platformId: string,
    requiredCapabilityIds: readonly string[],
  ): UmCapabilityCompatibilityResult;

  /**
   * Consumer-side compatibility: platform's required capability dependencies
   * (strength=required, targetKind=capability) must exist.
   * Unknown platform → INCOMPATIBLE (fail closed).
   */
  evaluatePlatformRequirements(
    platformId: string,
  ): UmCapabilityCompatibilityResult;

  /**
   * Declaration matrix for all registered platforms against the union of
   * declared + registered capability ids, plus consumer requirement rows.
   */
  evaluateMatrix(): UmCapabilityCompatibilityMatrix;
}
