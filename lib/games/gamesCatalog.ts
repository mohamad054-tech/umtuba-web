/**
 * UM Games Catalog Foundation V1 — pure contracts & validators.
 *
 * Authoritative registry metadata for all UMTUBA games. Extends Platform
 * Foundation (`games` table) additively via migration 20260847.
 *
 * No gameplay, economy, UM Points, Ads, matchmaking, public leaderboards,
 * anti-cheat, or game logic. Future games register via catalog only.
 */

import {
  GAMES_CATALOG_STATUSES,
  GAMES_LIMITS,
  GAMES_RESULT_VALIDATION_MODES,
  type GamesCatalogStatus,
  type GamesResultValidationMode,
  type GamesValidationErr,
  type GamesValidationResult,
  isFiniteNumber,
  utf8ByteLength,
} from "./gamesFoundation";

export {
  GAMES_CATALOG_STATUSES,
  type GamesCatalogStatus,
} from "./gamesFoundation";

/** Catalog visibility — who may see the entry in list/get RPCs. */
export const GAMES_CATALOG_VISIBILITIES = [
  "hidden",
  "authenticated",
  "listed",
] as const;
export type GamesCatalogVisibility =
  (typeof GAMES_CATALOG_VISIBILITIES)[number];

/** Availability for play / listing UX (independent of session `status`). */
export const GAMES_CATALOG_AVAILABILITIES = [
  "available",
  "unavailable",
  "coming_soon",
  "maintenance",
] as const;
export type GamesCatalogAvailability =
  (typeof GAMES_CATALOG_AVAILABILITIES)[number];

/** Stable category keys — extend via migration + constants, not free-form spam. */
export const GAMES_CATALOG_CATEGORIES = [
  "action",
  "cards",
  "puzzle",
  "sports",
  "casual",
  "strategy",
  "other",
] as const;
export type GamesCatalogCategory = (typeof GAMES_CATALOG_CATEGORIES)[number];

export const GAMES_CATALOG_DIFFICULTIES = [
  "unset",
  "easy",
  "medium",
  "hard",
  "expert",
] as const;
export type GamesCatalogDifficulty =
  (typeof GAMES_CATALOG_DIFFICULTIES)[number];

export const GAMES_CATALOG_PLATFORMS = ["web", "ios", "android"] as const;
export type GamesCatalogPlatform = (typeof GAMES_CATALOG_PLATFORMS)[number];

/** Allowlisted feature-flag keys (boolean values only). */
export const GAMES_CATALOG_FEATURE_FLAG_KEYS = [
  "sessions_enabled",
  "achievements_enabled",
  "progress_enabled",
  "privacy_settings_enabled",
] as const;
export type GamesCatalogFeatureFlagKey =
  (typeof GAMES_CATALOG_FEATURE_FLAG_KEYS)[number];

export const GAMES_CATALOG_FEATURE_FLAG_DEFAULTS: Record<
  GamesCatalogFeatureFlagKey,
  boolean
> = {
  sessions_enabled: true,
  achievements_enabled: true,
  progress_enabled: true,
  privacy_settings_enabled: true,
};

export const GAMES_CATALOG_LIMITS = {
  nameMaxChars: 120,
  descriptionMaxChars: 4000,
  shortBlurbMaxChars: 280,
  contentVersionMaxChars: 64,
  minPlayersMin: 1,
  minPlayersMax: 64,
  maxPlayersMin: 1,
  maxPlayersMax: 64,
  sortOrderMin: 0,
  sortOrderMax: 1_000_000,
  catalogVersionMin: 1,
  catalogVersionMax: 1_000_000,
  featureFlagsMaxBytes: 1024,
  platformsMaxCount: 8,
} as const;

export const GAMES_CATALOG_PUBLIC_RPCS = {
  listCatalog: "list_games_catalog",
  getByKey: "get_game_catalog_by_key",
  getById: "get_game_catalog_by_id",
} as const;

export const GAMES_CATALOG_ADMIN_RPCS = {
  upsert: "upsert_game_catalog_entry",
  setLifecycle: "set_game_catalog_lifecycle",
} as const;

export const GAMES_CATALOG_INTERNAL_HELPERS = {
  validateDefinition: "game_catalog_validate_definition",
  rowToJson: "game_catalog_row_to_json",
} as const;

export type GamesCatalogFeatureFlags = Partial<
  Record<GamesCatalogFeatureFlagKey, boolean>
>;

export type GamesCatalogDefinitionInput = {
  game_key: string;
  slug: string;
  name: string;
  description?: string | null;
  short_blurb?: string | null;
  status: GamesCatalogStatus;
  availability: GamesCatalogAvailability;
  visibility: GamesCatalogVisibility;
  category: GamesCatalogCategory;
  difficulty: GamesCatalogDifficulty;
  min_players: number;
  max_players: number;
  platforms: GamesCatalogPlatform[];
  feature_flags?: GamesCatalogFeatureFlags;
  catalog_version: number;
  content_version?: string | null;
  sort_order?: number;
  is_featured?: boolean;
  result_validation_mode?: GamesResultValidationMode;
  session_ttl_seconds?: number;
};

export type GamesCatalogEntryView = GamesCatalogDefinitionInput & {
  id: string;
  result_validation_mode: GamesResultValidationMode;
  session_ttl_seconds: number;
  feature_flags: Record<GamesCatalogFeatureFlagKey, boolean>;
  sort_order: number;
  is_featured: boolean;
  created_at?: string;
  updated_at?: string;
};

function fail(reason: string): GamesValidationErr {
  return { ok: false, reason };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

const GAME_KEY_RE = /^[a-z][a-z0-9_]{1,62}[a-z0-9]$/;
const SLUG_RE = /^[a-z][a-z0-9-]{1,62}[a-z0-9]$/;
const CONTENT_VERSION_RE = /^[A-Za-z0-9._+-]{1,64}$/;

export function isGamesCatalogVisibility(
  value: unknown
): value is GamesCatalogVisibility {
  return (
    typeof value === "string" &&
    (GAMES_CATALOG_VISIBILITIES as readonly string[]).includes(value)
  );
}

export function isGamesCatalogAvailability(
  value: unknown
): value is GamesCatalogAvailability {
  return (
    typeof value === "string" &&
    (GAMES_CATALOG_AVAILABILITIES as readonly string[]).includes(value)
  );
}

export function isGamesCatalogCategory(
  value: unknown
): value is GamesCatalogCategory {
  return (
    typeof value === "string" &&
    (GAMES_CATALOG_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isGamesCatalogDifficulty(
  value: unknown
): value is GamesCatalogDifficulty {
  return (
    typeof value === "string" &&
    (GAMES_CATALOG_DIFFICULTIES as readonly string[]).includes(value)
  );
}

export function isGamesCatalogPlatform(
  value: unknown
): value is GamesCatalogPlatform {
  return (
    typeof value === "string" &&
    (GAMES_CATALOG_PLATFORMS as readonly string[]).includes(value)
  );
}

export function validateGameKey(value: unknown): GamesValidationResult<string> {
  if (typeof value !== "string" || !GAME_KEY_RE.test(value)) {
    return fail("game_key_invalid");
  }
  if (value.length > GAMES_LIMITS.gameKeyMaxChars) {
    return fail("game_key_too_long");
  }
  return { ok: true, value };
}

export function validateGameSlug(value: unknown): GamesValidationResult<string> {
  if (typeof value !== "string" || !SLUG_RE.test(value)) {
    return fail("slug_invalid");
  }
  if (value.length > GAMES_LIMITS.slugMaxChars) {
    return fail("slug_too_long");
  }
  return { ok: true, value };
}

export function validateCatalogPlatforms(
  raw: unknown
): GamesValidationResult<GamesCatalogPlatform[]> {
  if (!Array.isArray(raw) || raw.length < 1) {
    return fail("platforms_required");
  }
  if (raw.length > GAMES_CATALOG_LIMITS.platformsMaxCount) {
    return fail("platforms_too_many");
  }
  const out: GamesCatalogPlatform[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isGamesCatalogPlatform(item)) return fail("platform_unknown");
    if (seen.has(item)) return fail("platform_duplicate");
    seen.add(item);
    out.push(item);
  }
  return { ok: true, value: out };
}

export function validateCatalogFeatureFlags(
  raw: unknown
): GamesValidationResult<Record<GamesCatalogFeatureFlagKey, boolean>> {
  const merged: Record<GamesCatalogFeatureFlagKey, boolean> = {
    ...GAMES_CATALOG_FEATURE_FLAG_DEFAULTS,
  };
  if (raw === undefined || raw === null) {
    return { ok: true, value: merged };
  }
  if (!isPlainObject(raw)) return fail("feature_flags_not_object");
  const serialized = JSON.stringify(raw);
  if (utf8ByteLength(serialized) > GAMES_CATALOG_LIMITS.featureFlagsMaxBytes) {
    return fail("feature_flags_too_large");
  }
  for (const key of Object.keys(raw)) {
    if (
      !(GAMES_CATALOG_FEATURE_FLAG_KEYS as readonly string[]).includes(key)
    ) {
      return fail("feature_flag_unknown");
    }
    if (typeof raw[key] !== "boolean") {
      return fail("feature_flag_not_boolean");
    }
    merged[key as GamesCatalogFeatureFlagKey] = raw[key] as boolean;
  }
  return { ok: true, value: merged };
}

/**
 * Whether a catalog entry is eligible for `start_game_session`.
 * Requires Platform status=active, availability=available, sessions flag.
 */
export function isCatalogPlayable(entry: {
  status: GamesCatalogStatus;
  availability: GamesCatalogAvailability;
  feature_flags: Record<string, boolean>;
}): boolean {
  return (
    entry.status === "active" &&
    entry.availability === "available" &&
    entry.feature_flags.sessions_enabled === true
  );
}

/** Player-facing catalog visibility gate. */
export function isCatalogVisibleToAuthenticated(entry: {
  status: GamesCatalogStatus;
  visibility: GamesCatalogVisibility;
  availability: GamesCatalogAvailability;
}): boolean {
  if (entry.status === "archived") return false;
  if (entry.visibility === "hidden") return false;
  if (
    entry.visibility !== "authenticated" &&
    entry.visibility !== "listed"
  ) {
    return false;
  }
  // coming_soon / maintenance may still appear in catalog; unavailable+draft hide.
  if (entry.status === "draft" && entry.visibility !== "listed") {
    return false;
  }
  return true;
}

export function canTransitionCatalogStatus(
  from: GamesCatalogStatus,
  to: GamesCatalogStatus
): boolean {
  if (from === to) return true;
  switch (from) {
    case "draft":
      return to === "active" || to === "archived";
    case "active":
      return to === "archived" || to === "draft";
    case "archived":
      return to === "draft" || to === "active";
    default:
      return false;
  }
}

/**
 * Fail-closed validation for admin upsert payloads.
 */
export function validateGamesCatalogDefinition(
  raw: unknown
): GamesValidationResult<GamesCatalogDefinitionInput> {
  if (!isPlainObject(raw)) return fail("definition_not_object");

  const keyResult = validateGameKey(raw.game_key);
  if (!keyResult.ok) return keyResult;
  const slugResult = validateGameSlug(raw.slug);
  if (!slugResult.ok) return slugResult;

  if (typeof raw.name !== "string" || raw.name.trim().length < 1) {
    return fail("name_required");
  }
  if (raw.name.length > GAMES_CATALOG_LIMITS.nameMaxChars) {
    return fail("name_too_long");
  }

  let description: string | null = null;
  if (raw.description !== undefined && raw.description !== null) {
    if (typeof raw.description !== "string") return fail("description_invalid");
    if (raw.description.length > GAMES_CATALOG_LIMITS.descriptionMaxChars) {
      return fail("description_too_long");
    }
    description = raw.description;
  }

  let short_blurb: string | null = null;
  if (raw.short_blurb !== undefined && raw.short_blurb !== null) {
    if (typeof raw.short_blurb !== "string") return fail("short_blurb_invalid");
    if (raw.short_blurb.length > GAMES_CATALOG_LIMITS.shortBlurbMaxChars) {
      return fail("short_blurb_too_long");
    }
    short_blurb = raw.short_blurb;
  }

  if (
    typeof raw.status !== "string" ||
    !(GAMES_CATALOG_STATUSES as readonly string[]).includes(raw.status)
  ) {
    return fail("status_invalid");
  }
  if (!isGamesCatalogAvailability(raw.availability)) {
    return fail("availability_invalid");
  }
  if (!isGamesCatalogVisibility(raw.visibility)) {
    return fail("visibility_invalid");
  }
  if (!isGamesCatalogCategory(raw.category)) {
    return fail("category_invalid");
  }
  if (!isGamesCatalogDifficulty(raw.difficulty)) {
    return fail("difficulty_invalid");
  }

  if (
    !isFiniteNumber(raw.min_players) ||
    !Number.isInteger(raw.min_players) ||
    raw.min_players < GAMES_CATALOG_LIMITS.minPlayersMin ||
    raw.min_players > GAMES_CATALOG_LIMITS.minPlayersMax
  ) {
    return fail("min_players_invalid");
  }
  if (
    !isFiniteNumber(raw.max_players) ||
    !Number.isInteger(raw.max_players) ||
    raw.max_players < GAMES_CATALOG_LIMITS.maxPlayersMin ||
    raw.max_players > GAMES_CATALOG_LIMITS.maxPlayersMax
  ) {
    return fail("max_players_invalid");
  }
  if (raw.min_players > raw.max_players) {
    return fail("player_count_range_invalid");
  }

  const platformsResult = validateCatalogPlatforms(raw.platforms);
  if (!platformsResult.ok) return platformsResult;

  const flagsResult = validateCatalogFeatureFlags(raw.feature_flags);
  if (!flagsResult.ok) return flagsResult;

  if (
    !isFiniteNumber(raw.catalog_version) ||
    !Number.isInteger(raw.catalog_version) ||
    raw.catalog_version < GAMES_CATALOG_LIMITS.catalogVersionMin ||
    raw.catalog_version > GAMES_CATALOG_LIMITS.catalogVersionMax
  ) {
    return fail("catalog_version_invalid");
  }

  let content_version: string | null = null;
  if (raw.content_version !== undefined && raw.content_version !== null) {
    if (
      typeof raw.content_version !== "string" ||
      !CONTENT_VERSION_RE.test(raw.content_version)
    ) {
      return fail("content_version_invalid");
    }
    content_version = raw.content_version;
  }

  let sort_order = 0;
  if (raw.sort_order !== undefined) {
    if (
      !isFiniteNumber(raw.sort_order) ||
      !Number.isInteger(raw.sort_order) ||
      raw.sort_order < GAMES_CATALOG_LIMITS.sortOrderMin ||
      raw.sort_order > GAMES_CATALOG_LIMITS.sortOrderMax
    ) {
      return fail("sort_order_invalid");
    }
    sort_order = raw.sort_order;
  }

  let is_featured = false;
  if (raw.is_featured !== undefined) {
    if (typeof raw.is_featured !== "boolean") return fail("is_featured_invalid");
    is_featured = raw.is_featured;
  }

  let result_validation_mode: GamesResultValidationMode = "fail_closed";
  if (raw.result_validation_mode !== undefined) {
    if (
      typeof raw.result_validation_mode !== "string" ||
      !(GAMES_RESULT_VALIDATION_MODES as readonly string[]).includes(
        raw.result_validation_mode
      )
    ) {
      return fail("result_validation_mode_invalid");
    }
    result_validation_mode =
      raw.result_validation_mode as GamesResultValidationMode;
  }

  let session_ttl_seconds: number = GAMES_LIMITS.defaultSessionTtlSeconds;
  if (raw.session_ttl_seconds !== undefined) {
    if (
      !isFiniteNumber(raw.session_ttl_seconds) ||
      !Number.isInteger(raw.session_ttl_seconds) ||
      raw.session_ttl_seconds < GAMES_LIMITS.minSessionTtlSeconds ||
      raw.session_ttl_seconds > GAMES_LIMITS.maxSessionTtlSeconds
    ) {
      return fail("session_ttl_invalid");
    }
    session_ttl_seconds = raw.session_ttl_seconds;
  }

  // Reject unknown top-level keys (fail-closed admin contract).
  const allowed = new Set([
    "game_key",
    "slug",
    "name",
    "description",
    "short_blurb",
    "status",
    "availability",
    "visibility",
    "category",
    "difficulty",
    "min_players",
    "max_players",
    "platforms",
    "feature_flags",
    "catalog_version",
    "content_version",
    "sort_order",
    "is_featured",
    "result_validation_mode",
    "session_ttl_seconds",
  ]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) return fail("definition_unknown_field");
  }

  return {
    ok: true,
    value: {
      game_key: keyResult.value,
      slug: slugResult.value,
      name: raw.name.trim(),
      description,
      short_blurb,
      status: raw.status as GamesCatalogStatus,
      availability: raw.availability,
      visibility: raw.visibility,
      category: raw.category,
      difficulty: raw.difficulty,
      min_players: raw.min_players,
      max_players: raw.max_players,
      platforms: platformsResult.value,
      feature_flags: flagsResult.value,
      catalog_version: raw.catalog_version,
      content_version,
      sort_order,
      is_featured,
      result_validation_mode,
      session_ttl_seconds,
    },
  };
}

/** UUID shape for trusted catalog row ids (matches Hub Runtime foundation). */
const CATALOG_ENTRY_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Allowlisted keys from `game_catalog_row_to_json` / list RPC payloads. */
const GAMES_CATALOG_ENTRY_VIEW_KEYS = [
  "id",
  "game_key",
  "slug",
  "name",
  "description",
  "short_blurb",
  "status",
  "availability",
  "visibility",
  "category",
  "difficulty",
  "min_players",
  "max_players",
  "platforms",
  "feature_flags",
  "catalog_version",
  "content_version",
  "sort_order",
  "is_featured",
  "result_validation_mode",
  "session_ttl_seconds",
  "created_at",
  "updated_at",
] as const;

/**
 * Minimal authenticated RPC client for trusted catalog reads.
 * Intentionally narrow — no service-role, no direct table access.
 */
export type GamesCatalogRpcClient = {
  rpc(
    fn: string,
    args?: Record<string, unknown>
  ): PromiseLike<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

/**
 * Parse one trusted catalog RPC row into an allowlisted EntryView.
 * Rejects unknown fields and invalid shapes (fail-closed).
 */
export function parseGamesCatalogEntryView(
  raw: unknown
): GamesValidationResult<GamesCatalogEntryView> {
  if (!isPlainObject(raw)) return fail("entry_not_object");

  const allowed = new Set<string>(GAMES_CATALOG_ENTRY_VIEW_KEYS);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) return fail("entry_unknown_field");
  }

  if (typeof raw.id !== "string" || !CATALOG_ENTRY_ID_RE.test(raw.id.trim())) {
    return fail("entry_id_invalid");
  }
  const id = raw.id.trim();

  const {
    id: _id,
    created_at: rawCreatedAt,
    updated_at: rawUpdatedAt,
    ...definitionRaw
  } = raw;
  void _id;

  const defResult = validateGamesCatalogDefinition(definitionRaw);
  if (!defResult.ok) return defResult;

  let created_at: string | undefined;
  if (rawCreatedAt !== undefined && rawCreatedAt !== null) {
    if (typeof rawCreatedAt !== "string" || rawCreatedAt.trim().length < 1) {
      return fail("created_at_invalid");
    }
    created_at = rawCreatedAt;
  }

  let updated_at: string | undefined;
  if (rawUpdatedAt !== undefined && rawUpdatedAt !== null) {
    if (typeof rawUpdatedAt !== "string" || rawUpdatedAt.trim().length < 1) {
      return fail("updated_at_invalid");
    }
    updated_at = rawUpdatedAt;
  }

  const def = defResult.value;
  // Re-normalize flags to the required full Record (definition input is Partial).
  const flags = validateCatalogFeatureFlags(def.feature_flags);
  if (!flags.ok) return flags;

  const value: GamesCatalogEntryView = {
    id,
    game_key: def.game_key,
    slug: def.slug,
    name: def.name,
    description: def.description,
    short_blurb: def.short_blurb,
    status: def.status,
    availability: def.availability,
    visibility: def.visibility,
    category: def.category,
    difficulty: def.difficulty,
    min_players: def.min_players,
    max_players: def.max_players,
    platforms: def.platforms,
    feature_flags: flags.value,
    catalog_version: def.catalog_version,
    content_version: def.content_version,
    sort_order: def.sort_order ?? 0,
    is_featured: def.is_featured ?? false,
    result_validation_mode: def.result_validation_mode ?? "fail_closed",
    session_ttl_seconds:
      def.session_ttl_seconds ?? GAMES_LIMITS.defaultSessionTtlSeconds,
    ...(created_at !== undefined ? { created_at } : {}),
    ...(updated_at !== undefined ? { updated_at } : {}),
  };

  return { ok: true, value };
}

/**
 * Parse `list_games_catalog` envelope `{ games: [...] }`.
 * Malformed envelope → fail. Malformed/hidden entries are rejected per-row.
 */
export function parseGamesCatalogListResponse(
  raw: unknown
): GamesValidationResult<GamesCatalogEntryView[]> {
  if (!isPlainObject(raw)) return fail("list_not_object");

  for (const key of Object.keys(raw)) {
    if (key !== "games") return fail("list_unknown_field");
  }

  if (!Array.isArray(raw.games)) return fail("games_not_array");

  const entries: GamesCatalogEntryView[] = [];
  for (const item of raw.games) {
    const parsed = parseGamesCatalogEntryView(item);
    if (!parsed.ok) {
      // Reject untrusted rows; do not surface them.
      continue;
    }
    if (!isCatalogVisibleToAuthenticated(parsed.value)) {
      continue;
    }
    entries.push(parsed.value);
  }

  return { ok: true, value: entries };
}

/**
 * Trusted authenticated read of visible catalog entries via `list_games_catalog`.
 * Database/RPC authorization remains authoritative; this only validates shape.
 */
export async function listGamesCatalogTrusted(
  client: GamesCatalogRpcClient
): Promise<GamesValidationResult<GamesCatalogEntryView[]>> {
  try {
    const { data, error } = await client.rpc(
      GAMES_CATALOG_PUBLIC_RPCS.listCatalog
    );
    if (error) {
      return fail("catalog_rpc_failed");
    }
    return parseGamesCatalogListResponse(data);
  } catch {
    return fail("catalog_rpc_failed");
  }
}

/**
 * Validate a catalog entry UUID before calling get-by-id RPC.
 * Matches `CATALOG_ENTRY_ID_RE` / Hub Runtime foundation shape.
 */
export function validateCatalogEntryId(
  value: unknown
): GamesValidationResult<string> {
  if (typeof value !== "string" || !CATALOG_ENTRY_ID_RE.test(value.trim())) {
    return fail("entry_id_invalid");
  }
  return { ok: true, value: value.trim() };
}

/**
 * Map a single-entry get RPC payload through `parseGamesCatalogEntryView`.
 * SQL get RPCs never return null for absence (they raise); null/malformed
 * payloads therefore fail closed — no trusted-null success union.
 */
function parseGamesCatalogGetResponse(
  data: unknown
): GamesValidationResult<GamesCatalogEntryView> {
  if (data === null || data === undefined) {
    return fail("catalog_get_response_invalid");
  }
  const parsed = parseGamesCatalogEntryView(data);
  if (!parsed.ok) {
    return fail("catalog_get_response_invalid");
  }
  return parsed;
}

/**
 * Trusted authenticated lookup via `get_game_catalog_by_key`.
 *
 * Metadata only — does not imply runtime eligibility, session authority,
 * playability, or matchmaking. DB auth/visibility remain authoritative.
 *
 * Not-found / hidden / draft / archived (for non-admin) surface as RPC errors
 * (`Game not available`); this client maps them to fail-closed
 * `catalog_rpc_failed` and never invents a success-null.
 */
export async function getGamesCatalogByKeyTrusted(
  client: GamesCatalogRpcClient,
  gameKey: unknown
): Promise<GamesValidationResult<GamesCatalogEntryView>> {
  const keyResult = validateGameKey(gameKey);
  if (!keyResult.ok) return keyResult;

  try {
    const { data, error } = await client.rpc(
      GAMES_CATALOG_PUBLIC_RPCS.getByKey,
      { p_game_key: keyResult.value }
    );
    if (error) {
      return fail("catalog_rpc_failed");
    }
    return parseGamesCatalogGetResponse(data);
  } catch {
    return fail("catalog_rpc_failed");
  }
}

/**
 * Trusted authenticated lookup via `get_game_catalog_by_id`.
 *
 * Same contracts as `getGamesCatalogByKeyTrusted`: metadata-only,
 * fail-closed, no service-role / direct table path, RPC visibility authoritative.
 */
export async function getGamesCatalogByIdTrusted(
  client: GamesCatalogRpcClient,
  gameId: unknown
): Promise<GamesValidationResult<GamesCatalogEntryView>> {
  const idResult = validateCatalogEntryId(gameId);
  if (!idResult.ok) return idResult;

  try {
    const { data, error } = await client.rpc(
      GAMES_CATALOG_PUBLIC_RPCS.getById,
      { p_game_id: idResult.value }
    );
    if (error) {
      return fail("catalog_rpc_failed");
    }
    return parseGamesCatalogGetResponse(data);
  } catch {
    return fail("catalog_rpc_failed");
  }
}

/**
 * Trusted admin upsert via `upsert_game_catalog_entry`.
 *
 * Sole Catalog mutation abstraction in application code — no service-role and
 * no direct table writes. Database `is_platform_admin` remains authoritative;
 * callers must still gate with the platform-admin auth path before invoking.
 */
export async function upsertGamesCatalogEntryTrusted(
  client: GamesCatalogRpcClient,
  definition: unknown
): Promise<GamesValidationResult<GamesCatalogEntryView>> {
  const validated = validateGamesCatalogDefinition(definition);
  if (!validated.ok) return validated;

  try {
    const { data, error } = await client.rpc(GAMES_CATALOG_ADMIN_RPCS.upsert, {
      p_def: validated.value,
    });
    if (error) {
      return fail("catalog_upsert_rpc_failed");
    }
    const parsed = parseGamesCatalogEntryView(data);
    if (!parsed.ok) {
      return fail("catalog_upsert_response_invalid");
    }
    return parsed;
  } catch {
    return fail("catalog_upsert_rpc_failed");
  }
}

export function validateLifecyclePatch(raw: unknown): GamesValidationResult<{
  status?: GamesCatalogStatus;
  availability?: GamesCatalogAvailability;
  visibility?: GamesCatalogVisibility;
}> {
  if (!isPlainObject(raw)) return fail("lifecycle_not_object");
  const allowed = new Set(["status", "availability", "visibility"]);
  for (const key of Object.keys(raw)) {
    if (!allowed.has(key)) return fail("lifecycle_unknown_field");
  }
  const out: {
    status?: GamesCatalogStatus;
    availability?: GamesCatalogAvailability;
    visibility?: GamesCatalogVisibility;
  } = {};
  if (raw.status !== undefined) {
    if (
      typeof raw.status !== "string" ||
      !(GAMES_CATALOG_STATUSES as readonly string[]).includes(raw.status)
    ) {
      return fail("status_invalid");
    }
    out.status = raw.status as GamesCatalogStatus;
  }
  if (raw.availability !== undefined) {
    if (!isGamesCatalogAvailability(raw.availability)) {
      return fail("availability_invalid");
    }
    out.availability = raw.availability;
  }
  if (raw.visibility !== undefined) {
    if (!isGamesCatalogVisibility(raw.visibility)) {
      return fail("visibility_invalid");
    }
    out.visibility = raw.visibility;
  }
  if (
    out.status === undefined &&
    out.availability === undefined &&
    out.visibility === undefined
  ) {
    return fail("lifecycle_empty");
  }
  return { ok: true, value: out };
}
