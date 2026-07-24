/**
 * UM Games Hub Runtime Submit Outcome Local Apply Plan Contract Trusted V1 —
 * pure fail-closed local-apply plan/intent builder only.
 *
 * Builds a bounded future-intent plan from an already-trusted apply-
 * eligibility view after strict continuity checks against the runtime
 * session and completion handoff.
 *
 * Plan/intent only — does not execute apply, mutate runtime session or
 * completion handoff, set handoff.applied to true, change runtime
 * lifecycle state, call Supabase, Submit, Start, or any RPC, open Hub
 * authority, or permit reapply.
 *
 * `preparesRuntimeApply` / `preparesHandoffApply` are planning metadata
 * only and must not be inferred as apply authority.
 *
 * Must not infer from a valid plan:
 * - apply occurred
 * - apply may run without additional authority
 * - Hub sync completed
 * - progress or achievements should be mutated locally
 * - rewards or economy should be granted
 *
 * Must not allow a plan for rejected or idempotent-replay outcomes.
 *
 * SQL remains the sole submit decision and mutation authority.
 * Existing apply-eligibility view is the only trusted classification input.
 * Hub Runtime authority remains closed.
 */

import {
  GAMES_RESULT_DECISION_STATUSES,
  type GamesResultDecisionStatus,
  type GamesValidationResult,
} from "./gamesFoundation";
import type {
  GamesRuntimeCompletionHandoff,
  GamesRuntimeSessionContract,
} from "./gamesHubRuntime";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_ACKNOWLEDGMENT_STATUSES,
  type GamesRuntimeSubmitOutcomeAcknowledgmentStatus,
} from "./gamesHubRuntimeSubmitOutcomeAcknowledgment";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_APPLY_ELIGIBILITY_STATUSES,
  type GamesRuntimeSubmitOutcomeApplyEligibility,
  type GamesRuntimeSubmitOutcomeApplyEligibilityStatus,
} from "./gamesHubRuntimeSubmitOutcomeApplyEligibility";
import { validateGameSessionId } from "./gamesSessions";

/**
 * Immutable Hub Runtime local-apply plan/intent view.
 *
 * Metadata / future-intent only — not apply execution, lifecycle
 * transition, handoff mutation, reapply permission, progress/achievement
 * mutation, reward/economy entitlement, Hub synchronization, or an
 * executor/callback/authority token.
 *
 * `preparesRuntimeApply` / `preparesHandoffApply` are planning markers
 * only. `applied`, `mutatesRuntime`, `mutatesHandoff`, `permitsReapply`,
 * and `executesApply` are always literal `false`.
 */
export type GamesRuntimeSubmitOutcomeLocalApplyPlan = Readonly<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus;
  eligibilityStatus: GamesRuntimeSubmitOutcomeApplyEligibilityStatus;
  decisionStatus: GamesResultDecisionStatus;
  idempotentReplay: boolean;
  preparesRuntimeApply: true;
  preparesHandoffApply: true;
  applied: false;
  mutatesRuntime: false;
  mutatesHandoff: false;
  permitsReapply: false;
  executesApply: false;
}>;

const ELIGIBILITY_KEYS = [
  "runtimeSessionId",
  "gameId",
  "playerId",
  "platformSessionId",
  "resultId",
  "acknowledgmentStatus",
  "eligibilityStatus",
  "decisionStatus",
  "idempotentReplay",
  "applied",
  "mutatesRuntime",
  "mutatesHandoff",
  "permitsReapply",
] as const;

function fail(
  reason: string
): Extract<GamesValidationResult<never>, { ok: false }> {
  return { ok: false, reason };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isGamesResultDecisionStatus(
  value: unknown
): value is GamesResultDecisionStatus {
  return (
    typeof value === "string" &&
    (GAMES_RESULT_DECISION_STATUSES as readonly string[]).includes(value)
  );
}

function isAcknowledgmentStatus(
  value: unknown
): value is GamesRuntimeSubmitOutcomeAcknowledgmentStatus {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_ACKNOWLEDGMENT_STATUSES as readonly string[]
    ).includes(value)
  );
}

function isEligibilityStatus(
  value: unknown
): value is GamesRuntimeSubmitOutcomeApplyEligibilityStatus {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_APPLY_ELIGIBILITY_STATUSES as readonly string[]
    ).includes(value)
  );
}

/**
 * Consistency required for an accepted-fresh plan input: eligibility,
 * acknowledgment, decision, and idempotentReplay must align exactly.
 */
function isConsistentAcceptedFreshEligibility(
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus,
  eligibilityStatus: GamesRuntimeSubmitOutcomeApplyEligibilityStatus,
  decisionStatus: GamesResultDecisionStatus,
  idempotentReplay: boolean
): boolean {
  return (
    eligibilityStatus === "eligible_accepted_fresh" &&
    acknowledgmentStatus === "accepted_fresh" &&
    decisionStatus === "accepted" &&
    idempotentReplay === false
  );
}

/**
 * Structural validation of an already-trusted Hub Runtime apply-eligibility
 * view. Does not re-parse Platform snake_case submit responses or
 * re-classify from raw acknowledgment / observation inputs.
 */
function readTrustedApplyEligibility(
  raw: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeApplyEligibility> {
  if (!isPlainObject(raw)) {
    return fail("eligibility_invalid");
  }

  const allowed = new Set<string>(ELIGIBILITY_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return fail("eligibility_invalid");
    }
  }

  for (const key of ELIGIBILITY_KEYS) {
    if (!(key in raw)) {
      return fail("eligibility_invalid");
    }
  }

  if (typeof raw.runtimeSessionId !== "string" || raw.runtimeSessionId.length === 0) {
    return fail("eligibility_invalid");
  }
  if (typeof raw.gameId !== "string" || raw.gameId.length === 0) {
    return fail("eligibility_invalid");
  }
  if (typeof raw.playerId !== "string" || raw.playerId.length === 0) {
    return fail("eligibility_invalid");
  }

  const platformSessionId = validateGameSessionId(raw.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("eligibility_invalid");
  }

  const resultId = validateGameSessionId(raw.resultId);
  if (!resultId.ok) {
    return fail("eligibility_invalid");
  }

  if (!isAcknowledgmentStatus(raw.acknowledgmentStatus)) {
    return fail("unsupported_eligibility_status");
  }

  if (!isEligibilityStatus(raw.eligibilityStatus)) {
    return fail("unsupported_eligibility_status");
  }

  if (!isGamesResultDecisionStatus(raw.decisionStatus)) {
    return fail("inconsistent_eligibility_state");
  }

  if (typeof raw.idempotentReplay !== "boolean") {
    return fail("inconsistent_eligibility_state");
  }

  if (raw.applied !== false) {
    return fail("eligibility_invalid");
  }
  if (raw.mutatesRuntime !== false) {
    return fail("eligibility_invalid");
  }
  if (raw.mutatesHandoff !== false) {
    return fail("eligibility_invalid");
  }
  if (raw.permitsReapply !== false) {
    return fail("eligibility_invalid");
  }

  return {
    ok: true,
    value: Object.freeze({
      runtimeSessionId: raw.runtimeSessionId,
      gameId: raw.gameId,
      playerId: raw.playerId,
      platformSessionId: platformSessionId.value,
      resultId: resultId.value,
      acknowledgmentStatus: raw.acknowledgmentStatus,
      eligibilityStatus: raw.eligibilityStatus,
      decisionStatus: raw.decisionStatus,
      idempotentReplay: raw.idempotentReplay,
      applied: false as const,
      mutatesRuntime: false as const,
      mutatesHandoff: false as const,
      permitsReapply: false as const,
    }),
  };
}

/**
 * Pure fail-closed builder: trusted apply-eligibility → local-apply plan.
 *
 * Continuity uses only fields guaranteed by current contracts:
 * runtimeSessionId, gameId, playerId, platformSessionId across runtime
 * session, completion handoff, and apply-eligibility.
 *
 * Accepts only eligible_accepted_fresh with exact accepted-fresh
 * consistency. Rejects rejected and idempotent-replay eligibility
 * fail-closed. Does not mutate inputs, execute apply, change lifecycle,
 * set handoff.applied, permit reapply, or call RPC.
 */
export function buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedApplyEligibility: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyPlan> {
  if (
    runtimeSession === null ||
    runtimeSession === undefined ||
    typeof runtimeSession !== "object"
  ) {
    return fail("session_required");
  }

  if (
    completionHandoff === null ||
    completionHandoff === undefined ||
    typeof completionHandoff !== "object"
  ) {
    return fail("handoff_required");
  }

  if (
    trustedApplyEligibility === null ||
    trustedApplyEligibility === undefined ||
    typeof trustedApplyEligibility !== "object"
  ) {
    return fail("eligibility_invalid");
  }

  const eligibilityResult = readTrustedApplyEligibility(
    trustedApplyEligibility
  );
  if (!eligibilityResult.ok) {
    return eligibilityResult;
  }

  const runtime = runtimeSession as GamesRuntimeSessionContract;
  const handoff = completionHandoff as GamesRuntimeCompletionHandoff;
  const applyEligibility = eligibilityResult.value;

  if (
    runtime.platformSessionId === null ||
    runtime.platformSessionId === undefined
  ) {
    return fail("platform_session_id_required");
  }

  const platformSessionId = validateGameSessionId(runtime.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("platform_session_id_required");
  }

  if (runtime.runtimeSessionId !== handoff.runtimeSessionId) {
    return fail("runtime_session_id_mismatch");
  }

  if (runtime.gameId !== handoff.gameId) {
    return fail("session_game_mismatch");
  }

  if (runtime.playerId !== handoff.playerId) {
    return fail("session_owner_mismatch");
  }

  if (applyEligibility.runtimeSessionId !== runtime.runtimeSessionId) {
    return fail("eligibility_identity_mismatch");
  }

  if (applyEligibility.gameId !== runtime.gameId) {
    return fail("eligibility_identity_mismatch");
  }

  if (applyEligibility.playerId !== runtime.playerId) {
    return fail("eligibility_identity_mismatch");
  }

  if (applyEligibility.platformSessionId !== platformSessionId.value) {
    return fail("platform_session_id_mismatch");
  }

  if (applyEligibility.eligibilityStatus === "ineligible_rejected") {
    return fail("ineligible_rejected");
  }

  if (applyEligibility.eligibilityStatus === "ineligible_idempotent_replay") {
    return fail("ineligible_idempotent_replay");
  }

  if (applyEligibility.eligibilityStatus !== "eligible_accepted_fresh") {
    return fail("unsupported_eligibility_status");
  }

  if (
    !isConsistentAcceptedFreshEligibility(
      applyEligibility.acknowledgmentStatus,
      applyEligibility.eligibilityStatus,
      applyEligibility.decisionStatus,
      applyEligibility.idempotentReplay
    )
  ) {
    return fail("inconsistent_eligibility_state");
  }

  return {
    ok: true,
    value: Object.freeze({
      runtimeSessionId: runtime.runtimeSessionId,
      gameId: runtime.gameId,
      playerId: runtime.playerId,
      platformSessionId: platformSessionId.value,
      resultId: applyEligibility.resultId,
      acknowledgmentStatus: applyEligibility.acknowledgmentStatus,
      eligibilityStatus: applyEligibility.eligibilityStatus,
      decisionStatus: applyEligibility.decisionStatus,
      idempotentReplay: applyEligibility.idempotentReplay,
      preparesRuntimeApply: true as const,
      preparesHandoffApply: true as const,
      applied: false as const,
      mutatesRuntime: false as const,
      mutatesHandoff: false as const,
      permitsReapply: false as const,
      executesApply: false as const,
    }),
  };
}
