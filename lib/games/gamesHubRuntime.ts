/**
 * UM Games Hub / Runtime Foundation V1 — pure contracts & validators.
 *
 * Builds on Games Platform Foundation + Games Catalog Foundation.
 * No playable game server, multiplayer, matchmaking, rewards, UI, public
 * APIs, or migrations. Client results remain claims only.
 */

import {
  type GamesCatalogAvailability,
  type GamesCatalogCategory,
  type GamesCatalogEntryView,
  type GamesCatalogStatus,
  isCatalogPlayable,
} from "./gamesCatalog";
import {
  type GamesClientResultClaim,
  type GamesValidationErr,
  type GamesValidationResult,
  validateClientResultClaim,
  validateIdempotencyKey,
} from "./gamesFoundation";
import { validateGameSessionId } from "./gamesSessions";

export const GAMES_HUB_RUNTIME_CONTRACT_VERSION = "v1" as const;

/**
 * Authority for Hub / Runtime Foundation V1.
 * All production-adjacent capabilities remain closed.
 */
export const GAMES_HUB_RUNTIME_AUTHORITY = {
  contractVersion: GAMES_HUB_RUNTIME_CONTRACT_VERSION,
  runsActualGameServer: false,
  grantsRewards: false,
  acceptsClientResultAsAuthoritative: false,
  multiplayerEnabled: false,
  matchmakingEnabled: false,
  appliesMigrations: false,
  publicApiEnabled: false,
  productionRuntimeEndpointEnabled: false,
  mutatesDatabase: false,
} as const;

export type GamesHubRuntimeAuthority = typeof GAMES_HUB_RUNTIME_AUTHORITY;

export const GAMES_HUB_SUPPORTED_MODES = ["solo"] as const;
export type GamesHubSupportedMode = (typeof GAMES_HUB_SUPPORTED_MODES)[number];

export const GAMES_HUB_RELEASE_CHANNELS = [
  "internal",
  "beta",
  "stable",
] as const;
export type GamesHubReleaseChannel =
  (typeof GAMES_HUB_RELEASE_CHANNELS)[number];

export const GAMES_HUB_MAINTENANCE_STATES = [
  "none",
  "scheduled",
  "active",
] as const;
export type GamesHubMaintenanceState =
  (typeof GAMES_HUB_MAINTENANCE_STATES)[number];

/** Runtime session lifecycle (Hub layer — distinct from Platform session statuses). */
export const GAMES_RUNTIME_LIFECYCLE_STATES = [
  "created",
  "active",
  "paused",
  "completed",
  "abandoned",
  "expired",
] as const;
export type GamesRuntimeLifecycleState =
  (typeof GAMES_RUNTIME_LIFECYCLE_STATES)[number];

export const GAMES_RUNTIME_TERMINAL_STATES = [
  "completed",
  "abandoned",
  "expired",
] as const;
export type GamesRuntimeTerminalState =
  (typeof GAMES_RUNTIME_TERMINAL_STATES)[number];

export const GAMES_RUNTIME_ELIGIBILITY_REASONS = [
  "eligible",
  "game_draft",
  "game_suspended",
  "game_archived",
  "under_maintenance",
  "unavailable_for_player",
  "missing_runtime_metadata",
  "sessions_disabled",
  "unsupported_mode",
  "invalid_player_bounds",
] as const;
export type GamesRuntimeEligibilityReason =
  (typeof GAMES_RUNTIME_ELIGIBILITY_REASONS)[number];

const ACTOR_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(reason: string): GamesValidationErr {
  return { ok: false, reason };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function freezeAuthority<T extends Record<string, unknown>>(
  value: T
): T & GamesHubRuntimeAuthority {
  return Object.freeze({
    ...value,
    ...GAMES_HUB_RUNTIME_AUTHORITY,
  });
}

export function assertGamesHubRuntimeAuthorityClosed(input: {
  runsActualGameServer?: unknown;
  grantsRewards?: unknown;
  acceptsClientResultAsAuthoritative?: unknown;
  multiplayerEnabled?: unknown;
  matchmakingEnabled?: unknown;
  appliesMigrations?: unknown;
  publicApiEnabled?: unknown;
  productionRuntimeEndpointEnabled?: unknown;
}): { ok: true } | { ok: false; issues: readonly string[] } {
  const issues: string[] = [];
  if (input.runsActualGameServer === true) {
    issues.push("runsActualGameServer must remain false.");
  }
  if (input.grantsRewards === true) {
    issues.push("grantsRewards must remain false.");
  }
  if (input.acceptsClientResultAsAuthoritative === true) {
    issues.push("acceptsClientResultAsAuthoritative must remain false.");
  }
  if (input.multiplayerEnabled === true) {
    issues.push("multiplayerEnabled must remain false.");
  }
  if (input.matchmakingEnabled === true) {
    issues.push("matchmakingEnabled must remain false.");
  }
  if (input.appliesMigrations === true) {
    issues.push("appliesMigrations must remain false.");
  }
  if (input.publicApiEnabled === true) {
    issues.push("publicApiEnabled must remain false.");
  }
  if (input.productionRuntimeEndpointEnabled === true) {
    issues.push("productionRuntimeEndpointEnabled must remain false.");
  }
  return issues.length === 0
    ? { ok: true }
    : { ok: false, issues: Object.freeze(issues) };
}

export function isGamesRuntimeLifecycleState(
  value: unknown
): value is GamesRuntimeLifecycleState {
  return (
    typeof value === "string" &&
    (GAMES_RUNTIME_LIFECYCLE_STATES as readonly string[]).includes(value)
  );
}

export function isGamesRuntimeTerminalState(
  value: GamesRuntimeLifecycleState
): value is GamesRuntimeTerminalState {
  return (GAMES_RUNTIME_TERMINAL_STATES as readonly string[]).includes(value);
}

export function isGamesHubSupportedMode(
  value: unknown
): value is GamesHubSupportedMode {
  return (
    typeof value === "string" &&
    (GAMES_HUB_SUPPORTED_MODES as readonly string[]).includes(value)
  );
}

export function isGamesHubReleaseChannel(
  value: unknown
): value is GamesHubReleaseChannel {
  return (
    typeof value === "string" &&
    (GAMES_HUB_RELEASE_CHANNELS as readonly string[]).includes(value)
  );
}

export type GamesHubDomainContract = Readonly<{
  contractVersion: typeof GAMES_HUB_RUNTIME_CONTRACT_VERSION;
  gameId: string;
  gameKey: string;
  title: string;
  description: string | null;
  category: GamesCatalogCategory;
  status: GamesCatalogStatus;
  availability: GamesCatalogAvailability;
  supportedModes: readonly GamesHubSupportedMode[];
  minPlayers: number;
  maxPlayers: number;
  runtimeEligible: boolean;
  maintenanceState: GamesHubMaintenanceState;
  releaseChannel: GamesHubReleaseChannel;
  runsActualGameServer: false;
  grantsRewards: false;
  acceptsClientResultAsAuthoritative: false;
  multiplayerEnabled: false;
  matchmakingEnabled: false;
  appliesMigrations: false;
  publicApiEnabled: false;
  productionRuntimeEndpointEnabled: false;
  mutatesDatabase: false;
}>;

export type GamesRuntimeEligibilityReport = Readonly<{
  contractVersion: typeof GAMES_HUB_RUNTIME_CONTRACT_VERSION;
  ok: boolean;
  reason: GamesRuntimeEligibilityReason;
  playable: boolean;
  maintenanceState: GamesHubMaintenanceState;
  runsActualGameServer: false;
  grantsRewards: false;
  acceptsClientResultAsAuthoritative: false;
  multiplayerEnabled: false;
  matchmakingEnabled: false;
  appliesMigrations: false;
  publicApiEnabled: false;
  productionRuntimeEndpointEnabled: false;
  mutatesDatabase: false;
}>;

export type GamesRuntimeSessionContract = Readonly<{
  contractVersion: typeof GAMES_HUB_RUNTIME_CONTRACT_VERSION;
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  mode: GamesHubSupportedMode;
  lifecycleState: GamesRuntimeLifecycleState;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  platformSessionId: string | null;
  finalized: boolean;
  runsActualGameServer: false;
  grantsRewards: false;
  acceptsClientResultAsAuthoritative: false;
  multiplayerEnabled: false;
  matchmakingEnabled: false;
  appliesMigrations: false;
  publicApiEnabled: false;
  productionRuntimeEndpointEnabled: false;
  mutatesDatabase: false;
}>;

export type GamesRuntimeCompletionHandoff = Readonly<{
  contractVersion: typeof GAMES_HUB_RUNTIME_CONTRACT_VERSION;
  runtimeSessionId: string;
  gameId: string;
  playerId: string;
  claim: GamesClientResultClaim;
  preparesGameResult: true;
  preparesPlayerProgress: true;
  preparesAchievements: true;
  grantsRewards: false;
  acceptsClientResultAsAuthoritative: false;
  applied: false;
  message: string;
}>;

function deriveMaintenanceState(
  availability: GamesCatalogAvailability
): GamesHubMaintenanceState {
  if (availability === "maintenance") return "active";
  return "none";
}

function deriveReleaseChannel(
  status: GamesCatalogStatus,
  availability: GamesCatalogAvailability
): GamesHubReleaseChannel {
  if (status === "draft" || availability === "coming_soon") return "internal";
  if (availability === "maintenance") return "beta";
  return "stable";
}

function validateActorId(value: unknown, label: string): GamesValidationResult<string> {
  if (typeof value !== "string" || !ACTOR_RE.test(value.trim())) {
    return fail(`${label}_invalid`);
  }
  return { ok: true, value: value.trim() };
}

function validateGameId(value: unknown): GamesValidationResult<string> {
  if (typeof value !== "string" || !UUID_RE.test(value.trim())) {
    return fail("game_id_invalid");
  }
  return { ok: true, value: value.trim() };
}

function validateIsoTimestamp(value: unknown, label: string): GamesValidationResult<string> {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    return fail(`${label}_invalid`);
  }
  return { ok: true, value };
}

/**
 * Build a Hub domain contract from a trusted catalog entry view.
 * Never trusts client-supplied status / eligibility / score.
 */
export function buildGamesHubDomainContract(
  entry: GamesCatalogEntryView,
  options?: { releaseChannel?: GamesHubReleaseChannel }
): GamesValidationResult<GamesHubDomainContract> {
  if (!entry || typeof entry !== "object") {
    return fail("catalog_entry_required");
  }
  const gameId = validateGameId(entry.id);
  if (!gameId.ok) return gameId;

  if (
    typeof entry.min_players !== "number" ||
    typeof entry.max_players !== "number" ||
    entry.min_players < 1 ||
    entry.max_players < entry.min_players
  ) {
    return fail("invalid_player_bounds");
  }

  const eligibility = evaluateGamesRuntimeEligibility(entry);
  const releaseChannel =
    options?.releaseChannel ??
    deriveReleaseChannel(entry.status, entry.availability);

  if (!isGamesHubReleaseChannel(releaseChannel)) {
    return fail("release_channel_invalid");
  }

  return {
    ok: true,
    value: freezeAuthority({
      contractVersion: GAMES_HUB_RUNTIME_CONTRACT_VERSION,
      gameId: gameId.value,
      gameKey: entry.game_key,
      title: entry.name,
      description: entry.description ?? null,
      category: entry.category,
      status: entry.status,
      availability: entry.availability,
      supportedModes: Object.freeze([...GAMES_HUB_SUPPORTED_MODES]),
      minPlayers: entry.min_players,
      maxPlayers: entry.max_players,
      runtimeEligible: eligibility.ok,
      maintenanceState: eligibility.maintenanceState,
      releaseChannel,
    }),
  };
}

/**
 * Central fail-closed runtime eligibility.
 * Catalog metadata is the only authority for game status / availability.
 */
export function evaluateGamesRuntimeEligibility(entry: {
  status: GamesCatalogStatus;
  availability: GamesCatalogAvailability;
  feature_flags: Record<string, boolean>;
  min_players?: number;
  max_players?: number;
  id?: string;
  game_key?: string;
  name?: string;
  session_ttl_seconds?: number;
}): GamesRuntimeEligibilityReport {
  const maintenanceState = deriveMaintenanceState(entry.availability);

  const closed = (
    reason: GamesRuntimeEligibilityReason
  ): GamesRuntimeEligibilityReport =>
    freezeAuthority({
      contractVersion: GAMES_HUB_RUNTIME_CONTRACT_VERSION,
      ok: false,
      reason,
      playable: false,
      maintenanceState,
    });

  if (!entry.game_key || !entry.name || !entry.id) {
    return closed("missing_runtime_metadata");
  }
  if (
    typeof entry.session_ttl_seconds !== "number" ||
    !Number.isFinite(entry.session_ttl_seconds)
  ) {
    return closed("missing_runtime_metadata");
  }
  if (entry.status === "draft") return closed("game_draft");
  if (entry.status === "archived") return closed("game_archived");
  if (entry.availability === "maintenance") return closed("under_maintenance");
  if (entry.availability === "unavailable") return closed("game_suspended");
  if (entry.availability === "coming_soon") {
    return closed("unavailable_for_player");
  }
  if (entry.feature_flags?.sessions_enabled !== true) {
    return closed("sessions_disabled");
  }
  if (
    typeof entry.min_players === "number" &&
    typeof entry.max_players === "number" &&
    (entry.min_players < 1 || entry.max_players < entry.min_players)
  ) {
    return closed("invalid_player_bounds");
  }
  // V1 hub supports solo only — multiplayer bounds > 1 remain catalog metadata
  // but do not enable multiplayer runtime.
  if (!isCatalogPlayable(entry)) {
    return closed("unavailable_for_player");
  }

  return freezeAuthority({
    contractVersion: GAMES_HUB_RUNTIME_CONTRACT_VERSION,
    ok: true,
    reason: "eligible",
    playable: true,
    maintenanceState,
  });
}

/**
 * Explicit runtime lifecycle transitions.
 * Terminal states never leave their state except identity (idempotent).
 */
export function canTransitionGamesRuntimeLifecycle(
  from: GamesRuntimeLifecycleState,
  to: GamesRuntimeLifecycleState
): boolean {
  if (from === to) return true;
  if (isGamesRuntimeTerminalState(from)) return false;
  switch (from) {
    case "created":
      return (
        to === "active" ||
        to === "abandoned" ||
        to === "expired"
      );
    case "active":
      return (
        to === "paused" ||
        to === "completed" ||
        to === "abandoned" ||
        to === "expired"
      );
    case "paused":
      return (
        to === "active" ||
        to === "completed" ||
        to === "abandoned" ||
        to === "expired"
      );
    default:
      return false;
  }
}

export function evaluateGamesRuntimeLifecycleTransition(input: {
  from: GamesRuntimeLifecycleState;
  to: GamesRuntimeLifecycleState;
}):
  | {
      ok: true;
      from: GamesRuntimeLifecycleState;
      to: GamesRuntimeLifecycleState;
      applied: false;
    }
  | { ok: false; reason: string } {
  if (
    !isGamesRuntimeLifecycleState(input.from) ||
    !isGamesRuntimeLifecycleState(input.to)
  ) {
    return { ok: false, reason: "lifecycle_state_invalid" };
  }
  if (!canTransitionGamesRuntimeLifecycle(input.from, input.to)) {
    return { ok: false, reason: "lifecycle_transition_forbidden" };
  }
  return {
    ok: true,
    from: input.from,
    to: input.to,
    applied: false,
  };
}

export type GamesRuntimeStartInput = {
  catalogEntry: GamesCatalogEntryView;
  playerId: string;
  mode?: unknown;
  nowIso?: string;
  /** Existing active runtime sessions for this player+game (fail if any). */
  existingActiveSessions?: readonly GamesRuntimeSessionContract[];
};

/**
 * Start a runtime session from trusted catalog data only.
 * Client-forged status / eligibility / score are ignored.
 */
export function startGamesRuntimeSession(
  input: GamesRuntimeStartInput
): GamesValidationResult<GamesRuntimeSessionContract> {
  const authority = assertGamesHubRuntimeAuthorityClosed(input as object);
  if (!authority.ok) {
    return fail(authority.issues[0] ?? "authority_open");
  }

  const player = validateActorId(input.playerId, "player_id");
  if (!player.ok) return player;

  const mode = input.mode === undefined ? "solo" : input.mode;
  if (!isGamesHubSupportedMode(mode)) {
    return fail("unsupported_mode");
  }
  if (mode !== "solo") {
    return fail("unsupported_mode");
  }

  const eligibility = evaluateGamesRuntimeEligibility(input.catalogEntry);
  if (!eligibility.ok) {
    return fail(eligibility.reason);
  }

  const hub = buildGamesHubDomainContract(input.catalogEntry);
  if (!hub.ok) return hub;

  const existing = input.existingActiveSessions ?? [];
  for (const session of existing) {
    if (
      session.playerId === player.value &&
      session.gameId === hub.value.gameId &&
      session.lifecycleState === "active"
    ) {
      return fail("active_session_already_exists");
    }
  }

  const nowIso =
    typeof input.nowIso === "string" && !Number.isNaN(Date.parse(input.nowIso))
      ? input.nowIso
      : new Date().toISOString();

  const ttlSeconds = input.catalogEntry.session_ttl_seconds;
  const expiresAt = new Date(
    Date.parse(nowIso) + ttlSeconds * 1000
  ).toISOString();

  const runtimeSessionId = `runtime.${hub.value.gameId}.${player.value}.${Date.parse(nowIso)}`;

  return {
    ok: true,
    value: freezeAuthority({
      contractVersion: GAMES_HUB_RUNTIME_CONTRACT_VERSION,
      runtimeSessionId,
      gameId: hub.value.gameId,
      playerId: player.value,
      mode: "solo" as const,
      lifecycleState: "active" as const,
      createdAt: nowIso,
      updatedAt: nowIso,
      expiresAt,
      platformSessionId: null,
      finalized: false,
    }),
  };
}

/**
 * Pure fail-closed binder: attach a validated Platform `session_id` to an
 * existing Hub Runtime session contract.
 *
 * Sets only `platformSessionId`. Preserves every other runtime field.
 * Metadata only — a non-null `platformSessionId` must never be treated as
 * ownership, gameplay permission, submit permission, runtime authority, or
 * playability. Does not call Session Start, Submit, any RPC, or Supabase.
 * Does not connect completion handoff or change Hub Runtime authority.
 *
 * Idempotent: rebinding the same Platform session id returns an equivalent
 * frozen contract. Conflicting rebind fails closed.
 */
export function bindGamesRuntimePlatformSessionId(
  session: unknown,
  platformSessionId: unknown
): GamesValidationResult<GamesRuntimeSessionContract> {
  if (session === null || session === undefined || typeof session !== "object") {
    return fail("session_required");
  }

  const runtime = session as GamesRuntimeSessionContract;

  const idResult = validateGameSessionId(platformSessionId);
  if (!idResult.ok) return idResult;

  if (
    runtime.platformSessionId !== null &&
    runtime.platformSessionId !== undefined &&
    runtime.platformSessionId !== idResult.value
  ) {
    return fail("platform_session_id_conflict");
  }

  return {
    ok: true,
    value: freezeAuthority({
      contractVersion: runtime.contractVersion,
      runtimeSessionId: runtime.runtimeSessionId,
      gameId: runtime.gameId,
      playerId: runtime.playerId,
      mode: runtime.mode,
      lifecycleState: runtime.lifecycleState,
      createdAt: runtime.createdAt,
      updatedAt: runtime.updatedAt,
      expiresAt: runtime.expiresAt,
      platformSessionId: idResult.value,
      finalized: runtime.finalized,
    }),
  };
}

export type GamesRuntimeResumeInput = {
  session: GamesRuntimeSessionContract;
  catalogEntry: GamesCatalogEntryView;
  playerId: string;
  nowIso?: string;
};

/**
 * Resume / reconnect an existing runtime session.
 * Rejects other players, terminal sessions, and unavailable games.
 */
export function resumeGamesRuntimeSession(
  input: GamesRuntimeResumeInput
): GamesValidationResult<GamesRuntimeSessionContract> {
  const player = validateActorId(input.playerId, "player_id");
  if (!player.ok) return player;

  const session = input.session;
  if (!session || typeof session !== "object") {
    return fail("session_required");
  }
  if (session.playerId !== player.value) {
    return fail("session_owner_mismatch");
  }
  if (isGamesRuntimeTerminalState(session.lifecycleState)) {
    return fail("session_terminal");
  }

  const gameId = validateGameId(input.catalogEntry.id);
  if (!gameId.ok) return gameId;
  if (session.gameId !== gameId.value) {
    return fail("session_game_mismatch");
  }

  const eligibility = evaluateGamesRuntimeEligibility(input.catalogEntry);
  if (!eligibility.ok) {
    return fail(eligibility.reason);
  }

  const nowIso =
    typeof input.nowIso === "string" && !Number.isNaN(Date.parse(input.nowIso))
      ? input.nowIso
      : new Date().toISOString();

  if (session.expiresAt) {
    const exp = Date.parse(session.expiresAt);
    if (!Number.isNaN(exp) && Date.parse(nowIso) > exp) {
      return fail("session_expired");
    }
  }

  let nextState: GamesRuntimeLifecycleState = session.lifecycleState;
  if (session.lifecycleState === "created") {
    nextState = "active";
  } else if (session.lifecycleState === "paused") {
    nextState = "active";
  } else if (session.lifecycleState !== "active") {
    return fail("session_not_resumable");
  }

  const transition = evaluateGamesRuntimeLifecycleTransition({
    from: session.lifecycleState,
    to: nextState,
  });
  if (!transition.ok) return fail(transition.reason);

  return {
    ok: true,
    value: freezeAuthority({
      ...session,
      lifecycleState: nextState,
      updatedAt: nowIso,
      finalized: false,
    }),
  };
}

export type GamesRuntimeCompleteInput = {
  session: GamesRuntimeSessionContract;
  catalogEntry: GamesCatalogEntryView;
  playerId: string;
  /** Client claim — never authoritative. */
  clientClaim: unknown;
  idempotencyKey: unknown;
  alreadyFinalized?: boolean;
};

/**
 * Completion handoff into Platform result / progress / achievements foundations.
 * Does not grant rewards and never treats the client claim as final authority.
 */
export function completeGamesRuntimeSession(
  input: GamesRuntimeCompleteInput
):
  | {
      ok: true;
      session: GamesRuntimeSessionContract;
      handoff: GamesRuntimeCompletionHandoff;
    }
  | GamesValidationErr {
  const player = validateActorId(input.playerId, "player_id");
  if (!player.ok) return player;

  if (input.session.playerId !== player.value) {
    return fail("session_owner_mismatch");
  }
  if (input.alreadyFinalized === true || input.session.finalized === true) {
    // Idempotent finalization: repeat completion after terminal is a no-op success.
    if (input.session.lifecycleState === "completed" && input.session.finalized) {
      const key = validateIdempotencyKey(input.idempotencyKey);
      if (!key.ok) return key;
      const claim = validateClientResultClaim(input.clientClaim, "fail_closed");
      if (!claim.ok) return claim;
      return {
        ok: true,
        session: input.session,
        handoff: Object.freeze({
          contractVersion: GAMES_HUB_RUNTIME_CONTRACT_VERSION,
          runtimeSessionId: input.session.runtimeSessionId,
          gameId: input.session.gameId,
          playerId: player.value,
          claim: claim.value,
          preparesGameResult: true as const,
          preparesPlayerProgress: true as const,
          preparesAchievements: true as const,
          grantsRewards: false as const,
          acceptsClientResultAsAuthoritative: false as const,
          applied: false as const,
          message:
            "Idempotent completion replay; handoff already finalized (applied: false).",
        }),
      };
    }
    return fail("session_already_finalized");
  }

  if (
    input.session.lifecycleState !== "active" &&
    input.session.lifecycleState !== "paused"
  ) {
    return fail("session_not_completable");
  }

  const eligibility = evaluateGamesRuntimeEligibility(input.catalogEntry);
  if (!eligibility.ok) {
    return fail(eligibility.reason);
  }

  const key = validateIdempotencyKey(input.idempotencyKey);
  if (!key.ok) return key;

  // Reject client-forged authoritative fields via Platform claim validator.
  const claim = validateClientResultClaim(input.clientClaim, "fail_closed");
  if (!claim.ok) return claim;

  // Explicitly reject attempts to force completion authority via forged envelope.
  if (isPlainObject(input.clientClaim)) {
    if (
      input.clientClaim.accepted === true ||
      input.clientClaim.grantsRewards === true ||
      input.clientClaim.authoritative === true
    ) {
      return fail("client_forged_result_rejected");
    }
  }

  const transition = evaluateGamesRuntimeLifecycleTransition({
    from: input.session.lifecycleState,
    to: "completed",
  });
  if (!transition.ok) return fail(transition.reason);

  const nowIso = new Date().toISOString();
  const session = freezeAuthority({
    ...input.session,
    lifecycleState: "completed" as const,
    updatedAt: nowIso,
    finalized: true,
  });

  const handoff: GamesRuntimeCompletionHandoff = Object.freeze({
    contractVersion: GAMES_HUB_RUNTIME_CONTRACT_VERSION,
    runtimeSessionId: session.runtimeSessionId,
    gameId: session.gameId,
    playerId: player.value,
    claim: claim.value,
    preparesGameResult: true as const,
    preparesPlayerProgress: true as const,
    preparesAchievements: true as const,
    grantsRewards: false as const,
    acceptsClientResultAsAuthoritative: false as const,
    applied: false as const,
    message:
      "Completion handoff prepared for Platform result/progress/achievements; rewards not granted; client claim is non-authoritative.",
  });

  return { ok: true, session, handoff };
}

export type GamesRuntimeFinalizeInput = {
  session: GamesRuntimeSessionContract;
  to: "abandoned" | "expired";
  playerId?: string;
  nowIso?: string;
  /** When true, repeating finalize on same terminal state succeeds idempotently. */
  allowIdempotentReplay?: boolean;
};

/**
 * Abandon / inactivity expiry / safe close with idempotent finalization.
 */
export function finalizeGamesRuntimeSession(
  input: GamesRuntimeFinalizeInput
): GamesValidationResult<GamesRuntimeSessionContract> {
  if (input.to !== "abandoned" && input.to !== "expired") {
    return fail("finalize_target_invalid");
  }

  const session = input.session;
  if (!session) return fail("session_required");

  if (input.playerId !== undefined) {
    const player = validateActorId(input.playerId, "player_id");
    if (!player.ok) return player;
    if (session.playerId !== player.value) {
      return fail("session_owner_mismatch");
    }
  }

  if (session.finalized || isGamesRuntimeTerminalState(session.lifecycleState)) {
    if (
      input.allowIdempotentReplay !== false &&
      session.lifecycleState === input.to &&
      session.finalized
    ) {
      return { ok: true, value: session };
    }
    return fail("session_already_finalized");
  }

  const transition = evaluateGamesRuntimeLifecycleTransition({
    from: session.lifecycleState,
    to: input.to,
  });
  if (!transition.ok) return fail(transition.reason);

  const nowResult =
    input.nowIso !== undefined
      ? validateIsoTimestamp(input.nowIso, "now")
      : { ok: true as const, value: new Date().toISOString() };
  if (!nowResult.ok) return nowResult;

  return {
    ok: true,
    value: freezeAuthority({
      ...session,
      lifecycleState: input.to,
      updatedAt: nowResult.value,
      finalized: true,
    }),
  };
}

/** Convenience: abandon path. */
export function abandonGamesRuntimeSession(input: {
  session: GamesRuntimeSessionContract;
  playerId: string;
  nowIso?: string;
}): GamesValidationResult<GamesRuntimeSessionContract> {
  return finalizeGamesRuntimeSession({
    session: input.session,
    to: "abandoned",
    playerId: input.playerId,
    nowIso: input.nowIso,
    allowIdempotentReplay: true,
  });
}

/** Convenience: inactivity expiry path. */
export function expireGamesRuntimeSession(input: {
  session: GamesRuntimeSessionContract;
  nowIso?: string;
}): GamesValidationResult<GamesRuntimeSessionContract> {
  const nowIso =
    typeof input.nowIso === "string" && !Number.isNaN(Date.parse(input.nowIso))
      ? input.nowIso
      : new Date().toISOString();

  if (input.session.expiresAt) {
    const exp = Date.parse(input.session.expiresAt);
    if (!Number.isNaN(exp) && Date.parse(nowIso) <= exp) {
      return fail("session_not_expired_yet");
    }
  }

  return finalizeGamesRuntimeSession({
    session: input.session,
    to: "expired",
    nowIso,
    allowIdempotentReplay: true,
  });
}
