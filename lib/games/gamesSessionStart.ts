/**
 * UM Games Session Start Trusted V1 — fail-closed application client.
 *
 * Wraps existing Catalog-integrated RPC `start_game_session` (active body
 * after `20260847`; Platform `20260846` body superseded for Catalog gates).
 *
 * Create/resume session metadata only — does not imply Hub Runtime is active,
 * that game code has launched, permission to submit a result, Catalog
 * visibility outside SQL, matchmaking/multiplayer authority, or reward /
 * economy entitlement. Does not populate Hub Runtime `platformSessionId`.
 *
 * SQL Catalog and session gates remain the sole authority for whether a game
 * may start, whether an existing session resumes, whether an old session
 * expires, session TTL, and one-active-session behavior. This module does
 * not pre-read Catalog, does not call `isCatalogPlayable`, and does not
 * invent a second start/playability state machine.
 *
 * NOT side-effect free: SQL may insert default `game_player_profiles` /
 * `game_privacy_settings` rows via `game_ensure_player_profile`, may expire
 * a due active session, and may insert a new `game_sessions` row or resume
 * an existing one. Application code must not duplicate those gates.
 *
 * Database authentication remains authoritative. No service-role. No direct
 * table reads or writes.
 */

import {
  GAMES_PUBLIC_RPCS,
  type GamesValidationErr,
  type GamesValidationResult,
} from "./gamesFoundation";

/** UUID shape required by SQL `p_game_id uuid`. */
const GAME_SESSION_START_GAME_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Exact top-level keys from `start_game_session` jsonb_build_object
 * (create and resume paths share this shape).
 */
const GAMES_MY_SESSION_START_VIEW_KEYS = [
  "session_id",
  "game_id",
  "status",
  "started_at",
  "expires_at",
  "resumed",
] as const;

/**
 * Bounded create/resume session metadata from `start_game_session`.
 * Metadata only — not Hub Runtime, gameplay launch, submit, reward, or
 * economy authority. SQL always returns `status = 'active'` on success.
 */
export type GamesMySessionStartView = {
  session_id: string;
  game_id: string;
  status: "active";
  started_at: string;
  expires_at: string;
  resumed: boolean;
};

/**
 * Minimal authenticated RPC client for trusted session start.
 * Intentionally narrow — no service-role, no direct table access.
 */
export type GamesSessionStartRpcClient = {
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
  if (
    typeof value !== "string" ||
    !GAME_SESSION_START_GAME_ID_RE.test(value.trim())
  ) {
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

/**
 * Validate a Catalog game UUID before calling start-session RPC.
 * Matches SQL `p_game_id uuid` shape. Does not check Catalog playability.
 */
export function validateGameSessionStartGameId(
  value: unknown
): GamesValidationResult<string> {
  if (
    typeof value !== "string" ||
    !GAME_SESSION_START_GAME_ID_RE.test(value.trim())
  ) {
    return fail("game_id_invalid");
  }
  return { ok: true, value: value.trim() };
}

/**
 * Parse one trusted `start_game_session` payload into an allowlisted view.
 * Rejects unknown fields, non-active status, non-boolean resumed, and
 * invalid UUIDs/timestamps (fail-closed). Sole response boundary — callers
 * must not surface raw Supabase data.
 */
export function parseGamesMySessionStartResponse(
  raw: unknown
): GamesValidationResult<GamesMySessionStartView> {
  if (!isPlainObject(raw)) return fail("session_start_not_object");

  const allowed = new Set<string>(GAMES_MY_SESSION_START_VIEW_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) return fail("session_start_unknown_field");
  }

  const sessionId = parseRequiredUuid(raw.session_id, "session_id_invalid");
  if (!sessionId.ok) return sessionId;

  const gameId = parseRequiredUuid(raw.game_id, "game_id_invalid");
  if (!gameId.ok) return gameId;

  // SQL create/resume success always returns status 'active'.
  if (raw.status !== "active") {
    return fail("session_status_invalid");
  }

  const startedAt = parseRequiredTimestamp(
    raw.started_at,
    "started_at_invalid"
  );
  if (!startedAt.ok) return startedAt;

  const expiresAt = parseRequiredTimestamp(
    raw.expires_at,
    "expires_at_invalid"
  );
  if (!expiresAt.ok) return expiresAt;

  if (typeof raw.resumed !== "boolean") {
    return fail("resumed_invalid");
  }

  return {
    ok: true,
    value: {
      session_id: sessionId.value,
      game_id: gameId.value,
      status: "active",
      started_at: startedAt.value,
      expires_at: expiresAt.value,
      resumed: raw.resumed,
    },
  };
}

/**
 * Map a start-session RPC payload through `parseGamesMySessionStartResponse`.
 * SQL returns a jsonb object on success; it does not return null for denial
 * (it raises). Null/malformed payloads therefore fail closed — no
 * trusted-null success union.
 */
function parseGamesMySessionStartRpcResponse(
  data: unknown
): GamesValidationResult<GamesMySessionStartView> {
  if (data === null || data === undefined) {
    return fail("session_start_response_invalid");
  }
  const parsed = parseGamesMySessionStartResponse(data);
  if (!parsed.ok) {
    return fail("session_start_response_invalid");
  }
  return parsed;
}

/**
 * Trusted authenticated create/resume via `start_game_session`.
 *
 * Session-start metadata only — does not imply Hub Runtime is active, that
 * game code has launched, permission to submit a result, Catalog visibility
 * outside SQL, matchmaking/multiplayer authority, or reward/economy
 * entitlement. Does not wire Hub Runtime `platformSessionId`.
 *
 * Catalog existence/status/availability/`sessions_enabled`, resume vs create,
 * lazy expiry, TTL, and one-active-session semantics remain SQL-authoritative.
 * Do not duplicate those checks or use `isCatalogPlayable` here.
 *
 * NOT side-effect free: SQL may ensure player profile/privacy defaults,
 * expire a due session, resume an active session, or insert a new session.
 */
export async function startMyGameSessionTrusted(
  client: GamesSessionStartRpcClient,
  gameId: unknown
): Promise<GamesValidationResult<GamesMySessionStartView>> {
  const idResult = validateGameSessionStartGameId(gameId);
  if (!idResult.ok) return idResult;

  try {
    const { data, error } = await client.rpc(GAMES_PUBLIC_RPCS.startSession, {
      p_game_id: idResult.value,
    });
    if (error) {
      return fail("session_start_rpc_failed");
    }
    return parseGamesMySessionStartRpcResponse(data);
  } catch {
    return fail("session_start_rpc_failed");
  }
}