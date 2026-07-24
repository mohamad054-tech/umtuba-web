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
  bindGamesRuntimePlatformSessionId,
  completeGamesRuntimeSession,
  startGamesRuntimeSession,
  type GamesRuntimeCompletionHandoff,
  type GamesRuntimeSessionContract,
} from "./gamesHubRuntime";
import {
  adaptGamesRuntimeSubmitOutcomeTrusted,
  type GamesRuntimeSubmitOutcomeObservation,
} from "./gamesHubRuntimeSubmitOutcomeAdaptation";
import type { GamesSessionResultSubmitResponseView } from "./gamesSessionResultSubmitResponse";

const MODULE = join(
  process.cwd(),
  "lib/games/gamesHubRuntimeSubmitOutcomeAdaptation.ts"
);

const GAME_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_GAME_ID = "22222222-2222-4222-8222-222222222222";
const PLATFORM_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const OTHER_PLATFORM_SESSION_ID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const RESULT_ID = "cccccccc-dddd-4eee-8fff-000000000000";
const PLAYER_A = "player.user-a";
const PLAYER_B = "player.user-b";
const NOW = "2026-07-24T00:00:00.000Z";
const IDEMPOTENCY_KEY = "outcome-adapt-1";

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
  overrides: Partial<GamesSessionResultSubmitResponseView> = {}
): GamesSessionResultSubmitResponseView {
  return Object.freeze({
    session_id: PLATFORM_SESSION_ID,
    result_id: RESULT_ID,
    decision_status: "accepted",
    rejection_reason: null,
    recorded_score: 10,
    idempotent_replay: false,
    ...overrides,
  });
}

function sampleRejected(
  overrides: Partial<GamesSessionResultSubmitResponseView> = {}
): GamesSessionResultSubmitResponseView {
  return sampleAccepted({
    decision_status: "rejected",
    rejection_reason: "score_negative",
    recorded_score: null,
    idempotent_replay: false,
    ...overrides,
  });
}

describe("Games Hub Runtime Submit Outcome Adaptation Trusted V1", () => {
  it("adapts an accepted submit response into an observation", () => {
    const { session, handoff } = boundCompletedPair({ score: 42 });
    const response = sampleAccepted({ recorded_score: 42 });
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      handoff,
      response
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.decisionStatus).toBe("accepted");
    expect(r.value.rejectionReason).toBeNull();
    expect(r.value.recordedScore).toBe(42);
    expect(r.value.idempotentReplay).toBe(false);
    expect(r.value.applied).toBe(false);
  });

  it("adapts a rejected submit response into an observation", () => {
    const { session, handoff } = boundCompletedPair({ score: 1 });
    const response = sampleRejected({
      rejection_reason: "unknown_claim_field",
      recorded_score: null,
    });
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      handoff,
      response
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.decisionStatus).toBe("rejected");
    expect(r.value.rejectionReason).toBe("unknown_claim_field");
    expect(r.value.recordedScore).toBeNull();
    expect(r.value.applied).toBe(false);
  });

  it("adapts an idempotent replay observation without reapply authority", () => {
    const { session, handoff } = boundCompletedPair({ score: 7 });
    const response = sampleAccepted({
      recorded_score: 7,
      idempotent_replay: true,
    });
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      handoff,
      response
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.idempotentReplay).toBe(true);
    expect(r.value.decisionStatus).toBe("accepted");
    expect(r.value.applied).toBe(false);
    expect(r.value).not.toHaveProperty("reapply");
    expect(r.value).not.toHaveProperty("progressChanged");
  });

  it("passes exact metadata through with Hub Runtime field casing", () => {
    const { session, handoff } = boundCompletedPair({ score: 12.5 });
    const response = sampleAccepted({
      result_id: RESULT_ID,
      decision_status: "accepted",
      rejection_reason: null,
      recorded_score: 12.5,
      idempotent_replay: false,
    });
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      handoff,
      response
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const observation: GamesRuntimeSubmitOutcomeObservation = r.value;
    expect(observation).toEqual({
      runtimeSessionId: session.runtimeSessionId,
      gameId: session.gameId,
      playerId: session.playerId,
      platformSessionId: PLATFORM_SESSION_ID,
      resultId: RESULT_ID,
      decisionStatus: "accepted",
      rejectionReason: null,
      recordedScore: 12.5,
      idempotentReplay: false,
      applied: false,
    });
    expect(Object.keys(observation).sort()).toEqual([
      "applied",
      "decisionStatus",
      "gameId",
      "idempotentReplay",
      "platformSessionId",
      "playerId",
      "recordedScore",
      "rejectionReason",
      "resultId",
      "runtimeSessionId",
    ]);
    expect(observation).not.toHaveProperty("session_id");
    expect(observation).not.toHaveProperty("result_id");
    expect(observation).not.toHaveProperty("decision_status");
    expect(observation).not.toHaveProperty("rejection_reason");
    expect(observation).not.toHaveProperty("recorded_score");
    expect(observation).not.toHaveProperty("idempotent_replay");
  });

  it("rejects platform session mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const response = sampleAccepted({
      session_id: OTHER_PLATFORM_SESSION_ID,
    });
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      handoff,
      response
    );
    expect(r).toEqual({
      ok: false,
      reason: "platform_session_id_mismatch",
    });
  });

  it("rejects runtime session mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const mismatched = Object.freeze({
      ...handoff,
      runtimeSessionId: "runtime.other-session",
    }) as GamesRuntimeCompletionHandoff;
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      mismatched,
      sampleAccepted()
    );
    expect(r).toEqual({
      ok: false,
      reason: "runtime_session_id_mismatch",
    });
  });

  it("rejects game identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const mismatched = Object.freeze({
      ...handoff,
      gameId: OTHER_GAME_ID,
    }) as GamesRuntimeCompletionHandoff;
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      mismatched,
      sampleAccepted()
    );
    expect(r).toEqual({
      ok: false,
      reason: "session_game_mismatch",
    });
  });

  it("rejects player identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const mismatched = Object.freeze({
      ...handoff,
      playerId: PLAYER_B,
    }) as GamesRuntimeCompletionHandoff;
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      mismatched,
      sampleAccepted()
    );
    expect(r).toEqual({
      ok: false,
      reason: "session_owner_mismatch",
    });
  });

  it("rejects malformed inputs fail-closed", () => {
    const { session, handoff } = boundCompletedPair();

    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(null, handoff, sampleAccepted())
    ).toMatchObject({ ok: false, reason: "session_required" });
    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(
        undefined,
        handoff,
        sampleAccepted()
      )
    ).toMatchObject({ ok: false, reason: "session_required" });
    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted("x", handoff, sampleAccepted())
    ).toMatchObject({ ok: false, reason: "session_required" });

    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(session, null, sampleAccepted())
    ).toMatchObject({ ok: false, reason: "handoff_required" });
    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(
        session,
        undefined,
        sampleAccepted()
      )
    ).toMatchObject({ ok: false, reason: "handoff_required" });
    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(session, "x", sampleAccepted())
    ).toMatchObject({ ok: false, reason: "handoff_required" });

    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(session, handoff, null)
    ).toMatchObject({ ok: false, reason: "submit_response_invalid" });
    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(session, handoff, undefined)
    ).toMatchObject({ ok: false, reason: "submit_response_invalid" });
    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(session, handoff, "x")
    ).toMatchObject({ ok: false, reason: "submit_response_invalid" });
    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(session, handoff, {
        session_id: PLATFORM_SESSION_ID,
        result_id: RESULT_ID,
        decision_status: "pending",
        rejection_reason: null,
        recorded_score: 1,
        idempotent_replay: false,
      })
    ).toMatchObject({ ok: false, reason: "submit_response_invalid" });
    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(session, handoff, {
        ...sampleAccepted(),
        extra: true,
      })
    ).toMatchObject({ ok: false, reason: "submit_response_invalid" });
  });

  it("rejects missing or malformed platformSessionId", () => {
    const { session, handoff } = boundCompletedPair();
    const unbound = Object.freeze({
      ...session,
      platformSessionId: null,
    }) as GamesRuntimeSessionContract;
    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(
        unbound,
        handoff,
        sampleAccepted()
      )
    ).toMatchObject({ ok: false, reason: "platform_session_id_required" });

    const malformed = Object.freeze({
      ...session,
      platformSessionId: "not-a-uuid",
    }) as GamesRuntimeSessionContract;
    expect(
      adaptGamesRuntimeSubmitOutcomeTrusted(
        malformed,
        handoff,
        sampleAccepted()
      )
    ).toMatchObject({ ok: false, reason: "platform_session_id_required" });
  });

  it("does not mutate inputs", () => {
    const { session, handoff } = boundCompletedPair({ score: 9 });
    const response = sampleAccepted({ recorded_score: 9 });
    const sessionSnapshot = structuredClone(session);
    const handoffSnapshot = structuredClone(handoff);
    const responseSnapshot = structuredClone(response);
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      handoff,
      response
    );
    expect(r.ok).toBe(true);
    expect(session).toEqual(sessionSnapshot);
    expect(handoff).toEqual(handoffSnapshot);
    expect(response).toEqual(responseSnapshot);
  });

  it("returns a frozen observation with applied literal false", () => {
    const { session, handoff } = boundCompletedPair();
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      handoff,
      sampleAccepted()
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.isFrozen(r.value)).toBe(true);
    expect(r.value.applied).toBe(false);
    expect(() => {
      (r.value as { applied: boolean }).applied = true;
    }).toThrow();
    expect(r.value.applied).toBe(false);
  });

  it("does not change lifecycle state or open Hub authority", () => {
    const { session, handoff } = boundCompletedPair();
    const lifecycleBefore = session.lifecycleState;
    const finalizedBefore = session.finalized;
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      handoff,
      sampleAccepted()
    );
    expect(r.ok).toBe(true);
    expect(session.lifecycleState).toBe(lifecycleBefore);
    expect(session.finalized).toBe(finalizedBefore);
    expect(handoff.applied).toBe(false);
    expect(handoff.grantsRewards).toBe(false);
    expect(handoff.acceptsClientResultAsAuthoritative).toBe(false);
    expect(handoff.contractVersion).toBe(GAMES_HUB_RUNTIME_CONTRACT_VERSION);

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

  it("does not call RPC helpers or perform side effects", () => {
    const rpc = vi.fn();
    const startTrusted = vi.fn();
    const submitTrusted = vi.fn();
    const { session, handoff } = boundCompletedPair();
    const r = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      handoff,
      sampleAccepted()
    );
    expect(r.ok).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
    expect(startTrusted).not.toHaveBeenCalled();
    expect(submitTrusted).not.toHaveBeenCalled();

    const src = read(MODULE);
    expect(src).toMatch(/adaptGamesRuntimeSubmitOutcomeTrusted/);
    expect(src).toMatch(/parseGamesSessionResultSubmitResponse/);
    expect(src).toMatch(/applied:\s*false\s*as\s*const/);
    expect(src).not.toMatch(/startMyGameSessionTrusted/);
    expect(src).not.toMatch(/submitMyGameSessionResultTrusted/);
    expect(src).not.toMatch(/client\.rpc/);
    expect(src).not.toMatch(/createClient/);
    expect(src).not.toMatch(/applied:\s*true/);
    expect(src).not.toMatch(/decision_status\s*===\s*['"]accepted['"]/);
    expect(src).not.toMatch(/idempotent_replay\s*===\s*true/);
  });

  it("does not treat accepted or idempotent_replay as local apply authority", () => {
    const { session, handoff } = boundCompletedPair({ score: 5 });
    const accepted = adaptGamesRuntimeSubmitOutcomeTrusted(
      session,
      handoff,
      sampleAccepted({ recorded_score: 5, idempotent_replay: true })
    );
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) return;
    expect(accepted.value.decisionStatus).toBe("accepted");
    expect(accepted.value.idempotentReplay).toBe(true);
    expect(accepted.value.applied).toBe(false);
    expect(handoff.applied).toBe(false);
    expect(accepted.value).not.toHaveProperty("grantsRewards");
    expect(accepted.value).not.toHaveProperty("progressApplied");
    expect(accepted.value).not.toHaveProperty("achievementsApplied");
    expect(accepted.value).not.toHaveProperty("hubSynchronized");
  });
});
