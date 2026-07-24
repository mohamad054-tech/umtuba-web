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
} from "./gamesHubRuntimeSubmitOutcomeAdaptation";
import {
  evaluateGamesRuntimeSubmitOutcomeAcknowledgmentTrusted,
  type GamesRuntimeSubmitOutcomeAcknowledgment,
} from "./gamesHubRuntimeSubmitOutcomeAcknowledgment";
import {
  GAMES_RUNTIME_SUBMIT_OUTCOME_APPLY_ELIGIBILITY_STATUSES,
  evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted,
  type GamesRuntimeSubmitOutcomeApplyEligibility,
} from "./gamesHubRuntimeSubmitOutcomeApplyEligibility";
import type { GamesSessionResultSubmitResponseView } from "./gamesSessionResultSubmitResponse";

const MODULE = join(
  process.cwd(),
  "lib/games/gamesHubRuntimeSubmitOutcomeApplyEligibility.ts"
);

const GAME_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_GAME_ID = "22222222-2222-4222-8222-222222222222";
const PLATFORM_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const OTHER_PLATFORM_SESSION_ID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const RESULT_ID = "cccccccc-dddd-4eee-8fff-000000000000";
const PLAYER_A = "player.user-a";
const PLAYER_B = "player.user-b";
const NOW = "2026-07-24T00:00:00.000Z";
const IDEMPOTENCY_KEY = "outcome-eligibility-1";

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

function trustedAcknowledgment(
  session: GamesRuntimeSessionContract,
  handoff: GamesRuntimeCompletionHandoff,
  response: GamesSessionResultSubmitResponseView = sampleAccepted()
): GamesRuntimeSubmitOutcomeAcknowledgment {
  const observation = adaptGamesRuntimeSubmitOutcomeTrusted(
    session,
    handoff,
    response
  );
  if (!observation.ok) throw new Error(observation.reason);
  const ack = evaluateGamesRuntimeSubmitOutcomeAcknowledgmentTrusted(
    session,
    handoff,
    observation.value
  );
  if (!ack.ok) throw new Error(ack.reason);
  return ack.value;
}

describe("Games Hub Runtime Submit Outcome Apply Eligibility Contract Trusted V1", () => {
  it("classifies rejected acknowledgment as ineligible_rejected", () => {
    const { session, handoff } = boundCompletedPair({ score: 1 });
    const acknowledgment = trustedAcknowledgment(
      session,
      handoff,
      sampleRejected({ rejection_reason: "unknown_claim_field" })
    );
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      acknowledgment
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.eligibilityStatus).toBe("ineligible_rejected");
    expect(r.value.acknowledgmentStatus).toBe("rejected");
    expect(r.value.decisionStatus).toBe("rejected");
    expect(r.value.idempotentReplay).toBe(false);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
  });

  it("classifies accepted fresh acknowledgment as eligible_accepted_fresh", () => {
    const { session, handoff } = boundCompletedPair({ score: 42 });
    const acknowledgment = trustedAcknowledgment(
      session,
      handoff,
      sampleAccepted({ recorded_score: 42, idempotent_replay: false })
    );
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      acknowledgment
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.eligibilityStatus).toBe("eligible_accepted_fresh");
    expect(r.value.acknowledgmentStatus).toBe("accepted_fresh");
    expect(r.value.decisionStatus).toBe("accepted");
    expect(r.value.idempotentReplay).toBe(false);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
  });

  it("classifies accepted idempotent replay as ineligible_idempotent_replay", () => {
    const { session, handoff } = boundCompletedPair({ score: 7 });
    const acknowledgment = trustedAcknowledgment(
      session,
      handoff,
      sampleAccepted({ recorded_score: 7, idempotent_replay: true })
    );
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      acknowledgment
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.eligibilityStatus).toBe("ineligible_idempotent_replay");
    expect(r.value.acknowledgmentStatus).toBe("accepted_idempotent_replay");
    expect(r.value.decisionStatus).toBe("accepted");
    expect(r.value.idempotentReplay).toBe(true);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value).not.toHaveProperty("reapply");
    expect(r.value).not.toHaveProperty("priorApplyConfirmed");
  });

  it("passes exact continuity and returns bounded eligibility metadata", () => {
    const { session, handoff } = boundCompletedPair({ score: 12.5 });
    const acknowledgment = trustedAcknowledgment(
      session,
      handoff,
      sampleAccepted({ recorded_score: 12.5 })
    );
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      acknowledgment
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const eligibility: GamesRuntimeSubmitOutcomeApplyEligibility = r.value;
    expect(eligibility).toEqual({
      runtimeSessionId: session.runtimeSessionId,
      gameId: session.gameId,
      playerId: session.playerId,
      platformSessionId: PLATFORM_SESSION_ID,
      resultId: RESULT_ID,
      acknowledgmentStatus: "accepted_fresh",
      eligibilityStatus: "eligible_accepted_fresh",
      decisionStatus: "accepted",
      idempotentReplay: false,
      applied: false,
      mutatesRuntime: false,
      mutatesHandoff: false,
      permitsReapply: false,
    });
    expect(Object.keys(eligibility).sort()).toEqual([
      "acknowledgmentStatus",
      "applied",
      "decisionStatus",
      "eligibilityStatus",
      "gameId",
      "idempotentReplay",
      "mutatesHandoff",
      "mutatesRuntime",
      "permitsReapply",
      "platformSessionId",
      "playerId",
      "resultId",
      "runtimeSessionId",
    ]);
    expect(GAMES_RUNTIME_SUBMIT_OUTCOME_APPLY_ELIGIBILITY_STATUSES).toEqual([
      "ineligible_rejected",
      "eligible_accepted_fresh",
      "ineligible_idempotent_replay",
    ]);
  });

  it("rejects runtime/handoff runtimeSessionId mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const acknowledgment = trustedAcknowledgment(session, handoff);
    const mismatched = Object.freeze({
      ...handoff,
      runtimeSessionId: "runtime.other-session",
    }) as GamesRuntimeCompletionHandoff;
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      mismatched,
      acknowledgment
    );
    expect(r).toEqual({
      ok: false,
      reason: "runtime_session_id_mismatch",
    });
  });

  it("rejects game identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const acknowledgment = trustedAcknowledgment(session, handoff);
    const mismatched = Object.freeze({
      ...handoff,
      gameId: OTHER_GAME_ID,
    }) as GamesRuntimeCompletionHandoff;
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      mismatched,
      acknowledgment
    );
    expect(r).toEqual({
      ok: false,
      reason: "session_game_mismatch",
    });
  });

  it("rejects player identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const acknowledgment = trustedAcknowledgment(session, handoff);
    const mismatched = Object.freeze({
      ...handoff,
      playerId: PLAYER_B,
    }) as GamesRuntimeCompletionHandoff;
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      mismatched,
      acknowledgment
    );
    expect(r).toEqual({
      ok: false,
      reason: "session_owner_mismatch",
    });
  });

  it("rejects platformSessionId mismatch between acknowledgment and runtime", () => {
    const { session, handoff } = boundCompletedPair();
    const acknowledgment = trustedAcknowledgment(session, handoff);
    const mismatched = Object.freeze({
      ...acknowledgment,
      platformSessionId: OTHER_PLATFORM_SESSION_ID,
    }) as GamesRuntimeSubmitOutcomeAcknowledgment;
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      mismatched
    );
    expect(r).toEqual({
      ok: false,
      reason: "platform_session_id_mismatch",
    });
  });

  it("rejects acknowledgment identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const acknowledgment = trustedAcknowledgment(session, handoff);

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        Object.freeze({
          ...acknowledgment,
          runtimeSessionId: "runtime.forged",
        })
      )
    ).toEqual({ ok: false, reason: "acknowledgment_identity_mismatch" });

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        Object.freeze({
          ...acknowledgment,
          gameId: OTHER_GAME_ID,
        })
      )
    ).toEqual({ ok: false, reason: "acknowledgment_identity_mismatch" });

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        Object.freeze({
          ...acknowledgment,
          playerId: PLAYER_B,
        })
      )
    ).toEqual({ ok: false, reason: "acknowledgment_identity_mismatch" });
  });

  it("rejects malformed inputs fail-closed", () => {
    const { session, handoff } = boundCompletedPair();
    const acknowledgment = trustedAcknowledgment(session, handoff);

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        null,
        handoff,
        acknowledgment
      )
    ).toMatchObject({ ok: false, reason: "session_required" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        undefined,
        handoff,
        acknowledgment
      )
    ).toMatchObject({ ok: false, reason: "session_required" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        "x",
        handoff,
        acknowledgment
      )
    ).toMatchObject({ ok: false, reason: "session_required" });

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        null,
        acknowledgment
      )
    ).toMatchObject({ ok: false, reason: "handoff_required" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        undefined,
        acknowledgment
      )
    ).toMatchObject({ ok: false, reason: "handoff_required" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        "x",
        acknowledgment
      )
    ).toMatchObject({ ok: false, reason: "handoff_required" });

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        null
      )
    ).toMatchObject({ ok: false, reason: "acknowledgment_invalid" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        undefined
      )
    ).toMatchObject({ ok: false, reason: "acknowledgment_invalid" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        "x"
      )
    ).toMatchObject({ ok: false, reason: "acknowledgment_invalid" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        { ...acknowledgment, extra: true }
      )
    ).toMatchObject({ ok: false, reason: "acknowledgment_invalid" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        { ...acknowledgment, applied: true }
      )
    ).toMatchObject({ ok: false, reason: "acknowledgment_invalid" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        { ...acknowledgment, mutatesRuntime: true }
      )
    ).toMatchObject({ ok: false, reason: "acknowledgment_invalid" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        { ...acknowledgment, mutatesHandoff: true }
      )
    ).toMatchObject({ ok: false, reason: "acknowledgment_invalid" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        { ...acknowledgment, permitsReapply: true }
      )
    ).toMatchObject({ ok: false, reason: "acknowledgment_invalid" });

    const unbound = Object.freeze({
      ...session,
      platformSessionId: null,
    }) as GamesRuntimeSessionContract;
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        unbound,
        handoff,
        acknowledgment
      )
    ).toMatchObject({ ok: false, reason: "platform_session_id_required" });

    const malformedPlatform = Object.freeze({
      ...session,
      platformSessionId: "not-a-uuid",
    }) as GamesRuntimeSessionContract;
    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        malformedPlatform,
        handoff,
        acknowledgment
      )
    ).toMatchObject({ ok: false, reason: "platform_session_id_required" });
  });

  it("rejects unsupported or inconsistent acknowledgment state", () => {
    const { session, handoff } = boundCompletedPair();
    const acknowledgment = trustedAcknowledgment(session, handoff);

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        { ...acknowledgment, acknowledgmentStatus: "pending" }
      )
    ).toMatchObject({ ok: false, reason: "unsupported_acknowledgment_status" });

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        {
          ...acknowledgment,
          acknowledgmentStatus: "accepted_fresh",
          decisionStatus: "rejected",
          idempotentReplay: false,
        }
      )
    ).toMatchObject({ ok: false, reason: "inconsistent_acknowledgment_state" });

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        {
          ...acknowledgment,
          acknowledgmentStatus: "accepted_fresh",
          decisionStatus: "accepted",
          idempotentReplay: true,
        }
      )
    ).toMatchObject({ ok: false, reason: "inconsistent_acknowledgment_state" });

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        {
          ...acknowledgment,
          acknowledgmentStatus: "accepted_idempotent_replay",
          decisionStatus: "accepted",
          idempotentReplay: false,
        }
      )
    ).toMatchObject({ ok: false, reason: "inconsistent_acknowledgment_state" });

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        {
          ...acknowledgment,
          acknowledgmentStatus: "rejected",
          decisionStatus: "accepted",
          idempotentReplay: false,
        }
      )
    ).toMatchObject({ ok: false, reason: "inconsistent_acknowledgment_state" });

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        { ...acknowledgment, decisionStatus: "pending" }
      )
    ).toMatchObject({ ok: false, reason: "inconsistent_acknowledgment_state" });

    expect(
      evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
        session,
        handoff,
        { ...acknowledgment, idempotentReplay: "yes" }
      )
    ).toMatchObject({ ok: false, reason: "inconsistent_acknowledgment_state" });
  });

  it("returns a frozen eligibility with authority flags literal false", () => {
    const { session, handoff } = boundCompletedPair();
    const acknowledgment = trustedAcknowledgment(session, handoff);
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      acknowledgment
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.isFrozen(r.value)).toBe(true);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(() => {
      (r.value as { applied: boolean }).applied = true;
    }).toThrow();
    expect(() => {
      (r.value as { mutatesRuntime: boolean }).mutatesRuntime = true;
    }).toThrow();
    expect(() => {
      (r.value as { mutatesHandoff: boolean }).mutatesHandoff = true;
    }).toThrow();
    expect(() => {
      (r.value as { permitsReapply: boolean }).permitsReapply = true;
    }).toThrow();
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
  });

  it("does not mutate inputs and keeps applied false", () => {
    const { session, handoff } = boundCompletedPair({ score: 9 });
    const acknowledgment = trustedAcknowledgment(
      session,
      handoff,
      sampleAccepted({ recorded_score: 9 })
    );
    const sessionSnapshot = structuredClone(session);
    const handoffSnapshot = structuredClone(handoff);
    const acknowledgmentSnapshot = structuredClone(acknowledgment);
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      acknowledgment
    );
    expect(r.ok).toBe(true);
    expect(session).toEqual(sessionSnapshot);
    expect(handoff).toEqual(handoffSnapshot);
    expect(acknowledgment).toEqual(acknowledgmentSnapshot);
    expect(handoff.applied).toBe(false);
    if (!r.ok) return;
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
  });

  it("does not change lifecycle state or open Hub authority", () => {
    const { session, handoff } = boundCompletedPair();
    const lifecycleBefore = session.lifecycleState;
    const finalizedBefore = session.finalized;
    const acknowledgment = trustedAcknowledgment(session, handoff);
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      acknowledgment
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
    const acknowledgment = trustedAcknowledgment(session, handoff);
    const r = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      acknowledgment
    );
    expect(r.ok).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
    expect(startTrusted).not.toHaveBeenCalled();
    expect(submitTrusted).not.toHaveBeenCalled();

    const src = read(MODULE);
    expect(src).toMatch(
      /evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted/
    );
    expect(src).toMatch(/applied:\s*false\s*as\s*const/);
    expect(src).toMatch(/mutatesRuntime:\s*false\s*as\s*const/);
    expect(src).toMatch(/mutatesHandoff:\s*false\s*as\s*const/);
    expect(src).toMatch(/permitsReapply:\s*false\s*as\s*const/);
    expect(src).not.toMatch(/parseGamesSessionResultSubmitResponse/);
    expect(src).not.toMatch(/startMyGameSessionTrusted/);
    expect(src).not.toMatch(/submitMyGameSessionResultTrusted/);
    expect(src).not.toMatch(/client\.rpc/);
    expect(src).not.toMatch(/createClient/);
    expect(src).not.toMatch(/applied:\s*true/);
    expect(src).not.toMatch(/lifecycleState:/);
  });

  it("does not treat eligibility statuses as apply or replay authority", () => {
    const { session, handoff } = boundCompletedPair({ score: 5 });
    const fresh = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      trustedAcknowledgment(
        session,
        handoff,
        sampleAccepted({ recorded_score: 5, idempotent_replay: false })
      )
    );
    expect(fresh.ok).toBe(true);
    if (!fresh.ok) return;
    expect(fresh.value.eligibilityStatus).toBe("eligible_accepted_fresh");
    expect(fresh.value.applied).toBe(false);
    expect(fresh.value.mutatesRuntime).toBe(false);
    expect(fresh.value.mutatesHandoff).toBe(false);
    expect(fresh.value.permitsReapply).toBe(false);
    expect(handoff.applied).toBe(false);
    expect(fresh.value).not.toHaveProperty("grantsRewards");
    expect(fresh.value).not.toHaveProperty("progressApplied");
    expect(fresh.value).not.toHaveProperty("achievementsApplied");
    expect(fresh.value).not.toHaveProperty("hubSynchronized");
    expect(fresh.value).not.toHaveProperty("lifecycleTransition");
    expect(fresh.value).not.toHaveProperty("localApplyOccurred");

    const replay = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      trustedAcknowledgment(
        session,
        handoff,
        sampleAccepted({ recorded_score: 5, idempotent_replay: true })
      )
    );
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.value.eligibilityStatus).toBe("ineligible_idempotent_replay");
    expect(replay.value.permitsReapply).toBe(false);
    expect(replay.value.applied).toBe(false);
    expect(replay.value).not.toHaveProperty("reapplyAllowed");
    expect(replay.value).not.toHaveProperty("priorApplyConfirmed");
    expect(replay.value).not.toHaveProperty("replayComplete");

    const rejected = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
      session,
      handoff,
      trustedAcknowledgment(session, handoff, sampleRejected())
    );
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.value.eligibilityStatus).toBe("ineligible_rejected");
    expect(rejected.value).not.toHaveProperty("retryAllowed");
    expect(rejected.value).not.toHaveProperty("claimMutationAllowed");
    expect(rejected.value.permitsReapply).toBe(false);
  });
});
