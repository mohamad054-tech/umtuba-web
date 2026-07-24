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
  describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted,
  type GamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription";
import {
  evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationTrusted,
  type GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyExecutionAuthorization";
import {
  evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted,
  type GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard";
import {
  buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted,
  type GamesRuntimeSubmitOutcomeLocalApplyPlan,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyPlan";
import type { GamesSessionResultSubmitResponseView } from "./gamesSessionResultSubmitResponse";

const MODULE = join(
  process.cwd(),
  "lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription.ts"
);

const GAME_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_GAME_ID = "22222222-2222-4222-8222-222222222222";
const PLATFORM_SESSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const OTHER_PLATFORM_SESSION_ID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const RESULT_ID = "cccccccc-dddd-4eee-8fff-000000000000";
const OTHER_RESULT_ID = "dddddddd-eeee-4fff-8000-111111111111";
const PLAYER_A = "player.user-a";
const PLAYER_B = "player.user-b";
const NOW = "2026-07-24T00:00:00.000Z";
const IDEMPOTENCY_KEY = "outcome-local-apply-dry-run-1";

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

function trustedReadyGuard(
  session: GamesRuntimeSessionContract,
  handoff: GamesRuntimeCompletionHandoff,
  plan: GamesRuntimeSubmitOutcomeLocalApplyPlan
): GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard {
  const guard =
    evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionTrusted(
      session,
      handoff,
      plan
    );
  if (!guard.ok) throw new Error(guard.reason);
  return guard.value;
}

function trustedAuthorized(
  session: GamesRuntimeSessionContract,
  handoff: GamesRuntimeCompletionHandoff,
  plan: GamesRuntimeSubmitOutcomeLocalApplyPlan,
  guard: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard
): GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization {
  const auth =
    evaluateGamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorizationTrusted(
      session,
      handoff,
      plan,
      guard
    );
  if (!auth.ok) throw new Error(auth.reason);
  return auth.value;
}

function forgePlan(
  base: GamesRuntimeSubmitOutcomeLocalApplyPlan,
  overrides: Record<string, unknown>
): unknown {
  return Object.freeze({ ...base, ...overrides });
}

function forgeGuard(
  base: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard,
  overrides: Record<string, unknown>
): unknown {
  return Object.freeze({ ...base, ...overrides });
}

function forgeAuthorization(
  base: GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization,
  overrides: Record<string, unknown>
): unknown {
  return Object.freeze({ ...base, ...overrides });
}

describe("Games Hub Runtime Submit Outcome Local Apply Dry-Run Effects Description Contract Trusted V1", () => {
  it("returns dry-run description for valid authorized accepted-fresh path", () => {
    const { session, handoff } = boundCompletedPair({ score: 42 });
    const plan = trustedPlan(
      session,
      handoff,
      sampleAccepted({ recorded_score: 42, idempotent_replay: false })
    );
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
      session,
      handoff,
      plan,
      guard,
      authorization
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.authorizationStatus).toBe("authorized");
    expect(r.value.preconditionStatus).toBe("ready");
    expect(r.value.eligibilityStatus).toBe("eligible_accepted_fresh");
    expect(r.value.acknowledgmentStatus).toBe("accepted_fresh");
    expect(r.value.decisionStatus).toBe("accepted");
    expect(r.value.idempotentReplay).toBe(false);
    expect(r.value.describesRuntimeApply).toBe(true);
    expect(r.value.describesHandoffApply).toBe(true);
    expect(r.value.dryRun).toBe(true);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value.executesApply).toBe(false);
    expect(r.value.grantsCapability).toBe(false);
    expect(r.value.providesAuthorityToken).toBe(false);
  });

  it("describes exact intended Runtime effect", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
      session,
      handoff,
      plan,
      guard,
      authorization
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.describesRuntimeApply).toBe(true);
    expect(r.value.intendedRuntimeEffect).toBe(
      "mark_runtime_completion_locally"
    );
  });

  it("describes exact intended handoff effect", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
      session,
      handoff,
      plan,
      guard,
      authorization
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.describesHandoffApply).toBe(true);
    expect(r.value.intendedHandoffEffect).toBe(
      "mark_completion_handoff_applied_locally"
    );
  });

  it("fails closed for blocked guard", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const ready = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, ready);
    const blocked = forgeGuard(ready, {
      preconditionStatus: "blocked",
      blockedReason: "lifecycle_abandoned",
    });
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
      session,
      handoff,
      plan,
      blocked,
      authorization
    );
    expect(r).toEqual({ ok: false, reason: "guard_blocked" });
  });

  it("fails closed for non-authorized authorization", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);
    const denied = forgeAuthorization(authorization, {
      authorizationStatus: "denied",
    });
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
      session,
      handoff,
      plan,
      guard,
      denied
    );
    expect(r).toEqual({ ok: false, reason: "authorization_denied" });
  });

  it("fails closed for already-applied handoff", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);
    const appliedHandoff = Object.freeze({
      ...handoff,
      applied: true,
    });
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
      session,
      appliedHandoff,
      plan,
      guard,
      authorization
    );
    expect(r).toEqual({ ok: false, reason: "handoff_already_applied" });
  });

  it("fails closed for rejected/ineligible plan", () => {
    const { session, handoff } = boundCompletedPair({ score: 1 });
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);
    const rejectedPlan = forgePlan(plan, {
      eligibilityStatus: "ineligible_rejected",
      acknowledgmentStatus: "rejected",
      decisionStatus: "rejected",
      idempotentReplay: false,
    });
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
      session,
      handoff,
      rejectedPlan,
      guard,
      authorization
    );
    expect(r).toEqual({ ok: false, reason: "ineligible_rejected" });
  });

  it("fails closed for idempotent-replay plan", () => {
    const { session, handoff } = boundCompletedPair({ score: 7 });
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);
    const replayPlan = forgePlan(plan, {
      eligibilityStatus: "ineligible_idempotent_replay",
      acknowledgmentStatus: "accepted_idempotent_replay",
      decisionStatus: "accepted",
      idempotentReplay: true,
    });
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
      session,
      handoff,
      replayPlan,
      guard,
      authorization
    );
    expect(r).toEqual({ ok: false, reason: "ineligible_idempotent_replay" });
  });

  it("fails closed for plan/guard/auth metadata inconsistency", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);

    const inconsistentPlan = forgePlan(plan, {
      eligibilityStatus: "eligible_accepted_fresh",
      acknowledgmentStatus: "accepted_fresh",
      decisionStatus: "accepted",
      idempotentReplay: true,
    });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        inconsistentPlan,
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "inconsistent_plan_state" });

    const inconsistentGuard = forgeGuard(guard, {
      preconditionStatus: "ready",
      blockedReason: "lifecycle_expired",
    });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        inconsistentGuard,
        authorization
      )
    ).toEqual({ ok: false, reason: "inconsistent_guard_state" });

    const inconsistentAuth = forgeAuthorization(authorization, {
      eligibilityStatus: "eligible_accepted_fresh",
      acknowledgmentStatus: "accepted_fresh",
      decisionStatus: "accepted",
      idempotentReplay: true,
    });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        guard,
        inconsistentAuth
      )
    ).toEqual({ ok: false, reason: "inconsistent_authorization_state" });

    const mismatchedAuthMeta = forgeAuthorization(authorization, {
      decisionStatus: "rejected",
    });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        guard,
        mismatchedAuthMeta
      )
    ).toEqual({ ok: false, reason: "inconsistent_authorization_state" });
  });

  it("fails closed for non-false authority/token flags", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);

    for (const flag of [
      "applied",
      "mutatesRuntime",
      "mutatesHandoff",
      "permitsReapply",
      "executesApply",
    ] as const) {
      expect(
        describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
          session,
          handoff,
          forgePlan(plan, { [flag]: true }),
          guard,
          authorization
        )
      ).toEqual({ ok: false, reason: "plan_invalid" });
      expect(
        describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
          session,
          handoff,
          plan,
          forgeGuard(guard, { [flag]: true }),
          authorization
        )
      ).toEqual({ ok: false, reason: "guard_invalid" });
      expect(
        describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
          session,
          handoff,
          plan,
          guard,
          forgeAuthorization(authorization, { [flag]: true })
        )
      ).toEqual({ ok: false, reason: "authorization_invalid" });
    }

    for (const flag of ["grantsCapability", "providesAuthorityToken"] as const) {
      expect(
        describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
          session,
          handoff,
          plan,
          guard,
          forgeAuthorization(authorization, { [flag]: true })
        )
      ).toEqual({ ok: false, reason: "authorization_invalid" });
    }
  });

  it("fails closed for runtime/handoff mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        Object.freeze({ ...handoff, runtimeSessionId: "other-runtime" }),
        plan,
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "runtime_session_id_mismatch" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        Object.freeze({ ...handoff, gameId: OTHER_GAME_ID }),
        plan,
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "session_game_mismatch" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        Object.freeze({ ...handoff, playerId: PLAYER_B }),
        plan,
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "session_owner_mismatch" });
  });

  it("fails closed for plan/guard/auth identity mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        forgePlan(plan, { runtimeSessionId: "other-runtime" }),
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "plan_identity_mismatch" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        forgePlan(plan, { gameId: OTHER_GAME_ID }),
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "plan_identity_mismatch" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        forgePlan(plan, { playerId: PLAYER_B }),
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "plan_identity_mismatch" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        forgeGuard(guard, { runtimeSessionId: "other-runtime" }),
        authorization
      )
    ).toEqual({ ok: false, reason: "guard_identity_mismatch" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        forgeGuard(guard, { gameId: OTHER_GAME_ID }),
        authorization
      )
    ).toEqual({ ok: false, reason: "guard_identity_mismatch" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        forgeGuard(guard, { playerId: PLAYER_B }),
        authorization
      )
    ).toEqual({ ok: false, reason: "guard_identity_mismatch" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        guard,
        forgeAuthorization(authorization, {
          runtimeSessionId: "other-runtime",
        })
      )
    ).toEqual({ ok: false, reason: "authorization_identity_mismatch" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        guard,
        forgeAuthorization(authorization, { gameId: OTHER_GAME_ID })
      )
    ).toEqual({ ok: false, reason: "authorization_identity_mismatch" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        guard,
        forgeAuthorization(authorization, { playerId: PLAYER_B })
      )
    ).toEqual({ ok: false, reason: "authorization_identity_mismatch" });
  });

  it("fails closed for platformSessionId mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        forgePlan(plan, { platformSessionId: OTHER_PLATFORM_SESSION_ID }),
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "platform_session_id_mismatch" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        forgeGuard(guard, { platformSessionId: OTHER_PLATFORM_SESSION_ID }),
        authorization
      )
    ).toEqual({ ok: false, reason: "platform_session_id_mismatch" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        guard,
        forgeAuthorization(authorization, {
          platformSessionId: OTHER_PLATFORM_SESSION_ID,
        })
      )
    ).toEqual({ ok: false, reason: "platform_session_id_mismatch" });
  });

  it("fails closed for resultId mismatch", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        forgeGuard(guard, { resultId: OTHER_RESULT_ID }),
        authorization
      )
    ).toEqual({ ok: false, reason: "plan_guard_result_id_mismatch" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        guard,
        forgeAuthorization(authorization, { resultId: OTHER_RESULT_ID })
      )
    ).toEqual({ ok: false, reason: "plan_authorization_result_id_mismatch" });
  });

  it("rejects malformed inputs fail-closed", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        null,
        handoff,
        plan,
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "session_required" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        null,
        plan,
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "handoff_required" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        null,
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "plan_invalid" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        null,
        authorization
      )
    ).toEqual({ ok: false, reason: "guard_invalid" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        guard,
        null
      )
    ).toEqual({ ok: false, reason: "authorization_invalid" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        "x",
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "plan_invalid" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        { ...plan, extra: true },
        guard,
        authorization
      )
    ).toEqual({ ok: false, reason: "plan_invalid" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        { ...guard, extra: true },
        authorization
      )
    ).toEqual({ ok: false, reason: "guard_invalid" });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
        session,
        handoff,
        plan,
        guard,
        { ...authorization, extra: true }
      )
    ).toEqual({ ok: false, reason: "authorization_invalid" });
  });

  it("returns frozen bounded dry-run effects-description output", () => {
    const { session, handoff } = boundCompletedPair({ score: 12.5 });
    const plan = trustedPlan(
      session,
      handoff,
      sampleAccepted({ recorded_score: 12.5 })
    );
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
      session,
      handoff,
      plan,
      guard,
      authorization
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const description: GamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription =
      r.value;
    expect(Object.isFrozen(description)).toBe(true);
    expect(description).toEqual({
      runtimeSessionId: session.runtimeSessionId,
      gameId: session.gameId,
      playerId: session.playerId,
      platformSessionId: PLATFORM_SESSION_ID,
      resultId: RESULT_ID,
      authorizationStatus: "authorized",
      preconditionStatus: "ready",
      eligibilityStatus: "eligible_accepted_fresh",
      acknowledgmentStatus: "accepted_fresh",
      decisionStatus: "accepted",
      idempotentReplay: false,
      describesRuntimeApply: true,
      describesHandoffApply: true,
      intendedRuntimeEffect: "mark_runtime_completion_locally",
      intendedHandoffEffect: "mark_completion_handoff_applied_locally",
      dryRun: true,
      applied: false,
      mutatesRuntime: false,
      mutatesHandoff: false,
      permitsReapply: false,
      executesApply: false,
      grantsCapability: false,
      providesAuthorityToken: false,
    });
    expect(Object.keys(description).sort()).toEqual([
      "acknowledgmentStatus",
      "applied",
      "authorizationStatus",
      "decisionStatus",
      "describesHandoffApply",
      "describesRuntimeApply",
      "dryRun",
      "eligibilityStatus",
      "executesApply",
      "gameId",
      "grantsCapability",
      "idempotentReplay",
      "intendedHandoffEffect",
      "intendedRuntimeEffect",
      "mutatesHandoff",
      "mutatesRuntime",
      "permitsReapply",
      "platformSessionId",
      "playerId",
      "preconditionStatus",
      "providesAuthorityToken",
      "resultId",
      "runtimeSessionId",
    ]);
  });

  it("does not mutate inputs and keeps dryRun true with authority flags false", () => {
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);
    const sessionBefore = JSON.stringify(session);
    const handoffBefore = JSON.stringify(handoff);
    const planBefore = JSON.stringify(plan);
    const guardBefore = JSON.stringify(guard);
    const authorizationBefore = JSON.stringify(authorization);
    const lifecycleBefore = session.lifecycleState;
    const finalizedBefore = session.finalized;
    const appliedBefore = handoff.applied;

    const r = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
      session,
      handoff,
      plan,
      guard,
      authorization
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(JSON.stringify(session)).toBe(sessionBefore);
    expect(JSON.stringify(handoff)).toBe(handoffBefore);
    expect(JSON.stringify(plan)).toBe(planBefore);
    expect(JSON.stringify(guard)).toBe(guardBefore);
    expect(JSON.stringify(authorization)).toBe(authorizationBefore);
    expect(session.lifecycleState).toBe(lifecycleBefore);
    expect(session.finalized).toBe(finalizedBefore);
    expect(handoff.applied).toBe(appliedBefore);
    expect(handoff.applied).toBe(false);
    expect(r.value.dryRun).toBe(true);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value.executesApply).toBe(false);
    expect(r.value.grantsCapability).toBe(false);
    expect(r.value.providesAuthorityToken).toBe(false);
  });

  it("has no RPC or side effects and keeps Hub authority closed", () => {
    const src = read(MODULE);
    expect(src).toMatch(
      /describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted/
    );
    expect(src).not.toMatch(/createClient/);
    expect(src).not.toMatch(/\.rpc\(/);
    expect(src).not.toMatch(/startGamesRuntimeSession|completeGamesRuntimeSession/);
    expect(src).not.toMatch(/submitGamesSessionResult|executeApply/);
    expect(src).not.toMatch(
      /evaluateGamesRuntimeLifecycleTransition|finalizeGamesRuntimeSession|abandonGamesRuntimeSession|expireGamesRuntimeSession/
    );
    expect(src).not.toMatch(/applied:\s*true/);
    expect(src).not.toMatch(/capabilityToken|authorityToken|nonce|secret/);
    expect(src).not.toMatch(
      /grantsCapability:\s*true|providesAuthorityToken:\s*true/
    );

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { session, handoff } = boundCompletedPair();
    const plan = trustedPlan(session, handoff);
    const guard = trustedReadyGuard(session, handoff, plan);
    const authorization = trustedAuthorized(session, handoff, plan, guard);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
      session,
      handoff,
      plan,
      guard,
      authorization
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
