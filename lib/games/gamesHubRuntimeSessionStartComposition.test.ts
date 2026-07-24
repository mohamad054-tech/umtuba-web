import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  GAMES_CATALOG_FEATURE_FLAG_DEFAULTS,
  type GamesCatalogEntryView,
} from "./gamesCatalog";
import { GAMES_PUBLIC_RPCS } from "./gamesFoundation";
import {
  GAMES_HUB_RUNTIME_AUTHORITY,
  bindGamesRuntimePlatformSessionId,
  startGamesRuntimeSession,
  type GamesRuntimeSessionContract,
} from "./gamesHubRuntime";
import { startGamesRuntimeSessionCompositionTrusted } from "./gamesHubRuntimeSessionStartComposition";

const MODULE = join(
  process.cwd(),
  "lib/games/gamesHubRuntimeSessionStartComposition.ts"
);
const HUB_RUNTIME = join(process.cwd(), "lib/games/gamesHubRuntime.ts");

const GAME_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_GAME_ID = "22222222-2222-4222-8222-222222222222";
const PLATFORM_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const OTHER_PLATFORM_SESSION_ID = "ffffffff-1111-4222-8333-444444444444";
const PLAYER_A = "player.user-a";
const NOW = "2026-07-24T00:00:00.000Z";
const STARTED_AT = "2026-07-24T00:00:01.000Z";
const EXPIRES_AT = "2026-07-24T01:00:01.000Z";

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

function sampleStart(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    session_id: PLATFORM_SESSION_ID,
    game_id: GAME_ID,
    status: "active",
    started_at: STARTED_AT,
    expires_at: EXPIRES_AT,
    resumed: false,
    ...overrides,
  };
}

describe("Games Hub Runtime Session Start Composition Trusted V1", () => {
  it("composes start → continuity → bind for a new Platform session", async () => {
    const session = unboundSession();
    const rpc = vi.fn(async (fn: string, args?: Record<string, unknown>) => {
      expect(fn).toBe(GAMES_PUBLIC_RPCS.startSession);
      expect(args).toEqual({ p_game_id: GAME_ID });
      return { data: sampleStart({ resumed: false }), error: null };
    });

    const r = await startGamesRuntimeSessionCompositionTrusted(
      { rpc },
      session
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(r.value.platformSessionId).toBe(PLATFORM_SESSION_ID);
    expect(r.value.runtimeSessionId).toBe(session.runtimeSessionId);
    expect(r.value.gameId).toBe(session.gameId);
    expect(r.value.playerId).toBe(session.playerId);
    expect(r.value.lifecycleState).toBe(session.lifecycleState);
    expect(r.value.finalized).toBe(session.finalized);
  });

  it("composes successfully when Platform resumes an existing session", async () => {
    const session = unboundSession();
    const r = await startGamesRuntimeSessionCompositionTrusted(
      {
        rpc: async () => ({
          data: sampleStart({ resumed: true }),
          error: null,
        }),
      },
      session
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.platformSessionId).toBe(PLATFORM_SESSION_ID);
    expect(r.value.gameId).toBe(GAME_ID);
    // Composition must not reinterpret resumed; only bind metadata.
    expect(r.value).not.toHaveProperty("resumed");
  });

  it("requires exact game_id continuity between Platform start and runtime", async () => {
    const session = unboundSession();
    const r = await startGamesRuntimeSessionCompositionTrusted(
      {
        rpc: async () => ({
          data: sampleStart({ game_id: OTHER_GAME_ID }),
          error: null,
        }),
      },
      session
    );

    expect(r).toEqual({
      ok: false,
      reason: "platform_session_game_mismatch",
    });
  });

  it("preserves start-client validation failures exactly", async () => {
    const session = unboundSession();
    const rpc = vi.fn(async () => ({
      data: sampleStart(),
      error: null,
    }));

    const invalidGame = await startGamesRuntimeSessionCompositionTrusted(
      { rpc },
      { ...session, gameId: "not-a-uuid" }
    );
    expect(invalidGame).toEqual({ ok: false, reason: "game_id_invalid" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("preserves start-client RPC failures exactly", async () => {
    const session = unboundSession();
    const r = await startGamesRuntimeSessionCompositionTrusted(
      {
        rpc: async () => ({
          data: null,
          error: { message: "Game not available" },
        }),
      },
      session
    );
    expect(r).toEqual({
      ok: false,
      reason: "session_start_rpc_failed",
    });
  });

  it("preserves invalid returned start response exactly", async () => {
    const session = unboundSession();
    const r = await startGamesRuntimeSessionCompositionTrusted(
      {
        rpc: async () => ({
          data: sampleStart({ status: "completed" }),
          error: null,
        }),
      },
      session
    );
    expect(r).toEqual({
      ok: false,
      reason: "session_start_response_invalid",
    });
  });

  it("fails closed for missing runtime session before RPC", async () => {
    const rpc = vi.fn(async () => ({ data: sampleStart(), error: null }));
    const missingSession = await startGamesRuntimeSessionCompositionTrusted(
      { rpc },
      null
    );
    expect(missingSession).toEqual({
      ok: false,
      reason: "session_required",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("keeps same platformSessionId bind idempotent", async () => {
    const session = unboundSession();
    const preBound = bindGamesRuntimePlatformSessionId(
      session,
      PLATFORM_SESSION_ID
    );
    expect(preBound.ok).toBe(true);
    if (!preBound.ok) return;

    const r = await startGamesRuntimeSessionCompositionTrusted(
      {
        rpc: async () => ({
          data: sampleStart({ session_id: PLATFORM_SESSION_ID }),
          error: null,
        }),
      },
      preBound.value
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.platformSessionId).toBe(PLATFORM_SESSION_ID);
    expect(r.value.runtimeSessionId).toBe(preBound.value.runtimeSessionId);
  });

  it("fails closed when a conflicting platformSessionId is already bound", async () => {
    const session = unboundSession();
    const preBound = bindGamesRuntimePlatformSessionId(
      session,
      OTHER_PLATFORM_SESSION_ID
    );
    expect(preBound.ok).toBe(true);
    if (!preBound.ok) return;

    const r = await startGamesRuntimeSessionCompositionTrusted(
      {
        rpc: async () => ({
          data: sampleStart({ session_id: PLATFORM_SESSION_ID }),
          error: null,
        }),
      },
      preBound.value
    );

    expect(r).toEqual({
      ok: false,
      reason: "platform_session_id_conflict",
    });
  });

  it("does not mutate the input runtime session", async () => {
    const session = unboundSession();
    const snapshot = structuredClone(session);
    const r = await startGamesRuntimeSessionCompositionTrusted(
      {
        rpc: async () => ({ data: sampleStart(), error: null }),
      },
      session
    );
    expect(r.ok).toBe(true);
    expect(session).toEqual(snapshot);
    expect(session.platformSessionId).toBeNull();
    if (!r.ok) return;
    expect(r.value).not.toBe(session);
  });

  it("returns a frozen runtime contract", async () => {
    const session = unboundSession();
    const r = await startGamesRuntimeSessionCompositionTrusted(
      {
        rpc: async () => ({ data: sampleStart(), error: null }),
      },
      session
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.isFrozen(r.value)).toBe(true);
    expect(() => {
      (r.value as { platformSessionId: string | null }).platformSessionId =
        null;
    }).toThrow();
  });

  it("keeps Hub Runtime authority flags false and avoids Submit/UI/extra RPC", async () => {
    const session = unboundSession();
    const rpc = vi.fn(async () => ({
      data: sampleStart(),
      error: null,
    }));

    const r = await startGamesRuntimeSessionCompositionTrusted(
      { rpc },
      session
    );
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

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(GAMES_PUBLIC_RPCS.startSession, {
      p_game_id: GAME_ID,
    });

    const compositionSrc = read(MODULE);
    expect(compositionSrc).toMatch(/startGamesRuntimeSessionCompositionTrusted/);
    expect(compositionSrc).toMatch(/startMyGameSessionTrusted/);
    expect(compositionSrc).toMatch(/bindGamesRuntimePlatformSessionId/);
    expect(compositionSrc).toMatch(/platform_session_game_mismatch/);
    expect(compositionSrc).not.toMatch(/submitMyGameSessionResultTrusted/);
    expect(compositionSrc).not.toMatch(/submit_game_session_result/);
    expect(compositionSrc).not.toMatch(/completeGamesRuntimeSession/);
    expect(compositionSrc).not.toMatch(/createClient/);

    const hub = read(HUB_RUNTIME);
    expect(hub).not.toMatch(/startMyGameSessionTrusted/);
    expect(hub).not.toMatch(/startGamesRuntimeSessionCompositionTrusted/);
    expect(hub).not.toMatch(/start_game_session/);
  });
});
