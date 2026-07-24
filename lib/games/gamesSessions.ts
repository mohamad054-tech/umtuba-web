/**
 * UM Games Session Lookup Trusted V1 — fail-closed application client.
 *
 * Wraps existing Platform Foundation RPC `get_my_game_session`.
 * Metadata only — does not imply runtime eligibility, resume/start permission,
 * result submission authority, Catalog availability, Hub playability, or
 * matchmaking. Does not connect to Hub Runtime `runtime.*` sessions or set
 * any Hub↔platform session linkage field.
 *
 * Database ownership checks remain authoritative. No service-role. No direct
 * table reads. No session creation / start / submit in this module.
 */

import {
  GAMES_PUBLIC_RPCS,
  GAMES_RESULT_DECISION_STATUSES,
  type GamesResultDecisionStatus,
  type GamesSessionStatus,
  type GamesValidationErr,
  type GamesValidationResult,
  isGamesSessionStatus,
} from "./gamesFoundation";

/** UUID shape required by SQL `p_session_id uuid`. */
const GAME_SESSION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Exact top-level keys from `get_my_game_session` jsonb_build_object. */
const GAMES_MY_SESSION_VIEW_KEYS = [
  "session_id",
  "game_id",
  "status",
  "started_at",
  "expires_at",
  "submitted_at",
  "accepted_at",
  "rejected_at",
  "expired_at",
  "result",
] as const;

/** Exact nested keys when `result` is non-null. */
const GAMES_MY_SESSION_RESULT_KEYS = [
  "result_id",
  "decision_status",
  "rejection_reason",
  "recorded_score",
  "recorded_level",
  "decided_at",
] as const;

/**
 * Nested result metadata from `get_my_game_session` when a result row exists.
 * Does not authorize replay, economy, or Hub Runtime.
 */
export type GamesMySessionResultView = {
  result_id: string;
  decision_status: GamesResultDecisionStatus;
  rejection_reason: string | null;
  recorded_score: number | null;
  recorded_level: number | null;
  decided_at: string;
};

/**
 * Bounded owner session metadata from `get_my_game_session`.
 * Note: SQL does not return `cancelled_at` even when status is `cancelled`.
 */
export type GamesMySessionView = {
  session_id: string;
  game_id: string;
  status: GamesSessionStatus;
  started_at: string;
  expires_at: string;
  submitted_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  expired_at: string | null;
  result: GamesMySessionResultView | null;
};

/**
 * Minimal authenticated RPC client for trusted session reads.
 * Intentionally narrow — no service-role, no direct table access.
 */
export type GamesSessionsRpcClient = {
  rpc(
    fn: string,
    args?: Record<string, unknown>
  ): PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

function fail(reason: string): GamesValidationErr {
  return { ok: false, reason };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseRequiredUuid(
  value: unknown,
  reason: string
): GamesValidationResult<string> {
  if (typeof value !== "string" || !GAME_SESSION_ID_RE.test(value.trim())) {
    return fail(reason);
  }
  return { ok: true, value: value.trim() };
}

function parseRequiredTimestamp(
  value: unknown,
  reason: string
): GamesValidationResult<string> {
  if (typeof value !== "string" || value.trim().length < 1) {
    return fail(reason);
  }
  return { ok: true, value };
}

function parseNullableTimestamp(
  value: unknown,
  reason: string
): GamesValidationResult<string | null> {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string" || value.trim().length < 1) {
    return fail(reason);
  }
  return { ok: true, value };
}

function parseNullableFiniteNumber(
  value: unknown,
  reason: string
): GamesValidationResult<number | null> {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(reason);
  }
  return { ok: true, value };
}

function parseNullableInteger(
  value: unknown,
  reason: string
): GamesValidationResult<number | null> {
  if (value === null) return { ok: true, value: null };
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value)
  ) {
    return fail(reason);
  }
  return { ok: true, value };
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
 * Validate a platform session UUID before calling get-my-session RPC.
 * Matches SQL `p_session_id uuid` / Catalog entry-id shape.
 */
export function validateGameSessionId(
  value: unknown
): GamesValidationResult<string> {
  if (typeof value !== "string" || !GAME_SESSION_ID_RE.test(value.trim())) {
    return fail("session_id_invalid");
  }
  return { ok: true, value: value.trim() };
}

function parseGamesMySessionResult(
  raw: unknown
): GamesValidationResult<GamesMySessionResultView> {
  if (!isPlainObject(raw)) return fail("session_result_not_object");

  const allowed = new Set<string>(GAMES_MY_SESSION_RESULT_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) return fail("session_result_unknown_field");
  }

  const resultId = parseRequiredUuid(raw.result_id, "result_id_invalid");
  if (!resultId.ok) return resultId;

  if (!isGamesResultDecisionStatus(raw.decision_status)) {
    return fail("decision_status_invalid");
  }

  let rejection_reason: string | null = null;
  if (raw.rejection_reason !== null) {
    if (typeof raw.rejection_reason !== "string") {
      return fail("rejection_reason_invalid");
    }
    rejection_reason = raw.rejection_reason;
  }

  const recordedScore = parseNullableFiniteNumber(
    raw.recorded_score,
    "recorded_score_invalid"
  );
  if (!recordedScore.ok) return recordedScore;

  const recordedLevel = parseNullableInteger(
    raw.recorded_level,
    "recorded_level_invalid"
  );
  if (!recordedLevel.ok) return recordedLevel;

  const decidedAt = parseRequiredTimestamp(
    raw.decided_at,
    "decided_at_invalid"
  );
  if (!decidedAt.ok) return decidedAt;

  return {
    ok: true,
    value: {
      result_id: resultId.value,
      decision_status: raw.decision_status,
      rejection_reason,
      recorded_score: recordedScore.value,
      recorded_level: recordedLevel.value,
      decided_at: decidedAt.value,
    },
  };
}

/**
 * Parse one trusted `get_my_game_session` payload into an allowlisted view.
 * Rejects unknown fields, unsupported statuses, and invalid shapes (fail-closed).
 * Sole response boundary — callers must not surface raw Supabase data.
 */
export function parseGamesMySessionResponse(
  raw: unknown
): GamesValidationResult<GamesMySessionView> {
  if (!isPlainObject(raw)) return fail("session_not_object");

  const allowed = new Set<string>(GAMES_MY_SESSION_VIEW_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) return fail("session_unknown_field");
  }

  const sessionId = parseRequiredUuid(raw.session_id, "session_id_invalid");
  if (!sessionId.ok) return sessionId;

  const gameId = parseRequiredUuid(raw.game_id, "game_id_invalid");
  if (!gameId.ok) return gameId;

  if (!isGamesSessionStatus(raw.status)) {
    return fail("session_status_invalid");
  }

  const startedAt = parseRequiredTimestamp(raw.started_at, "started_at_invalid");
  if (!startedAt.ok) return startedAt;

  const expiresAt = parseRequiredTimestamp(raw.expires_at, "expires_at_invalid");
  if (!expiresAt.ok) return expiresAt;

  const submittedAt = parseNullableTimestamp(
    raw.submitted_at,
    "submitted_at_invalid"
  );
  if (!submittedAt.ok) return submittedAt;

  const acceptedAt = parseNullableTimestamp(
    raw.accepted_at,
    "accepted_at_invalid"
  );
  if (!acceptedAt.ok) return acceptedAt;

  const rejectedAt = parseNullableTimestamp(
    raw.rejected_at,
    "rejected_at_invalid"
  );
  if (!rejectedAt.ok) return rejectedAt;

  const expiredAt = parseNullableTimestamp(
    raw.expired_at,
    "expired_at_invalid"
  );
  if (!expiredAt.ok) return expiredAt;

  let result: GamesMySessionResultView | null = null;
  if (raw.result !== null) {
    const parsedResult = parseGamesMySessionResult(raw.result);
    if (!parsedResult.ok) return parsedResult;
    result = parsedResult.value;
  }

  return {
    ok: true,
    value: {
      session_id: sessionId.value,
      game_id: gameId.value,
      status: raw.status,
      started_at: startedAt.value,
      expires_at: expiresAt.value,
      submitted_at: submittedAt.value,
      accepted_at: acceptedAt.value,
      rejected_at: rejectedAt.value,
      expired_at: expiredAt.value,
      result,
    },
  };
}

/**
 * Map a get-my-session RPC payload through `parseGamesMySessionResponse`.
 * SQL never returns null for absence (it raises with a shared deny message);
 * null/malformed payloads therefore fail closed — no trusted-null success union.
 */
function parseGamesMySessionGetResponse(
  data: unknown
): GamesValidationResult<GamesMySessionView> {
  if (data === null || data === undefined) {
    return fail("session_response_invalid");
  }
  const parsed = parseGamesMySessionResponse(data);
  if (!parsed.ok) {
    return fail("session_response_invalid");
  }
  return parsed;
}

/**
 * Trusted authenticated lookup via `get_my_game_session`.
 *
 * Metadata only — does not imply runtime eligibility, permission to resume or
 * start play, permission to submit results, Catalog availability, Hub card
 * playability, or matchmaking authority. Does not wire Hub Runtime platform
 * session linkage.
 *
 * Not-found and non-owner share SQL deny `'Not allowed to read this game
 * session'`; this client maps RPC errors to fail-closed `session_rpc_failed`
 * and never invents a success-null.
 */
export async function getMyGameSessionTrusted(
  client: GamesSessionsRpcClient,
  sessionId: unknown
): Promise<GamesValidationResult<GamesMySessionView>> {
  const idResult = validateGameSessionId(sessionId);
  if (!idResult.ok) return idResult;

  try {
    const { data, error } = await client.rpc(GAMES_PUBLIC_RPCS.getMySession, {
      p_session_id: idResult.value,
    });
    if (error) {
      return fail("session_rpc_failed");
    }
    return parseGamesMySessionGetResponse(data);
  } catch {
    return fail("session_rpc_failed");
  }
}
