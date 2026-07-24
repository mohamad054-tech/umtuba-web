/**
 * UM Games Hub Runtime Submit Outcome Local Apply Execution Authorization
 * Contract Trusted V1 — pure fail-closed, token-less authorization classifier
 * only.
 *
 * Classifies whether an already-trusted local-apply plan and ready
 * precondition guard may be considered authorized for a future local apply
 * step after strict continuity checks against the current runtime session and
 * completion handoff, plus exact trusted-plan and trusted-guard consistency.
 *
 * Authorization classification only — does not execute apply, mutate runtime
 * session or completion handoff, set handoff.applied to true, change runtime
 * lifecycle state, return a capability / authority token, call Supabase,
 * Submit, Start, or any RPC, open Hub authority, or permit reapply.
 *
 * An `authorized` result must not be inferred as:
 * - apply execution is permitted without another bounded consumer
 * - apply occurred
 * - duplicate apply is impossible globally
 * - Hub synchronization completed
 * - progress or achievements should mutate locally
 * - rewards or economy should be granted
 *
 * Distinction:
 * - Fail-closed (`ok: false`) for malformed, inconsistent, already-applied,
 *   blocked, rejected/ineligible/idempotent-replay plan, authority-flag,
 *   identity, prepares*, or plan/guard resultId mismatch inputs.
 * - Bounded `denied` (`ok: true`, authorizationStatus: "denied") is reserved
 *   only for explicit supported non-authorized states. This V1 slice has no
 *   successful `denied` path; every non-authorized case fails closed.
 *
 * SQL remains the sole submit decision and mutation authority.
 * Existing trusted local-apply plan and ready precondition guard are the only
 * trusted classification inputs. Hub Runtime authority remains closed.
 */

import {
  GAMES_RESULT_DECISION_STATUSES,
  type GamesResultDecisionStatus,
  type GamesValidationResult,
} from "./gamesFoundation";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_ACKNOWLEDGMENT_STATUSES,
  type GamesRuntimeSubmitOutcomeAcknowledgmentStatus,
} from "./gamesHubRuntimeSubmitOutcomeAcknowledgment";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_APPLY_ELIGIBILITY_STATUSES,
  type GamesRuntimeSubmitOutcomeApplyEligibilityStatus,
} from "./gamesHubRuntimeSubmitOutcomeApplyEligibility";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_PRECONDITION_BLOCKED_REASONS,
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_PRECONDITION_STATUSES,
  type GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionBlockedReason,
  type GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard,
  type GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard";
import type { GamesRuntimeSubmitOutcomeLocalApplyPlan } from "./gamesHubRuntimeSubmitOutcomeLocalApplyPlan";
import { validateGameSessionId } from "./gamesSessions";

/**
 * Bounded authorization statuses. Classification only — not execution
 * capability, apply permission, apply occurrence, or Hub authority.
 */
export const GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_AUTHORIZATION_STATUSES =
  ["authorized", "denied"] as const;

export type GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationStatus =
  (typeof GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_AUTHORIZATION_STATUSES)[number];

/**
 * Immutable Hub Runtime local-apply execution-authorization view.
 *
 * Token-less authorization classification only — not apply execution,
 * lifecycle transition, handoff mutation, reapply permission,
 * progress/achievement mutation, reward/economy entitlement, Hub
 * synchronization, capability token, authority token, or an
 * executor/callback.
 *
 * Authority / execution / capability flags are always literal `false`.
 * An `authorized` status is not an executor and not a capability token.
 */
export type GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization =
  Readonly<{
    runtimeSessionId: string;
    gameId: string;
    playerId: string;
    platformSessionId: string;
    resultId: string;
    authorizationStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationStatus;
    preconditionStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus;
    eligibilityStatus: GamesRuntimeSubmitOutcomeApplyEligibilityStatus;
    acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus;
    decisionStatus: GamesResultDecisionStatus;
    idempotentReplay: boolean;
    applied: false;
    mutatesRuntime: false;
    mutatesHandoff: false;
    permitsReapply: false;
    executesApply: false;
    grantsCapability: false;
    providesAuthorityToken: false;
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

const GUARD_KEYS = [
  "runtimeSessionId",
  "gameId",
  "playerId",
  "platformSessionId",
  "resultId",
  "preconditionStatus",
  "blockedReason",
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

function isPreconditionStatus(
  value: unknown
): value is GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_PRECONDITION_STATUSES as readonly string[]
    ).includes(value)
  );
}

function isBlockedReason(
  value: unknown
): value is GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionBlockedReason {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_PRECONDITION_BLOCKED_REASONS as readonly string[]
    ).includes(value)
  );
}

/**
 * Exact trusted-plan consistency required for authorized classification.
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
 * Exact trusted-guard consistency required for authorized classification.
 */
function isConsistentReadyGuard(
  preconditionStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus,
  blockedReason: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionBlockedReason | null,
  preparesRuntimeApply: unknown,
  preparesHandoffApply: unknown
): boolean {
  return (
    preconditionStatus === "ready" &&
    blockedReason === null &&
    preparesRuntimeApply === true &&
    preparesHandoffApply === true
  );
}

/**
 * Structural validation of an already-trusted Hub Runtime local-apply plan.
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
 * Structural validation of an already-trusted Hub Runtime precondition guard.
 */
function readTrustedPreconditionGuard(
  raw: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard> {
  if (!isPlainObject(raw)) {
    return fail("guard_invalid");
  }

  const allowed = new Set<string>(GUARD_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return fail("guard_invalid");
    }
  }

  for (const key of GUARD_KEYS) {
    if (!(key in raw)) {
      return fail("guard_invalid");
    }
  }

  if (typeof raw.runtimeSessionId !== "string" || raw.runtimeSessionId.length === 0) {
    return fail("guard_invalid");
  }
  if (typeof raw.gameId !== "string" || raw.gameId.length === 0) {
    return fail("guard_invalid");
  }
  if (typeof raw.playerId !== "string" || raw.playerId.length === 0) {
    return fail("guard_invalid");
  }

  const platformSessionId = validateGameSessionId(raw.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("guard_invalid");
  }

  const resultId = validateGameSessionId(raw.resultId);
  if (!resultId.ok) {
    return fail("guard_invalid");
  }

  if (!isPreconditionStatus(raw.preconditionStatus)) {
    return fail("unsupported_guard_status");
  }

  if (raw.blockedReason !== null && !isBlockedReason(raw.blockedReason)) {
    return fail("inconsistent_guard_state");
  }

  if (raw.preparesRuntimeApply !== true) {
    return fail("guard_prepares_runtime_apply_required");
  }
  if (raw.preparesHandoffApply !== true) {
    return fail("guard_prepares_handoff_apply_required");
  }

  if (raw.applied !== false) {
    return fail("guard_invalid");
  }
  if (raw.mutatesRuntime !== false) {
    return fail("guard_invalid");
  }
  if (raw.mutatesHandoff !== false) {
    return fail("guard_invalid");
  }
  if (raw.permitsReapply !== false) {
    return fail("guard_invalid");
  }
  if (raw.executesApply !== false) {
    return fail("guard_invalid");
  }

  if (
    raw.preconditionStatus === "ready" &&
    raw.blockedReason !== null
  ) {
    return fail("inconsistent_guard_state");
  }

  if (
    raw.preconditionStatus === "blocked" &&
    raw.blockedReason === null
  ) {
    return fail("inconsistent_guard_state");
  }

  return {
    ok: true,
    value: Object.freeze({
      runtimeSessionId: raw.runtimeSessionId,
      gameId: raw.gameId,
      playerId: raw.playerId,
      platformSessionId: platformSessionId.value,
      resultId: resultId.value,
      preconditionStatus: raw.preconditionStatus,
      blockedReason: raw.blockedReason,
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
 * Structural checks for fields this classifier reads from the runtime session.
 */
function readRuntimeSessionFields(
  raw: unknown
): GamesValidationResult<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string | null;
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

  return {
    ok: true,
    value: {
      runtimeSessionId: raw.runtimeSessionId,
      gameId: raw.gameId,
      playerId: raw.playerId,
      platformSessionId:
        typeof raw.platformSessionId === "string" ? raw.platformSessionId : null,
    },
  };
}

/**
 * Structural checks for fields this classifier reads from the completion handoff.
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

function freezeAuthorization(input: {
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  authorizationStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationStatus;
  preconditionStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus;
  eligibilityStatus: GamesRuntimeSubmitOutcomeApplyEligibilityStatus;
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus;
  decisionStatus: GamesResultDecisionStatus;
  idempotentReplay: boolean;
}): GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization {
  return Object.freeze({
    runtimeSessionId: input.runtimeSessionId,
    gameId: input.gameId,
    playerId: input.playerId,
    platformSessionId: input.platformSessionId,
    resultId: input.resultId,
    authorizationStatus: input.authorizationStatus,
    preconditionStatus: input.preconditionStatus,
    eligibilityStatus: input.eligibilityStatus,
    acknowledgmentStatus: input.acknowledgmentStatus,
    decisionStatus: input.decisionStatus,
    idempotentReplay: input.idempotentReplay,
    applied: false as const,
    mutatesRuntime: false as const,
    mutatesHandoff: false as const,
    permitsReapply: false as const,
    executesApply: false as const,
    grantsCapability: false as const,
    providesAuthorityToken: false as const,
  });
}

/**
 * Pure fail-closed classifier: trusted local-apply plan + ready precondition
 * guard + current runtime / handoff → token-less authorization view.
 *
 * Continuity uses only fields guaranteed by current contracts:
 * runtimeSessionId, gameId, playerId, platformSessionId across runtime
 * session, completion handoff, trusted plan, and trusted guard; plus
 * plan.resultId === guard.resultId.
 *
 * Does not mutate inputs, execute apply, change lifecycle, set
 * handoff.applied, permit reapply, grant a capability / authority token, or
 * call RPC. `authorized` is not an executor and not execution permission.
 */
export function evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedLocalApplyPlan: unknown,
  trustedPreconditionGuard: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization> {
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

  if (
    trustedPreconditionGuard === null ||
    trustedPreconditionGuard === undefined ||
    typeof trustedPreconditionGuard !== "object"
  ) {
    return fail("guard_invalid");
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

  const guardResult = readTrustedPreconditionGuard(trustedPreconditionGuard);
  if (!guardResult.ok) {
    return guardResult;
  }

  const session = sessionFields.value;
  const handoffView = handoffFields.value;
  const plan = planResult.value;
  const guard = guardResult.value;

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

  if (guard.runtimeSessionId !== session.runtimeSessionId) {
    return fail("guard_identity_mismatch");
  }

  if (guard.gameId !== session.gameId) {
    return fail("guard_identity_mismatch");
  }

  if (guard.playerId !== session.playerId) {
    return fail("guard_identity_mismatch");
  }

  if (guard.platformSessionId !== platformSessionId.value) {
    return fail("platform_session_id_mismatch");
  }

  if (plan.resultId !== guard.resultId) {
    return fail("plan_guard_result_id_mismatch");
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

  if (guard.preconditionStatus === "blocked") {
    return fail("guard_blocked");
  }

  if (guard.preconditionStatus !== "ready") {
    return fail("unsupported_guard_status");
  }

  if (
    !isConsistentReadyGuard(
      guard.preconditionStatus,
      guard.blockedReason,
      guard.preparesRuntimeApply,
      guard.preparesHandoffApply
    )
  ) {
    return fail("inconsistent_guard_state");
  }

  return {
    ok: true,
    value: freezeAuthorization({
      runtimeSessionId: session.runtimeSessionId,
      gameId: session.gameId,
      playerId: session.playerId,
      platformSessionId: platformSessionId.value,
      resultId: plan.resultId,
      authorizationStatus: "authorized",
      preconditionStatus: guard.preconditionStatus,
      eligibilityStatus: plan.eligibilityStatus,
      acknowledgmentStatus: plan.acknowledgmentStatus,
      decisionStatus: plan.decisionStatus,
      idempotentReplay: plan.idempotentReplay,
    }),
  };
}
