/**
 * Feature flag contracts (Standards §14 / Spec Ch.9).
 *
 * P1: interfaces only.
 * P8: pure in-memory flag catalog (no evaluation runtime).
 *
 * Policy law belongs to Core; meaning belongs to declaring platforms.
 * FLAG REGISTRATION IS NOT FLAG EVALUATION.
 */

import type { UmCapabilityId, UmFlagId, UmPlatformId } from "../identity/types";
import type { UmCapabilityRegistry } from "../capability/types";
import type { UmPlatformRegistry } from "../registry/interfaces";

export type UmFlagDefaultState = "on" | "off";

export type UmFlagRegistryFindingSeverity = "error" | "warning" | "info";

export interface UmFlagRegistryFinding {
  readonly code: string;
  readonly severity: UmFlagRegistryFindingSeverity;
  readonly message: string;
  readonly path?: string;
  readonly standardRef?: string;
}

/**
 * Flag catalog record (Standards §14.4).
 */
export interface UmFlagRecord {
  readonly flagId: UmFlagId;
  readonly ownerPlatformId: UmPlatformId;
  readonly ownerRef: string;
  readonly defaultState: UmFlagDefaultState;
  readonly linkedCapabilityIds: readonly UmCapabilityId[];
  readonly dangerElevated: boolean;
  /** Catalog metadata: every Core flag is a kill-switch candidate (Standards §14). */
  readonly killSwitch: true;
  readonly auditRequired: boolean;
  readonly description?: string;
  readonly registeredAt?: string;
}

/**
 * Declaration used to register a flag into the catalog.
 */
export interface UmFlagDeclaration {
  readonly flagId: UmFlagId;
  readonly ownerPlatformId: UmPlatformId;
  readonly ownerRef: string;
  readonly defaultState: UmFlagDefaultState;
  readonly linkedCapabilityIds: readonly UmCapabilityId[];
  readonly dangerElevated: boolean;
  readonly auditRequired: boolean;
  readonly description?: string;
}

export interface UmFlagRegistrationMetadata {
  readonly registeredAt?: string;
}

export interface UmFlagRegistrationInput {
  readonly flag: UmFlagDeclaration;
  readonly registration?: UmFlagRegistrationMetadata;
}

export interface UmFlagRegistrationResult {
  readonly ok: boolean;
  readonly flagId: UmFlagId;
  readonly record?: UmFlagRecord;
  readonly findings: readonly UmFlagRegistryFinding[];
}

/**
 * Flag catalog registry (Standards §14).
 */
export interface UmFlagRegistry {
  get(flagId: UmFlagId): UmFlagRecord | undefined;
  list(): readonly UmFlagRecord[];
  listByPlatform(platformId: UmPlatformId): readonly UmFlagRecord[];
  listByLinkedCapability(
    capabilityId: UmCapabilityId,
  ): readonly UmFlagRecord[];
  listByDangerElevated(dangerElevated: boolean): readonly UmFlagRecord[];
  has(flagId: UmFlagId): boolean;
  size(): number;
}

/**
 * P8 writable in-memory flag registry.
 * Catalog only — does not evaluate flags.
 */
export interface UmInMemoryFlagRegistry extends UmFlagRegistry {
  register(input: UmFlagRegistrationInput): UmFlagRegistrationResult;
  clear(): void;
}

export interface UmFlagRegistryDeps {
  readonly platforms: UmPlatformRegistry;
  /** Optional P5 capability catalog for linked-capability integrity. */
  readonly capabilities?: UmCapabilityRegistry;
}

/**
 * Evaluation context — intentionally abstract (no cohort vendor assumptions).
 * Used only by UmFlagEvaluator (NOT implemented in P8).
 */
export interface UmFlagEvaluationContext {
  readonly platformId?: UmPlatformId;
  readonly environmentRef?: string;
  readonly attributes?: Readonly<Record<string, string>>;
}

export interface UmFlagEvaluationRequest {
  readonly flagId: UmFlagId;
  readonly context?: UmFlagEvaluationContext;
}

export interface UmFlagEvaluationResult {
  readonly flagId: UmFlagId;
  readonly enabled: boolean;
  readonly reasonCode?: string;
  readonly source: "default" | "override" | "kill_switch" | "unknown";
}

/**
 * Flag evaluator — interface only (Standards: fail closed for elevated unknown).
 * P8 does NOT implement this.
 */
export interface UmFlagEvaluator {
  evaluate(request: UmFlagEvaluationRequest): UmFlagEvaluationResult;
  evaluateBatch(
    requests: readonly UmFlagEvaluationRequest[],
  ): readonly UmFlagEvaluationResult[];
}
