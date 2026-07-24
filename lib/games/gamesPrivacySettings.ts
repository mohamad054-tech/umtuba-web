/**
 * UM Games Privacy Settings Lookup Trusted V1 — fail-closed application client.
 *
 * Wraps existing Platform Foundation RPC `get_my_game_privacy_settings`.
 * Owner privacy preference metadata only — does not imply that public
 * sharing is active, that a public profile or leaderboard exists, that Hub
 * or social feeds may expose the data, reward/economy eligibility, or
 * Catalog existence / playability.
 *
 * NOT side-effect free. SQL ensure-on-read may insert default
 * `game_player_profiles` and `game_privacy_settings` rows via
 * `game_ensure_privacy_settings` → `game_ensure_player_profile`
 * (`ON CONFLICT DO NOTHING`). Application code must not duplicate ensure
 * or default-row logic; SQL remains the sole ensure/default authority.
 *
 * Does not implement `update_my_game_privacy_settings`, public-read
 * surfaces, or Hub Runtime / achievements / progress / profiles / feeds /
 * leaderboards wiring.
 *
 * Database authentication remains authoritative. No service-role. No
 * direct table reads.
 */

import {
  GAMES_PUBLIC_RPCS,
  type GamesValidationErr,
  type GamesValidationResult,
} from "./gamesFoundation";

/**
 * Exact top-level keys from `get_my_game_privacy_settings` jsonb_build_object.
 * Table columns `user_id`, `created_at`, and `updated_at` are not returned.
 */
const GAMES_MY_PRIVACY_SETTINGS_VIEW_KEYS = [
  "share_achievements",
  "share_best_score",
  "share_level_or_progress",
  "share_activity",
] as const;

/**
 * Bounded owner privacy preference metadata from
 * `get_my_game_privacy_settings`. Preference flags only — not public-sharing,
 * Hub, reward, economy, or playability authority.
 */
export type GamesMyPrivacySettingsView = {
  share_achievements: boolean;
  share_best_score: boolean;
  share_level_or_progress: boolean;
  share_activity: boolean;
};

/**
 * Minimal authenticated RPC client for trusted privacy settings reads.
 * Intentionally narrow — no service-role, no direct table access.
 */
export type GamesPrivacySettingsRpcClient = {
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

function parseRequiredBoolean(
  value: unknown,
  reason: string
): GamesValidationResult<boolean> {
  if (typeof value !== "boolean") {
    return fail(reason);
  }
  return { ok: true, value };
}

/**
 * Parse one trusted `get_my_game_privacy_settings` payload into an
 * allowlisted view. Rejects unknown fields and non-boolean values
 * (fail-closed). Sole response boundary — callers must not surface raw
 * Supabase data.
 *
 * Accepts SQL default-all-false rows and any mixed boolean preferences.
 */
export function parseGamesMyPrivacySettingsResponse(
  raw: unknown
): GamesValidationResult<GamesMyPrivacySettingsView> {
  if (!isPlainObject(raw)) return fail("privacy_not_object");

  const allowed = new Set<string>(GAMES_MY_PRIVACY_SETTINGS_VIEW_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) return fail("privacy_unknown_field");
  }

  const shareAchievements = parseRequiredBoolean(
    raw.share_achievements,
    "share_achievements_invalid"
  );
  if (!shareAchievements.ok) return shareAchievements;

  const shareBestScore = parseRequiredBoolean(
    raw.share_best_score,
    "share_best_score_invalid"
  );
  if (!shareBestScore.ok) return shareBestScore;

  const shareLevelOrProgress = parseRequiredBoolean(
    raw.share_level_or_progress,
    "share_level_or_progress_invalid"
  );
  if (!shareLevelOrProgress.ok) return shareLevelOrProgress;

  const shareActivity = parseRequiredBoolean(
    raw.share_activity,
    "share_activity_invalid"
  );
  if (!shareActivity.ok) return shareActivity;

  return {
    ok: true,
    value: {
      share_achievements: shareAchievements.value,
      share_best_score: shareBestScore.value,
      share_level_or_progress: shareLevelOrProgress.value,
      share_activity: shareActivity.value,
    },
  };
}

/**
 * Map a get-my-privacy RPC payload through
 * `parseGamesMyPrivacySettingsResponse`. SQL returns a jsonb object after
 * ensure-on-read; it does not return null for absence. Null/malformed
 * payloads therefore fail closed — no trusted-null success union.
 */
function parseGamesMyPrivacySettingsGetResponse(
  data: unknown
): GamesValidationResult<GamesMyPrivacySettingsView> {
  if (data === null || data === undefined) {
    return fail("privacy_response_invalid");
  }
  const parsed = parseGamesMyPrivacySettingsResponse(data);
  if (!parsed.ok) {
    return fail("privacy_response_invalid");
  }
  return parsed;
}

/**
 * Trusted authenticated lookup via `get_my_game_privacy_settings`.
 *
 * Privacy preference metadata only — does not imply public sharing is
 * active, that a public profile or leaderboard exists, that Hub or social
 * feeds may expose the data, reward/economy eligibility, or Catalog
 * existence / playability.
 *
 * NOT side-effect free: SQL may insert default
 * `game_player_profiles` / `game_privacy_settings` rows on first read
 * (`ON CONFLICT DO NOTHING`; repeated calls are idempotent). Do not
 * duplicate ensure/default logic in application code.
 */
export async function getMyGamePrivacySettingsTrusted(
  client: GamesPrivacySettingsRpcClient
): Promise<GamesValidationResult<GamesMyPrivacySettingsView>> {
  try {
    const { data, error } = await client.rpc(GAMES_PUBLIC_RPCS.getMyPrivacy);
    if (error) {
      return fail("privacy_rpc_failed");
    }
    return parseGamesMyPrivacySettingsGetResponse(data);
  } catch {
    return fail("privacy_rpc_failed");
  }
}
