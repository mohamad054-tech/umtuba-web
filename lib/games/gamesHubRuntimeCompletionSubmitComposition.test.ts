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
  completeGamesRuntimeSession,
  startGamesRuntimeSession,
  type GamesRuntimeCompletionHandoff,
  type GamesRuntimeSessionContract,
} from "./gamesHubRuntime";
import { completeGamesRuntimeSubmitCompositionTrusted } from "./gamesHubRuntimeCompletionSubmitComposition";

const MODULE = join(
  process.cwd(),
  "lib/games/gamesHubRuntimeCompletionSubmitComposition.ts"
);
const HUB_RUNTIME = join(process.cwd(), "lib/games/gamesHubRuntime.ts");

const GAME_ID = "11111111-1111-4111-8111-111111111111";
const PLATFORM_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const RESULT_ID = "ffffffff-1111-4222-8333-444444444444";
const PLAYER_A = "player.user-a";
const NOW = "2026-07-24T00:00:00.000Z";
const IDEMPOTENCY_KEY = "composition-run-1";

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

function sampleAccepted(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    session_id: PLATFORM_SESSION_ID,
    result_id: RESULT_ID,
    decision_status: "accepted",
    rejection_reason: null,
    recorded_score: 10,
    idempotent_replay: false,
    ...overrides,
  };
}

describe("Games Hub Runtime Completion Submit Composition Trusted V1", () => {
  it("composes assemble → trusted submit successfully", async () => {
    const { session, handoff } = boundCompletedPair({ score: 42 });
    const rpc = vi.fn(async (fn: string, args?: Record<string, unknown>) => {
      expect(fn).toBe(GAMES_PUBLIC_RPCS.submitResult);
      expect(args).toEqual({
        p_session_id: PLATFORM_SESSION_ID,
        p_idempotency_key: IDEMPOTENCY_KEY,
        p_claim: { score: 42 },
      });
      return {
        data: sampleAccepted({ recorded_score: 42 }),
        error: null,
      };
    });

    const r = await completeGamesRuntimeSubmitCompositionTrusted(
      { rpc },
      session,
      handoff,
      IDEMPOTENCY_KEY
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(r.value).toEqual({
      session_id: PLATFORM_SESSION_ID,
      result_id: RESULT_ID,
      decision_status: "accepted",
      rejection_reason: null,
      recorded_score: 42,
      idempotent_replay: false,
    });
  });

  it("preserves request validation failures exactly", async () => {
    const { session, handoff } = boundCompletedPair();
    const rpc = vi.fn(async () => ({ data: sampleAccepted(), error: null }));

    const missingPlatform = await completeGamesRuntimeSubmitCompositionTrusted(
      { rpc },
      { ...session, platformSessionId: null },
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(missingPlatform).toEqual({
      ok: false,
      reason: "platform_session_id_required",
    });
    expect(rpc).not.toHaveBeenCalled();

    const badKey = await completeGamesRuntimeSubmitCompositionTrusted(
      { rpc },
      session,
      handoff,
      ""
    );
    expect(badKey).toEqual({
      ok: false,
      reason: "idempotency_key_required",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("preserves submit client failures exactly", async () => {
    const { session, handoff } = boundCompletedPair();
    const r = await completeGamesRuntimeSubmitCompositionTrusted(
      {
        rpc: async () => ({
          data: null,
          error: { message: "permission denied" },
        }),
      },
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r).toEqual({
      ok: false,
      reason: "session_result_submit_rpc_failed",
    });
  });

  it("passes through the exact submit response view", async () => {
    const { session, handoff } = boundCompletedPair({ score: 7 });
    const payload = sampleAccepted({
      decision_status: "rejected",
      rejection_reason: "score_negative",
      recorded_score: null,
      idempotent_replay: true,
    });
    const r = await completeGamesRuntimeSubmitCompositionTrusted(
      {
        rpc: async () => ({ data: payload, error: null }),
      },
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({
      session_id: PLATFORM_SESSION_ID,
      result_id: RESULT_ID,
      decision_status: "rejected",
      rejection_reason: "score_negative",
      recorded_score: null,
      idempotent_replay: true,
    });
    expect(Object.keys(r.value).sort()).toEqual(
      [
        "decision_status",
        "idempotent_replay",
        "recorded_score",
        "rejection_reason",
        "result_id",
        "session_id",
      ].sort()
    );
    expect(r.value).not.toHaveProperty("applied");
    expect(r.value).not.toHaveProperty("platformSessionId");
    expect(r.value).not.toHaveProperty("runtimeSessionId");
  });

  it("does not mutate runtime session or completion handoff", async () => {
    const { session, handoff } = boundCompletedPair({ score: 9 });
    const sessionSnapshot = structuredClone(session);
    const handoffSnapshot = structuredClone(handoff);
    const r = await completeGamesRuntimeSubmitCompositionTrusted(
      {
        rpc: async () => ({
          data: sampleAccepted({ recorded_score: 9 }),
          error: null,
        }),
      },
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);
    expect(session).toEqual(sessionSnapshot);
    expect(handoff).toEqual(handoffSnapshot);
  });

  it("leaves handoff.applied false", async () => {
    const { session, handoff } = boundCompletedPair();
    expect(handoff.applied).toBe(false);
    const r = await completeGamesRuntimeSubmitCompositionTrusted(
      {
        rpc: async () => ({ data: sampleAccepted(), error: null }),
      },
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);
    expect(handoff.applied).toBe(false);
  });

  it("keeps Hub Runtime authority closed and does not wire RPC into hub module", async () => {
    const { session, handoff } = boundCompletedPair();
    const r = await completeGamesRuntimeSubmitCompositionTrusted(
      {
        rpc: async () => ({ data: sampleAccepted(), error: null }),
      },
      session,
      handoff,
      IDEMPOTENCY_KEY
    );
    expect(r.ok).toBe(true);

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

    const compositionSrc = read(MODULE);
    expect(compositionSrc).toMatch(/completeGamesRuntimeSubmitCompositionTrusted/);
    expect(compositionSrc).toMatch(/assembleGamesRuntimeCompletionSubmitRequest/);
    expect(compositionSrc).toMatch(/submitMyGameSessionResultTrusted/);
    expect(compositionSrc).not.toMatch(/startMyGameSessionTrusted/);
    expect(compositionSrc).not.toMatch(/createClient/);
    expect(compositionSrc).not.toMatch(/applied\s*[:=]\s*true/);

    const hub = read(HUB_RUNTIME);
    expect(hub).not.toMatch(/submitMyGameSessionResultTrusted/);
    expect(hub).not.toMatch(/completeGamesRuntimeSubmitCompositionTrusted/);
    expect(hub).not.toMatch(/submit_game_session_result/);
  });
});
