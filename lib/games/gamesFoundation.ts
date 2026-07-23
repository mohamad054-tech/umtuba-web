/**
 * UM Games Platform Foundation V1 — pure contracts & validators.
 *
 * Mirrors `supabase/migrations/20260846_games_platform_foundation_v1.sql`.
 * No service role. No UM Points awarding. No Ads activation. No public
 * leaderboards. Client results are claims only.
 */

/** Stable product keys (catalog `game_key`). Not Ads placement IDs. */
export const GAMES_CATALOG_STATUSES = [
  "draft",
  "active",
  "archived",
] as const;
export type GamesCatalogStatus = (typeof GAMES_CATALOG_STATUSES)[number];

/**
 * V1 validation mode. Unknown modes fail closed.
 * `fail_closed` = allowlisted claim only; reject unknown/authoritative fields.
 */
export const GAMES_RESULT_VALIDATION_MODES = ["fail_closed"] as const;
export type GamesResultValidationMode =
  (typeof GAMES_RESULT_VALIDATION_MODES)[number];

export const GAMES_SESSION_STATUSES = [
  "active",
  "submitted",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
] as const;
export type GamesSessionStatus = (typeof GAMES_SESSION_STATUSES)[number];

/** Terminal statuses — cannot submit. */
export const GAMES_SESSION_TERMINAL_STATUSES = [
  "submitted",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
] as const;
export type GamesSessionTerminalStatus =
  (typeof GAMES_SESSION_TERMINAL_STATUSES)[number];

/** Statuses that may transition to submitted (after lazy expiry check). */
export const GAMES_SESSION_SUBMITTABLE_STATUSES = ["active"] as const;

export const GAMES_RESULT_DECISION_STATUSES = [
  "accepted",
  "rejected",
] as const;
export type GamesResultDecisionStatus =
  (typeof GAMES_RESULT_DECISION_STATUSES)[number];

/** Client claim allowlist — only these keys may appear in claim payload. */
export const GAMES_CLIENT_RESULT_CLAIM_KEYS = [
  "score",
  "level",
  "experience_delta",
  "duration_ms",
  "client_meta",
] as const;
export type GamesClientResultClaimKey =
  (typeof GAMES_CLIENT_RESULT_CLAIM_KEYS)[number];

/**
 * Server-authoritative / forbidden if supplied by client.
 * Presence of any → reject (fail-closed).
 */
export const GAMES_AUTHORITATIVE_RESULT_DENYLIST = [
  "accepted",
  "rejected",
  "decision",
  "decision_status",
  "server_score",
  "server_level",
  "awarded_points",
  "um_points",
  "points",
  "wallet_credit",
  "achievement_ids",
  "unlocked_achievements",
  "progress",
  "best_score",
  "play_count",
  "scored_by",
  "validated_by",
  "trust_level",
  "anti_cheat_passed",
] as const;

/** Reserved future integration keys — nullable, non-authoritative metadata only. */
export const GAMES_RESERVED_INTEGRATION_KEYS = [
  "city_id",
  "world_event_id",
  "live_room_id",
  "community_project_id",
] as const;
export type GamesReservedIntegrationKey =
  (typeof GAMES_RESERVED_INTEGRATION_KEYS)[number];

export const GAMES_PRIVACY_DEFAULTS = {
  share_achievements: false,
  share_best_score: false,
  share_level_or_progress: false,
  share_activity: false,
} as const;

export type GamesPrivacySettings = {
  share_achievements: boolean;
  share_best_score: boolean;
  share_level_or_progress: boolean;
  share_activity: boolean;
};

export const GAMES_LIMITS = {
  /** Default session TTL when catalog omits override (seconds). */
  defaultSessionTtlSeconds: 3600,
  minSessionTtlSeconds: 60,
  maxSessionTtlSeconds: 86_400,
  /** Max JSON bytes for client claim payload (serialized). */
  claimPayloadMaxBytes: 4096,
  /** Max JSON bytes for client_meta object inside claim. */
  clientMetaMaxBytes: 1024,
  /** Max absolute score magnitude accepted as a claim. */
  scoreAbsMax: 1_000_000_000,
  levelMin: 0,
  levelMax: 1_000_000,
  experienceDeltaMin: 0,
  experienceDeltaMax: 1_000_000,
  durationMsMin: 0,
  durationMsMax: 86_400_000,
  idempotencyKeyMaxChars: 128,
  gameKeyMaxChars: 64,
  slugMaxChars: 64,
} as const;

export const GAMES_PUBLIC_RPCS = {
  startSession: "start_game_session",
  submitResult: "submit_game_session_result",
  getMySession: "get_my_game_session",
  getMyProgress: "get_my_game_progress",
  getMyAchievements: "get_my_game_achievements",
  getMyPrivacy: "get_my_game_privacy_settings",
  updateMyPrivacy: "update_my_game_privacy_settings",
} as const;

/** Internal helpers — EXECUTE must be revoked from authenticated. */
export const GAMES_INTERNAL_HELPERS = {
  expireIfDue: "game_session_expire_if_due",
  validateClaim: "game_validate_client_result_claim",
  applyAcceptedResult: "game_apply_accepted_result",
  ensurePlayerProfile: "game_ensure_player_profile",
  ensurePrivacySettings: "game_ensure_privacy_settings",
} as const;

/** Banned UM Points surfaces — must never appear in Games Foundation code/SQL. */
export const GAMES_UM_POINTS_DENYLIST = [
  "award_um_points",
  "award_um_points_to_user",
  "um_point_balances",
  "um_points_ledger",
  "claim_verified_welcome_bonus",
] as const;

export type GamesClientResultClaim = {
  score: number;
  level?: number;
  experience_delta?: number;
  duration_ms?: number;
  client_meta?: Record<string, unknown>;
};

export type GamesValidationOk<T> = { ok: true; value: T };
export type GamesValidationErr = { ok: false; reason: string };
export type GamesValidationResult<T> =
  | GamesValidationOk<T>
  | GamesValidationErr;

function fail(reason: string): GamesValidationErr {
  return { ok: false, reason };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isGamesSessionStatus(value: unknown): value is GamesSessionStatus {
  return (
    typeof value === "string" &&
    (GAMES_SESSION_STATUSES as readonly string[]).includes(value)
  );
}

export function isGamesResultValidationMode(
  value: unknown
): value is GamesResultValidationMode {
  return (
    typeof value === "string" &&
    (GAMES_RESULT_VALIDATION_MODES as readonly string[]).includes(value)
  );
}

/** Finite number (rejects NaN / ±Infinity). */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function validateScoreClaim(score: unknown): GamesValidationResult<number> {
  if (!isFiniteNumber(score)) {
    return fail("score_not_finite");
  }
  if (score < 0) {
    return fail("score_negative");
  }
  if (score > GAMES_LIMITS.scoreAbsMax) {
    return fail("score_out_of_range");
  }
  return { ok: true, value: score };
}

export function validateOptionalIntInRange(
  value: unknown,
  min: number,
  max: number,
  reasonPrefix: string
): GamesValidationResult<number | undefined> {
  if (value === undefined) return { ok: true, value: undefined };
  if (!isFiniteNumber(value) || !Number.isInteger(value)) {
    return fail(`${reasonPrefix}_not_integer`);
  }
  if (value < min || value > max) {
    return fail(`${reasonPrefix}_out_of_range`);
  }
  return { ok: true, value };
}

export function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).length;
}

export function validateClientMeta(
  meta: unknown
): GamesValidationResult<Record<string, unknown> | undefined> {
  if (meta === undefined) return { ok: true, value: undefined };
  if (!isPlainObject(meta)) return fail("client_meta_not_object");
  const serialized = JSON.stringify(meta);
  if (utf8ByteLength(serialized) > GAMES_LIMITS.clientMetaMaxBytes) {
    return fail("client_meta_too_large");
  }
  // Reserved integration keys inside client_meta are allowed as opaque strings
  // only when values are null or non-empty strings — never authoritative.
  for (const key of GAMES_RESERVED_INTEGRATION_KEYS) {
    if (!(key in meta)) continue;
    const v = meta[key];
    if (v !== null && typeof v !== "string") {
      return fail("reserved_field_invalid");
    }
  }
  return { ok: true, value: meta };
}

/**
 * Fail-closed claim validation.
 * Rejects unknown keys, authoritative denylist keys, and invalid numerics.
 */
export function validateClientResultClaim(
  raw: unknown,
  mode: GamesResultValidationMode = "fail_closed"
): GamesValidationResult<GamesClientResultClaim> {
  if (mode !== "fail_closed") {
    return fail("validation_mode_unsupported");
  }
  if (!isPlainObject(raw)) {
    return fail("claim_not_object");
  }

  for (const key of Object.keys(raw)) {
    if (
      (GAMES_AUTHORITATIVE_RESULT_DENYLIST as readonly string[]).includes(key)
    ) {
      return fail("authoritative_field_forbidden");
    }
    if (!(GAMES_CLIENT_RESULT_CLAIM_KEYS as readonly string[]).includes(key)) {
      return fail("unknown_claim_field");
    }
  }

  const scoreResult = validateScoreClaim(raw.score);
  if (!scoreResult.ok) return scoreResult;

  const levelResult = validateOptionalIntInRange(
    raw.level,
    GAMES_LIMITS.levelMin,
    GAMES_LIMITS.levelMax,
    "level"
  );
  if (!levelResult.ok) return levelResult;

  const xpResult = validateOptionalIntInRange(
    raw.experience_delta,
    GAMES_LIMITS.experienceDeltaMin,
    GAMES_LIMITS.experienceDeltaMax,
    "experience_delta"
  );
  if (!xpResult.ok) return xpResult;

  const durationResult = validateOptionalIntInRange(
    raw.duration_ms,
    GAMES_LIMITS.durationMsMin,
    GAMES_LIMITS.durationMsMax,
    "duration_ms"
  );
  if (!durationResult.ok) return durationResult;

  const metaResult = validateClientMeta(raw.client_meta);
  if (!metaResult.ok) return metaResult;

  const claim: GamesClientResultClaim = { score: scoreResult.value };
  if (levelResult.value !== undefined) claim.level = levelResult.value;
  if (xpResult.value !== undefined) claim.experience_delta = xpResult.value;
  if (durationResult.value !== undefined) claim.duration_ms = durationResult.value;
  if (metaResult.value !== undefined) claim.client_meta = metaResult.value;

  const serialized = JSON.stringify(claim);
  if (utf8ByteLength(serialized) > GAMES_LIMITS.claimPayloadMaxBytes) {
    return fail("claim_payload_too_large");
  }

  return { ok: true, value: claim };
}

export function validateIdempotencyKey(
  key: unknown
): GamesValidationResult<string> {
  if (typeof key !== "string" || key.length < 1) {
    return fail("idempotency_key_required");
  }
  if (key.length > GAMES_LIMITS.idempotencyKeyMaxChars) {
    return fail("idempotency_key_too_long");
  }
  if (!/^[A-Za-z0-9._:-]+$/.test(key)) {
    return fail("idempotency_key_invalid");
  }
  return { ok: true, value: key };
}

export function validatePrivacySettingsPatch(
  raw: unknown
): GamesValidationResult<Partial<GamesPrivacySettings>> {
  if (!isPlainObject(raw)) return fail("privacy_not_object");
  const allowed = Object.keys(GAMES_PRIVACY_DEFAULTS);
  const patch: Partial<GamesPrivacySettings> = {};
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) return fail("privacy_unknown_field");
    if (typeof raw[key] !== "boolean") return fail("privacy_field_not_boolean");
    (patch as Record<string, boolean>)[key] = raw[key] as boolean;
  }
  return { ok: true, value: patch };
}

export function defaultPrivacySettings(): GamesPrivacySettings {
  return { ...GAMES_PRIVACY_DEFAULTS };
}

/**
 * Session transition matrix (V1).
 * Only `active → submitted|expired|cancelled` then `submitted → accepted|rejected`.
 * Submit path may fold submitted→accepted/rejected atomically.
 */
export function canTransitionGameSession(
  from: GamesSessionStatus,
  to: GamesSessionStatus
): boolean {
  if (from === to) return true;
  switch (from) {
    case "active":
      return (
        to === "submitted" ||
        to === "expired" ||
        to === "cancelled" ||
        // Atomic accept/reject after validation in same submit txn.
        to === "accepted" ||
        to === "rejected"
      );
    case "submitted":
      return to === "accepted" || to === "rejected";
    default:
      return false;
  }
}

export function canSubmitGameSession(
  status: GamesSessionStatus,
  expiresAtIso: string | null,
  nowMs: number = Date.now()
): GamesValidationResult<true> {
  if (status === "expired") return fail("session_expired");
  if (status !== "active") return fail("session_not_active");
  if (expiresAtIso) {
    const exp = Date.parse(expiresAtIso);
    if (!Number.isNaN(exp) && nowMs > exp) {
      return fail("session_expired");
    }
  }
  return { ok: true, value: true };
}

/** Idempotent unlock: same achievement twice → still unlocked once. */
export function mergeAchievementUnlockIds(
  existing: readonly string[],
  next: readonly string[]
): string[] {
  const set = new Set(existing);
  for (const id of next) set.add(id);
  return [...set];
}

export function isReservedIntegrationValue(
  value: unknown
): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
}

export function validateReservedIntegrationFields(
  raw: Record<string, unknown>
): GamesValidationResult<Partial<Record<GamesReservedIntegrationKey, string | null>>> {
  const out: Partial<Record<GamesReservedIntegrationKey, string | null>> = {};
  for (const key of GAMES_RESERVED_INTEGRATION_KEYS) {
    if (!(key in raw)) continue;
    const v = raw[key];
    if (!isReservedIntegrationValue(v)) {
      return fail("reserved_field_invalid");
    }
    if (v !== undefined) out[key] = v;
  }
  return { ok: true, value: out };
}
