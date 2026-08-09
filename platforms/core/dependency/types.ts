/**
 * Dependency declaration contracts (Standards §7 / Spec Ch.8).
 *
 * P1: interfaces only.
 * P9: pure in-memory dependency edge catalog (no runtime resolution).
 *
 * DEPENDENCY REGISTRATION IS NOT DEPENDENCY RESOLUTION.
 */

import type { UmCapabilityId, UmCoreId, UmPlatformId } from "../identity/types";
import type { UmCapabilityRegistry } from "../capability/types";
import type { UmPlatformRegistry } from "../registry/interfaces";

export type UmDependencyTargetKind = "platform" | "capability" | "peer_kernel";

export type UmDependencyStrength = "required" | "optional";

/**
 * One dependency requirement entry (Standards §7.4).
 */
export interface UmDependencyRequirement {
  readonly targetKind: UmDependencyTargetKind;
  readonly targetId: UmCoreId;
  readonly strength: UmDependencyStrength;
  /** Opaque compatibility expression — pass-through only (not evaluated). */
  readonly minCompatibility?: string;
  readonly reason: string;
}

/**
 * Logical dependency edge for graph review (no runtime resolver in P9).
 */
export interface UmDependencyEdge {
  readonly fromPlatformId: UmPlatformId;
  readonly requirement: UmDependencyRequirement;
}

/**
 * Deterministic edge identity:
 * `${fromPlatformId}=>${targetKind}:${targetId}:${strength}`
 */
export type UmDependencyEdgeId = string;

export type UmDependencyRegistryFindingSeverity = "error" | "warning" | "info";

export interface UmDependencyRegistryFinding {
  readonly code: string;
  readonly severity: UmDependencyRegistryFindingSeverity;
  readonly message: string;
  readonly path?: string;
  readonly standardRef?: string;
}

/**
 * Catalog row for a declared dependency edge (heap only in P9).
 */
export interface UmDependencyRecord {
  readonly edgeId: UmDependencyEdgeId;
  readonly fromPlatformId: UmPlatformId;
  readonly targetKind: UmDependencyTargetKind;
  readonly targetId: UmCoreId;
  readonly strength: UmDependencyStrength;
  readonly reason: string;
  readonly minCompatibility?: string;
  readonly registeredAt?: string;
}

/**
 * Declaration used to register a dependency edge into the catalog.
 */
export interface UmDependencyDeclaration {
  readonly fromPlatformId: UmPlatformId;
  readonly targetKind: UmDependencyTargetKind;
  readonly targetId: UmCoreId;
  readonly strength: UmDependencyStrength;
  readonly reason: string;
  readonly minCompatibility?: string;
}

export interface UmDependencyRegistrationMetadata {
  readonly registeredAt?: string;
}

export interface UmDependencyRegistrationInput {
  readonly dependency: UmDependencyDeclaration;
  readonly registration?: UmDependencyRegistrationMetadata;
}

export interface UmDependencyRegistrationResult {
  readonly ok: boolean;
  readonly edgeId: UmDependencyEdgeId;
  readonly record?: UmDependencyRecord;
  readonly findings: readonly UmDependencyRegistryFinding[];
}

/**
 * Registry/query surface for declared dependencies (Standards §7).
 */
export interface UmDependencyRegistry {
  get(edgeId: UmDependencyEdgeId): UmDependencyRecord | undefined;
  list(): readonly UmDependencyRecord[];
  listRequirements(platformId: UmPlatformId): readonly UmDependencyRequirement[];
  listDependents(targetId: UmCoreId): readonly UmDependencyEdge[];
  listByTargetKind(targetKind: UmDependencyTargetKind): readonly UmDependencyRecord[];
  listByStrength(strength: UmDependencyStrength): readonly UmDependencyRecord[];
  has(edgeId: UmDependencyEdgeId): boolean;
  size(): number;
}

/**
 * P9 writable in-memory dependency registry.
 * Catalog only — does not resolve, install, probe, or orchestrate.
 */
export interface UmInMemoryDependencyRegistry extends UmDependencyRegistry {
  register(input: UmDependencyRegistrationInput): UmDependencyRegistrationResult;
  clear(): void;
}

export interface UmDependencyRegistryDeps {
  readonly platforms: UmPlatformRegistry;
  /** Optional P5 capability catalog for capability-target integrity. */
  readonly capabilities?: UmCapabilityRegistry;
}

/**
 * Explicit DI bag for the in-memory dependency validator (P19).
 * Caller owns registries; validator borrows read-only references.
 */
export interface UmDependencyValidatorDeps {
  readonly platforms: UmPlatformRegistry;
  /** Optional P5 capability catalog for capability-target integrity. */
  readonly capabilities?: UmCapabilityRegistry;
  /**
   * Optional P9 edge catalog for required-platform cycle SoT against
   * already-admitted edges. Omitted → cycle check uses only the candidate
   * requirements (self-edges / intra-list prospective edges from this owner).
   */
  readonly dependencies?: UmDependencyRegistry;
}

/**
 * Validator surface for dependency requirement law (P19).
 *
 * Pure in-memory requirement review — not P13 completeness/drift, not catalog RI,
 * not registration mutation, not resolution / version solving.
 */
export interface UmDependencyValidator {
  /**
   * Validate a candidate requires[] for referential integrity and SoT
   * required-platform cycle policy. Result-returning; never throws.
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
