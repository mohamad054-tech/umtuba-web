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
} from "./gamesHubRuntimeSubmitOutcomeApplyEligibility";
import {
  buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted,
  type GamesRuntimeSubmitOutcomeLocalApplyPlan,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyPlan";
import {
  evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted,
  type GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard";
import type { GamesSessionResultSubmitResponseView } from "./gamesSessionResultSubmitResponse";

const MODULE = join(
  process.cwd(),
  "lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard.ts"
);

const GAME_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_GAME_ID = "22222222-2222-4222-8222-222222222222";
const PLATFORM_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const OTHER_PLATFORM_SESSION_ID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const RESULT_ID = "cccccccc-dddd-4eee-8fff-000000000000";
const PLAYER_A = "player.user-a";
const PLAYER_B = "player.user-b";
const NOW = "2026-07-24T00:00:00.000Z";
const IDEMPOTENCY_KEY = "outcome-local-apply-precondition-1";

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

function trustedPlan(
  session: GamesRuntimeSessionContract,
  handoff: GamesRuntimeCompletionHandoff,
  response: GamesSessionResultSubmitResponseView = sampleAccepted()
): GamesRuntimeSubmitOutcomeLocalApplyPlan {
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
  const plan = buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted(
    session,
    handoff,
    eligibility.value
  );
  if (!plan.ok) throw new Error(plan.reason);
  return plan.value;
}

function forgePlan(
  base: GamesRuntimeSubmitOutcomeLocalApplyPlan,
  overrides: Record<string, unknown>
): unknown {
  return Object.freeze({ ...base, ...overrides });
}

describe("Games Hub Runtime Submit Outcome Local Apply Execution Precondition Guard Contract Trusted V1", () => {
  it("returns ready for valid eligible fresh plan + unapplied handoff", () => {
    const { session, handoff } = boundCompletedPair({ score: 42 });
    const plan = trustedPlan(
      session,
      handoff,
      sampleAccepted({ recorded_score: 42, idempotent_replay: false })
    );
    const r = evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
      session,
      handoff,
      plan
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.preconditionStatus).toBe("ready");
    expect(r.value.blockedReason).toBeNull();
    expect(r.value.preparesRuntimeApply).toBe(true);
    expect(r.value.preparesHandoffApply).toBe(true);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value.executesApply).toBe(false);
  });

  it("fails closed for already-applied handoff", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const appliedHandoff = Object.freeze({
      ...handoff,
      applied: true,
    });
    const r = evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
      session,
      appliedHandoff,
      plan
    );
    expect(r).toEqual({ ok: false, reason: "handoff_already_applied" });
  });

  it("fails closed for rejected/ineligible plan", () => {
    const { session, handoff } = boundCompletedPair({ score: 1 });
    const plan = trustedPlan(session, handoff);
    const rejectedPlan = forgePlan(plan, {
      eligibilityStatus: "ineligible_rejected",
      acknowledgmentStatus: "rejected",
      decisionStatus: "rejected",
      idempotentReplay: false,
    });
    const r = evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
      session,
      handoff,
      rejectedPlan
    );
    expect(r).toEqual({ ok: false, reason: "ineligible_rejected" });
  });

  it("fails closed for idempotent-replay plan", () => {
    const { session, handoff } = boundCompletedPair({ score: 7 });
    const plan = trustedPlan(session, handoff);
    const replayPlan = forgePlan(plan, {
      eligibilityStatus: "ineligible_idempotent_replay",
      acknowledgmentStatus: "accepted_idempotent_replay",
      decisionStatus: "accepted",
      idempotentReplay: true,
    });
    const r = evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
      session,
      handoff,
      replayPlan
    );
    expect(r).toEqual({ ok: false, reason: "ineligible_idempotent_replay" });
  });

  it("fails closed for inconsistent accepted-fresh metadata", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const inconsistent = forgePlan(plan, {
      eligibilityStatus: "eligible_accepted_fresh",
      acknowledgmentStatus: "accepted_fresh",
      decisionStatus: "accepted",
      idempotentReplay: true,
    });
    const r = evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
      session,
      handoff,
      inconsistent
    );
    expect(r).toEqual({ ok: false, reason: "inconsistent_plan_state" });
  });

  it("fails closed for non-false authority flags", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    for (const flag of [
      "applied",
      "mutatesRuntime",
      "mutatesHandoff",
      "permitsReapply",
      "executesApply",
    ] as const) {
      const bad = forgePlan(plan, { [flag]: true });
      expect(
        evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
          session,
          handoff,
          bad
        )
      ).toEqual({ ok: false, reason: "plan_invalid" });
    }
  });

  it("fails closed when prepares* is not true", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        handoff,
        forgePlan(plan, { preparesRuntimeApply: false })
      )
    ).toEqual({ ok: false, reason: "plan_prepares_runtime_apply_required" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        handoff,
        forgePlan(plan, { preparesHandoffApply: false })
      )
    ).toEqual({ ok: false, reason: "plan_prepares_handoff_apply_required" });
  });

  it("fails closed for runtime/handoff mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        Object.freeze({ ...handoff, runtimeSessionId: "other-runtime" }),
        plan
      )
    ).toEqual({ ok: false, reason: "runtime_session_id_mismatch" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        Object.freeze({ ...handoff, gameId: OTHER_GAME_ID }),
        plan
      )
    ).toEqual({ ok: false, reason: "session_game_mismatch" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        Object.freeze({ ...handoff, playerId: PLAYER_B }),
        plan
      )
    ).toEqual({ ok: false, reason: "session_owner_mismatch" });
  });

  it("fails closed for plan/runtime identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        handoff,
        forgePlan(plan, { runtimeSessionId: "other-runtime" })
      )
    ).toEqual({ ok: false, reason: "plan_identity_mismatch" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        handoff,
        forgePlan(plan, { gameId: OTHER_GAME_ID })
      )
    ).toEqual({ ok: false, reason: "plan_identity_mismatch" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        handoff,
        forgePlan(plan, { playerId: PLAYER_B })
      )
    ).toEqual({ ok: false, reason: "plan_identity_mismatch" });
  });

  it("fails closed for platformSessionId mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const r = evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
      session,
      handoff,
      forgePlan(plan, { platformSessionId: OTHER_PLATFORM_SESSION_ID })
    );
    expect(r).toEqual({ ok: false, reason: "platform_session_id_mismatch" });
  });

  it("fails closed for resultId malformed or missing", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        handoff,
        forgePlan(plan, { resultId: "not-a-uuid" })
      )
    ).toEqual({ ok: false, reason: "plan_invalid" });
    const missing = { ...plan } as Record<string, unknown>;
    delete missing.resultId;
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        handoff,
        missing
      )
    ).toEqual({ ok: false, reason: "plan_invalid" });
  });

  it("classifies abandoned/expired as bounded blocked; rejects other incompatible lifecycle", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);

    const abandoned = Object.freeze({
      ...session,
      lifecycleState: "abandoned" as const,
      finalized: true,
    });
    const abandonedGuard =
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        abandoned,
        handoff,
        plan
      );
    expect(abandonedGuard.ok).toBe(true);
    if (!abandonedGuard.ok) return;
    expect(abandonedGuard.value.preconditionStatus).toBe("blocked");
    expect(abandonedGuard.value.blockedReason).toBe("lifecycle_abandoned");
    expect(abandonedGuard.value.applied).toBe(false);
    expect(abandonedGuard.value.executesApply).toBe(false);

    const expired = Object.freeze({
      ...session,
      lifecycleState: "expired" as const,
      finalized: true,
    });
    const expiredGuard =
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        expired,
        handoff,
        plan
      );
    expect(expiredGuard.ok).toBe(true);
    if (!expiredGuard.ok) return;
    expect(expiredGuard.value.preconditionStatus).toBe("blocked");
    expect(expiredGuard.value.blockedReason).toBe("lifecycle_expired");

    for (const lifecycleState of ["created", "active", "paused"] as const) {
      const incompatible = Object.freeze({
        ...session,
        lifecycleState,
        finalized: false,
      });
      expect(
        evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
          incompatible,
          handoff,
          plan
        )
      ).toEqual({ ok: false, reason: "lifecycle_incompatible" });
    }

    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        Object.freeze({
          ...session,
          lifecycleState: "completed" as const,
          finalized: false,
        }),
        handoff,
        plan
      )
    ).toEqual({ ok: false, reason: "lifecycle_finalization_inconsistent" });
  });

  it("rejects malformed inputs fail-closed", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        null,
        handoff,
        plan
      )
    ).toEqual({ ok: false, reason: "session_required" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        null,
        plan
      )
    ).toEqual({ ok: false, reason: "handoff_required" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        handoff,
        null
      )
    ).toEqual({ ok: false, reason: "plan_invalid" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        handoff,
        "x"
      )
    ).toEqual({ ok: false, reason: "plan_invalid" });
    expect(
      evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
        session,
        handoff,
        { ...plan, extra: true }
      )
    ).toEqual({ ok: false, reason: "plan_invalid" });
  });

  it("returns frozen bounded guard output", () => {
    const { session, handoff } = boundCompletedPair({ score: 12.5 });
    const plan = trustedPlan(
      session,
      handoff,
      sampleAccepted({ recorded_score: 12.5 })
    );
    const r = evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
      session,
      handoff,
      plan
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const guard: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard =
      r.value;
    expect(Object.isFrozen(guard)).toBe(true);
    expect(guard).toEqual({
      runtimeSessionId: session.runtimeSessionId,
      gameId: session.gameId,
      playerId: session.playerId,
      platformSessionId: PLATFORM_SESSION_ID,
      resultId: RESULT_ID,
      preconditionStatus: "ready",
      blockedReason: null,
      preparesRuntimeApply: true,
      preparesHandoffApply: true,
      applied: false,
      mutatesRuntime: false,
      mutatesHandoff: false,
      permitsReapply: false,
      executesApply: false,
    });
    expect(Object.keys(guard).sort()).toEqual([
      "applied",
      "blockedReason",
      "executesApply",
      "gameId",
      "mutatesHandoff",
      "mutatesRuntime",
      "permitsReapply",
      "platformSessionId",
      "playerId",
      "preconditionStatus",
      "preparesHandoffApply",
      "preparesRuntimeApply",
      "resultId",
      "runtimeSessionId",
    ]);
  });

  it("does not mutate inputs and keeps applied/authority flags false", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const sessionBefore = JSON.stringify(session);
    const handoffBefore = JSON.stringify(handoff);
    const planBefore = JSON.stringify(plan);
    const lifecycleBefore = session.lifecycleState;
    const finalizedBefore = session.finalized;
    const appliedBefore = handoff.applied;

    const r = evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
      session,
      handoff,
      plan
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(JSON.stringify(session)).toBe(sessionBefore);
    expect(JSON.stringify(handoff)).toBe(handoffBefore);
    expect(JSON.stringify(plan)).toBe(planBefore);
    expect(session.lifecycleState).toBe(lifecycleBefore);
    expect(session.finalized).toBe(finalizedBefore);
    expect(handoff.applied).toBe(appliedBefore);
    expect(handoff.applied).toBe(false);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value.executesApply).toBe(false);
  });

  it("has no RPC or side effects and keeps Hub authority closed", () => {
    const src = read(MODULE);
    expect(src).toMatch(
      /evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted/
    );
    expect(src).not.toMatch(/createClient/);
    expect(src).not.toMatch(/\.rpc\(/);
    expect(src).not.toMatch(/startGamesRuntimeSession|completeGamesRuntimeSession/);
    expect(src).not.toMatch(/submitGamesSessionResult|executeApply/);
    expect(src).not.toMatch(
      /evaluateGamesRuntimeLifecycleTransition|finalizeGamesRuntimeSession|abandonGamesRuntimeSession|expireGamesRuntimeSession/
    );
    expect(src).not.toMatch(/applied:\s*true/);

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const r = evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
      session,
      handoff,
      plan
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();

    expect(GAMES_HUB_RUNTIME_AUTHORITY).toEqual({
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
    });
    expect(session.contractVersion).toBe(GAMES_HUB_RUNTIME_CONTRACT_VERSION);
    expect(session.runsActualGameServer).toBe(false);
    expect(session.grantsRewards).toBe(false);
    expect(session.acceptsClientResultAsAuthoritative).toBe(false);
    expect(session.multiplayerEnabled).toBe(false);
    expect(session.matchmakingEnabled).toBe(false);
    expect(session.appliesMigrations).toBe(false);
    expect(session.publicApiEnabled).toBe(false);
    expect(session.productionRuntimeEndpointEnabled).toBe(false);
    expect(session.mutatesDatabase).toBe(false);
    expect(handoff.grantsRewards).toBe(false);
    expect(handoff.acceptsClientResultAsAuthoritative).toBe(false);
    expect(handoff.applied).toBe(false);
  });
});
