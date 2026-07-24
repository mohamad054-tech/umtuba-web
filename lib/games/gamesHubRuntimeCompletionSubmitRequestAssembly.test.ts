import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  GAMES_CATALOG_FEATURE_FLAG_DEFAULTS,
  type GamesCatalogEntryView,
} from "./gamesCatalog";
import {
  GAMES_HUB_RUNTIME_AUTHORITY,
  GAMES_HUB_RUNTIME_CONTRACT_VERSION,
  assembleGamesRuntimeCompletionSubmitRequest,
  bindGamesRuntimePlatformSessionId,
  completeGamesRuntimeSession,
  startGamesRuntimeSession,
  type GamesRuntimeCompletionHandoff,
  type GamesRuntimeSessionContract,
} from "./gamesHubRuntime";

const MODULE = join(process.cwd(), "lib/games/gamesHubRuntime.ts");

const GAME_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_GAME_ID = "22222222-2222-4222-8222-222222222222";
const PLATFORM_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const PLAYER_A = "player.user-a";
const PLAYER_B = "player.user-b";
const NOW = "2026-07-24T00:00:00.000Z";
const IDEMPOTENCY_KEY = "assembly-run-1";

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

function boundCompletedPair(claim: unknown = { score: 10 }): {
  session: GamesRuntimeSessionContract;
  handoff: GamesRuntimeCompletionHandoff;
} {
  const started = startGamesRuntimeSession({
    catalogEntry: playableEntry(),
    playerId: PLAYER_A,
    nowIso: NOW,
  });
  if (!started.ok) throw new Error(started.reason);

  const bound = bindGamesRuntimePlatformSessionId(
    started.value,
    PLATFORM_SESSION_ID
  );
  if (!bound.ok) throw new Error(bound.reason);

  const completed = completeGamesRuntimeSession({
    session: bound.value,
    catalogEntry: playableEntry(),
    playerId: PLAYER_A,
    clientClaim: claim,
    idempotencyKey: IDEMPOTENCY_KEY,
  });
  if (!completed.ok) throw new Error(completed.reason);

  return { session: completed.session, handoff: completed.handoff };
}

describe("Games Hub Runtime Completion Submit Request Assembly Trusted V1", () => {
  it("assembles a validated submit request successfully", () => {
    const { session, handoff } = boundCompletedPair({ score: 42 });
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      session_id: PLATFORM_SESSION_ID,
      idempotency_key: IDEMPOTENCY_KEY,
      claim: { score: 42 },
    });
  });

  it("maps platformSessionId exactly to session_id", () => {
    const { session, handoff } = boundCompletedPair();
    expect(session.platformSessionId).toBe(PLATFORM_SESSION_ID);
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.session_id).toBe(session.platformSessionId);
    expect(r.value.session_id).toBe(PLATFORM_SESSION_ID);
  });

  it("passes claim through the existing submit request validator", () => {
    const claim = {
      score: 12.5,
      level: 3,
      experience_delta: 40,
      duration_ms: 1500,
      client_meta: { note: "ok", city_id: null },
    };
    const { session, handoff } = boundCompletedPair(claim);
    expect(handoff.claim).toEqual(claim);
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.claim).toEqual(claim);
  });

  it("accepts a valid idempotency key via the request validator", () => {
    const { session, handoff } = boundCompletedPair();
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      handoff,
      "valid-key-99"
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.idempotency_key).toBe("valid-key-99");
  });

  it("rejects missing platformSessionId", () => {
    const started = startGamesRuntimeSession({
      catalogEntry: playableEntry(),
      playerId: PLAYER_A,
      nowIso: NOW,
    });
    if (!started.ok) throw new Error(started.reason);
    expect(started.value.platformSessionId).toBeNull();

    const completed = completeGamesRuntimeSession({
      session: started.value,
      catalogEntry: playableEntry(),
      playerId: PLAYER_A,
      clientClaim: { score: 1 },
      idempotencyKey: IDEMPOTENCY_KEY,
    });
    if (!completed.ok) throw new Error(completed.reason);

    const r = assembleGamesRuntimeCompletionSubmitRequest(
      completed.session,
      completed.handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("platform_session_id_required");
  });

  it("rejects invalid platformSessionId via the request validator", () => {
    const { session, handoff } = boundCompletedPair();
    const forged = Object.freeze({
      ...session,
      platformSessionId: "not-a-uuid",
    }) as GamesRuntimeSessionContract;
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      forged,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("session_id_invalid");
  });

  it("rejects malformed runtime session", () => {
    const { handoff } = boundCompletedPair();
    expect(
      assembleGamesRuntimeCompletionSubmitRequest(null, handoff, IDEMPOTENCY_KEY)
    ).toMatchObject({ ok: false, reason: "session_required" });
    expect(
      assembleGamesRuntimeCompletionSubmitRequest(
        undefined,
        handoff,
        IDEMPOTENCY_KEY
      )
    ).toMatchObject({ ok: false, reason: "session_required" });
    expect(
      assembleGamesRuntimeCompletionSubmitRequest(
        "x",
        handoff,
        IDEMPOTENCY_KEY
      )
    ).toMatchObject({ ok: false, reason: "session_required" });
  });

  it("rejects malformed completion handoff", () => {
    const { session } = boundCompletedPair();
    expect(
      assembleGamesRuntimeCompletionSubmitRequest(
        session,
        null,
        IDEMPOTENCY_KEY
      )
    ).toMatchObject({ ok: false, reason: "handoff_required" });
    expect(
      assembleGamesRuntimeCompletionSubmitRequest(
        session,
        undefined,
        IDEMPOTENCY_KEY
      )
    ).toMatchObject({ ok: false, reason: "handoff_required" });
    expect(
      assembleGamesRuntimeCompletionSubmitRequest(session, "x", IDEMPOTENCY_KEY)
    ).toMatchObject({ ok: false, reason: "handoff_required" });
  });

  it("rejects runtime/handoff identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const mismatched = Object.freeze({
      ...handoff,
      runtimeSessionId: "runtime.other-session",
    }) as GamesRuntimeCompletionHandoff;
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      mismatched,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("runtime_session_id_mismatch");
  });

  it("rejects game identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const mismatched = Object.freeze({
      ...handoff,
      gameId: OTHER_GAME_ID,
    }) as GamesRuntimeCompletionHandoff;
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      mismatched,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("session_game_mismatch");
  });

  it("rejects player identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const mismatched = Object.freeze({
      ...handoff,
      playerId: PLAYER_B,
    }) as GamesRuntimeCompletionHandoff;
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      mismatched,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("session_owner_mismatch");
  });

  it("rejects invalid claim via the request validator", () => {
    const { session, handoff } = boundCompletedPair();
    const badHandoff = Object.freeze({
      ...handoff,
      claim: { score: -1 },
    }) as GamesRuntimeCompletionHandoff;
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      badHandoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("score_negative");
  });

  it("rejects invalid idempotency key via the request validator", () => {
    const { session, handoff } = boundCompletedPair();
    expect(
      assembleGamesRuntimeCompletionSubmitRequest(session, handoff, "")
    ).toMatchObject({ ok: false, reason: "idempotency_key_required" });
    expect(
      assembleGamesRuntimeCompletionSubmitRequest(session, handoff, null)
    ).toMatchObject({ ok: false, reason: "idempotency_key_required" });
  });

  it("returns an exact bounded frozen result", () => {
    const { session, handoff } = boundCompletedPair({
      score: 7,
      level: 1,
    });
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.value).sort()).toEqual([
      "claim",
      "idempotency_key",
      "session_id",
    ]);
    expect(Object.isFrozen(r.value)).toBe(true);
    expect(Object.isFrozen(r.value.claim)).toBe(true);
    expect(r.value).not.toHaveProperty("platformSessionId");
    expect(r.value).not.toHaveProperty("runtimeSessionId");
    expect(r.value).not.toHaveProperty("applied");
    expect(r.value).not.toHaveProperty("grantsRewards");
  });

  it("is deterministic and pure across repeated calls", () => {
    const { session, handoff } = boundCompletedPair({ score: 3 });
    const a = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    const b = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(a).toEqual(b);
  });

  it("does not mutate runtime session or completion handoff", () => {
    const { session, handoff } = boundCompletedPair({ score: 9 });
    const sessionSnapshot = structuredClone(session);
    const handoffSnapshot = structuredClone(handoff);
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);
    expect(session).toEqual(sessionSnapshot);
    expect(handoff).toEqual(handoffSnapshot);
  });

  it("does not call RPC helpers or perform side effects", () => {
    const rpc = vi.fn();
    const startTrusted = vi.fn();
    const submitTrusted = vi.fn();
    const { session, handoff } = boundCompletedPair();
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
    expect(startTrusted).not.toHaveBeenCalled();
    expect(submitTrusted).not.toHaveBeenCalled();

    const src = read(MODULE);
    expect(src).toMatch(/assembleGamesRuntimeCompletionSubmitRequest/);
    expect(src).toMatch(/validateGamesSessionResultSubmitRequest/);
    expect(src).not.toMatch(/startMyGameSessionTrusted/);
    expect(src).not.toMatch(/submitMyGameSessionResultTrusted/);
    expect(src).not.toMatch(/client\.rpc/);
    expect(src).not.toMatch(/createClient/);
  });

  it("keeps Hub Runtime authority flags false", () => {
    const { session, handoff } = boundCompletedPair();
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);
    expect(session.runsActualGameServer).toBe(false);
    expect(session.grantsRewards).toBe(false);
    expect(session.acceptsClientResultAsAuthoritative).toBe(false);
    expect(session.multiplayerEnabled).toBe(false);
    expect(session.matchmakingEnabled).toBe(false);
    expect(session.appliesMigrations).toBe(false);
    expect(session.publicApiEnabled).toBe(false);
    expect(session.productionRuntimeEndpointEnabled).toBe(false);
    expect(session.mutatesDatabase).toBe(false);
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

  it("leaves handoff.applied false and does not reinterpret authority", () => {
    const { session, handoff } = boundCompletedPair();
    expect(handoff.applied).toBe(false);
    expect(handoff.grantsRewards).toBe(false);
    expect(handoff.acceptsClientResultAsAuthoritative).toBe(false);
    expect(handoff.contractVersion).toBe(GAMES_HUB_RUNTIME_CONTRACT_VERSION);
    const r = assembleGamesRuntimeCompletionSubmitRequest(
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);
    expect(handoff.applied).toBe(false);
    expect(handoff.grantsRewards).toBe(false);
    expect(handoff.acceptsClientResultAsAuthoritative).toBe(false);
  });
});
