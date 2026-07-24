/**
 * UM Games Hub Runtime Submit Outcome Local Apply Consumer
 * Contract Trusted V1 — pure fail-closed consumer-contract bound only.
 *
 * Bounds what a future local-apply consumer may accept over an
 * already-trusted lifecycle-model view after strict continuity checks
 * against the current runtime session and completion handoff, plus exact
 * trusted lifecycle-model prepared / dry-run-verified / accepted-fresh /
 * ready / authorized / lifecycleModelOnly consistency.
 *
 * Consumer-contract metadata only — does not execute apply, mutate runtime
 * session or completion handoff, set handoff.applied to true, change runtime
 * lifecycle state, persist state, implement a consumer / executor, return a
 * capability / authority token, expose a callback / mutation function /
 * writable Runtime or handoff reference / RPC client, call Supabase, Submit,
 * Start, or any RPC, open Hub authority, or permit reapply.
 *
 * A successful consumer-contract result must not be inferred as:
 * - apply execution permission
 * - mutation completion
 * - persistence authority
 * - Hub synchronization
 * - apply occurred
 * - duplicate apply is globally impossible in an executor
 * - rollback behavior exists
 * - progress or achievements should mutate locally
 * - rewards or economy should be granted
 * - Runtime lifecycle may transition automatically
 *
 * `consumerContractOnly` / `acceptedInputType` / `lifecycleModelRequired` /
 * `runtimeAndHandoffAtomicityRequired` / `duplicatePreventionRequired` /
 * `failureMustFailClosed` are contract-bound metadata only and must not be
 * inferred as apply authority or execution permission.
 *
 * Contract acceptance ≠ execution permission.
 * Contract acceptance ≠ mutation completion.
 * Contract acceptance ≠ persistence authority.
 * Contract acceptance ≠ Hub synchronization.
 *
 * SQL remains the sole submit decision and mutation authority.
 * Existing trusted lifecycle model is the only trusted classification input.
 * Hub Runtime authority remains closed.
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
  type GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedHandoffEffect,
  type GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedRuntimeEffect,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_AUTHORIZATION_STATUSES,
  type GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationStatus,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyExecutionAuthorization";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_EXECUTION_PRECONDITION_STATUSES,
  type GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_ALLOWED_FUTURE_TRANSITIONS,
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_ATOMICITY_PAIRINGS,
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_DUPLICATE_PREVENTION_RULES,
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_FAILURE_SEMANTICS,
  GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_PERSISTENCE_AUTHORITIES,
  type GamesRuntimeSubmitOutcomeLocalApplyLifecycleAllowedFutureTransition,
  type GamesRuntimeSubmitOutcomeLocalApplyLifecycleAtomicityPairing,
  type GamesRuntimeSubmitOutcomeLocalApplyLifecycleDuplicatePreventionRule,
  type GamesRuntimeSubmitOutcomeLocalApplyLifecycleFailureSemantics,
  type GamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted,
  type GamesRuntimeSubmitOutcomeLocalApplyLifecyclePersistenceAuthority,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyLifecycleModel";
import { validateGameSessionId } from "./gamesSessions";

/**
 * Bounded accepted future local-apply consumer input type.
 * Contract metadata only — not execution, not a mutation function.
 */
export const GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_CONSUMER_ACCEPTED_INPUT_TYPES =
  ["local_apply_mutation_input"] as const;

export type GamesRuntimeSubmitOutcomeLocalApplyConsumerAcceptedInputType =
  (typeof GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_CONSUMER_ACCEPTED_INPUT_TYPES)[number];

/**
 * Immutable Hub Runtime local-apply consumer-contract view.
 *
 * Consumer-contract bound metadata only — not apply execution, lifecycle
 * transition, handoff mutation, reapply permission, progress/achievement
 * mutation, reward/economy entitlement, Hub synchronization, persistence,
 * rollback, capability token, authority token, callback, executor, mutation
 * function, writable Runtime / handoff reference, or RPC client.
 *
 * `consumerContractOnly` / `acceptedInputType` / `lifecycleModelRequired` /
 * `runtimeAndHandoffAtomicityRequired` / `duplicatePreventionRequired` /
 * `failureMustFailClosed` are contract markers only.
 * Authority / execution / capability flags are always literal `false`.
 * A successful consumer-contract result is not an executor and not execution
 * permission.
 *
 * Contract acceptance ≠ execution permission.
 * Contract acceptance ≠ mutation completion.
 * Contract acceptance ≠ persistence authority.
 * Contract acceptance ≠ Hub synchronization.
 */
export type GamesRuntimeSubmitOutcomeLocalApplyConsumerContractTrusted =
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
    mutationInputPrepared: true;
    dryRunVerified: true;
    lifecycleModelOnly: true;
    consumerContractOnly: true;
    acceptedInputType: GamesRuntimeSubmitOutcomeLocalApplyConsumerAcceptedInputType;
    lifecycleModelRequired: true;
    runtimeAndHandoffAtomicityRequired: true;
    duplicatePreventionRequired: true;
    failureMustFailClosed: true;
    applied: false;
    mutatesRuntime: false;
    mutatesHandoff: false;
    executesApply: false;
    permitsReapply: false;
    grantsCapability: false;
    providesAuthorityToken: false;
  }>;

const LIFECYCLE_MODEL_KEYS = [
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
  "intendedRuntimeEffect",
  "intendedHandoffEffect",
  "mutationInputPrepared",
  "dryRunVerified",
  "allowedFutureTransitions",
  "duplicatePreventionRule",
  "atomicityPairing",
  "failureSemantics",
  "rollbackSupported",
  "persistenceAuthority",
  "lifecycleModelOnly",
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

function isAllowedFutureTransition(
  value: unknown
): value is GamesRuntimeSubmitOutcomeLocalApplyLifecycleAllowedFutureTransition {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_ALLOWED_FUTURE_TRANSITIONS as readonly string[]
    ).includes(value)
  );
}

function isDuplicatePreventionRule(
  value: unknown
): value is GamesRuntimeSubmitOutcomeLocalApplyLifecycleDuplicatePreventionRule {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_DUPLICATE_PREVENTION_RULES as readonly string[]
    ).includes(value)
  );
}

function isAtomicityPairing(
  value: unknown
): value is GamesRuntimeSubmitOutcomeLocalApplyLifecycleAtomicityPairing {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_ATOMICITY_PAIRINGS as readonly string[]
    ).includes(value)
  );
}

function isFailureSemantics(
  value: unknown
): value is GamesRuntimeSubmitOutcomeLocalApplyLifecycleFailureSemantics {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_FAILURE_SEMANTICS as readonly string[]
    ).includes(value)
  );
}

function isPersistenceAuthority(
  value: unknown
): value is GamesRuntimeSubmitOutcomeLocalApplyLifecyclePersistenceAuthority {
  return (
    typeof value === "string" &&
    (
      GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_PERSISTENCE_AUTHORITIES as readonly string[]
    ).includes(value)
  );
}

/**
 * Exact trusted lifecycle-model consistency required for consumer-contract
 * binding.
 */
function isConsistentTrustedLifecycleModel(
  lifecycleModelOnly: unknown,
  mutationInputPrepared: unknown,
  dryRunVerified: unknown,
  authorizationStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationStatus,
  preconditionStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus,
  eligibilityStatus: GamesRuntimeSubmitOutcomeApplyEligibilityStatus,
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus,
  decisionStatus: GamesResultDecisionStatus,
  idempotentReplay: boolean,
  intendedRuntimeEffect: GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedRuntimeEffect,
  intendedHandoffEffect: GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedHandoffEffect,
  allowedFutureTransitions: readonly GamesRuntimeSubmitOutcomeLocalApplyLifecycleAllowedFutureTransition[],
  duplicatePreventionRule: GamesRuntimeSubmitOutcomeLocalApplyLifecycleDuplicatePreventionRule,
  atomicityPairing: GamesRuntimeSubmitOutcomeLocalApplyLifecycleAtomicityPairing,
  failureSemantics: GamesRuntimeSubmitOutcomeLocalApplyLifecycleFailureSemantics,
  rollbackSupported: unknown,
  persistenceAuthority: GamesRuntimeSubmitOutcomeLocalApplyLifecyclePersistenceAuthority
): boolean {
  return (
    lifecycleModelOnly === true &&
    mutationInputPrepared === true &&
    dryRunVerified === true &&
    authorizationStatus === "authorized" &&
    preconditionStatus === "ready" &&
    eligibilityStatus === "eligible_accepted_fresh" &&
    acknowledgmentStatus === "accepted_fresh" &&
    decisionStatus === "accepted" &&
    idempotentReplay === false &&
    intendedRuntimeEffect === "mark_runtime_completion_locally" &&
    intendedHandoffEffect === "mark_completion_handoff_applied_locally" &&
    allowedFutureTransitions.length === 1 &&
    allowedFutureTransitions[0] === "atomic_paired_local_apply_marks" &&
    duplicatePreventionRule === "reject_when_handoff_already_applied" &&
    atomicityPairing === "runtime_and_handoff_must_apply_together" &&
    failureSemantics === "fail_closed_no_partial_apply" &&
    rollbackSupported === false &&
    persistenceAuthority === "none"
  );
}

/**
 * Structural validation of an already-trusted Hub Runtime lifecycle-model
 * view.
 */
function readTrustedLifecycleModel(
  raw: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted> {
  if (!isPlainObject(raw)) {
    return fail("lifecycle_model_invalid");
  }

  const allowed = new Set<string>(LIFECYCLE_MODEL_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return fail("lifecycle_model_invalid");
    }
  }

  for (const key of LIFECYCLE_MODEL_KEYS) {
    if (!(key in raw)) {
      return fail("lifecycle_model_invalid");
    }
  }

  if (typeof raw.runtimeSessionId !== "string" || raw.runtimeSessionId.length === 0) {
    return fail("lifecycle_model_invalid");
  }
  if (typeof raw.gameId !== "string" || raw.gameId.length === 0) {
    return fail("lifecycle_model_invalid");
  }
  if (typeof raw.playerId !== "string" || raw.playerId.length === 0) {
    return fail("lifecycle_model_invalid");
  }

  const platformSessionId = validateGameSessionId(raw.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("lifecycle_model_invalid");
  }

  const resultId = validateGameSessionId(raw.resultId);
  if (!resultId.ok) {
    return fail("lifecycle_model_invalid");
  }

  if (!isAuthorizationStatus(raw.authorizationStatus)) {
    return fail("unsupported_lifecycle_model_status");
  }

  if (!isPreconditionStatus(raw.preconditionStatus)) {
    return fail("inconsistent_lifecycle_model_state");
  }

  if (!isEligibilityStatus(raw.eligibilityStatus)) {
    return fail("inconsistent_lifecycle_model_state");
  }

  if (!isAcknowledgmentStatus(raw.acknowledgmentStatus)) {
    return fail("inconsistent_lifecycle_model_state");
  }

  if (!isGamesResultDecisionStatus(raw.decisionStatus)) {
    return fail("inconsistent_lifecycle_model_state");
  }

  if (typeof raw.idempotentReplay !== "boolean") {
    return fail("inconsistent_lifecycle_model_state");
  }

  if (raw.lifecycleModelOnly !== true) {
    return fail("lifecycle_model_only_required");
  }

  if (raw.mutationInputPrepared !== true) {
    return fail("mutation_input_prepared_required");
  }

  if (raw.dryRunVerified !== true) {
    return fail("dry_run_verified_required");
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

  if (!Array.isArray(raw.allowedFutureTransitions)) {
    return fail("lifecycle_model_invalid");
  }

  if (
    raw.allowedFutureTransitions.length !== 1 ||
    !isAllowedFutureTransition(raw.allowedFutureTransitions[0]) ||
    raw.allowedFutureTransitions[0] !== "atomic_paired_local_apply_marks"
  ) {
    return fail("inconsistent_lifecycle_model_state");
  }

  if (
    !isDuplicatePreventionRule(raw.duplicatePreventionRule) ||
    raw.duplicatePreventionRule !== "reject_when_handoff_already_applied"
  ) {
    return fail("inconsistent_lifecycle_model_state");
  }

  if (
    !isAtomicityPairing(raw.atomicityPairing) ||
    raw.atomicityPairing !== "runtime_and_handoff_must_apply_together"
  ) {
    return fail("inconsistent_lifecycle_model_state");
  }

  if (
    !isFailureSemantics(raw.failureSemantics) ||
    raw.failureSemantics !== "fail_closed_no_partial_apply"
  ) {
    return fail("inconsistent_lifecycle_model_state");
  }

  if (raw.rollbackSupported !== false) {
    return fail("lifecycle_model_invalid");
  }

  if (
    !isPersistenceAuthority(raw.persistenceAuthority) ||
    raw.persistenceAuthority !== "none"
  ) {
    return fail("inconsistent_lifecycle_model_state");
  }

  if (raw.applied !== false) {
    return fail("lifecycle_model_invalid");
  }
  if (raw.mutatesRuntime !== false) {
    return fail("lifecycle_model_invalid");
  }
  if (raw.mutatesHandoff !== false) {
    return fail("lifecycle_model_invalid");
  }
  if (raw.permitsReapply !== false) {
    return fail("lifecycle_model_invalid");
  }
  if (raw.executesApply !== false) {
    return fail("lifecycle_model_invalid");
  }
  if (raw.grantsCapability !== false) {
    return fail("lifecycle_model_invalid");
  }
  if (raw.providesAuthorityToken !== false) {
    return fail("lifecycle_model_invalid");
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
      intendedRuntimeEffect: raw.intendedRuntimeEffect,
      intendedHandoffEffect: raw.intendedHandoffEffect,
      mutationInputPrepared: true as const,
      dryRunVerified: true as const,
      allowedFutureTransitions: Object.freeze([
        "atomic_paired_local_apply_marks" as const,
      ]),
      duplicatePreventionRule: "reject_when_handoff_already_applied" as const,
      atomicityPairing: "runtime_and_handoff_must_apply_together" as const,
      failureSemantics: "fail_closed_no_partial_apply" as const,
      rollbackSupported: false as const,
      persistenceAuthority: "none" as const,
      lifecycleModelOnly: true as const,
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
 * Structural checks for fields this binder reads from the runtime session.
 * Lifecycle fields (`lifecycleState`, `finalized`) are inspected for presence
 * only when present; this slice does not transition lifecycle.
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
 * Structural checks for fields this binder reads from the completion handoff.
 * Lifecycle-relevant handoff field: `applied` must remain false.
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

function freezeConsumerContract(input: {
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
}): GamesRuntimeSubmitOutcomeLocalApplyConsumerContractTrusted {
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
    mutationInputPrepared: true as const,
    dryRunVerified: true as const,
    lifecycleModelOnly: true as const,
    consumerContractOnly: true as const,
    acceptedInputType: "local_apply_mutation_input" as const,
    lifecycleModelRequired: true as const,
    runtimeAndHandoffAtomicityRequired: true as const,
    duplicatePreventionRequired: true as const,
    failureMustFailClosed: true as const,
    applied: false as const,
    mutatesRuntime: false as const,
    mutatesHandoff: false as const,
    executesApply: false as const,
    permitsReapply: false as const,
    grantsCapability: false as const,
    providesAuthorityToken: false as const,
  });
}

/**
 * Pure fail-closed binder: trusted lifecycle model + current runtime /
 * handoff → frozen consumer-contract view.
 *
 * Continuity uses only fields guaranteed by current contracts:
 * runtimeSessionId, gameId, playerId, platformSessionId across runtime
 * session, completion handoff, and trusted lifecycle model; plus
 * lifecycle-model resultId identity.
 *
 * Does not mutate inputs, execute apply, change lifecycle, set
 * handoff.applied, persist state, implement a consumer / executor, permit
 * reapply, grant a capability / authority token, expose writable references /
 * callbacks / executors, or call RPC. Consumer-contract fields are metadata
 * only.
 *
 * Contract acceptance ≠ execution permission.
 * Contract acceptance ≠ mutation completion.
 * Contract acceptance ≠ persistence authority.
 * Contract acceptance ≠ Hub synchronization.
 */
export function bindGamesRuntimeSubmitOutcomeLocalApplyConsumerTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedLifecycleModel: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyConsumerContractTrusted> {
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
    trustedLifecycleModel === null ||
    trustedLifecycleModel === undefined ||
    typeof trustedLifecycleModel !== "object"
  ) {
    return fail("lifecycle_model_invalid");
  }

  const sessionFields = readRuntimeSessionFields(runtimeSession);
  if (!sessionFields.ok) {
    return sessionFields;
  }

  const handoffFields = readCompletionHandoffFields(completionHandoff);
  if (!handoffFields.ok) {
    return handoffFields;
  }

  const lifecycleModelResult = readTrustedLifecycleModel(trustedLifecycleModel);
  if (!lifecycleModelResult.ok) {
    return lifecycleModelResult;
  }

  const session = sessionFields.value;
  const handoffView = handoffFields.value;
  const lifecycleModel = lifecycleModelResult.value;

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

  if (lifecycleModel.runtimeSessionId !== session.runtimeSessionId) {
    return fail("lifecycle_model_identity_mismatch");
  }

  if (lifecycleModel.gameId !== session.gameId) {
    return fail("lifecycle_model_identity_mismatch");
  }

  if (lifecycleModel.playerId !== session.playerId) {
    return fail("lifecycle_model_identity_mismatch");
  }

  if (lifecycleModel.platformSessionId !== platformSessionId.value) {
    return fail("platform_session_id_mismatch");
  }

  if (handoffView.applied !== false) {
    return fail("handoff_already_applied");
  }

  if (lifecycleModel.eligibilityStatus === "ineligible_rejected") {
    return fail("ineligible_rejected");
  }

  if (lifecycleModel.eligibilityStatus === "ineligible_idempotent_replay") {
    return fail("ineligible_idempotent_replay");
  }

  if (lifecycleModel.eligibilityStatus !== "eligible_accepted_fresh") {
    return fail("unsupported_lifecycle_model_status");
  }

  if (lifecycleModel.preconditionStatus === "blocked") {
    return fail("lifecycle_model_not_ready");
  }

  if (lifecycleModel.preconditionStatus !== "ready") {
    return fail("unsupported_lifecycle_model_status");
  }

  if (lifecycleModel.authorizationStatus === "denied") {
    return fail("lifecycle_model_not_authorized");
  }

  if (lifecycleModel.authorizationStatus !== "authorized") {
    return fail("unsupported_lifecycle_model_status");
  }

  if (lifecycleModel.lifecycleModelOnly !== true) {
    return fail("lifecycle_model_only_required");
  }

  if (lifecycleModel.mutationInputPrepared !== true) {
    return fail("mutation_input_prepared_required");
  }

  if (lifecycleModel.dryRunVerified !== true) {
    return fail("dry_run_verified_required");
  }

  if (lifecycleModel.intendedRuntimeEffect !== "mark_runtime_completion_locally") {
    return fail("incorrect_intended_runtime_effect");
  }

  if (
    lifecycleModel.intendedHandoffEffect !==
    "mark_completion_handoff_applied_locally"
  ) {
    return fail("incorrect_intended_handoff_effect");
  }

  if (
    !isConsistentTrustedLifecycleModel(
      lifecycleModel.lifecycleModelOnly,
      lifecycleModel.mutationInputPrepared,
      lifecycleModel.dryRunVerified,
      lifecycleModel.authorizationStatus,
      lifecycleModel.preconditionStatus,
      lifecycleModel.eligibilityStatus,
      lifecycleModel.acknowledgmentStatus,
      lifecycleModel.decisionStatus,
      lifecycleModel.idempotentReplay,
      lifecycleModel.intendedRuntimeEffect,
      lifecycleModel.intendedHandoffEffect,
      lifecycleModel.allowedFutureTransitions,
      lifecycleModel.duplicatePreventionRule,
      lifecycleModel.atomicityPairing,
      lifecycleModel.failureSemantics,
      lifecycleModel.rollbackSupported,
      lifecycleModel.persistenceAuthority
    )
  ) {
    return fail("inconsistent_lifecycle_model_state");
  }

  return {
    ok: true,
    value: freezeConsumerContract({
      runtimeSessionId: session.runtimeSessionId,
      gameId: session.gameId,
      playerId: session.playerId,
      platformSessionId: platformSessionId.value,
      resultId: lifecycleModel.resultId,
      authorizationStatus: lifecycleModel.authorizationStatus,
      preconditionStatus: lifecycleModel.preconditionStatus,
      eligibilityStatus: lifecycleModel.eligibilityStatus,
      acknowledgmentStatus: lifecycleModel.acknowledgmentStatus,
      decisionStatus: lifecycleModel.decisionStatus,
      idempotentReplay: lifecycleModel.idempotentReplay,
    }),
  };
}
