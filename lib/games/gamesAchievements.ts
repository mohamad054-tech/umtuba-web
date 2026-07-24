/**
 * UM Games Achievements Lookup Trusted V1 — fail-closed application client.
 *
 * Wraps existing Platform Foundation RPC `get_my_game_achievements`.
 * Unlock metadata only — does not imply Catalog existence/visibility,
 * playability, runtime eligibility, session authority, reward entitlement,
 * wallet/economy credit, or achievement verification authority beyond the
 * RPC result itself.
 *
 * Does not connect to Hub Runtime `runtime.*` sessions or set any
 * Hub↔platform session linkage field.
 *
 * Database authentication remains authoritative. No service-role. No direct
 * table reads. No Catalog pre-read. No achievement unlock mutation in this
 * module.
 *
 * Empty-list contract: when the authenticated user has no unlocks for
 * `game_id`, SQL returns a success object with `achievements: []` (not an
 * error). That empty response is preserved exactly and must not be
 * interpreted as Catalog/game existence, playability, or reward authority.
 */

import {
  GAMES_PUBLIC_RPCS,
  type GamesValidationErr,
  type GamesValidationResult,
} from "./gamesFoundation";

/** UUID shape required by SQL `p_game_id uuid` / returned `achievement_id`. */
const GAME_ACHIEVEMENTS_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Exact top-level keys from `get_my_game_achievements` jsonb_build_object. */
const GAMES_MY_ACHIEVEMENTS_VIEW_KEYS = ["game_id", "achievements"] as const;

/**
 * Exact per-entry keys from SQL jsonb_build_object inside the achievements
 * array. `source_session_id` exists on the table but is not returned.
 */
const GAMES_MY_ACHIEVEMENT_ENTRY_KEYS = [
  "achievement_id",
  "achievement_key",
  "name",
  "description",
  "unlocked_at",
] as const;

/**
 * One unlocked achievement entry from `get_my_game_achievements`.
 * Unlock metadata only — not reward or economy authority.
 */
export type GamesMyAchievementEntryView = {
  achievement_id: string;
  achievement_key: string;
  name: string;
  description: string | null;
  unlocked_at: string;
};

/**
 * Bounded owner achievements payload from `get_my_game_achievements`.
 * Includes SQL empty-list shape (`achievements: []`) when no unlocks exist.
 * Ordering matches SQL: `unlocked_at` descending when entries are present.
 */
export type GamesMyAchievementsView = {
  game_id: string;
  achievements: GamesMyAchievementEntryView[];
};

/**
 * Minimal authenticated RPC client for trusted achievements reads.
 * Intentionally narrow — no service-role, no direct table access.
 */
export type GamesAchievementsRpcClient = {
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
  if (typeof value !== "string" || !GAME_ACHIEVEMENTS_UUID_RE.test(value.trim())) {
    return fail(reason);
  }
  return { ok: true, value: value.trim() };
}

function parseRequiredNonEmptyString(
  value: unknown,
  reason: string
): GamesValidationResult<string> {
  if (typeof value !== "string" || value.trim().length < 1) {
    return fail(reason);
  }
  return { ok: true, value };
}

function parseNullableString(
  value: unknown,
  reason: string
): GamesValidationResult<string | null> {
  if (value === null) return { ok: true, value: null };
  if (typeof value !== "string") {
    return fail(reason);
  }
  return { ok: true, value };
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
 * Validate a platform game UUID before calling get-my-achievements RPC.
 * Matches SQL `p_game_id uuid` shape.
 */
export function validateGameAchievementsGameId(
  value: unknown
): GamesValidationResult<string> {
  if (typeof value !== "string" || !GAME_ACHIEVEMENTS_UUID_RE.test(value.trim())) {
    return fail("game_id_invalid");
  }
  return { ok: true, value: value.trim() };
}

/**
 * Parse one achievement entry from the SQL achievements array.
 * Rejects unknown fields and invalid shapes (fail-closed).
 */
export function parseGamesMyAchievementEntry(
  raw: unknown
): GamesValidationResult<GamesMyAchievementEntryView> {
  if (!isPlainObject(raw)) return fail("achievement_entry_invalid");

  const allowed = new Set<string>(GAMES_MY_ACHIEVEMENT_ENTRY_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) return fail("achievement_entry_unknown_field");
  }

  const achievementId = parseRequiredUuid(
    raw.achievement_id,
    "achievement_id_invalid"
  );
  if (!achievementId.ok) return achievementId;

  const achievementKey = parseRequiredNonEmptyString(
    raw.achievement_key,
    "achievement_key_invalid"
  );
  if (!achievementKey.ok) return achievementKey;

  const name = parseRequiredNonEmptyString(raw.name, "achievement_name_invalid");
  if (!name.ok) return name;

  const description = parseNullableString(
    raw.description,
    "achievement_description_invalid"
  );
  if (!description.ok) return description;

  const unlockedAt = parseRequiredTimestamp(
    raw.unlocked_at,
    "unlocked_at_invalid"
  );
  if (!unlockedAt.ok) return unlockedAt;

  return {
    ok: true,
    value: {
      achievement_id: achievementId.value,
      achievement_key: achievementKey.value,
      name: name.value,
      description: description.value,
      unlocked_at: unlockedAt.value,
    },
  };
}

/**
 * Parse one trusted `get_my_game_achievements` payload into an allowlisted view.
 * Rejects unknown fields and invalid shapes (fail-closed).
 * Sole response boundary — callers must not surface raw Supabase data.
 *
 * Accepts both populated unlock lists and SQL empty-list objects
 * (`achievements: []`).
 */
export function parseGamesMyAchievementsResponse(
  raw: unknown
): GamesValidationResult<GamesMyAchievementsView> {
  if (!isPlainObject(raw)) return fail("achievements_not_object");

  const allowed = new Set<string>(GAMES_MY_ACHIEVEMENTS_VIEW_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) return fail("achievements_unknown_field");
  }

  const gameId = parseRequiredUuid(raw.game_id, "game_id_invalid");
  if (!gameId.ok) return gameId;

  if (!Array.isArray(raw.achievements)) {
    return fail("achievements_array_invalid");
  }

  const achievements: GamesMyAchievementEntryView[] = [];
  for (const entry of raw.achievements) {
    const parsed = parseGamesMyAchievementEntry(entry);
    if (!parsed.ok) return parsed;
    achievements.push(parsed.value);
  }

  return {
    ok: true,
    value: {
      game_id: gameId.value,
      achievements,
    },
  };
}

/**
 * Map a get-my-achievements RPC payload through `parseGamesMyAchievementsResponse`.
 * SQL returns a jsonb object on success (including empty list); it never
 * returns null for absence. Null/malformed payloads therefore fail closed —
 * no trusted-null success union.
 */
function parseGamesMyAchievementsGetResponse(
  data: unknown
): GamesValidationResult<GamesMyAchievementsView> {
  if (data === null || data === undefined) {
    return fail("achievements_response_invalid");
  }
  const parsed = parseGamesMyAchievementsResponse(data);
  if (!parsed.ok) {
    return fail("achievements_response_invalid");
  }
  return parsed;
}

/**
 * Trusted authenticated lookup via `get_my_game_achievements`.
 *
 * Unlock metadata only — does not imply Catalog existence or visibility,
 * playability, runtime eligibility, session authority, reward entitlement,
 * wallet/economy credit, or achievement verification authority outside the
 * RPC result. Does not wire Hub Runtime platform session linkage.
 *
 * When the caller has no unlocks for the game, SQL returns
 * `{ game_id, achievements: [] }`. That success payload is preserved and
 * must not be treated as proof that the game exists in Catalog.
 */
export async function getMyGameAchievementsTrusted(
  client: GamesAchievementsRpcClient,
  gameId: unknown
): Promise<GamesValidationResult<GamesMyAchievementsView>> {
  const idResult = validateGameAchievementsGameId(gameId);
  if (!idResult.ok) return idResult;

  try {
    const { data, error } = await client.rpc(
      GAMES_PUBLIC_RPCS.getMyAchievements,
      {
        p_game_id: idResult.value,
      }
    );
    if (error) {
      return fail("achievements_rpc_failed");
    }
    return parseGamesMyAchievementsGetResponse(data);
  } catch {
    return fail("achievements_rpc_failed");
  }
}
