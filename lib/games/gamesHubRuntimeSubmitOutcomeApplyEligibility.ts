/**
 * UM Games Hub Runtime Submit Outcome Apply Eligibility Contract Trusted V1 —
 * pure fail-closed eligibility classifier only.
 *
 * Determines whether an already-trusted Runtime submit outcome acknowledgment
 * is eligible for a future local apply step after strict continuity checks
 * against the runtime session and completion handoff.
 *
 * Eligibility classification only — does not perform apply, mutate runtime
 * session or completion handoff, set handoff.applied to true, change runtime
 * lifecycle state, call Supabase, Submit, Start, or any RPC, open Hub
 * authority, or permit reapply.
 *
 * Must not infer from eligible_accepted_fresh:
 * - local apply occurred
 * - Hub synchronization completed
 * - Runtime lifecycle may transition automatically
 * - progress or achievements changed locally
 * - reward or economy entitlement
 *
 * Must not infer from ineligible_idempotent_replay:
 * - the prior local apply definitely occurred
 * - replay is globally complete
 * - a new apply may be attempted
 *
 * Must not infer from ineligible_rejected:
 * - auto-retry permission
 * - claim mutation permission
 *
 * SQL remains the sole submit decision and mutation authority.
 * Existing acknowledgment is the only trusted classification input.
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
  type GamesRuntimeSubmitOutcomeAcknowledgment,
  type GamesRuntimeSubmitOutcomeAcknowledgmentStatus,
} from "./gamesHubRuntimeSubmitOutcomeAcknowledgment";
import { validateGameSessionId } from "./gamesSessions";

/**
 * Bounded eligibility statuses derived only from trusted acknowledgment
 * acknowledgmentStatus. No additional invented states.
 */
export const GAMES_RUNTIME_SUBMIT_OUTCOME_APPLY_ELIGIBILITY_STATUSES = [
  "ineligible_rejected",
  "eligible_accepted_fresh",
  "ineligible_idempotent_replay",
] as const;

export type GamesRuntimeSubmitOutcomeApplyEligibilityStatus =
  (typeof GAMES_RUNTIME_SUBMIT_OUTCOME_APPLY_ELIGIBILITY_STATUSES)[number];

/**
 * Immutable Hub Runtime eligibility view of a trusted submit outcome
 * acknowledgment.
 *
 * Metadata / classification only — not apply authority, lifecycle
 * transition, handoff mutation, reapply permission, progress/achievement
 * mutation, reward/economy entitlement, or Hub synchronization.
 *
 * `applied`, `mutatesRuntime`, `mutatesHandoff`, and `permitsReapply` are
 * always literal `false`.
 */
export type GamesRuntimeSubmitOutcomeApplyEligibility = Readonly<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus;
  eligibilityStatus: GamesRuntimeSubmitOutcomeApplyEligibilityStatus;
  decisionStatus: GamesResultDecisionStatus;
  idempotentReplay: boolean;
  applied: false;
  mutatesRuntime: false;
  mutatesHandoff: false;
  permitsReapply: false;
}>;

const ACKNOWLEDGMENT_KEYS = [
  "runtimeSessionId",
  "gameId",
  "playerId",
  "platformSessionId",
  "resultId",
  "acknowledgmentStatus",
  "decisionStatus",
  "rejectionReason",
  "recordedScore",
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

/**
 * Consistency between acknowledgmentStatus and decisionStatus /
 * idempotentReplay — mirrors acknowledgment classification rules exactly.
 */
function isConsistentAcknowledgmentState(
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus,
  decisionStatus: GamesResultDecisionStatus,
  idempotentReplay: boolean
): boolean {
  if (acknowledgmentStatus === "rejected") {
    return decisionStatus === "rejected";
  }
  if (acknowledgmentStatus === "accepted_fresh") {
    return decisionStatus === "accepted" && idempotentReplay === false;
  }
  if (acknowledgmentStatus === "accepted_idempotent_replay") {
    return decisionStatus === "accepted" && idempotentReplay === true;
  }
  return false;
}

function classifyEligibilityStatus(
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus
): GamesRuntimeSubmitOutcomeApplyEligibilityStatus {
  if (acknowledgmentStatus === "rejected") {
    return "ineligible_rejected";
  }
  if (acknowledgmentStatus === "accepted_fresh") {
    return "eligible_accepted_fresh";
  }
  return "ineligible_idempotent_replay";
}

/**
 * Structural validation of an already-trusted Hub Runtime acknowledgment.
 * Does not re-parse Platform snake_case submit responses or re-classify
 * from raw observation decision metadata.
 */
function readTrustedAcknowledgment(
  raw: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeAcknowledgment> {
  if (!isPlainObject(raw)) {
    return fail("acknowledgment_invalid");
  }

  const allowed = new Set<string>(ACKNOWLEDGMENT_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return fail("acknowledgment_invalid");
    }
  }

  for (const key of ACKNOWLEDGMENT_KEYS) {
    if (!(key in raw)) {
      return fail("acknowledgment_invalid");
    }
  }

  if (typeof raw.runtimeSessionId !== "string" || raw.runtimeSessionId.length === 0) {
    return fail("acknowledgment_invalid");
  }
  if (typeof raw.gameId !== "string" || raw.gameId.length === 0) {
    return fail("acknowledgment_invalid");
  }
  if (typeof raw.playerId !== "string" || raw.playerId.length === 0) {
    return fail("acknowledgment_invalid");
  }

  const platformSessionId = validateGameSessionId(raw.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("acknowledgment_invalid");
  }

  const resultId = validateGameSessionId(raw.resultId);
  if (!resultId.ok) {
    return fail("acknowledgment_invalid");
  }

  if (!isAcknowledgmentStatus(raw.acknowledgmentStatus)) {
    return fail("unsupported_acknowledgment_status");
  }

  if (!isGamesResultDecisionStatus(raw.decisionStatus)) {
    return fail("inconsistent_acknowledgment_state");
  }

  if (raw.rejectionReason !== null && typeof raw.rejectionReason !== "string") {
    return fail("acknowledgment_invalid");
  }

  if (
    raw.recordedScore !== null &&
    (typeof raw.recordedScore !== "number" || !Number.isFinite(raw.recordedScore))
  ) {
    return fail("acknowledgment_invalid");
  }

  if (typeof raw.idempotentReplay !== "boolean") {
    return fail("inconsistent_acknowledgment_state");
  }

  if (raw.applied !== false) {
    return fail("acknowledgment_invalid");
  }
  if (raw.mutatesRuntime !== false) {
    return fail("acknowledgment_invalid");
  }
  if (raw.mutatesHandoff !== false) {
    return fail("acknowledgment_invalid");
  }
  if (raw.permitsReapply !== false) {
    return fail("acknowledgment_invalid");
  }

  if (
    !isConsistentAcknowledgmentState(
      raw.acknowledgmentStatus,
      raw.decisionStatus,
      raw.idempotentReplay
    )
  ) {
    return fail("inconsistent_acknowledgment_state");
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
      decisionStatus: raw.decisionStatus,
      rejectionReason: raw.rejectionReason,
      recordedScore: raw.recordedScore,
      idempotentReplay: raw.idempotentReplay,
      applied: false as const,
      mutatesRuntime: false as const,
      mutatesHandoff: false as const,
      permitsReapply: false as const,
    }),
  };
}

/**
 * Pure fail-closed classifier: trusted outcome acknowledgment → eligibility.
 *
 * Continuity uses only fields guaranteed by current contracts:
 * runtimeSessionId, gameId, playerId, platformSessionId across runtime
 * session, completion handoff, and acknowledgment.
 *
 * Does not mutate inputs, perform apply, change lifecycle, set
 * handoff.applied, permit reapply, or call RPC.
 */
export function evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  trustedOutcomeAcknowledgment: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeApplyEligibility> {
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
    trustedOutcomeAcknowledgment === null ||
    trustedOutcomeAcknowledgment === undefined ||
    typeof trustedOutcomeAcknowledgment !== "object"
  ) {
    return fail("acknowledgment_invalid");
  }

  const acknowledgmentResult = readTrustedAcknowledgment(
    trustedOutcomeAcknowledgment
  );
  if (!acknowledgmentResult.ok) {
    return acknowledgmentResult;
  }

  const runtime = runtimeSession as GamesRuntimeSessionContract;
  const handoff = completionHandoff as GamesRuntimeCompletionHandoff;
  const acknowledgment = acknowledgmentResult.value;

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

  if (acknowledgment.runtimeSessionId !== runtime.runtimeSessionId) {
    return fail("acknowledgment_identity_mismatch");
  }

  if (acknowledgment.gameId !== runtime.gameId) {
    return fail("acknowledgment_identity_mismatch");
  }

  if (acknowledgment.playerId !== runtime.playerId) {
    return fail("acknowledgment_identity_mismatch");
  }

  if (acknowledgment.platformSessionId !== platformSessionId.value) {
    return fail("platform_session_id_mismatch");
  }

  const eligibilityStatus = classifyEligibilityStatus(
    acknowledgment.acknowledgmentStatus
  );

  return {
    ok: true,
    value: Object.freeze({
      runtimeSessionId: runtime.runtimeSessionId,
      gameId: runtime.gameId,
      playerId: runtime.playerId,
      platformSessionId: platformSessionId.value,
      resultId: acknowledgment.resultId,
      acknowledgmentStatus: acknowledgment.acknowledgmentStatus,
      eligibilityStatus,
      decisionStatus: acknowledgment.decisionStatus,
      idempotentReplay: acknowledgment.idempotentReplay,
      applied: false as const,
      mutatesRuntime: false as const,
      mutatesHandoff: false as const,
      permitsReapply: false as const,
    }),
  };
}
