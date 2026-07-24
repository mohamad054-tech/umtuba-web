/**
 * UM Games Privacy Settings Trusted V1 — fail-closed application clients.
 *
 * Wraps existing Platform Foundation RPCs:
 * - `get_my_game_privacy_settings` (lookup)
 * - `update_my_game_privacy_settings` (owner patch)
 *
 * Owner privacy preference metadata only — does not imply that public
 * sharing is active, that a public profile or leaderboard exists, that Hub
 * or social feeds may expose the data, reward/economy eligibility, or
 * Catalog existence / playability.
 *
 * NOT side-effect free.
 * - Lookup: SQL ensure-on-read may insert default
 *   `game_player_profiles` and `game_privacy_settings` rows via
 *   `game_ensure_privacy_settings` → `game_ensure_player_profile`
 *   (`ON CONFLICT DO NOTHING`).
 * - Update: SQL ensure-on-write may insert the same default rows via
 *   `game_ensure_player_profile` (`ON CONFLICT DO NOTHING`), then
 *   UPDATE preference columns. Application code must not duplicate ensure
 *   or default-row logic; SQL remains the sole ensure/default/mutation
 *   authority.
 *
 * Does not add a public-read surface or Hub Runtime / achievements /
 * progress / profiles / feeds / leaderboards wiring.
 *
 * Database authentication remains authoritative. No service-role. No
 * direct table reads or writes.
 */

import {
  GAMES_PUBLIC_RPCS,
  validatePrivacySettingsPatch,
  type GamesValidationErr,
  type GamesValidationResult,
} from "./gamesFoundation";

/**
 * Exact top-level keys from privacy settings jsonb_build_object
 * (`get_my_game_privacy_settings` / `update_my_game_privacy_settings`).
 * Table columns `user_id`, `created_at`, and `updated_at` are not returned.
 */
const GAMES_MY_PRIVACY_SETTINGS_VIEW_KEYS = [
  "share_achievements",
  "share_best_score",
  "share_level_or_progress",
  "share_activity",
] as const;

/**
 * Bounded owner privacy preference metadata from privacy settings RPCs.
 * Preference flags only — not public-sharing, Hub, reward, economy, or
 * playability authority.
 */
export type GamesMyPrivacySettingsView = {
  share_achievements: boolean;
  share_best_score: boolean;
  share_level_or_progress: boolean;
  share_activity: boolean;
};

/**
 * Exact allowlisted owner patch for `update_my_game_privacy_settings`.
 * Any non-empty subset of the four preference flags; omitted keys are not
 * sent and must not be overwritten by the client.
 */
export type GamesMyPrivacySettingsPatch = Partial<GamesMyPrivacySettingsView>;

/**
 * Minimal authenticated RPC client for trusted privacy settings reads/writes.
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
 * Parse one trusted privacy settings payload into an allowlisted view.
 * Rejects unknown fields and non-boolean values (fail-closed). Sole
 * response boundary for both get and update — callers must not surface
 * raw Supabase data.
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
 * Map a privacy RPC payload through `parseGamesMyPrivacySettingsResponse`.
 * SQL returns a jsonb object after ensure; it does not return null for
 * absence. Null/malformed payloads therefore fail closed — no trusted-null
 * success union.
 */
function parseGamesMyPrivacySettingsRpcResponse(
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
 * Validate an owner privacy patch before RPC.
 *
 * Reuses foundation `validatePrivacySettingsPatch` (allowlisted boolean
 * keys only) and additionally rejects empty objects — the trusted update
 * client must not call the RPC with a no-op patch.
 */
export function validateGamesMyPrivacySettingsPatch(
  raw: unknown
): GamesValidationResult<GamesMyPrivacySettingsPatch> {
  const validated = validatePrivacySettingsPatch(raw);
  if (!validated.ok) return validated;
  if (Object.keys(validated.value).length === 0) {
    return fail("privacy_empty");
  }
  return { ok: true, value: validated.value };
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
    return parseGamesMyPrivacySettingsRpcResponse(data);
  } catch {
    return fail("privacy_rpc_failed");
  }
}

/**
 * Trusted authenticated owner update via `update_my_game_privacy_settings`.
 *
 * Accepts only an exact allowlisted non-empty subset of preference flags.
 * Omitted fields are not sent in `p_patch` and are preserved by SQL
 * (`CASE WHEN p_patch ? key … ELSE keep`). Returned `true` preference
 * flags are private owner metadata only — they do not imply public
 * visibility, Hub/Runtime exposure, feed/leaderboard publication,
 * achievement/score/progress publication, or reward/economy eligibility.
 *
 * NOT side-effect free: SQL may insert default
 * `game_player_profiles` / `game_privacy_settings` rows via
 * `game_ensure_player_profile` (`ON CONFLICT DO NOTHING`) before UPDATE.
 * Do not duplicate ensure/default/mutation logic in application code.
 */
export async function updateMyGamePrivacySettingsTrusted(
  client: GamesPrivacySettingsRpcClient,
  patch: unknown
): Promise<GamesValidationResult<GamesMyPrivacySettingsView>> {
  const patchResult = validateGamesMyPrivacySettingsPatch(patch);
  if (!patchResult.ok) return patchResult;

  try {
    const { data, error } = await client.rpc(GAMES_PUBLIC_RPCS.updateMyPrivacy, {
      p_patch: patchResult.value,
    });
    if (error) {
      return fail("privacy_rpc_failed");
    }
    return parseGamesMyPrivacySettingsRpcResponse(data);
  } catch {
    return fail("privacy_rpc_failed");
  }
}
