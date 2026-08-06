/**
 * Dependency declaration contracts (Standards §7 / Spec Ch.8).
 */

import type { UmCapabilityId, UmCoreId, UmPlatformId } from "../identity/types";

export type UmDependencyTargetKind = "platform" | "capability" | "peer_kernel";

export type UmDependencyStrength = "required" | "optional";

/**
 * One dependency requirement entry (Standards §7.4).
 */
export interface UmDependencyRequirement {
  readonly targetKind: UmDependencyTargetKind;
  readonly targetId: UmCoreId;
  readonly strength: UmDependencyStrength;
  /** Opaque compatibility expression (e.g. version range string) — not evaluated in P1. */
  readonly minCompatibility?: string;
  readonly reason: string;
}

/**
 * Logical dependency edge for graph review (no graph engine in P1).
 */
export interface UmDependencyEdge {
  readonly fromPlatformId: UmPlatformId;
  readonly requirement: UmDependencyRequirement;
}

/**
 * Registry/query surface for declared dependencies — interface only.
 */
export interface UmDependencyRegistry {
  listRequirements(platformId: UmPlatformId): readonly UmDependencyRequirement[];
  listDependents(targetId: UmCoreId): readonly UmDependencyEdge[];
}

/**
 * Validator surface for dependency law — interface only.
 */
export interface UmDependencyValidator {
  /**
   * Validate requires[] referential integrity and SoT cycle policy.
   * Implementations belong to later phases.
   */
  validateRequirements(
    platformId: UmPlatformId,
    requirements: readonly UmDependencyRequirement[],
  ): UmDependencyValidationResult;
}

export interface UmDependencyValidationResult {
  readonly ok: boolean;
  readonly findings: readonly UmDependencyValidationFinding[];
}

export interface UmDependencyValidationFinding {
  readonly code: string;
  readonly message: string;
  readonly targetId?: UmCoreId;
  readonly relatedCapabilityId?: UmCapabilityId;
}
