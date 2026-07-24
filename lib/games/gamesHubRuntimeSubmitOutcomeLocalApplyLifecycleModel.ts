/**
 * UM Games Hub Runtime Submit Outcome Local Apply Lifecycle Model
 * Contract Trusted V1 — pure fail-closed lifecycle-model description only.
 *
 * Describes a bounded future local-apply lifecycle/semantics view over an
 * already-trusted mutation-input envelope after strict continuity checks
 * against the current runtime session and completion handoff, plus exact
 * trusted mutation-input prepared / dry-run-verified / accepted-fresh /
 * ready / authorized consistency.
 *
 * Lifecycle-model metadata only — does not execute apply, mutate runtime
 * session or completion handoff, set handoff.applied to true, change runtime
 * lifecycle state, persist state, implement rollback, return a capability /
 * authority token, expose a callback / executor / mutation function /
 * writable Runtime or handoff reference / RPC client, call Supabase, Submit,
 * Start, or any RPC, open Hub authority, or permit reapply.
 *
 * A successful lifecycle-model result must not be inferred as:
 * - apply execution is authorized
 * - apply occurred
 * - duplicate apply is globally impossible in an executor
 * - rollback behavior exists
 * - Hub synchronization completed
 * - progress or achievements should mutate locally
 * - rewards or economy should be granted
 * - Runtime lifecycle may transition automatically
 *
 * `lifecycleModelOnly` / `allowedFutureTransitions` / `duplicatePreventionRule`
 * / `atomicityPairing` / `failureSemantics` / `persistenceAuthority` are
 * description metadata only and must not be inferred as apply authority or
 * execution permission. `rollbackSupported` is always literal `false`.
 *
 * SQL remains the sole submit decision and mutation authority.
 * Existing trusted mutation input is the only trusted classification input.
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
import type { GamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted } from "./gamesHubRuntimeSubmitOutcomeLocalApplyMutationInput";
import { validateGameSessionId } from "./gamesSessions";

/**
 * Bounded allowed future local-apply transition descriptions.
 * Description metadata only — not a lifecycle transition, not execution.
 */
export const GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_ALLOWED_FUTURE_TRANSITIONS =
  ["atomic_paired_local_apply_marks"] as const;

export type GamesRuntimeSubmitOutcomeLocalApplyLifecycleAllowedFutureTransition =
  (typeof GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_ALLOWED_FUTURE_TRANSITIONS)[number];

/**
 * Bounded duplicate-prevention rule descriptions.
 * Description metadata only — not an executor guarantee.
 */
export const GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_DUPLICATE_PREVENTION_RULES =
  ["reject_when_handoff_already_applied"] as const;

export type GamesRuntimeSubmitOutcomeLocalApplyLifecycleDuplicatePreventionRule =
  (typeof GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_DUPLICATE_PREVENTION_RULES)[number];

/**
 * Bounded atomicity pairing descriptions.
 * Description metadata only — not apply execution.
 */
export const GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_ATOMICITY_PAIRINGS =
  ["runtime_and_handoff_must_apply_together"] as const;

export type GamesRuntimeSubmitOutcomeLocalApplyLifecycleAtomicityPairing =
  (typeof GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_ATOMICITY_PAIRINGS)[number];

/**
 * Bounded failure-semantics descriptions.
 * Description metadata only — not rollback implementation.
 */
export const GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_FAILURE_SEMANTICS =
  ["fail_closed_no_partial_apply"] as const;

export type GamesRuntimeSubmitOutcomeLocalApplyLifecycleFailureSemantics =
  (typeof GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_FAILURE_SEMANTICS)[number];

/**
 * Bounded persistence-authority descriptions.
 * Description metadata only — persistence remains none / local-future.
 */
export const GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_PERSISTENCE_AUTHORITIES =
  ["none"] as const;

export type GamesRuntimeSubmitOutcomeLocalApplyLifecyclePersistenceAuthority =
  (typeof GAMES_RUNTIME_SUBMIT_OUTCOME_LOCAL_APPLY_LIFECYCLE_PERSISTENCE_AUTHORITIES)[number];

/**
 * Immutable Hub Runtime local-apply lifecycle-model view.
 *
 * Lifecycle-model description metadata only — not apply execution, lifecycle
 * transition, handoff mutation, reapply permission, progress/achievement
 * mutation, reward/economy entitlement, Hub synchronization, persistence,
 * rollback, capability token, authority token, callback, executor, mutation
 * function, writable Runtime / handoff reference, or RPC client.
 *
 * `lifecycleModelOnly` / `allowedFutureTransitions` /
 * `duplicatePreventionRule` / `atomicityPairing` / `failureSemantics` /
 * `persistenceAuthority` are description markers only.
 * `rollbackSupported` is always literal `false`.
 * Authority / execution / capability flags are always literal `false`.
 * A successful lifecycle-model result is not an executor and not execution
 * permission.
 */
export type GamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted =
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
    allowedFutureTransitions: readonly GamesRuntimeSubmitOutcomeLocalApplyLifecycleAllowedFutureTransition[];
    duplicatePreventionRule: GamesRuntimeSubmitOutcomeLocalApplyLifecycleDuplicatePreventionRule;
    atomicityPairing: GamesRuntimeSubmitOutcomeLocalApplyLifecycleAtomicityPairing;
    failureSemantics: GamesRuntimeSubmitOutcomeLocalApplyLifecycleFailureSemantics;
    rollbackSupported: false;
    persistenceAuthority: GamesRuntimeSubmitOutcomeLocalApplyLifecyclePersistenceAuthority;
    lifecycleModelOnly: true;
    applied: false;
    mutatesRuntime: false;
    mutatesHandoff: false;
    permitsReapply: false;
    executesApply: false;
    grantsCapability: false;
    providesAuthorityToken: false;
  }>;

const MUTATION_INPUT_KEYS = [
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

/**
 * Exact trusted mutation-input consistency required for lifecycle-model
 * description.
 */
function isConsistentPreparedMutationInput(
  mutationInputPrepared: unknown,
  dryRunVerified: unknown,
  authorizationStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationStatus,
  preconditionStatus: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionStatus,
  eligibilityStatus: GamesRuntimeSubmitOutcomeApplyEligibilityStatus,
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus,
  decisionStatus: GamesResultDecisionStatus,
  idempotentReplay: boolean,
  intendedRuntimeEffect: GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedRuntimeEffect,
  intendedHandoffEffect: GamesRuntimeSubmitOutcomeLocalApplyDryRunIntendedHandoffEffect
): boolean {
  return (
    mutationInputPrepared === true &&
    dryRunVerified === true &&
    authorizationStatus === "authorized" &&
    preconditionStatus === "ready" &&
    eligibilityStatus === "eligible_accepted_fresh" &&
    acknowledgmentStatus === "accepted_fresh" &&
    decisionStatus === "accepted" &&
    idempotentReplay === false &&
    intendedRuntimeEffect === "mark_runtime_completion_locally" &&
    intendedHandoffEffect === "mark_completion_handoff_applied_locally"
  );
}

/**
 * Structural validation of an already-trusted Hub Runtime mutation-input
 * envelope.
 */
function readTrustedMutationInput(
  raw: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted> {
  if (!isPlainObject(raw)) {
    return fail("mutation_input_invalid");
  }

  const allowed = new Set<string>(MUTATION_INPUT_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return fail("mutation_input_invalid");
    }
  }

  for (const key of MUTATION_INPUT_KEYS) {
    if (!(key in raw)) {
      return fail("mutation_input_invalid");
    }
  }

  if (typeof raw.runtimeSessionId !== "string" || raw.runtimeSessionId.length === 0) {
    return fail("mutation_input_invalid");
  }
  if (typeof raw.gameId !== "string" || raw.gameId.length === 0) {
    return fail("mutation_input_invalid");
  }
  if (typeof raw.playerId !== "string" || raw.playerId.length === 0) {
    return fail("mutation_input_invalid");
  }

  const platformSessionId = validateGameSessionId(raw.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("mutation_input_invalid");
  }

  const resultId = validateGameSessionId(raw.resultId);
  if (!resultId.ok) {
    return fail("mutation_input_invalid");
  }

  if (!isAuthorizationStatus(raw.authorizationStatus)) {
    return fail("unsupported_mutation_input_status");
  }

  if (!isPreconditionStatus(raw.preconditionStatus)) {
    return fail("inconsistent_mutation_input_state");
  }

  if (!isEligibilityStatus(raw.eligibilityStatus)) {
    return fail("inconsistent_mutation_input_state");
  }

  if (!isAcknowledgmentStatus(raw.acknowledgmentStatus)) {
    return fail("inconsistent_mutation_input_state");
  }

  if (!isGamesResultDecisionStatus(raw.decisionStatus)) {
    return fail("inconsistent_mutation_input_state");
  }

  if (typeof raw.idempotentReplay !== "boolean") {
    return fail("inconsistent_mutation_input_state");
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

  if (raw.applied !== false) {
    return fail("mutation_input_invalid");
  }
  if (raw.mutatesRuntime !== false) {
    return fail("mutation_input_invalid");
  }
  if (raw.mutatesHandoff !== false) {
    return fail("mutation_input_invalid");
  }
  if (raw.permitsReapply !== false) {
    return fail("mutation_input_invalid");
  }
  if (raw.executesApply !== false) {
    return fail("mutation_input_invalid");
  }
  if (raw.grantsCapability !== false) {
    return fail("mutation_input_invalid");
  }
  if (raw.providesAuthorityToken !== false) {
    return fail("mutation_input_invalid");
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
 * Structural checks for fields this describer reads from the runtime session.
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
 * Structural checks for fields this describer reads from the completion handoff.
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

function freezeLifecycleModel(input: {
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
}): GamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted {
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
  });
}

/**
 * Pure fail-closed describer: trusted mutation input + current runtime /
 * handoff → frozen lifecycle-model view.
 *
 * Continuity uses only fields guaranteed by current contracts:
 * runtimeSessionId, gameId, playerId, platformSessionId across runtime
 * session, completion handoff, and trusted mutation input; plus
 * mutation-input resultId identity.
 *
 * Does not mutate inputs, execute apply, change lifecycle, set
 * handoff.applied, persist state, implement rollback, permit reapply, grant
 * a capability / authority token, expose writable references / callbacks /
 * executors, or call RPC. Lifecycle-model fields are metadata only.
 */
export function describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedMutationInput: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted> {
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
    trustedMutationInput === null ||
    trustedMutationInput === undefined ||
    typeof trustedMutationInput !== "object"
  ) {
    return fail("mutation_input_invalid");
  }

  const sessionFields = readRuntimeSessionFields(runtimeSession);
  if (!sessionFields.ok) {
    return sessionFields;
  }

  const handoffFields = readCompletionHandoffFields(completionHandoff);
  if (!handoffFields.ok) {
    return handoffFields;
  }

  const mutationInputResult = readTrustedMutationInput(trustedMutationInput);
  if (!mutationInputResult.ok) {
    return mutationInputResult;
  }

  const session = sessionFields.value;
  const handoffView = handoffFields.value;
  const mutationInput = mutationInputResult.value;

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

  if (mutationInput.runtimeSessionId !== session.runtimeSessionId) {
    return fail("mutation_input_identity_mismatch");
  }

  if (mutationInput.gameId !== session.gameId) {
    return fail("mutation_input_identity_mismatch");
  }

  if (mutationInput.playerId !== session.playerId) {
    return fail("mutation_input_identity_mismatch");
  }

  if (mutationInput.platformSessionId !== platformSessionId.value) {
    return fail("platform_session_id_mismatch");
  }

  if (handoffView.applied !== false) {
    return fail("handoff_already_applied");
  }

  if (mutationInput.eligibilityStatus === "ineligible_rejected") {
    return fail("ineligible_rejected");
  }

  if (mutationInput.eligibilityStatus === "ineligible_idempotent_replay") {
    return fail("ineligible_idempotent_replay");
  }

  if (mutationInput.eligibilityStatus !== "eligible_accepted_fresh") {
    return fail("unsupported_mutation_input_status");
  }

  if (mutationInput.preconditionStatus === "blocked") {
    return fail("mutation_input_not_ready");
  }

  if (mutationInput.preconditionStatus !== "ready") {
    return fail("unsupported_mutation_input_status");
  }

  if (mutationInput.authorizationStatus === "denied") {
    return fail("mutation_input_not_authorized");
  }

  if (mutationInput.authorizationStatus !== "authorized") {
    return fail("unsupported_mutation_input_status");
  }

  if (mutationInput.mutationInputPrepared !== true) {
    return fail("mutation_input_prepared_required");
  }

  if (mutationInput.dryRunVerified !== true) {
    return fail("dry_run_verified_required");
  }

  if (mutationInput.intendedRuntimeEffect !== "mark_runtime_completion_locally") {
    return fail("incorrect_intended_runtime_effect");
  }

  if (
    mutationInput.intendedHandoffEffect !==
    "mark_completion_handoff_applied_locally"
  ) {
    return fail("incorrect_intended_handoff_effect");
  }

  if (
    !isConsistentPreparedMutationInput(
      mutationInput.mutationInputPrepared,
      mutationInput.dryRunVerified,
      mutationInput.authorizationStatus,
      mutationInput.preconditionStatus,
      mutationInput.eligibilityStatus,
      mutationInput.acknowledgmentStatus,
      mutationInput.decisionStatus,
      mutationInput.idempotentReplay,
      mutationInput.intendedRuntimeEffect,
      mutationInput.intendedHandoffEffect
    )
  ) {
    return fail("inconsistent_mutation_input_state");
  }

  return {
    ok: true,
    value: freezeLifecycleModel({
      runtimeSessionId: session.runtimeSessionId,
      gameId: session.gameId,
      playerId: session.playerId,
      platformSessionId: platformSessionId.value,
      resultId: mutationInput.resultId,
      authorizationStatus: mutationInput.authorizationStatus,
      preconditionStatus: mutationInput.preconditionStatus,
      eligibilityStatus: mutationInput.eligibilityStatus,
      acknowledgmentStatus: mutationInput.acknowledgmentStatus,
      decisionStatus: mutationInput.decisionStatus,
      idempotentReplay: mutationInput.idempotentReplay,
      intendedRuntimeEffect: mutationInput.intendedRuntimeEffect,
      intendedHandoffEffect: mutationInput.intendedHandoffEffect,
    }),
  };
}
