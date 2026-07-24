/**
 * UM Games Catalog Title Seed V1 — allowlisted, metadata-only title registration.
 *
 * Code readiness only. Does not apply migrations or execute remote seeds.
 * Sole mutation path: existing `upsert_game_catalog_entry` via
 * `upsertGamesCatalogEntryTrusted`. No service-role / direct table writes.
 */

import {
  type GamesCatalogDefinitionInput,
  type GamesCatalogEntryView,
  type GamesCatalogRpcClient,
  upsertGamesCatalogEntryTrusted,
  validateGamesCatalogDefinition,
} from "./gamesCatalog";
import type { GamesValidationErr, GamesValidationResult } from "./gamesFoundation";

/** Allowlisted seed identifiers — immutable application inputs, not client payloads. */
export const GAMES_CATALOG_TITLE_SEED_IDS = ["kick_blast"] as const;
export type GamesCatalogTitleSeedId =
  (typeof GAMES_CATALOG_TITLE_SEED_IDS)[number];

/**
 * Canonical UM Kick Blast catalog seed (metadata-only, non-playable).
 *
 * - `category: "action"` is a **provisional repository convention** required by
 *   the Catalog schema (category is non-null / allowlisted). It is not a final
 *   product classification.
 * - `sort_order` is intentionally omitted so the existing contract/database
 *   default (`0`) applies — no invented production ordering decision.
 * - Unknown marketing/asset/legal metadata stays absent/null.
 */
export const UM_KICK_BLAST_CATALOG_TITLE_SEED: GamesCatalogDefinitionInput =
  Object.freeze({
    game_key: "kick_blast",
    slug: "kick-blast",
    name: "UM Kick Blast",
    description: null,
    short_blurb: null,
    status: "active",
    availability: "coming_soon",
    visibility: "authenticated",
    category: "action",
    difficulty: "unset",
    min_players: 1,
    max_players: 1,
    platforms: Object.freeze(["web"]) as GamesCatalogDefinitionInput["platforms"],
    feature_flags: Object.freeze({
      sessions_enabled: false,
      achievements_enabled: false,
      progress_enabled: false,
      privacy_settings_enabled: false,
    }),
    catalog_version: 1,
    content_version: null,
    is_featured: false,
    result_validation_mode: "fail_closed",
  });

export const GAMES_CATALOG_TITLE_SEEDS: Readonly<
  Record<GamesCatalogTitleSeedId, GamesCatalogDefinitionInput>
> = Object.freeze({
  kick_blast: UM_KICK_BLAST_CATALOG_TITLE_SEED,
});

function fail(reason: string): GamesValidationErr {
  return { ok: false, reason };
}

export function isGamesCatalogTitleSeedId(
  value: unknown
): value is GamesCatalogTitleSeedId {
  return (
    typeof value === "string" &&
    (GAMES_CATALOG_TITLE_SEED_IDS as readonly string[]).includes(value)
  );
}

/**
 * Resolve + validate an allowlisted seed definition.
 * Forces `sessions_enabled === false` (fail closed otherwise).
 */
export function resolveGamesCatalogTitleSeed(
  seedId: unknown
): GamesValidationResult<GamesCatalogDefinitionInput> {
  if (!isGamesCatalogTitleSeedId(seedId)) {
    return fail("seed_unknown");
  }

  const raw = GAMES_CATALOG_TITLE_SEEDS[seedId];
  const validated = validateGamesCatalogDefinition({
    ...raw,
    platforms: [...(raw.platforms ?? [])],
    feature_flags: { ...(raw.feature_flags ?? {}) },
  });
  if (!validated.ok) return validated;

  if (validated.value.feature_flags?.sessions_enabled !== false) {
    return fail("seed_sessions_must_be_disabled");
  }

  return validated;
}

export type GamesCatalogTitleSeedAuth = {
  /** Authoritative platform-admin check (`is_platform_admin` / assertPlatformAdminDb). */
  assertPlatformAdmin(): Promise<boolean>;
};

/**
 * Admin-only registration of one allowlisted catalog title seed.
 *
 * Fail-closed on missing auth, unknown/malformed seed, sessions enabled,
 * RPC error, or unexpected upsert response. Idempotent via Catalog upsert
 * semantics (`on conflict (game_key)`).
 */
export async function registerGamesCatalogTitleSeed(
  client: GamesCatalogRpcClient,
  auth: GamesCatalogTitleSeedAuth,
  seedId: unknown
): Promise<GamesValidationResult<GamesCatalogEntryView>> {
  let isAdmin = false;
  try {
    isAdmin = await auth.assertPlatformAdmin();
  } catch {
    return fail("seed_auth_failed");
  }
  if (isAdmin !== true) {
    return fail("seed_unauthorized");
  }

  const seed = resolveGamesCatalogTitleSeed(seedId);
  if (!seed.ok) return seed;

  if (seed.value.feature_flags?.sessions_enabled !== false) {
    return fail("seed_sessions_must_be_disabled");
  }

  return upsertGamesCatalogEntryTrusted(client, seed.value);
}
