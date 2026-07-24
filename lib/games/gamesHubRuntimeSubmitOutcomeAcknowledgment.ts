/**
 * UM Games Hub Runtime Submit Outcome Acknowledgment Contract Trusted V1 —
 * pure fail-closed acknowledgment classifier only.
 *
 * Classifies an already-trusted Runtime submit outcome observation into a
 * bounded acknowledgment status after strict continuity checks against the
 * runtime session and completion handoff.
 *
 * Classification only — does not mutate runtime session or completion
 * handoff. Does not set handoff.applied to true. Does not change runtime
 * lifecycle state. Does not call Supabase, Submit, Start, or any RPC.
 * Does not open Hub authority. Does not permit reapply.
 *
 * Must not infer from accepted_fresh:
 * - local Runtime apply success
 * - Hub synchronization
 * - progress or achievement state
 * - reward / economy entitlement
 * - permission to transition lifecycle
 *
 * Must not infer from accepted_idempotent_replay:
 * - permission to reapply
 * - a new mutation occurred
 * - progress / achievements changed again
 *
 * Must not infer from rejected:
 * - Runtime should be retried automatically
 * - claim should be modified
 * - a new submit is permitted
 *
 * SQL remains the sole submit decision and mutation authority.
 * Existing outcome observation is the only decision metadata source.
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
import type { GamesRuntimeSubmitOutcomeObservation } from "./gamesHubRuntimeSubmitOutcomeAdaptation";
import { validateGameSessionId } from "./gamesSessions";

/**
 * Bounded acknowledgment statuses derived only from trusted observation
 * decisionStatus + idempotentReplay. No additional invented states.
 */
export const GAMES_RUNTIME_SUBMIT_OUTCOME_ACKNOWLEDGMENT_STATUSES = [
  "rejected",
  "accepted_fresh",
  "accepted_idempotent_replay",
] as const;

export type GamesRuntimeSubmitOutcomeAcknowledgmentStatus =
  (typeof GAMES_RUNTIME_SUBMIT_OUTCOME_ACKNOWLEDGMENT_STATUSES)[number];

/**
 * Immutable Hub Runtime acknowledgment view of a trusted submit outcome
 * observation.
 *
 * Metadata / classification only — not apply authority, lifecycle
 * transition, handoff mutation, reapply permission, progress/achievement
 * mutation, reward/economy entitlement, or Hub synchronization.
 *
 * `applied`, `mutatesRuntime`, `mutatesHandoff`, and `permitsReapply` are
 * always literal `false`.
 */
export type GamesRuntimeSubmitOutcomeAcknowledgment = Readonly<{
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  platformSessionId: string;
  resultId: string;
  acknowledgmentStatus: GamesRuntimeSubmitOutcomeAcknowledgmentStatus;
  decisionStatus: GamesResultDecisionStatus;
  rejectionReason: string | null;
  recordedScore: number | null;
  idempotentReplay: boolean;
  applied: false;
  mutatesRuntime: false;
  mutatesHandoff: false;
  permitsReapply: false;
}>;

const OBSERVATION_KEYS = [
  "runtimeSessionId",
  "gameId",
  "playerId",
  "platformSessionId",
  "resultId",
  "decisionStatus",
  "rejectionReason",
  "recordedScore",
  "idempotentReplay",
  "applied",
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

/**
 * Structural validation of an already-trusted Hub Runtime observation.
 * Does not re-parse Platform snake_case submit responses.
 */
function readTrustedObservation(
  raw: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeObservation> {
  if (!isPlainObject(raw)) {
    return fail("observation_invalid");
  }

  const allowed = new Set<string>(OBSERVATION_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return fail("observation_invalid");
    }
  }

  for (const key of OBSERVATION_KEYS) {
    if (!(key in raw)) {
      return fail("observation_invalid");
    }
  }

  if (typeof raw.runtimeSessionId !== "string" || raw.runtimeSessionId.length === 0) {
    return fail("observation_invalid");
  }
  if (typeof raw.gameId !== "string" || raw.gameId.length === 0) {
    return fail("observation_invalid");
  }
  if (typeof raw.playerId !== "string" || raw.playerId.length === 0) {
    return fail("observation_invalid");
  }

  const platformSessionId = validateGameSessionId(raw.platformSessionId);
  if (!platformSessionId.ok) {
    return fail("observation_invalid");
  }

  const resultId = validateGameSessionId(raw.resultId);
  if (!resultId.ok) {
    return fail("observation_invalid");
  }

  if (!isGamesResultDecisionStatus(raw.decisionStatus)) {
    return fail("unsupported_decision_status");
  }

  if (raw.rejectionReason !== null && typeof raw.rejectionReason !== "string") {
    return fail("observation_invalid");
  }

  if (
    raw.recordedScore !== null &&
    (typeof raw.recordedScore !== "number" || !Number.isFinite(raw.recordedScore))
  ) {
    return fail("observation_invalid");
  }

  if (typeof raw.idempotentReplay !== "boolean") {
    return fail("invalid_idempotent_replay");
  }

  if (raw.applied !== false) {
    return fail("observation_invalid");
  }

  return {
    ok: true,
    value: Object.freeze({
      runtimeSessionId: raw.runtimeSessionId,
      gameId: raw.gameId,
      playerId: raw.playerId,
      platformSessionId: platformSessionId.value,
      resultId: resultId.value,
      decisionStatus: raw.decisionStatus,
      rejectionReason: raw.rejectionReason,
      recordedScore: raw.recordedScore,
      idempotentReplay: raw.idempotentReplay,
      applied: false as const,
    }),
  };
}

function classifyAcknowledgmentStatus(
  decisionStatus: GamesResultDecisionStatus,
  idempotentReplay: boolean
): GamesRuntimeSubmitOutcomeAcknowledgmentStatus {
  if (decisionStatus === "rejected") {
    return "rejected";
  }
  if (idempotentReplay === false) {
    return "accepted_fresh";
  }
  return "accepted_idempotent_replay";
}

/**
 * Pure fail-closed classifier: trusted outcome observation → acknowledgment.
 *
 * Continuity uses only fields guaranteed by current contracts:
 * runtimeSessionId, gameId, playerId, platformSessionId across runtime
 * session, completion handoff, and observation.
 *
 * Does not mutate inputs, change lifecycle, set handoff.applied, permit
 * reapply, or call RPC.
 */
export function evaluateGamesRuntimeSubmitOutcomeAcknowledgmentTrusted(
  runtimeSession: unknown,
  completionHandoff: unknown,
  outcomeObservation: unknown
): GamesValidationResult<GamesRuntimeSubmitOutcomeAcknowledgment> {
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
    outcomeObservation === null ||
    outcomeObservation === undefined ||
    typeof outcomeObservation !== "object"
  ) {
    return fail("observation_invalid");
  }

  const observationResult = readTrustedObservation(outcomeObservation);
  if (!observationResult.ok) {
    return observationResult;
  }

  const runtime = runtimeSession as GamesRuntimeSessionContract;
  const handoff = completionHandoff as GamesRuntimeCompletionHandoff;
  const observation = observationResult.value;

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

  if (observation.runtimeSessionId !== runtime.runtimeSessionId) {
    return fail("observation_identity_mismatch");
  }

  if (observation.gameId !== runtime.gameId) {
    return fail("observation_identity_mismatch");
  }

  if (observation.playerId !== runtime.playerId) {
    return fail("observation_identity_mismatch");
  }

  if (observation.platformSessionId !== platformSessionId.value) {
    return fail("platform_session_id_mismatch");
  }

  const acknowledgmentStatus = classifyAcknowledgmentStatus(
    observation.decisionStatus,
    observation.idempotentReplay
  );

  return {
    ok: true,
    value: Object.freeze({
      runtimeSessionId: runtime.runtimeSessionId,
      gameId: runtime.gameId,
      playerId: runtime.playerId,
      platformSessionId: platformSessionId.value,
      resultId: observation.resultId,
      acknowledgmentStatus,
      decisionStatus: observation.decisionStatus,
      rejectionReason: observation.rejectionReason,
      recordedScore: observation.recordedScore,
      idempotentReplay: observation.idempotentReplay,
      applied: false as const,
      mutatesRuntime: false as const,
      mutatesHandoff: false as const,
      permitsReapply: false as const,
    }),
  };
}
