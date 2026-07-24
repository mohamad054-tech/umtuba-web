/**
 * UM Games Hub Runtime Submit Outcome Local Apply Mutation Input
 * Contract Trusted V1 — pure fail-closed mutation-input envelope only.
 *
 * Prepares a bounded future mutation-input view over an already-trusted
 * local-apply plan, ready precondition guard, token-less execution
 * authorization, and dry-run effects description after strict continuity
 * checks against the current runtime session and completion handoff, plus
 * exact trusted-plan, trusted-guard, trusted-authorization, and
 * trusted-dry-run consistency.
 *
 * Mutation-input metadata only — does not execute apply, mutate runtime
 * session or completion handoff, set handoff.applied to true, change runtime
 * lifecycle state, return a capability / authority token, expose a callback /
 * executor / mutation function / writable Runtime or handoff reference /
 * RPC client, call Supabase, Submit, Start, or any RPC, open Hub authority,
 * or permit reapply.
 *
 * A successful mutation-input result must not be inferred as:
 * - apply execution is authorized
 * - apply occurred
 * - duplicate apply is globally impossible
 * - rollback behavior exists
 * - Hub synchronization completed
 * - progress or achievements should mutate locally
 * - rewards or economy should be granted
 *
 * `mutationInputPrepared` / `dryRunVerified` are metadata only and must not
 * be inferred as apply authority or execution permission.
 *
 * SQL remains the sole submit decision and mutation authority.
 * Existing trusted local-apply plan, ready precondition guard, token-less
 * execution authorization, and dry-run effects description are the only
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
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_DRY_RUN_INTENDED_HANDOFF_EFFECTS,
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_DRY_RUN_INTENDED_RUNTIME_EFFECTS,
  type GamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription,
  type GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedHandoffEffect,
  type GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedRuntimeEffect,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_AUTHORIZATION_STATUSES,
  type GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization,
  type GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationStatus,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyExecutionAuthorization";
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
 * Immutable Hub Runtime local-apply mutation-input view.
 *
 * Mutation-input preparation metadata only — not apply execution, lifecycle
 * transition, handoff mutation, reapply permission, progress/achievement
 * mutation, reward/economy entitlement, Hub synchronization, capability
 * token, authority token, callback, executor, mutation function, writable
 * Runtime / handoff reference, or RPC client.
 *
 * `mutationInputPrepared` / `dryRunVerified` are metadata markers only.
 * Authority / execution / capability flags are always literal `false`.
 * A successful mutation-input result is not an executor and not execution
 * permission.
 */
export type GamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted =
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
    intendedRuntimeEffect: GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedRuntimeEffect;
    intendedHandoffEffect: GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedHandoffEffect;
    mutationInputPrepared: true;
    dryRunVerified: true;
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

const AUTHORIZATION_KEYS = [
  "runtimeSessionId",
  "gameId",
  "playerId",
  "platformSessionId",
  "resultId",
  "authorizationStatus",
  "preconditionStatus",
  "eligibilityStatus",
  "acknowledgmentStatus",
  "decisionStatus",
  "idempotentReplay",
  "applied",
  "mutatesRuntime",
  "mutatesHandoff",
  "permitsReapply",
  "executesApply",
  "grantsCapability",
  "providesAuthorityToken",
] as const;

const DRY_RUN_KEYS = [
  "runtimeSessionId",
  "gameId",
  "playerId",
  "platformSessionId",
  "resultId",
  "authorizationStatus",
  "preconditionStatus",
  "eligibilityStatus",
  "acknowledgmentStatus",
  "decisionStatus",
  "idempotentReplay",
  "describesRuntimeApply",
  "describesHandoffApply",
  "intendedRuntimeEffect",
  "intendedHandoffEffect",
  "dryRun",
  "applied",
  "mutatesRuntime",
  "mutatesHandoff",
  "permitsReapply",
  "executesApply",
  "grantsCapability",
  "providesAuthorityToken",
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

function isAuthorizationStatus(
  value: unknown
): value is GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationStatus {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_AUTHORIZATION_STATUSES as readonly string[]
    ).includes(value)
  );
}

function isIntendedRuntimeEffect(
  value: unknown
): value is GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedRuntimeEffect {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_DRY_RUN_INTENDED_RUNTIME_EFFECTS as readonly string[]
    ).includes(value)
  );
}

function isIntendedHandoffEffect(
  value: unknown
): value is GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedHandoffEffect {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_DRY_RUN_INTENDED_HANDOFF_EFFECTS as readonly string[]
    ).includes(value)
  );
}

/**
 * Exact trusted-plan consistency required for mutation-input preparation.
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
 * Exact trusted-guard consistency required for mutation-input preparation.
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
 * Exact trusted-authorization consistency required for mutation-input
 * preparation.
 */
function isConsistentAuthorizedAuthorization(
  authorizationStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationStatus,
  preconditionStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus,
  eligibilityStatus: GamesRuntimeSubmitOutcomeApplyEligibilityStatus,
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus,
  decisionStatus: GamesResultDecisionStatus,
  idempotentReplay: boolean
): boolean {
  return (
    authorizationStatus === "authorized" &&
    preconditionStatus === "ready" &&
    eligibilityStatus === "eligible_accepted_fresh" &&
    acknowledgmentStatus === "accepted_fresh" &&
    decisionStatus === "accepted" &&
    idempotentReplay === false
  );
}

/**
 * Exact trusted-dry-run consistency required for mutation-input preparation.
 */
function isConsistentDryRunEffectsDescription(
  dryRun: unknown,
  describesRuntimeApply: unknown,
  describesHandoffApply: unknown,
  intendedRuntimeEffect: GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedRuntimeEffect,
  intendedHandoffEffect: GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedHandoffEffect,
  authorizationStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationStatus,
  preconditionStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus,
  eligibilityStatus: GamesRuntimeSubmitOutcomeApplyEligibilityStatus,
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus,
  decisionStatus: GamesResultDecisionStatus,
  idempotentReplay: boolean
): boolean {
  return (
    dryRun === true &&
    describesRuntimeApply === true &&
    describesHandoffApply === true &&
    intendedRuntimeEffect === "mark_runtime_completion_locally" &&
    intendedHandoffEffect === "mark_completion_handoff_applied_locally" &&
    authorizationStatus === "authorized" &&
    preconditionStatus === "ready" &&
    eligibilityStatus === "eligible_accepted_fresh" &&
    acknowledgmentStatus === "accepted_fresh" &&
    decisionStatus === "accepted" &&
    idempotentReplay === false
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
 * Structural validation of an already-trusted Hub Runtime execution
 * authorization view.
 */
function readTrustedExecutionAuthorization(
  raw: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization> {
  if (!isPlainObject(raw)) {
    return fail("authorization_invalid");
  }

  const allowed = new Set<string>(AUTHORIZATION_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return fail("authorization_invalid");
    }
  }

  for (const key of AUTHORIZATION_KEYS) {
    if (!(key in raw)) {
      return fail("authorization_invalid");
    }
  }

  if (typeof raw.runtimeSessionId !== "string" || raw.runtimeSessionId.length === 0) {
    return fail("authorization_invalid");
  }
  if (typeof raw.gameId !== "string" || raw.gameId.length === 0) {
    return fail("authorization_invalid");
  }
  if (typeof raw.playerId !== "string" || raw.playerId.length === 0) {
    return fail("authorization_invalid");
  }

  const platformSessionId = validateGameSessionId(raw.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("authorization_invalid");
  }

  const resultId = validateGameSessionId(raw.resultId);
  if (!resultId.ok) {
    return fail("authorization_invalid");
  }

  if (!isAuthorizationStatus(raw.authorizationStatus)) {
    return fail("unsupported_authorization_status");
  }

  if (!isPreconditionStatus(raw.preconditionStatus)) {
    return fail("inconsistent_authorization_state");
  }

  if (!isEligibilityStatus(raw.eligibilityStatus)) {
    return fail("inconsistent_authorization_state");
  }

  if (!isAcknowledgmentStatus(raw.acknowledgmentStatus)) {
    return fail("inconsistent_authorization_state");
  }

  if (!isGamesResultDecisionStatus(raw.decisionStatus)) {
    return fail("inconsistent_authorization_state");
  }

  if (typeof raw.idempotentReplay !== "boolean") {
    return fail("inconsistent_authorization_state");
  }

  if (raw.applied !== false) {
    return fail("authorization_invalid");
  }
  if (raw.mutatesRuntime !== false) {
    return fail("authorization_invalid");
  }
  if (raw.mutatesHandoff !== false) {
    return fail("authorization_invalid");
  }
  if (raw.permitsReapply !== false) {
    return fail("authorization_invalid");
  }
  if (raw.executesApply !== false) {
    return fail("authorization_invalid");
  }
  if (raw.grantsCapability !== false) {
    return fail("authorization_invalid");
  }
  if (raw.providesAuthorityToken !== false) {
    return fail("authorization_invalid");
  }

  return {
    ok: true,
    value: Object.freeze({
      runtimeSessionId: raw.runtimeSessionId,
      gameId: raw.gameId,
      playerId: raw.playerId,
      platformSessionId: platformSessionId.value,
      resultId: resultId.value,
      authorizationStatus: raw.authorizationStatus,
      preconditionStatus: raw.preconditionStatus,
      eligibilityStatus: raw.eligibilityStatus,
      acknowledgmentStatus: raw.acknowledgmentStatus,
      decisionStatus: raw.decisionStatus,
      idempotentReplay: raw.idempotentReplay,
      applied: false as const,
      mutatesRuntime: false as const,
      mutatesHandoff: false as const,
      permitsReapply: false as const,
      executesApply: false as const,
      grantsCapability: false as const,
      providesAuthorityToken: false as const,
    }),
  };
}

/**
 * Structural validation of an already-trusted Hub Runtime dry-run
 * effects-description view.
 */
function readTrustedDryRunEffectsDescription(
  raw: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription> {
  if (!isPlainObject(raw)) {
    return fail("dry_run_invalid");
  }

  const allowed = new Set<string>(DRY_RUN_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return fail("dry_run_invalid");
    }
  }

  for (const key of DRY_RUN_KEYS) {
    if (!(key in raw)) {
      return fail("dry_run_invalid");
    }
  }

  if (typeof raw.runtimeSessionId !== "string" || raw.runtimeSessionId.length === 0) {
    return fail("dry_run_invalid");
  }
  if (typeof raw.gameId !== "string" || raw.gameId.length === 0) {
    return fail("dry_run_invalid");
  }
  if (typeof raw.playerId !== "string" || raw.playerId.length === 0) {
    return fail("dry_run_invalid");
  }

  const platformSessionId = validateGameSessionId(raw.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("dry_run_invalid");
  }

  const resultId = validateGameSessionId(raw.resultId);
  if (!resultId.ok) {
    return fail("dry_run_invalid");
  }

  if (!isAuthorizationStatus(raw.authorizationStatus)) {
    return fail("inconsistent_dry_run_state");
  }

  if (!isPreconditionStatus(raw.preconditionStatus)) {
    return fail("inconsistent_dry_run_state");
  }

  if (!isEligibilityStatus(raw.eligibilityStatus)) {
    return fail("inconsistent_dry_run_state");
  }

  if (!isAcknowledgmentStatus(raw.acknowledgmentStatus)) {
    return fail("inconsistent_dry_run_state");
  }

  if (!isGamesResultDecisionStatus(raw.decisionStatus)) {
    return fail("inconsistent_dry_run_state");
  }

  if (typeof raw.idempotentReplay !== "boolean") {
    return fail("inconsistent_dry_run_state");
  }

  if (raw.describesRuntimeApply !== true) {
    return fail("dry_run_describes_runtime_apply_required");
  }
  if (raw.describesHandoffApply !== true) {
    return fail("dry_run_describes_handoff_apply_required");
  }

  if (raw.dryRun !== true) {
    return fail("dry_run_required_true");
  }

  if (!isIntendedRuntimeEffect(raw.intendedRuntimeEffect)) {
    return fail("incorrect_intended_runtime_effect");
  }

  if (!isIntendedHandoffEffect(raw.intendedHandoffEffect)) {
    return fail("incorrect_intended_handoff_effect");
  }

  if (raw.intendedRuntimeEffect !== "mark_runtime_completion_locally") {
    return fail("incorrect_intended_runtime_effect");
  }

  if (raw.intendedHandoffEffect !== "mark_completion_handoff_applied_locally") {
    return fail("incorrect_intended_handoff_effect");
  }

  if (raw.applied !== false) {
    return fail("dry_run_invalid");
  }
  if (raw.mutatesRuntime !== false) {
    return fail("dry_run_invalid");
  }
  if (raw.mutatesHandoff !== false) {
    return fail("dry_run_invalid");
  }
  if (raw.permitsReapply !== false) {
    return fail("dry_run_invalid");
  }
  if (raw.executesApply !== false) {
    return fail("dry_run_invalid");
  }
  if (raw.grantsCapability !== false) {
    return fail("dry_run_invalid");
  }
  if (raw.providesAuthorityToken !== false) {
    return fail("dry_run_invalid");
  }

  return {
    ok: true,
    value: Object.freeze({
      runtimeSessionId: raw.runtimeSessionId,
      gameId: raw.gameId,
      playerId: raw.playerId,
      platformSessionId: platformSessionId.value,
      resultId: resultId.value,
      authorizationStatus: raw.authorizationStatus,
      preconditionStatus: raw.preconditionStatus,
      eligibilityStatus: raw.eligibilityStatus,
      acknowledgmentStatus: raw.acknowledgmentStatus,
      decisionStatus: raw.decisionStatus,
      idempotentReplay: raw.idempotentReplay,
      describesRuntimeApply: true as const,
      describesHandoffApply: true as const,
      intendedRuntimeEffect: raw.intendedRuntimeEffect,
      intendedHandoffEffect: raw.intendedHandoffEffect,
      dryRun: true as const,
      applied: false as const,
      mutatesRuntime: false as const,
      mutatesHandoff: false as const,
      permitsReapply: false as const,
      executesApply: false as const,
      grantsCapability: false as const,
      providesAuthorityToken: false as const,
    }),
  };
}

/**
 * Structural checks for fields this preparer reads from the runtime session.
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
 * Structural checks for fields this preparer reads from the completion handoff.
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

function freezeMutationInput(input: {
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
  intendedRuntimeEffect: GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedRuntimeEffect;
  intendedHandoffEffect: GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedHandoffEffect;
}): GamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted {
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
    intendedRuntimeEffect: input.intendedRuntimeEffect,
    intendedHandoffEffect: input.intendedHandoffEffect,
    mutationInputPrepared: true as const,
    dryRunVerified: true as const,
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
 * Pure fail-closed preparer: trusted local-apply plan + ready precondition
 * guard + token-less authorized execution authorization + trusted dry-run
 * effects description + current runtime / handoff → mutation-input view.
 *
 * Continuity uses only fields guaranteed by current contracts:
 * runtimeSessionId, gameId, playerId, platformSessionId across runtime
 * session, completion handoff, trusted plan, trusted guard, trusted
 * authorization, and trusted dry-run; plus plan.resultId === guard.resultId
 * === authorization.resultId === dryRun.resultId.
 *
 * Does not mutate inputs, execute apply, change lifecycle, set
 * handoff.applied, permit reapply, grant a capability / authority token,
 * expose writable references / callbacks / executors, or call RPC.
 * `mutationInputPrepared` / `dryRunVerified` are metadata only.
 */
export function buildGamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedLocalApplyPlan: unknown,
  trustedPreconditionGuard: unknown,
  trustedExecutionAuthorization: unknown,
  trustedDryRunEffectsDescription: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted> {
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

  if (
    trustedExecutionAuthorization === null ||
    trustedExecutionAuthorization === undefined ||
    typeof trustedExecutionAuthorization !== "object"
  ) {
    return fail("authorization_invalid");
  }

  if (
    trustedDryRunEffectsDescription === null ||
    trustedDryRunEffectsDescription === undefined ||
    typeof trustedDryRunEffectsDescription !== "object"
  ) {
    return fail("dry_run_invalid");
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

  const authorizationResult = readTrustedExecutionAuthorization(
    trustedExecutionAuthorization
  );
  if (!authorizationResult.ok) {
    return authorizationResult;
  }

  const dryRunResult = readTrustedDryRunEffectsDescription(
    trustedDryRunEffectsDescription
  );
  if (!dryRunResult.ok) {
    return dryRunResult;
  }

  const session = sessionFields.value;
  const handoffView = handoffFields.value;
  const plan = planResult.value;
  const guard = guardResult.value;
  const authorization = authorizationResult.value;
  const dryRun = dryRunResult.value;

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

  if (authorization.runtimeSessionId !== session.runtimeSessionId) {
    return fail("authorization_identity_mismatch");
  }

  if (authorization.gameId !== session.gameId) {
    return fail("authorization_identity_mismatch");
  }

  if (authorization.playerId !== session.playerId) {
    return fail("authorization_identity_mismatch");
  }

  if (authorization.platformSessionId !== platformSessionId.value) {
    return fail("platform_session_id_mismatch");
  }

  if (dryRun.runtimeSessionId !== session.runtimeSessionId) {
    return fail("dry_run_identity_mismatch");
  }

  if (dryRun.gameId !== session.gameId) {
    return fail("dry_run_identity_mismatch");
  }

  if (dryRun.playerId !== session.playerId) {
    return fail("dry_run_identity_mismatch");
  }

  if (dryRun.platformSessionId !== platformSessionId.value) {
    return fail("platform_session_id_mismatch");
  }

  if (plan.resultId !== guard.resultId) {
    return fail("plan_guard_result_id_mismatch");
  }

  if (plan.resultId !== authorization.resultId) {
    return fail("plan_authorization_result_id_mismatch");
  }

  if (plan.resultId !== dryRun.resultId) {
    return fail("plan_dry_run_result_id_mismatch");
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

  if (authorization.authorizationStatus === "denied") {
    return fail("authorization_denied");
  }

  if (authorization.authorizationStatus !== "authorized") {
    return fail("unsupported_authorization_status");
  }

  if (
    !isConsistentAuthorizedAuthorization(
      authorization.authorizationStatus,
      authorization.preconditionStatus,
      authorization.eligibilityStatus,
      authorization.acknowledgmentStatus,
      authorization.decisionStatus,
      authorization.idempotentReplay
    )
  ) {
    return fail("inconsistent_authorization_state");
  }

  if (authorization.preconditionStatus !== guard.preconditionStatus) {
    return fail("inconsistent_authorization_state");
  }

  if (authorization.eligibilityStatus !== plan.eligibilityStatus) {
    return fail("inconsistent_authorization_state");
  }

  if (authorization.acknowledgmentStatus !== plan.acknowledgmentStatus) {
    return fail("inconsistent_authorization_state");
  }

  if (authorization.decisionStatus !== plan.decisionStatus) {
    return fail("inconsistent_authorization_state");
  }

  if (authorization.idempotentReplay !== plan.idempotentReplay) {
    return fail("inconsistent_authorization_state");
  }

  if (dryRun.dryRun !== true) {
    return fail("dry_run_required_true");
  }

  if (dryRun.intendedRuntimeEffect !== "mark_runtime_completion_locally") {
    return fail("incorrect_intended_runtime_effect");
  }

  if (
    dryRun.intendedHandoffEffect !== "mark_completion_handoff_applied_locally"
  ) {
    return fail("incorrect_intended_handoff_effect");
  }

  if (
    !isConsistentDryRunEffectsDescription(
      dryRun.dryRun,
      dryRun.describesRuntimeApply,
      dryRun.describesHandoffApply,
      dryRun.intendedRuntimeEffect,
      dryRun.intendedHandoffEffect,
      dryRun.authorizationStatus,
      dryRun.preconditionStatus,
      dryRun.eligibilityStatus,
      dryRun.acknowledgmentStatus,
      dryRun.decisionStatus,
      dryRun.idempotentReplay
    )
  ) {
    return fail("inconsistent_dry_run_state");
  }

  if (dryRun.authorizationStatus !== authorization.authorizationStatus) {
    return fail("inconsistent_dry_run_state");
  }

  if (dryRun.preconditionStatus !== guard.preconditionStatus) {
    return fail("inconsistent_dry_run_state");
  }

  if (dryRun.eligibilityStatus !== plan.eligibilityStatus) {
    return fail("inconsistent_dry_run_state");
  }

  if (dryRun.acknowledgmentStatus !== plan.acknowledgmentStatus) {
    return fail("inconsistent_dry_run_state");
  }

  if (dryRun.decisionStatus !== plan.decisionStatus) {
    return fail("inconsistent_dry_run_state");
  }

  if (dryRun.idempotentReplay !== plan.idempotentReplay) {
    return fail("inconsistent_dry_run_state");
  }

  return {
    ok: true,
    value: freezeMutationInput({
      runtimeSessionId: session.runtimeSessionId,
      gameId: session.gameId,
      playerId: session.playerId,
      platformSessionId: platformSessionId.value,
      resultId: plan.resultId,
      authorizationStatus: authorization.authorizationStatus,
      preconditionStatus: guard.preconditionStatus,
      eligibilityStatus: plan.eligibilityStatus,
      acknowledgmentStatus: plan.acknowledgmentStatus,
      decisionStatus: plan.decisionStatus,
      idempotentReplay: plan.idempotentReplay,
      intendedRuntimeEffect: dryRun.intendedRuntimeEffect,
      intendedHandoffEffect: dryRun.intendedHandoffEffect,
    }),
  };
}
