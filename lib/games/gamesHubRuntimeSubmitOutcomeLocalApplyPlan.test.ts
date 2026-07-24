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
} from "./gamesHubRuntimeSubmitOutcomeAcknowledgment";
import {
  evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted,
  type GamesRuntimeSubmitOutcomeApplyEligibility,
} from "./gamesHubRuntimeSubmitOutcomeApplyEligibility";
import {
  buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted,
  type GamesRuntimeSubmitOutcomeLocalApplyPlan,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyPlan";
import type { GamesSessionResultSubmitResponseView } from "./gamesSessionResultSubmitResponse";

const MODULE = join(
  process.cwd(),
  "lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyPlan.ts"
);

const GAME_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_GAME_ID = "22222222-2222-4222-8222-222222222222";
const PLATFORM_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const OTHER_PLATFORM_SESSION_ID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const RESULT_ID = "cccccccc-dddd-4eee-8fff-000000000000";
const PLAYER_A = "player.user-a";
const PLAYER_B = "player.user-b";
const NOW = "2026-07-24T00:00:00.000Z";
const IDEMPOTENCY_KEY = "outcome-local-apply-plan-1";

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

function trustedEligibility(
  session: GamesRuntimeSessionContract,
  handoff: GamesRuntimeCompletionHandoff,
  response: GamesSessionResultSubmitResponseView = sampleAccepted()
): GamesRuntimeSubmitOutcomeApplyEligibility {
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
  const eligibility = evaluateGamesRuntimeSubmitOutcomeApplyEligibilityTrusted(
    session,
    handoff,
    ack.value
  );
  if (!eligibility.ok) throw new Error(eligibility.reason);
  return eligibility.value;
}

describe("Games Hub Runtime Submit Outcome Local Apply Plan Contract Trusted V1", () => {
  it("builds a valid plan for eligible accepted-fresh eligibility", () => {
    const { session, handoff } = boundCompletedPair({ score: 42 });
    const eligibility = trustedEligibility(
      session,
      handoff,
      sampleAccepted({ recorded_score: 42, idempotent_replay: false })
    );
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      handoff,
      eligibility
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.eligibilityStatus).toBe("eligible_accepted_fresh");
    expect(r.value.acknowledgmentStatus).toBe("accepted_fresh");
    expect(r.value.decisionStatus).toBe("accepted");
    expect(r.value.idempotentReplay).toBe(false);
    expect(r.value.preparesRuntimeApply).toBe(true);
    expect(r.value.preparesHandoffApply).toBe(true);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value.executesApply).toBe(false);
  });

  it("rejects rejected eligibility fail-closed", () => {
    const { session, handoff } = boundCompletedPair({ score: 1 });
    const eligibility = trustedEligibility(
      session,
      handoff,
      sampleRejected({ rejection_reason: "unknown_claim_field" })
    );
    expect(eligibility.eligibilityStatus).toBe("ineligible_rejected");
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      handoff,
      eligibility
    );
    expect(r).toEqual({ ok: false, reason: "ineligible_rejected" });
  });

  it("rejects idempotent-replay eligibility fail-closed", () => {
    const { session, handoff } = boundCompletedPair({ score: 7 });
    const eligibility = trustedEligibility(
      session,
      handoff,
      sampleAccepted({ recorded_score: 7, idempotent_replay: true })
    );
    expect(eligibility.eligibilityStatus).toBe("ineligible_idempotent_replay");
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      handoff,
      eligibility
    );
    expect(r).toEqual({ ok: false, reason: "ineligible_idempotent_replay" });
  });

  it("passes exact continuity and returns bounded plan metadata", () => {
    const { session, handoff } = boundCompletedPair({ score: 12.5 });
    const eligibility = trustedEligibility(
      session,
      handoff,
      sampleAccepted({ recorded_score: 12.5 })
    );
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      handoff,
      eligibility
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const plan: GamesRuntimeSubmitOutcomeLocalApplyPlan = r.value;
    expect(plan).toEqual({
      runtimeSessionId: session.runtimeSessionId,
      gameId: session.gameId,
      playerId: session.playerId,
      platformSessionId: PLATFORM_SESSION_ID,
      resultId: RESULT_ID,
      acknowledgmentStatus: "accepted_fresh",
      eligibilityStatus: "eligible_accepted_fresh",
      decisionStatus: "accepted",
      idempotentReplay: false,
      preparesRuntimeApply: true,
      preparesHandoffApply: true,
      applied: false,
      mutatesRuntime: false,
      mutatesHandoff: false,
      permitsReapply: false,
      executesApply: false,
    });
    expect(Object.keys(plan).sort()).toEqual([
      "acknowledgmentStatus",
      "applied",
      "decisionStatus",
      "eligibilityStatus",
      "executesApply",
      "gameId",
      "idempotentReplay",
      "mutatesHandoff",
      "mutatesRuntime",
      "permitsReapply",
      "platformSessionId",
      "playerId",
      "preparesHandoffApply",
      "preparesRuntimeApply",
      "resultId",
      "runtimeSessionId",
    ]);
  });

  it("rejects runtime/handoff runtimeSessionId mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const eligibility = trustedEligibility(session, handoff);
    const mismatched = Object.freeze({
      ...handoff,
      runtimeSessionId: "runtime.other-session",
    }) as GamesRuntimeCompletionHandoff;
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      mismatched,
      eligibility
    );
    expect(r).toEqual({
      ok: false,
      reason: "runtime_session_id_mismatch",
    });
  });

  it("rejects game identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const eligibility = trustedEligibility(session, handoff);
    const mismatched = Object.freeze({
      ...handoff,
      gameId: OTHER_GAME_ID,
    }) as GamesRuntimeCompletionHandoff;
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      mismatched,
      eligibility
    );
    expect(r).toEqual({
      ok: false,
      reason: "session_game_mismatch",
    });
  });

  it("rejects player identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const eligibility = trustedEligibility(session, handoff);
    const mismatched = Object.freeze({
      ...handoff,
      playerId: PLAYER_B,
    }) as GamesRuntimeCompletionHandoff;
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      mismatched,
      eligibility
    );
    expect(r).toEqual({
      ok: false,
      reason: "session_owner_mismatch",
    });
  });

  it("rejects platformSessionId mismatch between eligibility and runtime", () => {
    const { session, handoff } = boundCompletedPair();
    const eligibility = trustedEligibility(session, handoff);
    const mismatched = Object.freeze({
      ...eligibility,
      platformSessionId: OTHER_PLATFORM_SESSION_ID,
    }) as GamesRuntimeSubmitOutcomeApplyEligibility;
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      handoff,
      mismatched
    );
    expect(r).toEqual({
      ok: false,
      reason: "platform_session_id_mismatch",
    });
  });

  it("rejects eligibility identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const eligibility = trustedEligibility(session, handoff);

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        session,
        handoff,
        Object.freeze({
          ...eligibility,
          runtimeSessionId: "runtime.forged",
        })
      )
    ).toEqual({ ok: false, reason: "eligibility_identity_mismatch" });

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        session,
        handoff,
        Object.freeze({
          ...eligibility,
          gameId: OTHER_GAME_ID,
        })
      )
    ).toEqual({ ok: false, reason: "eligibility_identity_mismatch" });

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        session,
        handoff,
        Object.freeze({
          ...eligibility,
          playerId: PLAYER_B,
        })
      )
    ).toEqual({ ok: false, reason: "eligibility_identity_mismatch" });
  });

  it("rejects malformed inputs fail-closed", () => {
    const { session, handoff } = boundCompletedPair();
    const eligibility = trustedEligibility(session, handoff);

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        null,
        handoff,
        eligibility
      )
    ).toMatchObject({ ok: false, reason: "session_required" });
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        undefined,
        handoff,
        eligibility
      )
    ).toMatchObject({ ok: false, reason: "session_required" });
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        "x",
        handoff,
        eligibility
      )
    ).toMatchObject({ ok: false, reason: "session_required" });

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        session,
        null,
        eligibility
      )
    ).toMatchObject({ ok: false, reason: "handoff_required" });
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        session,
        undefined,
        eligibility
      )
    ).toMatchObject({ ok: false, reason: "handoff_required" });
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        session,
        "x",
        eligibility
      )
    ).toMatchObject({ ok: false, reason: "handoff_required" });

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, null)
    ).toMatchObject({ ok: false, reason: "eligibility_invalid" });
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        session,
        handoff,
        undefined
      )
    ).toMatchObject({ ok: false, reason: "eligibility_invalid" });
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, "x")
    ).toMatchObject({ ok: false, reason: "eligibility_invalid" });
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        extra: true,
      })
    ).toMatchObject({ ok: false, reason: "eligibility_invalid" });

    const unbound = Object.freeze({
      ...session,
      platformSessionId: null,
    }) as GamesRuntimeSessionContract;
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        unbound,
        handoff,
        eligibility
      )
    ).toMatchObject({ ok: false, reason: "platform_session_id_required" });

    const malformedPlatform = Object.freeze({
      ...session,
      platformSessionId: "not-a-uuid",
    }) as GamesRuntimeSessionContract;
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
        malformedPlatform,
        handoff,
        eligibility
      )
    ).toMatchObject({ ok: false, reason: "platform_session_id_required" });
  });

  it("rejects inconsistent accepted-fresh metadata", () => {
    const { session, handoff } = boundCompletedPair();
    const eligibility = trustedEligibility(session, handoff);

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        acknowledgmentStatus: "accepted_fresh",
        eligibilityStatus: "eligible_accepted_fresh",
        decisionStatus: "rejected",
        idempotentReplay: false,
      })
    ).toMatchObject({ ok: false, reason: "inconsistent_eligibility_state" });

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        acknowledgmentStatus: "accepted_fresh",
        eligibilityStatus: "eligible_accepted_fresh",
        decisionStatus: "accepted",
        idempotentReplay: true,
      })
    ).toMatchObject({ ok: false, reason: "inconsistent_eligibility_state" });

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        acknowledgmentStatus: "rejected",
        eligibilityStatus: "eligible_accepted_fresh",
        decisionStatus: "accepted",
        idempotentReplay: false,
      })
    ).toMatchObject({ ok: false, reason: "inconsistent_eligibility_state" });

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        acknowledgmentStatus: "accepted_idempotent_replay",
        eligibilityStatus: "eligible_accepted_fresh",
        decisionStatus: "accepted",
        idempotentReplay: false,
      })
    ).toMatchObject({ ok: false, reason: "inconsistent_eligibility_state" });

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        eligibilityStatus: "pending_apply",
      })
    ).toMatchObject({ ok: false, reason: "unsupported_eligibility_status" });

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        decisionStatus: "pending",
      })
    ).toMatchObject({ ok: false, reason: "inconsistent_eligibility_state" });

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        idempotentReplay: "yes",
      })
    ).toMatchObject({ ok: false, reason: "inconsistent_eligibility_state" });
  });

  it("rejects input authority flag not literal false", () => {
    const { session, handoff } = boundCompletedPair();
    const eligibility = trustedEligibility(session, handoff);

    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        applied: true,
      })
    ).toMatchObject({ ok: false, reason: "eligibility_invalid" });
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        mutatesRuntime: true,
      })
    ).toMatchObject({ ok: false, reason: "eligibility_invalid" });
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        mutatesHandoff: true,
      })
    ).toMatchObject({ ok: false, reason: "eligibility_invalid" });
    expect(
      buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(session, handoff, {
        ...eligibility,
        permitsReapply: true,
      })
    ).toMatchObject({ ok: false, reason: "eligibility_invalid" });
  });

  it("returns a frozen plan with prepares* true and authority flags false", () => {
    const { session, handoff } = boundCompletedPair();
    const eligibility = trustedEligibility(session, handoff);
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      handoff,
      eligibility
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.isFrozen(r.value)).toBe(true);
    expect(r.value.preparesRuntimeApply).toBe(true);
    expect(r.value.preparesHandoffApply).toBe(true);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value.executesApply).toBe(false);
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
    expect(() => {
      (r.value as { executesApply: boolean }).executesApply = true;
    }).toThrow();
    expect(() => {
      (r.value as { preparesRuntimeApply: boolean }).preparesRuntimeApply =
        false;
    }).toThrow();
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value.executesApply).toBe(false);
    expect(r.value.preparesRuntimeApply).toBe(true);
    expect(r.value.preparesHandoffApply).toBe(true);
  });

  it("does not mutate inputs and keeps applied false", () => {
    const { session, handoff } = boundCompletedPair({ score: 9 });
    const eligibility = trustedEligibility(
      session,
      handoff,
      sampleAccepted({ recorded_score: 9 })
    );
    const sessionSnapshot = structuredClone(session);
    const handoffSnapshot = structuredClone(handoff);
    const eligibilitySnapshot = structuredClone(eligibility);
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      handoff,
      eligibility
    );
    expect(r.ok).toBe(true);
    expect(session).toEqual(sessionSnapshot);
    expect(handoff).toEqual(handoffSnapshot);
    expect(eligibility).toEqual(eligibilitySnapshot);
    expect(handoff.applied).toBe(false);
    if (!r.ok) return;
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value.executesApply).toBe(false);
  });

  it("does not change lifecycle state or open Hub authority", () => {
    const { session, handoff } = boundCompletedPair();
    const lifecycleBefore = session.lifecycleState;
    const finalizedBefore = session.finalized;
    const eligibility = trustedEligibility(session, handoff);
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      handoff,
      eligibility
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
    const eligibility = trustedEligibility(session, handoff);
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      handoff,
      eligibility
    );
    expect(r.ok).toBe(true);
    expect(rpc).not.toHaveBeenCalled();
    expect(startTrusted).not.toHaveBeenCalled();
    expect(submitTrusted).not.toHaveBeenCalled();

    const src = read(MODULE);
    expect(src).toMatch(/buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted/);
    expect(src).toMatch(/preparesRuntimeApply:\s*true\s*as\s*const/);
    expect(src).toMatch(/preparesHandoffApply:\s*true\s*as\s*const/);
    expect(src).toMatch(/applied:\s*false\s*as\s*const/);
    expect(src).toMatch(/mutatesRuntime:\s*false\s*as\s*const/);
    expect(src).toMatch(/mutatesHandoff:\s*false\s*as\s*const/);
    expect(src).toMatch(/permitsReapply:\s*false\s*as\s*const/);
    expect(src).toMatch(/executesApply:\s*false\s*as\s*const/);
    expect(src).not.toMatch(/parseGamesSessionResultSubmitResponse/);
    expect(src).not.toMatch(/startMyGameSessionTrusted/);
    expect(src).not.toMatch(/submitMyGameSessionResultTrusted/);
    expect(src).not.toMatch(/client\.rpc/);
    expect(src).not.toMatch(/createClient/);
    expect(src).not.toMatch(/applied:\s*true/);
    expect(src).not.toMatch(/lifecycleState:/);
    expect(src).not.toMatch(/\.rpc\(/);
  });

  it("does not treat a valid plan as apply, replay, or Hub authority", () => {
    const { session, handoff } = boundCompletedPair({ score: 5 });
    const r = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
      session,
      handoff,
      trustedEligibility(
        session,
        handoff,
        sampleAccepted({ recorded_score: 5, idempotent_replay: false })
      )
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.eligibilityStatus).toBe("eligible_accepted_fresh");
    expect(r.value.preparesRuntimeApply).toBe(true);
    expect(r.value.preparesHandoffApply).toBe(true);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value.executesApply).toBe(false);
    expect(handoff.applied).toBe(false);
    expect(r.value).not.toHaveProperty("grantsRewards");
    expect(r.value).not.toHaveProperty("progressApplied");
    expect(r.value).not.toHaveProperty("achievementsApplied");
    expect(r.value).not.toHaveProperty("hubSynchronized");
    expect(r.value).not.toHaveProperty("lifecycleTransition");
    expect(r.value).not.toHaveProperty("localApplyOccurred");
    expect(r.value).not.toHaveProperty("apply");
    expect(r.value).not.toHaveProperty("execute");
    expect(r.value).not.toHaveProperty("callback");
    expect(r.value).not.toHaveProperty("executor");
    expect(r.value).not.toHaveProperty("rpc");
    expect(r.value).not.toHaveProperty("reapplyAllowed");
    expect(r.value).not.toHaveProperty("authorityToken");
  });
});
