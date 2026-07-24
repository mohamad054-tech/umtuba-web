/**
 * UM Games Session Result Submit Response Parser Trusted V1 —
 * pure fail-closed parser for `submit_game_session_result` success payloads.
 *
 * Parses only the exact SQL `jsonb_build_object` success shape from
 * `supabase/migrations/20260846_games_platform_foundation_v1.sql`.
 * Does not call Supabase or any RPC. Does not implement a submit client.
 * Does not perform ownership, expiry, idempotency replay, claim
 * acceptance/rejection, progress, achievement, reward, or economy logic.
 *
 * Parsing success must not be treated as:
 * - caller owned the session
 * - session was active or unexpired
 * - claim was valid
 * - result was newly applied
 * - idempotent replay is safe to reapply
 * - progress or achievements changed
 * - reward / points / economy entitlement
 *
 * SQL `submit_game_session_result` remains the sole result decision and
 * mutation authority. Hub Runtime authority remains closed.
 *
 * Do not reuse the nested get-my-session result parser — that shape differs
 * (includes level/decided timestamps; omits session id / idempotent flag).
 */

import {
  GAMES_RESULT_DECISION_STATUSES,
  type GamesResultDecisionStatus,
  type GamesValidationErr,
  type GamesValidationResult,
} from "./gamesFoundation";
import { validateGameSessionId } from "./gamesSessions";

/**
 * Exact top-level keys from `submit_game_session_result` jsonb_build_object
 * (fresh insert and idempotent replay share this shape).
 */
const GAMES_SESSION_RESULT_SUBMIT_RESPONSE_KEYS = [
  "session_id",
  "result_id",
  "decision_status",
  "rejection_reason",
  "recorded_score",
  "idempotent_replay",
] as const;

/**
 * Bounded immutable metadata from a successful
 * `submit_game_session_result` payload.
 *
 * Metadata only — not ownership, acceptance authority, replay safety,
 * progress/achievement mutation, reward/economy, or Hub Runtime authority.
 */
export type GamesSessionResultSubmitResponseView = {
  readonly session_id: string;
  readonly result_id: string;
  readonly decision_status: GamesResultDecisionStatus;
  readonly rejection_reason: string | null;
  readonly recorded_score: number | null;
  readonly idempotent_replay: boolean;
};

function fail(reason: string): GamesValidationErr {
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
 * Nullable recorded score per SQL:
 * `recorded_score is null or recorded_score >= 0` (finite number).
 * No invented upper bound or cross-field decision rules.
 */
function parseNullableRecordedScore(
  value: unknown
): GamesValidationResult<number | null> {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return fail("recorded_score_invalid");
  }
  return { ok: true, value };
}

/**
 * Nullable rejection reason per SQL:
 * `rejection_reason is null or char_length(rejection_reason) <= 120`.
 * No invented rule requiring null when accepted or non-null when rejected
 * (table has no such CHECK; idempotent replay returns stored values).
 */
function parseNullableRejectionReason(
  value: unknown
): GamesValidationResult<string | null> {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string" || value.length > 120) {
    return fail("rejection_reason_invalid");
  }
  return { ok: true, value };
}

/**
 * Parse one trusted `submit_game_session_result` success payload into an
 * allowlisted immutable view. Rejects unknown fields, missing keys,
 * unsupported decision statuses, and invalid shapes (fail-closed).
 *
 * Pure and side-effect free: no RPC, no mutation, no ownership/expiry/
 * replay/acceptance/progress/achievement/reward authority.
 */
export function parseGamesSessionResultSubmitResponse(
  raw: unknown
): GamesValidationResult<GamesSessionResultSubmitResponseView> {
  if (!isPlainObject(raw)) {
    return fail("submit_response_not_object");
  }

  const allowed = new Set<string>(GAMES_SESSION_RESULT_SUBMIT_RESPONSE_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) {
      return fail("submit_response_unknown_field");
    }
  }

  for (const key of GAMES_SESSION_RESULT_SUBMIT_RESPONSE_KEYS) {
    if (!(key in raw)) {
      return fail("submit_response_missing_field");
    }
  }

  const sessionId = validateGameSessionId(raw.session_id);
  if (!sessionId.ok) return sessionId;

  const resultIdParsed = validateGameSessionId(raw.result_id);
  if (!resultIdParsed.ok) {
    return fail("result_id_invalid");
  }

  if (!isGamesResultDecisionStatus(raw.decision_status)) {
    return fail("decision_status_invalid");
  }

  const rejectionReason = parseNullableRejectionReason(raw.rejection_reason);
  if (!rejectionReason.ok) return rejectionReason;

  const recordedScore = parseNullableRecordedScore(raw.recorded_score);
  if (!recordedScore.ok) return recordedScore;

  if (typeof raw.idempotent_replay !== "boolean") {
    return fail("idempotent_replay_invalid");
  }

  return {
    ok: true,
    value: Object.freeze({
      session_id: sessionId.value,
      result_id: resultIdParsed.value,
      decision_status: raw.decision_status,
      rejection_reason: rejectionReason.value,
      recorded_score: recordedScore.value,
      idempotent_replay: raw.idempotent_replay,
    }),
  };
}
