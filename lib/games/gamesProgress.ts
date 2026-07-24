/**
 * UM Games Progress Lookup Trusted V1 — fail-closed application client.
 *
 * Wraps existing Platform Foundation RPC `get_my_game_progress`.
 * Player progress metadata only — does not imply Catalog existence/visibility,
 * playability, runtime eligibility, session authority, reward entitlement,
 * wallet/economy credit, or achievement completion authority.
 *
 * Does not connect to Hub Runtime `runtime.*` sessions or set any
 * Hub↔platform session linkage field.
 *
 * Database authentication remains authoritative. No service-role. No direct
 * table reads. No Catalog pre-read. No progress mutation in this module.
 *
 * Empty/default contract: when no `game_player_progress` row exists for the
 * authenticated user + game_id, SQL returns a success object with zeros/nulls
 * (not an error). That empty-default response is preserved exactly and must
 * not be interpreted as Catalog/game existence.
 */

import {
  GAMES_PUBLIC_RPCS,
  type GamesValidationErr,
  type GamesValidationResult,
} from "./gamesFoundation";

/** UUID shape required by SQL `p_game_id uuid`. */
const GAME_PROGRESS_GAME_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Exact top-level keys from `get_my_game_progress` jsonb_build_object. */
const GAMES_MY_PROGRESS_VIEW_KEYS = [
  "game_id",
  "play_count",
  "accepted_result_count",
  "best_score",
  "current_level",
  "experience_value",
  "last_played_at",
] as const;

/**
 * Bounded owner progress metadata from `get_my_game_progress`.
 * Includes SQL empty-default shape (zeros / nulls) when no row exists.
 */
export type GamesMyProgressView = {
  game_id: string;
  play_count: number;
  accepted_result_count: number;
  best_score: number | null;
  current_level: number;
  experience_value: number;
  last_played_at: string | null;
};

/**
 * Minimal authenticated RPC client for trusted progress reads.
 * Intentionally narrow — no service-role, no direct table access.
 */
export type GamesProgressRpcClient = {
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
  if (typeof value !== "string" || !GAME_PROGRESS_GAME_ID_RE.test(value.trim())) {
    return fail(reason);
  }
  return { ok: true, value: value.trim() };
}

function parseNonNegativeInteger(
  value: unknown,
  reason: string
): GamesValidationResult<number> {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < 0
  ) {
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

/**
 * Validate a platform game UUID before calling get-my-progress RPC.
 * Matches SQL `p_game_id uuid` / Catalog entry-id shape.
 */
export function validateGameProgressGameId(
  value: unknown
): GamesValidationResult<string> {
  if (typeof value !== "string" || !GAME_PROGRESS_GAME_ID_RE.test(value.trim())) {
    return fail("game_id_invalid");
  }
  return { ok: true, value: value.trim() };
}

/**
 * Parse one trusted `get_my_game_progress` payload into an allowlisted view.
 * Rejects unknown fields and invalid shapes (fail-closed).
 * Sole response boundary — callers must not surface raw Supabase data.
 *
 * Accepts both populated rows and SQL empty-default objects (zeros / nulls).
 */
export function parseGamesMyProgressResponse(
  raw: unknown
): GamesValidationResult<GamesMyProgressView> {
  if (!isPlainObject(raw)) return fail("progress_not_object");

  const allowed = new Set<string>(GAMES_MY_PROGRESS_VIEW_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) return fail("progress_unknown_field");
  }

  const gameId = parseRequiredUuid(raw.game_id, "game_id_invalid");
  if (!gameId.ok) return gameId;

  const playCount = parseNonNegativeInteger(raw.play_count, "play_count_invalid");
  if (!playCount.ok) return playCount;

  const acceptedResultCount = parseNonNegativeInteger(
    raw.accepted_result_count,
    "accepted_result_count_invalid"
  );
  if (!acceptedResultCount.ok) return acceptedResultCount;

  const bestScore = parseNullableFiniteNumber(
    raw.best_score,
    "best_score_invalid"
  );
  if (!bestScore.ok) return bestScore;

  const currentLevel = parseNonNegativeInteger(
    raw.current_level,
    "current_level_invalid"
  );
  if (!currentLevel.ok) return currentLevel;

  const experienceValue = parseNonNegativeInteger(
    raw.experience_value,
    "experience_value_invalid"
  );
  if (!experienceValue.ok) return experienceValue;

  const lastPlayedAt = parseNullableTimestamp(
    raw.last_played_at,
    "last_played_at_invalid"
  );
  if (!lastPlayedAt.ok) return lastPlayedAt;

  return {
    ok: true,
    value: {
      game_id: gameId.value,
      play_count: playCount.value,
      accepted_result_count: acceptedResultCount.value,
      best_score: bestScore.value,
      current_level: currentLevel.value,
      experience_value: experienceValue.value,
      last_played_at: lastPlayedAt.value,
    },
  };
}

/**
 * Map a get-my-progress RPC payload through `parseGamesMyProgressResponse`.
 * SQL returns a jsonb object on success (including empty-default); it never
 * returns null for absence. Null/malformed payloads therefore fail closed —
 * no trusted-null success union.
 */
function parseGamesMyProgressGetResponse(
  data: unknown
): GamesValidationResult<GamesMyProgressView> {
  if (data === null || data === undefined) {
    return fail("progress_response_invalid");
  }
  const parsed = parseGamesMyProgressResponse(data);
  if (!parsed.ok) {
    return fail("progress_response_invalid");
  }
  return parsed;
}

/**
 * Trusted authenticated lookup via `get_my_game_progress`.
 *
 * Progress metadata only — does not imply Catalog existence or visibility,
 * playability, runtime eligibility, session authority, reward entitlement,
 * wallet/economy credit, or achievement completion authority. Does not wire
 * Hub Runtime platform session linkage.
 *
 * When no progress row exists, SQL returns empty defaults (zeros / nulls).
 * That success payload is preserved and must not be treated as proof that
 * the game exists in Catalog.
 */
export async function getMyGameProgressTrusted(
  client: GamesProgressRpcClient,
  gameId: unknown
): Promise<GamesValidationResult<GamesMyProgressView>> {
  const idResult = validateGameProgressGameId(gameId);
  if (!idResult.ok) return idResult;

  try {
    const { data, error } = await client.rpc(GAMES_PUBLIC_RPCS.getMyProgress, {
      p_game_id: idResult.value,
    });
    if (error) {
      return fail("progress_rpc_failed");
    }
    return parseGamesMyProgressGetResponse(data);
  } catch {
    return fail("progress_rpc_failed");
  }
}
