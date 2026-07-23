/**
 * UM Learning OS — Result Policy Completion V1.
 *
 * Completes show_result_policy gates for after_close + manual release.
 * Aggregate learner payload remains exactly as Result Delivery V1.
 * No keys, per-question correctness, Progress, grading, Games, or UM Points.
 */

/** Policies that can unlock aggregate visibility when gates pass. */
export const LEARNING_RESULT_POLICY_UNLOCKABLE = [
  "immediately",
  "after_submit",
  "after_close",
  "manual",
] as const;
export type LearningResultPolicyUnlockable =
  (typeof LEARNING_RESULT_POLICY_UNLOCKABLE)[number];

/** Still fail-closed with no unlock path. */
export const LEARNING_RESULT_POLICY_FAIL_CLOSED = ["never"] as const;
export type LearningResultPolicyFailClosed =
  (typeof LEARNING_RESULT_POLICY_FAIL_CLOSED)[number];

export const LEARNING_RESULT_POLICY_RPCS = {
  setResultsAvailableAt: "set_learning_activity_results_available_at",
  releaseAttemptResult: "release_learning_attempt_result",
  getMyResult: "get_my_learning_attempt_result",
} as const;

export const LEARNING_RESULT_POLICY_INTERNAL_HELPERS = {
  releaseGuardImmutable: "learning_attempt_result_release_guard_immutable",
} as const;

export type LearningResultPolicyVisibilityGate = {
  attemptStatus: "active" | "submitted" | "expired" | "cancelled";
  policy: string;
  /** ISO timestamptz or null — after_close only. */
  resultsAvailableAt: string | null;
  hasManualRelease: boolean;
  nowMs?: number;
};

/**
 * Whether the show_result_policy gate is unlocked.
 * Non-submitted attempts never unlock (even if close time or release exists).
 */
export function isLearningResultPolicyUnlocked(
  gate: LearningResultPolicyVisibilityGate
): boolean {
  if (gate.attemptStatus !== "submitted") return false;

  switch (gate.policy) {
    case "immediately":
    case "after_submit":
      return true;
    case "after_close": {
      if (!gate.resultsAvailableAt) return false;
      const at = Date.parse(gate.resultsAvailableAt);
      if (Number.isNaN(at)) return false;
      const now = gate.nowMs ?? Date.now();
      return now >= at;
    }
    case "manual":
      return gate.hasManualRelease === true;
    case "never":
    default:
      return false;
  }
}

/**
 * Whether results_available_at may still be changed.
 * Once reached (now >= available_at), immutable.
 */
export function canChangeResultsAvailableAt(
  previousIso: string | null,
  nowMs: number = Date.now()
): boolean {
  if (previousIso == null) return true;
  const prev = Date.parse(previousIso);
  if (Number.isNaN(prev)) return false;
  return nowMs < prev;
}

/**
 * Postponing or clearing after the timestamp was reached is forbidden.
 * Clearing is always forbidden via RPC (required non-null).
 */
export function isResultsAvailableAtPostponementForbidden(
  previousIso: string | null,
  nextIso: string,
  nowMs: number = Date.now()
): boolean {
  if (previousIso == null) return false;
  const prev = Date.parse(previousIso);
  const next = Date.parse(nextIso);
  if (Number.isNaN(prev) || Number.isNaN(next)) return true;
  if (nowMs < prev) return false; // not yet reached — change allowed
  // reached: only identical value is ok (no-op)
  return next !== prev;
}
