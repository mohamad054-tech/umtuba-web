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
  describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted,
  type GamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyLifecycleModel";
import {
  buildGamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted,
  type GamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyMutationInput";
import {
  buildGamesRuntimeSubmitOutcomeLocalApplyPlanTrusted,
  type GamesRuntimeSubmitOutcomeLocalApplyPlan,
} from "./gamesHubRuntimeSubmitOutcomeLocalApplyPlan";
import type { GamesSessionResultSubmitResponseView } from "./gamesSessionResultSubmitResponse";

const MODULE = join(
  process.cwd(),
  "lib/games/gamesHubRuntimeSubmitOutcomeLocalApplyLifecycleModel.ts"
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
const IDEMPOTENCY_KEY = "outcome-local-apply-lifecycle-model-1";

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

function trustedDryRun(
  session: GamesRuntimeSessionContract,
  handoff: GamesRuntimeCompletionHandoff,
  plan: GamesRuntimeSubmitOutcomeLocalApplyPlan,
  guard: GamesRuntimeSubmitOutcomeLocalApplyExecutionPreconditionGuard,
  authorization: GamesRuntimeSubmitOutcomeLocalApplyExecutionAuthorization
): GamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsDescription {
  const dryRun = describeGamesRuntimeSubmitOutcomeLocalApplyDryRunEffectsTrusted(
    session,
    handoff,
    plan,
    guard,
    authorization
  );
  if (!dryRun.ok) throw new Error(dryRun.reason);
  return dryRun.value;
}

function trustedMutationInput(
  session: GamesRuntimeSessionContract,
  handoff: GamesRuntimeCompletionHandoff,
  response: GamesSessionResultSubmitResponseView = sampleAccepted()
): GamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted {
  const plan = trustedPlan(session, handoff, response);
  const guard = trustedReadyGuard(session, handoff, plan);
  const authorization = trustedAuthorized(session, handoff, plan, guard);
  const dryRun = trustedDryRun(session, handoff, plan, guard, authorization);
  const mutationInput =
    buildGamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted(
      session,
      handoff,
      plan,
      guard,
      authorization,
      dryRun
    );
  if (!mutationInput.ok) throw new Error(mutationInput.reason);
  return mutationInput.value;
}

function forgeMutationInput(
  base: GamesRuntimeSubmitOutcomeLocalApplyMutationInputTrusted,
  overrides: Record<string, unknown>
): unknown {
  return Object.freeze({ ...base, ...overrides });
}

describe("Games Hub Runtime Submit Outcome Local Apply Lifecycle Model Contract Trusted V1", () => {
  it("returns lifecycle model for valid accepted-fresh prepared mutation input", () => {
    const { session, handoff } = boundCompletedPair({ score: 42 });
    const mutationInput = trustedMutationInput(
      session,
      handoff,
      sampleAccepted({ recorded_score: 42, idempotent_replay: false })
    );
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      mutationInput
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.authorizationStatus).toBe("authorized");
    expect(r.value.preconditionStatus).toBe("ready");
    expect(r.value.eligibilityStatus).toBe("eligible_accepted_fresh");
    expect(r.value.acknowledgmentStatus).toBe("accepted_fresh");
    expect(r.value.decisionStatus).toBe("accepted");
    expect(r.value.idempotentReplay).toBe(false);
    expect(r.value.mutationInputPrepared).toBe(true);
    expect(r.value.dryRunVerified).toBe(true);
    expect(r.value.lifecycleModelOnly).toBe(true);
    expect(r.value.allowedFutureTransitions).toEqual([
      "atomic_paired_local_apply_marks",
    ]);
    expect(r.value.duplicatePreventionRule).toBe(
      "reject_when_handoff_already_applied"
    );
    expect(r.value.atomicityPairing).toBe(
      "runtime_and_handoff_must_apply_together"
    );
    expect(r.value.failureSemantics).toBe("fail_closed_no_partial_apply");
    expect(r.value.rollbackSupported).toBe(false);
    expect(r.value.persistenceAuthority).toBe("none");
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value.executesApply).toBe(false);
    expect(r.value.grantsCapability).toBe(false);
    expect(r.value.providesAuthorityToken).toBe(false);
  });

  it("passes through exact intended-effect metadata", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      mutationInput
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.intendedRuntimeEffect).toBe(
      "mark_runtime_completion_locally"
    );
    expect(r.value.intendedHandoffEffect).toBe(
      "mark_completion_handoff_applied_locally"
    );
  });

  it("sets lifecycleModelOnly true as metadata only", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      mutationInput
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lifecycleModelOnly).toBe(true);
    expect(r.value.executesApply).toBe(false);
  });

  it("fails closed for already-applied handoff", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const appliedHandoff = Object.freeze({
      ...handoff,
      applied: true,
    });
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      appliedHandoff,
      mutationInput
    );
    expect(r).toEqual({ ok: false, reason: "handoff_already_applied" });
  });

  it("fails closed for rejected/ineligible mutation input", () => {
    const { session, handoff } = boundCompletedPair({ score: 1 });
    const mutationInput = trustedMutationInput(session, handoff);
    const rejected = forgeMutationInput(mutationInput, {
      eligibilityStatus: "ineligible_rejected",
      acknowledgmentStatus: "rejected",
      decisionStatus: "rejected",
      idempotentReplay: false,
    });
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      rejected
    );
    expect(r).toEqual({ ok: false, reason: "ineligible_rejected" });
  });

  it("fails closed for idempotent-replay mutation input", () => {
    const { session, handoff } = boundCompletedPair({ score: 7 });
    const mutationInput = trustedMutationInput(session, handoff);
    const replay = forgeMutationInput(mutationInput, {
      eligibilityStatus: "ineligible_idempotent_replay",
      acknowledgmentStatus: "accepted_idempotent_replay",
      decisionStatus: "accepted",
      idempotentReplay: true,
    });
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      replay
    );
    expect(r).toEqual({ ok: false, reason: "ineligible_idempotent_replay" });
  });

  it("fails closed for non-ready mutation input", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const blocked = forgeMutationInput(mutationInput, {
      preconditionStatus: "blocked",
    });
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      blocked
    );
    expect(r).toEqual({ ok: false, reason: "mutation_input_not_ready" });
  });

  it("fails closed for non-authorized mutation input", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const denied = forgeMutationInput(mutationInput, {
      authorizationStatus: "denied",
    });
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      denied
    );
    expect(r).toEqual({ ok: false, reason: "mutation_input_not_authorized" });
  });

  it("fails closed when mutationInputPrepared is not true", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      forgeMutationInput(mutationInput, { mutationInputPrepared: false })
    );
    expect(r).toEqual({ ok: false, reason: "mutation_input_prepared_required" });
  });

  it("fails closed when dryRunVerified is not true", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      forgeMutationInput(mutationInput, { dryRunVerified: false })
    );
    expect(r).toEqual({ ok: false, reason: "dry_run_verified_required" });
  });

  it("fails closed for incorrect intended Runtime effect", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      forgeMutationInput(mutationInput, {
        intendedRuntimeEffect: "mark_runtime_completion_remotely",
      })
    );
    expect(r).toEqual({
      ok: false,
      reason: "incorrect_intended_runtime_effect",
    });
  });

  it("fails closed for incorrect intended handoff effect", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      forgeMutationInput(mutationInput, {
        intendedHandoffEffect: "mark_completion_handoff_applied_remotely",
      })
    );
    expect(r).toEqual({
      ok: false,
      reason: "incorrect_intended_handoff_effect",
    });
  });

  it("fails closed for mutation-input metadata inconsistency", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const inconsistent = forgeMutationInput(mutationInput, {
      eligibilityStatus: "eligible_accepted_fresh",
      acknowledgmentStatus: "accepted_fresh",
      decisionStatus: "accepted",
      idempotentReplay: true,
    });
    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        session,
        handoff,
        inconsistent
      )
    ).toEqual({ ok: false, reason: "inconsistent_mutation_input_state" });
  });

  it("fails closed for continuity and identity mismatches", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        Object.freeze({ ...session, runtimeSessionId: "other-runtime" }),
        handoff,
        mutationInput
      )
    ).toEqual({ ok: false, reason: "runtime_session_id_mismatch" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        Object.freeze({ ...session, gameId: OTHER_GAME_ID }),
        handoff,
        mutationInput
      )
    ).toEqual({ ok: false, reason: "session_game_mismatch" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        Object.freeze({ ...session, playerId: PLAYER_B }),
        handoff,
        mutationInput
      )
    ).toEqual({ ok: false, reason: "session_owner_mismatch" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        session,
        handoff,
        forgeMutationInput(mutationInput, {
          runtimeSessionId: "other-runtime",
        })
      )
    ).toEqual({ ok: false, reason: "mutation_input_identity_mismatch" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        session,
        handoff,
        forgeMutationInput(mutationInput, {
          platformSessionId: OTHER_PLATFORM_SESSION_ID,
        })
      )
    ).toEqual({ ok: false, reason: "platform_session_id_mismatch" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        Object.freeze({ ...session, platformSessionId: null }),
        handoff,
        mutationInput
      )
    ).toEqual({ ok: false, reason: "platform_session_id_required" });
  });

  it("fails closed for missing or malformed inputs", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        null,
        handoff,
        mutationInput
      )
    ).toEqual({ ok: false, reason: "session_required" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        session,
        null,
        mutationInput
      )
    ).toEqual({ ok: false, reason: "handoff_required" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        session,
        handoff,
        null
      )
    ).toEqual({ ok: false, reason: "mutation_input_invalid" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        session,
        handoff,
        { ...mutationInput, extra: true }
      )
    ).toEqual({ ok: false, reason: "mutation_input_invalid" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        session,
        handoff,
        forgeMutationInput(mutationInput, {
          resultId: OTHER_RESULT_ID.slice(0, 8),
        })
      )
    ).toEqual({ ok: false, reason: "mutation_input_invalid" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        session,
        handoff,
        forgeMutationInput(mutationInput, { applied: true })
      )
    ).toEqual({ ok: false, reason: "mutation_input_invalid" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        session,
        handoff,
        forgeMutationInput(mutationInput, { executesApply: true })
      )
    ).toEqual({ ok: false, reason: "mutation_input_invalid" });

    expect(
      describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
        session,
        handoff,
        forgeMutationInput(mutationInput, { grantsCapability: true })
      )
    ).toEqual({ ok: false, reason: "mutation_input_invalid" });
  });

  it("returns frozen bounded lifecycle-model output", () => {
    const { session, handoff } = boundCompletedPair({ score: 12.5 });
    const mutationInput = trustedMutationInput(
      session,
      handoff,
      sampleAccepted({ recorded_score: 12.5 })
    );
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      mutationInput
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const model: GamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted =
      r.value;
    expect(Object.isFrozen(model)).toBe(true);
    expect(Object.isFrozen(model.allowedFutureTransitions)).toBe(true);
    expect(model).toEqual({
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
      intendedRuntimeEffect: "mark_runtime_completion_locally",
      intendedHandoffEffect: "mark_completion_handoff_applied_locally",
      mutationInputPrepared: true,
      dryRunVerified: true,
      allowedFutureTransitions: ["atomic_paired_local_apply_marks"],
      duplicatePreventionRule: "reject_when_handoff_already_applied",
      atomicityPairing: "runtime_and_handoff_must_apply_together",
      failureSemantics: "fail_closed_no_partial_apply",
      rollbackSupported: false,
      persistenceAuthority: "none",
      lifecycleModelOnly: true,
      applied: false,
      mutatesRuntime: false,
      mutatesHandoff: false,
      permitsReapply: false,
      executesApply: false,
      grantsCapability: false,
      providesAuthorityToken: false,
    });
    expect(Object.keys(model).sort()).toEqual([
      "acknowledgmentStatus",
      "allowedFutureTransitions",
      "applied",
      "atomicityPairing",
      "authorizationStatus",
      "decisionStatus",
      "dryRunVerified",
      "duplicatePreventionRule",
      "eligibilityStatus",
      "executesApply",
      "failureSemantics",
      "gameId",
      "grantsCapability",
      "idempotentReplay",
      "intendedHandoffEffect",
      "intendedRuntimeEffect",
      "lifecycleModelOnly",
      "mutatesHandoff",
      "mutatesRuntime",
      "mutationInputPrepared",
      "permitsReapply",
      "persistenceAuthority",
      "platformSessionId",
      "playerId",
      "preconditionStatus",
      "providesAuthorityToken",
      "resultId",
      "rollbackSupported",
      "runtimeSessionId",
    ]);
  });

  it("does not mutate inputs and keeps authority/execution flags false", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const sessionBefore = JSON.stringify(session);
    const handoffBefore = JSON.stringify(handoff);
    const mutationInputBefore = JSON.stringify(mutationInput);
    const lifecycleBefore = session.lifecycleState;
    const finalizedBefore = session.finalized;
    const appliedBefore = handoff.applied;

    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      mutationInput
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(JSON.stringify(session)).toBe(sessionBefore);
    expect(JSON.stringify(handoff)).toBe(handoffBefore);
    expect(JSON.stringify(mutationInput)).toBe(mutationInputBefore);
    expect(session.lifecycleState).toBe(lifecycleBefore);
    expect(session.finalized).toBe(finalizedBefore);
    expect(handoff.applied).toBe(appliedBefore);
    expect(handoff.applied).toBe(false);
    expect(r.value.applied).toBe(false);
    expect(r.value.mutatesRuntime).toBe(false);
    expect(r.value.mutatesHandoff).toBe(false);
    expect(r.value.executesApply).toBe(false);
    expect(r.value.permitsReapply).toBe(false);
    expect(r.value.grantsCapability).toBe(false);
    expect(r.value.providesAuthorityToken).toBe(false);
    expect(r.value.rollbackSupported).toBe(false);
    expect(r.value.lifecycleModelOnly).toBe(true);
  });

  it("does not change lifecycle state or open Hub authority", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const lifecycleBefore = session.lifecycleState;
    const authorityBefore = { ...GAMES_HUB_RUNTIME_AUTHORITY };

    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      mutationInput
    );
    expect(r.ok).toBe(true);
    expect(session.lifecycleState).toBe(lifecycleBefore);
    expect(session.lifecycleState).toBe("completed");
    expect(session.finalized).toBe(true);
    expect(handoff.applied).toBe(false);
    expect(GAMES_HUB_RUNTIME_AUTHORITY).toEqual(authorityBefore);
    expect(GAMES_HUB_RUNTIME_AUTHORITY.mutatesDatabase).toBe(false);
    expect(GAMES_HUB_RUNTIME_CONTRACT_VERSION).toBe("v1");
  });

  it("source is pure lifecycle-model description only", () => {
    const src = read(MODULE);
    expect(src).toMatch(
      /describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted/
    );
    expect(src).toMatch(/lifecycleModelOnly:\s*true\s*as\s*const/);
    expect(src).toMatch(/rollbackSupported:\s*false\s*as\s*const/);
    expect(src).toMatch(/persistenceAuthority:\s*"none"\s*as\s*const/);
    expect(src).toMatch(/applied:\s*false\s*as\s*const/);
    expect(src).toMatch(/mutatesRuntime:\s*false\s*as\s*const/);
    expect(src).toMatch(/mutatesHandoff:\s*false\s*as\s*const/);
    expect(src).toMatch(/executesApply:\s*false\s*as\s*const/);
    expect(src).toMatch(/permitsReapply:\s*false\s*as\s*const/);
    expect(src).toMatch(/grantsCapability:\s*false\s*as\s*const/);
    expect(src).toMatch(/providesAuthorityToken:\s*false\s*as\s*const/);
    expect(src).not.toMatch(/createClient/);
    expect(src).not.toMatch(/\.rpc\(/);
    expect(src).not.toMatch(
      /startGamesRuntimeSession|completeGamesRuntimeSession/
    );
    expect(src).not.toMatch(/submitGamesSessionResult|executeApply/);
    expect(src).not.toMatch(
      /evaluateGamesRuntimeLifecycleTransition|finalizeGamesRuntimeSession|abandonGamesRuntimeSession|expireGamesRuntimeSession/
    );
    expect(src).not.toMatch(/applied:\s*true/);
    expect(src).not.toMatch(/capabilityToken|authorityToken|nonce|secret/);
    expect(src).not.toMatch(
      /grantsCapability:\s*true|providesAuthorityToken:\s*true/
    );
  });

  it("does not expose executor, token, writable reference, or persistence hooks", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      mutationInput
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).not.toHaveProperty("execute");
    expect(r.value).not.toHaveProperty("apply");
    expect(r.value).not.toHaveProperty("callback");
    expect(r.value).not.toHaveProperty("token");
    expect(r.value).not.toHaveProperty("authorityToken");
    expect(r.value).not.toHaveProperty("capability");
    expect(r.value).not.toHaveProperty("session");
    expect(r.value).not.toHaveProperty("handoff");
    expect(r.value).not.toHaveProperty("persist");
    expect(r.value).not.toHaveProperty("rollback");
    expect(r.value).not.toHaveProperty("lifecycleTransition");
    expect(typeof r.value).toBe("object");
    for (const value of Object.values(r.value)) {
      expect(typeof value === "function").toBe(false);
    }
  });

  it("is synchronous and does not schedule side effects", () => {
    const { session, handoff } = boundCompletedPair();
    const mutationInput = trustedMutationInput(session, handoff);
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const queueMicrotaskSpy = vi.spyOn(globalThis, "queueMicrotask");
    const r = describeGamesRuntimeSubmitOutcomeLocalApplyLifecycleModelTrusted(
      session,
      handoff,
      mutationInput
    );
    expect(r.ok).toBe(true);
    expect(setTimeoutSpy).not.toHaveBeenCalled();
    expect(queueMicrotaskSpy).not.toHaveBeenCalled();
    setTimeoutSpy.mockRestore();
    queueMicrotaskSpy.mockRestore();
  });
});
