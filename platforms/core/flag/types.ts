/**
 * Feature flag contracts (Standards §14 / Spec Ch.9).
 *
 * Policy law belongs to Core; meaning belongs to declaring platforms.
 * No flag engine in P1.
 */

import type { UmCapabilityId, UmFlagId, UmPlatformId } from "../identity/types";

export type UmFlagDefaultState = "on" | "off";

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
  readonly killSwitch: true;
  readonly auditRequired: boolean;
  readonly description?: string;
}

/**
 * Evaluation context — intentionally abstract (no cohort vendor assumptions).
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
 * Flag catalog registry — interface only.
 */
export interface UmFlagRegistry {
  get(flagId: UmFlagId): UmFlagRecord | undefined;
  listByPlatform(platformId: UmPlatformId): readonly UmFlagRecord[];
}

/**
 * Flag evaluator — interface only (Standards: fail closed for elevated unknown).
 */
export interface UmFlagEvaluator {
  evaluate(request: UmFlagEvaluationRequest): UmFlagEvaluationResult;
  evaluateBatch(
    requests: readonly UmFlagEvaluationRequest[],
  ): readonly UmFlagEvaluationResult[];
}
