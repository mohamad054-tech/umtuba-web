/**
 * UM Games Hub Experience Foundation V1 — UI view models & adapters.
 *
 * Transforms trusted Catalog / Runtime foundation data into display models.
 * No production game server, rewards, multiplayer, public APIs, or migrations.
 */

import {
  isCatalogVisibleToAuthenticated,
  type GamesCatalogAvailability,
  type GamesCatalogCategory,
  type GamesCatalogEntryView,
} from "./gamesCatalog";
import type { GamesValidationResult } from "./gamesFoundation";
import {
  buildGamesHubDomainContract,
  evaluateGamesRuntimeEligibility,
  type GamesHubMaintenanceState,
  type GamesHubReleaseChannel,
  type GamesRuntimeEligibilityReason,
  GAMES_HUB_RUNTIME_AUTHORITY,
} from "./gamesHubRuntime";

export const GAMES_HUB_EXPERIENCE_CONTRACT_VERSION = "v1" as const;

export const GAMES_HUB_EXPERIENCE_ROUTES = {
  hub: "/games",
} as const;

/** Play action outcomes — foundation evaluation only, no live server start. */
export const GAMES_HUB_PLAY_ACTIONS = [
  "eligible",
  "blocked",
  "maintenance",
  "unavailable",
  "runtime_metadata_missing",
] as const;
export type GamesHubPlayAction = (typeof GAMES_HUB_PLAY_ACTIONS)[number];

export const GAMES_HUB_UI_STATES = [
  "loading",
  "ready",
  "empty_catalog",
  "unavailable",
  "maintenance",
  "eligibility_blocked",
  "internal_error",
] as const;
export type GamesHubUiState = (typeof GAMES_HUB_UI_STATES)[number];

export type GamesHubCardViewModel = Readonly<{
  contractVersion: typeof GAMES_HUB_EXPERIENCE_CONTRACT_VERSION;
  gameId: string;
  title: string;
  shortDescription: string;
  category: GamesCatalogCategory;
  availability: GamesCatalogAvailability;
  maintenanceStatus: GamesHubMaintenanceState;
  supportedMode: "solo";
  playerCountLabel: string;
  releaseChannel: GamesHubReleaseChannel;
  runtimeEligible: boolean;
  disabledReason: string | null;
  playAction: GamesHubPlayAction;
  canPlay: boolean;
  /** Safe placeholder — no production assets required. */
  imagePlaceholderLabel: string;
}>;

export type GamesHubExperienceViewModel = Readonly<{
  contractVersion: typeof GAMES_HUB_EXPERIENCE_CONTRACT_VERSION;
  uiState: GamesHubUiState;
  games: readonly GamesHubCardViewModel[];
  userMessage: string | null;
  runsActualGameServer: false;
  grantsRewards: false;
  acceptsClientResultAsAuthoritative: false;
  multiplayerEnabled: false;
  publicApiEnabled: false;
}>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function playerCountLabel(min: number, max: number): string {
  if (min === max) {
    return min === 1 ? "1 player" : `${min} players`;
  }
  return `${min}–${max} players`;
}

function shortDescriptionFromEntry(entry: GamesCatalogEntryView): string {
  const blurb = entry.short_blurb?.trim();
  if (blurb) return blurb;
  const description = entry.description?.trim();
  if (description) {
    return description.length > 160
      ? `${description.slice(0, 157)}...`
      : description;
  }
  return "No description yet.";
}

function mapEligibilityToPlayAction(
  reason: GamesRuntimeEligibilityReason
): GamesHubPlayAction {
  switch (reason) {
    case "eligible":
      return "eligible";
    case "under_maintenance":
      return "maintenance";
    case "missing_runtime_metadata":
      return "runtime_metadata_missing";
    case "game_suspended":
    case "unavailable_for_player":
      return "unavailable";
    default:
      return "blocked";
  }
}

function disabledReasonLabel(action: GamesHubPlayAction, reason: GamesRuntimeEligibilityReason): string | null {
  if (action === "eligible") return null;
  switch (reason) {
    case "under_maintenance":
      return "Under maintenance";
    case "game_suspended":
      return "Unavailable";
    case "unavailable_for_player":
      return "Not available yet";
    case "missing_runtime_metadata":
      return "Runtime not ready";
    case "game_draft":
    case "game_archived":
      return "Not available";
    case "sessions_disabled":
      return "Sessions disabled";
    default:
      return "Cannot play";
  }
}

/**
 * Whether a catalog entry may appear in the Hub list.
 * Draft/archived never display. Visibility must pass catalog gate.
 */
export function isGamesHubDisplayableEntry(entry: {
  status: GamesCatalogEntryView["status"];
  visibility: GamesCatalogEntryView["visibility"];
  availability: GamesCatalogAvailability;
}): boolean {
  if (entry.status === "draft" || entry.status === "archived") {
    return false;
  }
  return isCatalogVisibleToAuthenticated(entry);
}

/**
 * Adapt a trusted catalog entry into a Hub card view model.
 * Ignores any client-forged eligibility / score / reward fields on raw input.
 */
export function adaptGamesCatalogEntryToHubCard(
  entry: GamesCatalogEntryView,
  rawClientOverlay?: unknown
): GamesHubCardViewModel | null {
  // Explicitly ignore client overlays — never trust forged eligibility.
  if (rawClientOverlay !== undefined && isPlainObject(rawClientOverlay)) {
    // Strip known forge attempts; adapter uses catalog entry only.
    void rawClientOverlay.runtimeEligible;
    void rawClientOverlay.canPlay;
    void rawClientOverlay.playAction;
    void rawClientOverlay.score;
    void rawClientOverlay.grantsRewards;
  }

  if (!isGamesHubDisplayableEntry(entry)) {
    return null;
  }

  const hub = buildGamesHubDomainContract(entry);
  if (!hub.ok) {
    return null;
  }

  const eligibility = evaluateGamesRuntimeEligibility(entry);
  const playAction = mapEligibilityToPlayAction(eligibility.reason);
  const canPlay = playAction === "eligible" && eligibility.ok;

  return Object.freeze({
    contractVersion: GAMES_HUB_EXPERIENCE_CONTRACT_VERSION,
    gameId: hub.value.gameId,
    title: hub.value.title,
    shortDescription: shortDescriptionFromEntry(entry),
    category: hub.value.category,
    availability: hub.value.availability,
    maintenanceStatus: hub.value.maintenanceState,
    supportedMode: "solo" as const,
    playerCountLabel: playerCountLabel(hub.value.minPlayers, hub.value.maxPlayers),
    releaseChannel: hub.value.releaseChannel,
    runtimeEligible: canPlay,
    disabledReason: disabledReasonLabel(playAction, eligibility.reason),
    playAction,
    canPlay,
    imagePlaceholderLabel: hub.value.title.slice(0, 1).toUpperCase() || "G",
  });
}

/**
 * Adapt a catalog list into a Hub experience view model.
 */
export function adaptGamesCatalogToHubExperience(
  entries: readonly GamesCatalogEntryView[],
  options?: { errorMessage?: string | null }
): GamesHubExperienceViewModel {
  if (options?.errorMessage) {
    return Object.freeze({
      contractVersion: GAMES_HUB_EXPERIENCE_CONTRACT_VERSION,
      uiState: "internal_error",
      games: Object.freeze([]),
      userMessage: "Something went wrong loading Games. Please try again later.",
      ...pickExperienceAuthority(),
    });
  }

  const games: GamesHubCardViewModel[] = [];
  for (const entry of entries) {
    const card = adaptGamesCatalogEntryToHubCard(entry);
    if (card) games.push(card);
  }

  if (games.length === 0) {
    return Object.freeze({
      contractVersion: GAMES_HUB_EXPERIENCE_CONTRACT_VERSION,
      uiState: "empty_catalog",
      games: Object.freeze([]),
      userMessage: "No games are available in the Hub yet.",
      ...pickExperienceAuthority(),
    });
  }

  const uiState = deriveAggregateUiState(games);

  return Object.freeze({
    contractVersion: GAMES_HUB_EXPERIENCE_CONTRACT_VERSION,
    uiState,
    games: Object.freeze(games),
    userMessage:
      uiState === "maintenance"
        ? "Games are under maintenance."
        : uiState === "unavailable"
          ? "Games are currently unavailable."
          : uiState === "eligibility_blocked"
            ? "No games are eligible to play right now."
            : null,
    ...pickExperienceAuthority(),
  });
}

function deriveAggregateUiState(
  games: readonly GamesHubCardViewModel[]
): GamesHubUiState {
  if (games.every((g) => g.playAction === "maintenance")) {
    return "maintenance";
  }
  if (games.every((g) => g.playAction === "unavailable")) {
    return "unavailable";
  }
  if (games.every((g) => !g.canPlay)) {
    return "eligibility_blocked";
  }
  return "ready";
}

function pickExperienceAuthority() {
  return {
    runsActualGameServer: false as const,
    grantsRewards: false as const,
    acceptsClientResultAsAuthoritative: false as const,
    multiplayerEnabled: false as const,
    publicApiEnabled: false as const,
  };
}

/**
 * Foundation Play action — evaluates precomputed card action only.
 * Does not start a real runtime server. Rejects client-forged overrides.
 */
export function evaluateGamesHubPlayAction(input: {
  card: GamesHubCardViewModel;
  /** Ignored — client cannot override eligibility. */
  clientOverride?: unknown;
}): {
  ok: true;
  action: GamesHubPlayAction;
  startedServer: false;
  grantsRewards: false;
  message: string;
} {
  void input.clientOverride;
  const action = input.card.playAction;
  const messages: Record<GamesHubPlayAction, string> = {
    eligible:
      "Eligible to play. Runtime session start is not wired in Experience Foundation V1.",
    blocked: "Play is blocked for this game.",
    maintenance: "This game is under maintenance.",
    unavailable: "This game is unavailable.",
    runtime_metadata_missing: "Runtime metadata is missing for this game.",
  };
  return {
    ok: true,
    action,
    startedServer: false,
    grantsRewards: false,
    message: messages[action],
  };
}

export type GamesHubCatalogLoadResult =
  | {
      ok: true;
      entries: readonly GamesCatalogEntryView[];
    }
  | {
      ok: false;
      reason: string;
    };

export type GamesHubCatalogListDependency = () => Promise<
  GamesValidationResult<GamesCatalogEntryView[]>
>;

/**
 * Trusted Hub catalog loader.
 * Requires an injected Catalog list dependency (typically
 * `listGamesCatalogTrusted` over authenticated `list_games_catalog`).
 * Fail-closed on dependency failure; never invents catalog rows.
 */
export async function loadGamesHubExperienceCatalogFoundation(deps: {
  listCatalog: GamesHubCatalogListDependency;
}): Promise<GamesHubCatalogLoadResult> {
  try {
    const listed = await deps.listCatalog();
    if (!listed.ok) {
      return { ok: false, reason: listed.reason };
    }
    return {
      ok: true,
      entries: Object.freeze([...listed.value]),
    };
  } catch {
    return { ok: false, reason: "catalog_load_failed" };
  }
}

/** Assert experience slice does not reopen Runtime authority. */
export function assertGamesHubExperienceAuthorityClosed(): boolean {
  return (
    GAMES_HUB_RUNTIME_AUTHORITY.runsActualGameServer === false &&
    GAMES_HUB_RUNTIME_AUTHORITY.grantsRewards === false &&
    GAMES_HUB_RUNTIME_AUTHORITY.acceptsClientResultAsAuthoritative === false &&
    GAMES_HUB_RUNTIME_AUTHORITY.multiplayerEnabled === false &&
    GAMES_HUB_RUNTIME_AUTHORITY.publicApiEnabled === false &&
    GAMES_HUB_RUNTIME_AUTHORITY.productionRuntimeEndpointEnabled === false
  );
}
