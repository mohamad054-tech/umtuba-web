/**
 * UM Games Hub Runtime Submit Outcome Local Apply Execution Precondition
 * Guard Contract Trusted V1 — pure fail-closed readiness classifier only.
 *
 * Evaluates whether an already-trusted local-apply plan may be considered
 * ready for a future local apply step after strict continuity checks against
 * the current runtime session and completion handoff, plus exact trusted-plan
 * consistency and existing lifecycle/finalization field inspection.
 *
 * Precondition / guard classification only — does not execute apply, mutate
 * runtime session or completion handoff, set handoff.applied to true, change
 * runtime lifecycle state, call Supabase, Submit, Start, or any RPC, open Hub
 * authority, permit reapply, or authorize execution.
 *
 * A ready result must not be inferred as:
 * - apply execution is authorized
 * - apply occurred
 * - Hub sync completed
 * - duplicate apply is globally impossible
 * - progress or achievements should mutate locally
 * - rewards or economy should be granted
 *
 * Distinction:
 * - Fail-closed (`ok: false`) for malformed, inconsistent, already-applied,
 *   rejected/ineligible/idempotent-replay plan, authority-flag, identity,
 *   or non-terminal lifecycle/finalization inconsistency inputs.
 * - Bounded blocked (`ok: true`, preconditionStatus: "blocked") only for
 *   explicit supported non-ready terminal states already defined by the
 *   Runtime contract: `abandoned` and `expired`.
 *
 * SQL remains the sole submit decision and mutation authority.
 * Existing trusted local-apply plan is the only trusted plan input.
 * Hub Runtime authority remains closed.
 */

import {
  GAMES_RESULT_DECISION_STATUSES,
  type GamesResultDecisionStatus,
  type GamesValidationResult,
} from "./gamesFoundation";
import {
  isGamesRuntimeLifecycleState,
  type GamesRuntimeLifecycleState,
} from "./gamesHubRuntime";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_ACKNOWLEDGMENT_STATUSES,
  type GamesRuntimeSubmitOutcomeAcknowledgmentStatus,
} from "./gamesHubRuntimeSubmitOutcomeAcknowledgment";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_APPLY_ELIGIBILITY_STATUSES,
  type GamesRuntimeSubmitOutcomeApplyEligibilityStatus,
} from "./gamesHubRuntimeSubmitOutcomeApplyEligibility";
import type { GamesRuntimeSubmitOutcomeLocalApplyPlan } from "./gamesHubRuntimeSubmitOutcomeLocalApplyPlan";
import { validateGameSessionId } from "./gamesSessions";

/**
 * Bounded precondition statuses. Classification only — not execution
 * permission, apply occurrence, or Hub authority.
 */
export const GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_PRECONDITION_STATUSES =
  ["ready", "blocked"] as const;

export type GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus =
  (typeof GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_PRECONDITION_STATUSES)[number];

/**
 * Bounded blocked reasons for successful non-ready classification.
 * Only explicit supported terminal non-ready Runtime lifecycle states.
 */
export const GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_PRECONDITION_BLOCKED_REASONS =
  ["lifecycle_abandoned", "lifecycle_expired"] as const;

export type GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionBlockedReason =
  (typeof GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_PRECONDITION_BLOCKED_REASONS)[number];

/**
 * Immutable Hub Runtime local-apply execution-precondition guard view.
 *
 * Readiness classification only — not apply execution, lifecycle transition,
 * handoff mutation, reapply permission, progress/achievement mutation,
 * reward/economy entitlement, Hub synchronization, or an
 * executor/callback/authority token.
 *
 * `preparesRuntimeApply` / `preparesHandoffApply` remain planning markers
 * mirrored from the trusted plan. `applied`, `mutatesRuntime`,
 * `mutatesHandoff`, `permitsReapply`, and `executesApply` are always
 * literal `false`. A `ready` status is not execution permission.
 */
export type GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard =
  Readonly<{
    runtimeSessionId: string;
    gameId: string;
    playerId: string;
    platformSessionId: string;
    resultId: string;
    preconditionStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus;
    blockedReason: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionBlockedReason | null;
    preparesRuntimeApply: true;
    preparesHandoffApply: true;
    applied: false;
    mutatesRuntime: false;
    mutatesHandoff: false;
    permitsReapply: false;
    executesApply: false;
  }>;

const PLAN_KEYS = [
  "runtimeSessionId",
  "gameId",
  "playerId",
  "platformSessionId",
  "resultId",
  "acknowledgmentStatus",
  "eligibilityStatus",
  "decisionStatus",
  "idempotentReplay",
  "preparesRuntimeApply",
  "preparesHandoffApply",
  "applied",
  "mutatesRuntime",
  "mutatesHandoff",
  "permitsReapply",
  "executesApply",
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
 * Exact trusted-plan consistency required for a ready or blocked guard:
 * eligibility, acknowledgment, decision, idempotentReplay, and prepares*
 * markers must align exactly with an accepted-fresh plan.
 */
function isConsistentAcceptedFreshPlan(
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus,
  eligibilityStatus: GamesRuntimeSubmitOutcomeApplyEligibilityStatus,
  decisionStatus: GamesResultDecisionStatus,
  idempotentReplay: boolean,
  preparesRuntimeApply: unknown,
  preparesHandoffApply: unknown
): boolean {
  return (
    eligibilityStatus === "eligible_accepted_fresh" &&
    acknowledgmentStatus === "accepted_fresh" &&
    decisionStatus === "accepted" &&
    idempotentReplay === false &&
    preparesRuntimeApply === true &&
    preparesHandoffApply === true
  );
}

/**
 * Structural validation of an already-trusted Hub Runtime local-apply plan.
 * Does not re-classify from eligibility / acknowledgment / observation inputs.
 */
function readTrustedLocalApplyPlan(
  raw: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyPlan> {
  if (!isPlainObject(raw)) {
    return fail("plan_invalid");
  }

  const allowed = new Set<string>(PLAN_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return fail("plan_invalid");
    }
  }

  for (const key of PLAN_KEYS) {
    if (!(key in raw)) {
      return fail("plan_invalid");
    }
  }

  if (typeof raw.runtimeSessionId !== "string" || raw.runtimeSessionId.length === 0) {
    return fail("plan_invalid");
  }
  if (typeof raw.gameId !== "string" || raw.gameId.length === 0) {
    return fail("plan_invalid");
  }
  if (typeof raw.playerId !== "string" || raw.playerId.length === 0) {
    return fail("plan_invalid");
  }

  const platformSessionId = validateGameSessionId(raw.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("plan_invalid");
  }

  const resultId = validateGameSessionId(raw.resultId);
  if (!resultId.ok) {
    return fail("plan_invalid");
  }

  if (!isAcknowledgmentStatus(raw.acknowledgmentStatus)) {
    return fail("unsupported_plan_status");
  }

  if (!isEligibilityStatus(raw.eligibilityStatus)) {
    return fail("unsupported_plan_status");
  }

  if (!isGamesResultDecisionStatus(raw.decisionStatus)) {
    return fail("inconsistent_plan_state");
  }

  if (typeof raw.idempotentReplay !== "boolean") {
    return fail("inconsistent_plan_state");
  }

  if (raw.preparesRuntimeApply !== true) {
    return fail("plan_prepares_runtime_apply_required");
  }
  if (raw.preparesHandoffApply !== true) {
    return fail("plan_prepares_handoff_apply_required");
  }

  if (raw.applied !== false) {
    return fail("plan_invalid");
  }
  if (raw.mutatesRuntime !== false) {
    return fail("plan_invalid");
  }
  if (raw.mutatesHandoff !== false) {
    return fail("plan_invalid");
  }
  if (raw.permitsReapply !== false) {
    return fail("plan_invalid");
  }
  if (raw.executesApply !== false) {
    return fail("plan_invalid");
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

/**
 * Structural checks for fields this guard reads from the runtime session.
 * Does not invent lifecycle transitions or re-validate the full session
 * factory contract.
 */
function readRuntimeSessionFields(
  raw: unknown
): GamesValidationResult<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string | null;
  lifecycleState: GamesRuntimeLifecycleState;
  finalized: boolean;
}> {
  if (!isPlainObject(raw)) {
    return fail("session_required");
  }

  if (typeof raw.runtimeSessionId !== "string" || raw.runtimeSessionId.length === 0) {
    return fail("session_invalid");
  }
  if (typeof raw.gameId !== "string" || raw.gameId.length === 0) {
    return fail("session_invalid");
  }
  if (typeof raw.playerId !== "string" || raw.playerId.length === 0) {
    return fail("session_invalid");
  }

  if (
    raw.platformSessionId !== null &&
    raw.platformSessionId !== undefined &&
    typeof raw.platformSessionId !== "string"
  ) {
    return fail("session_invalid");
  }

  if (!isGamesRuntimeLifecycleState(raw.lifecycleState)) {
    return fail("session_invalid");
  }

  if (typeof raw.finalized !== "boolean") {
    return fail("session_invalid");
  }

  return {
    ok: true,
    value: {
      runtimeSessionId: raw.runtimeSessionId,
      gameId: raw.gameId,
      playerId: raw.playerId,
      platformSessionId:
        typeof raw.platformSessionId === "string" ? raw.platformSessionId : null,
      lifecycleState: raw.lifecycleState,
      finalized: raw.finalized,
    },
  };
}

/**
 * Structural checks for fields this guard reads from the completion handoff.
 */
function readCompletionHandoffFields(
  raw: unknown
): GamesValidationResult<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  applied: unknown;
}> {
  if (!isPlainObject(raw)) {
    return fail("handoff_required");
  }

  if (typeof raw.runtimeSessionId !== "string" || raw.runtimeSessionId.length === 0) {
    return fail("handoff_invalid");
  }
  if (typeof raw.gameId !== "string" || raw.gameId.length === 0) {
    return fail("handoff_invalid");
  }
  if (typeof raw.playerId !== "string" || raw.playerId.length === 0) {
    return fail("handoff_invalid");
  }

  if (!("applied" in raw)) {
    return fail("handoff_invalid");
  }

  return {
    ok: true,
    value: {
      runtimeSessionId: raw.runtimeSessionId,
      gameId: raw.gameId,
      playerId: raw.playerId,
      applied: raw.applied,
    },
  };
}

function freezeGuard(input: {
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  preconditionStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus;
  blockedReason: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionBlockedReason | null;
}): GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard {
  return Object.freeze({
    runtimeSessionId: input.runtimeSessionId,
    gameId: input.gameId,
    playerId: input.playerId,
    platformSessionId: input.platformSessionId,
    resultId: input.resultId,
    preconditionStatus: input.preconditionStatus,
    blockedReason: input.blockedReason,
    preparesRuntimeApply: true as const,
    preparesHandoffApply: true as const,
    applied: false as const,
    mutatesRuntime: false as const,
    mutatesHandoff: false as const,
    permitsReapply: false as const,
    executesApply: false as const,
  });
}

/**
 * Pure fail-closed classifier: trusted local-apply plan + current runtime /
 * handoff → execution-precondition guard.
 *
 * Continuity uses only fields guaranteed by current contracts:
 * runtimeSessionId, gameId, playerId, platformSessionId across runtime
 * session, completion handoff, and trusted plan.
 *
 * Lifecycle / finalization uses only explicit existing contract fields:
 * - ready: lifecycleState === "completed" && finalized === true
 * - blocked: lifecycleState === "abandoned" | "expired" (supported non-ready)
 * - fail-closed: non-terminal states or finalization inconsistency
 *
 * Does not mutate inputs, execute apply, change lifecycle, set
 * handoff.applied, permit reapply, authorize execution, or call RPC.
 */
export function evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedLocalApplyPlan: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard> {
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
    trustedLocalApplyPlan === null ||
    trustedLocalApplyPlan === undefined ||
    typeof trustedLocalApplyPlan !== "object"
  ) {
    return fail("plan_invalid");
  }

  const sessionFields = readRuntimeSessionFields(runtimeSession);
  if (!sessionFields.ok) {
    return sessionFields;
  }

  const handoffFields = readCompletionHandoffFields(completionHandoff);
  if (!handoffFields.ok) {
    return handoffFields;
  }

  const planResult = readTrustedLocalApplyPlan(trustedLocalApplyPlan);
  if (!planResult.ok) {
    return planResult;
  }

  const session = sessionFields.value;
  const handoffView = handoffFields.value;
  const plan = planResult.value;

  if (
    session.platformSessionId === null ||
    session.platformSessionId === undefined
  ) {
    return fail("platform_session_id_required");
  }

  const platformSessionId = validateGameSessionId(session.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("platform_session_id_required");
  }

  if (session.runtimeSessionId !== handoffView.runtimeSessionId) {
    return fail("runtime_session_id_mismatch");
  }

  if (session.gameId !== handoffView.gameId) {
    return fail("session_game_mismatch");
  }

  if (session.playerId !== handoffView.playerId) {
    return fail("session_owner_mismatch");
  }

  if (plan.runtimeSessionId !== session.runtimeSessionId) {
    return fail("plan_identity_mismatch");
  }

  if (plan.gameId !== session.gameId) {
    return fail("plan_identity_mismatch");
  }

  if (plan.playerId !== session.playerId) {
    return fail("plan_identity_mismatch");
  }

  if (plan.platformSessionId !== platformSessionId.value) {
    return fail("platform_session_id_mismatch");
  }

  if (handoffView.applied !== false) {
    return fail("handoff_already_applied");
  }

  if (plan.eligibilityStatus === "ineligible_rejected") {
    return fail("ineligible_rejected");
  }

  if (plan.eligibilityStatus === "ineligible_idempotent_replay") {
    return fail("ineligible_idempotent_replay");
  }

  if (plan.eligibilityStatus !== "eligible_accepted_fresh") {
    return fail("unsupported_plan_status");
  }

  if (
    !isConsistentAcceptedFreshPlan(
      plan.acknowledgmentStatus,
      plan.eligibilityStatus,
      plan.decisionStatus,
      plan.idempotentReplay,
      plan.preparesRuntimeApply,
      plan.preparesHandoffApply
    )
  ) {
    return fail("inconsistent_plan_state");
  }

  const identity = {
    runtimeSessionId: session.runtimeSessionId,
    gameId: session.gameId,
    playerId: session.playerId,
    platformSessionId: platformSessionId.value,
    resultId: plan.resultId,
  };

  // Explicit supported non-ready terminal states → bounded blocked.
  if (session.lifecycleState === "abandoned") {
    if (session.finalized !== true) {
      return fail("lifecycle_finalization_inconsistent");
    }
    return {
      ok: true,
      value: freezeGuard({
        ...identity,
        preconditionStatus: "blocked",
        blockedReason: "lifecycle_abandoned",
      }),
    };
  }

  if (session.lifecycleState === "expired") {
    if (session.finalized !== true) {
      return fail("lifecycle_finalization_inconsistent");
    }
    return {
      ok: true,
      value: freezeGuard({
        ...identity,
        preconditionStatus: "blocked",
        blockedReason: "lifecycle_expired",
      }),
    };
  }

  // Ready only for the existing completed + finalized contract pair.
  if (session.lifecycleState === "completed") {
    if (session.finalized !== true) {
      return fail("lifecycle_finalization_inconsistent");
    }
    return {
      ok: true,
      value: freezeGuard({
        ...identity,
        preconditionStatus: "ready",
        blockedReason: null,
      }),
    };
  }

  // Non-terminal existing states are incompatible with future local apply.
  return fail("lifecycle_incompatible");
}
