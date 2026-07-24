import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GAMES_CATALOG_FEATURE_FLAG_DEFAULTS,
  type GamesCatalogEntryView,
} from "./gamesCatalog";
import {
  GAMES_HUB_RUNTIME_AUTHORITY,
  bindGamesRuntimePlatformSessionId,
  startGamesRuntimeSession,
  type GamesRuntimeSessionContract,
} from "./gamesHubRuntime";

const MODULE = join(process.cwd(), "lib/games/gamesHubRuntime.ts");

const GAME_ID = "11111111-1111-4111-8111-111111111111";
const PLATFORM_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const OTHER_PLATFORM_SESSION_ID = "ffffffff-1111-4222-8333-444444444444";
const PLAYER_A = "player.user-a";
const NOW = "2026-07-24T00:00:00.000Z";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

function playableEntry(
  overrides: Partial<GamesCatalogEntryView> = {}
): GamesCatalogEntryView {
  return {
    id: GAME_ID,
    game_key: "sample_game",
    slug: "sample-game",
    name: "Sample Game",
    description: "A foundation sample",
    short_blurb: "sample",
    status: "active",
    availability: "available",
    visibility: "listed",
    category: "casual",
    difficulty: "easy",
    min_players: 1,
    max_players: 1,
    platforms: ["web"],
    feature_flags: { ...GAMES_CATALOG_FEATURE_FLAG_DEFAULTS },
    catalog_version: 1,
    content_version: "1.0.0",
    sort_order: 10,
    is_featured: false,
    result_validation_mode: "fail_closed",
    session_ttl_seconds: 3600,
    ...overrides,
  };
}

function unboundSession(): GamesRuntimeSessionContract {
  const started = startGamesRuntimeSession({
    catalogEntry: playableEntry(),
    playerId: PLAYER_A,
    nowIso: NOW,
  });
  if (!started.ok) throw new Error(started.reason);
  expect(started.value.platformSessionId).toBeNull();
  return started.value;
}

describe("Games Hub Runtime Platform Session Bind Trusted V1", () => {
  it("binds a validated Platform session id successfully", () => {
    const session = unboundSession();
    const r = bindGamesRuntimePlatformSessionId(session, PLATFORM_SESSION_ID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.platformSessionId).toBe(PLATFORM_SESSION_ID);
    expect(r.value.runtimeSessionId).toBe(session.runtimeSessionId);
    expect(r.value.gameId).toBe(session.gameId);
    expect(r.value.playerId).toBe(session.playerId);
    expect(r.value.mode).toBe(session.mode);
    expect(r.value.lifecycleState).toBe(session.lifecycleState);
    expect(r.value.createdAt).toBe(session.createdAt);
    expect(r.value.updatedAt).toBe(session.updatedAt);
    expect(r.value.expiresAt).toBe(session.expiresAt);
    expect(r.value.finalized).toBe(session.finalized);
    expect(r.value.contractVersion).toBe(session.contractVersion);
  });

  it("allows repeated bind with the same Platform session id", () => {
    const session = unboundSession();
    const first = bindGamesRuntimePlatformSessionId(session, PLATFORM_SESSION_ID);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = bindGamesRuntimePlatformSessionId(
      first.value,
      PLATFORM_SESSION_ID
    );
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.platformSessionId).toBe(PLATFORM_SESSION_ID);
    expect(second.value.runtimeSessionId).toBe(first.value.runtimeSessionId);
    expect(second.value.gameId).toBe(first.value.gameId);
    expect(second.value.playerId).toBe(first.value.playerId);
    expect(second.value.lifecycleState).toBe(first.value.lifecycleState);
  });

  it("rejects conflicting rebind to a different Platform session id", () => {
    const session = unboundSession();
    const first = bindGamesRuntimePlatformSessionId(session, PLATFORM_SESSION_ID);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const conflict = bindGamesRuntimePlatformSessionId(
      first.value,
      OTHER_PLATFORM_SESSION_ID
    );
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.reason).toBe("platform_session_id_conflict");
  });

  it("rejects invalid Platform session UUID", () => {
    const session = unboundSession();
    const r = bindGamesRuntimePlatformSessionId(session, "not-a-uuid");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("session_id_invalid");
  });

  it("rejects missing Platform session id", () => {
    const session = unboundSession();
    const missingNull = bindGamesRuntimePlatformSessionId(session, null);
    expect(missingNull.ok).toBe(false);
    if (missingNull.ok) return;
    expect(missingNull.reason).toBe("session_id_invalid");

    const missingUndefined = bindGamesRuntimePlatformSessionId(
      session,
      undefined
    );
    expect(missingUndefined.ok).toBe(false);
    if (missingUndefined.ok) return;
    expect(missingUndefined.reason).toBe("session_id_invalid");

    const missingEmpty = bindGamesRuntimePlatformSessionId(session, "");
    expect(missingEmpty.ok).toBe(false);
    if (missingEmpty.ok) return;
    expect(missingEmpty.reason).toBe("session_id_invalid");
  });

  it("rejects null runtime contract", () => {
    const r = bindGamesRuntimePlatformSessionId(null, PLATFORM_SESSION_ID);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("session_required");

    const undef = bindGamesRuntimePlatformSessionId(
      undefined,
      PLATFORM_SESSION_ID
    );
    expect(undef.ok).toBe(false);
    if (undef.ok) return;
    expect(undef.reason).toBe("session_required");
  });

  it("returns immutable frozen output and preserves other fields", () => {
    const session = unboundSession();
    const r = bindGamesRuntimePlatformSessionId(session, PLATFORM_SESSION_ID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.isFrozen(r.value)).toBe(true);
    expect(() => {
      (r.value as { platformSessionId: string | null }).platformSessionId =
        null;
    }).toThrow();
    expect(session.platformSessionId).toBeNull();
    expect(r.value).not.toBe(session);
  });

  it("keeps Hub Runtime authority flags unchanged and false", () => {
    const session = unboundSession();
    const r = bindGamesRuntimePlatformSessionId(session, PLATFORM_SESSION_ID);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.runsActualGameServer).toBe(false);
    expect(r.value.grantsRewards).toBe(false);
    expect(r.value.acceptsClientResultAsAuthoritative).toBe(false);
    expect(r.value.multiplayerEnabled).toBe(false);
    expect(r.value.matchmakingEnabled).toBe(false);
    expect(r.value.appliesMigrations).toBe(false);
    expect(r.value.publicApiEnabled).toBe(false);
    expect(r.value.productionRuntimeEndpointEnabled).toBe(false);
    expect(r.value.mutatesDatabase).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.runsActualGameServer).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.grantsRewards).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.acceptsClientResultAsAuthoritative).toBe(
      false
    );
    expect(GAMES_HUB_RUNTIME_AUTHORITY.multiplayerEnabled).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.matchmakingEnabled).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.appliesMigrations).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.publicApiEnabled).toBe(false);
    expect(
      GAMES_HUB_RUNTIME_AUTHORITY.productionRuntimeEndpointEnabled
    ).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.mutatesDatabase).toBe(false);
  });

  it("module remains free of Session Start, Submit, RPC, and completion wire", () => {
    const src = read(MODULE);
    expect(src).toMatch(/bindGamesRuntimePlatformSessionId/);
    expect(src).toMatch(/validateGameSessionId/);
    expect(src).toMatch(/platform_session_id_conflict/);
    expect(src).toMatch(/Does not call Session Start, Submit/);
    expect(src).not.toMatch(/startMyGameSessionTrusted/);
    expect(src).not.toMatch(/submitMyGameSessionResultTrusted/);
    expect(src).not.toMatch(/submit_game_session_result/);
    expect(src).not.toMatch(/client\.rpc/);
  });
});
