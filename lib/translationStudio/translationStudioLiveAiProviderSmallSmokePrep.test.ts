import { describe, expect, it } from "vitest";
import {
  SMALL_SMOKE_LOCKED_CASE_IDS,
  SMALL_SMOKE_PROVIDER_ELIGIBILITY,
  RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN,
  SMALL_SMOKE_CONFIG_VARIABLE_NAMES,
  PHASE_A_SMOKE_CASE_IDS,
  assessLiveProfessionalProviderReadiness,
  buildProfessionalBenchmarkMatrix,
  buildSmallSmokePackage,
  calculateSmallSmokeCallBudget,
  createScriptedProfessionalAiTransport,
  createTranslationStudioWorkflow,
  prepareSmallSmokeExecution,
  refuseLiveSmallSmokeIfNotReady,
  runSmallSmokeOffline,
  runSmallSmokePhase,
  validateSmallSmokePrivacy,
} from "./index";

describe("live AI provider small smoke prep V1", () => {
  it("readiness remains NOT_CONFIGURED with per-role states", () => {
    const r = assessLiveProfessionalProviderReadiness();
    expect(r.overall).toBe("LIVE_PROVIDER_NOT_CONFIGURED");
    expect(r.generator.state).toBe("NOT_CONFIGURED");
    expect(r.reviewer.state).toBe("NOT_CONFIGURED");
    expect(["NOT_CONFIGURED", "OPTIONAL", "READY", "INVALID"]).toContain(
      r.sensitiveReviewer.state
    );
    expect(r.activated).toBe(false);
    expect(r.secretsExposed).toBe(false);
    expect(JSON.stringify(r)).not.toMatch(/sk-|api[_-]?key\s*[:=]/i);
  });

  it("locks exactly five cases with AR + sensitive + FR placeholder", () => {
    const pkg = buildSmallSmokePackage();
    expect(pkg.caseCount).toBe(5);
    expect(pkg.cases.map((c) => c.caseId)).toEqual([
      "appshell_back",
      "appshell_cancel",
      "collab_workspace",
      "commerce_refund",
      "ph_hello_name",
    ]);
    expect([...SMALL_SMOKE_LOCKED_CASE_IDS]).toEqual([...PHASE_A_SMOKE_CASE_IDS]);
    expect(pkg.cases.filter((c) => c.targetLocale === "ar")).toHaveLength(4);
    const refund = pkg.cases.find((c) => c.caseId === "commerce_refund")!;
    expect(refund.humanReviewRequired).toBe(true);
    expect(refund.profileId).toBe("commerce_sensitive");
    expect(refund.sensitiveReviewerPreferred).toBe(true);
    const ph = pkg.cases.find((c) => c.caseId === "ph_hello_name")!;
    expect(ph.targetLocale).toBe("fr");
    expect(ph.placeholders).toContain("{name}");
    expect(ph.disqualifyingErrors).toContain("placeholder_corruption");
  });

  it("call budget math: 10 normal + retry ceiling", () => {
    const budget = calculateSmallSmokeCallBudget({ maxRetries: 1 });
    expect(budget.generatorCalls).toBe(5);
    expect(budget.reviewerCalls).toBe(5);
    expect(budget.normalCalls).toBe(10);
    expect(budget.retryCeilingCalls).toBe(10);
    expect(budget.totalCallCeiling).toBe(20);
    expect(budget.requiresExplicitGo).toBe(true);
  });

  it("privacy preflight PASS for locked five", () => {
    const privacy = validateSmallSmokePrivacy();
    expect(privacy.status).toBe("PASS");
    expect(privacy.errors).toEqual([]);
  });

  it("prep snapshot refuses live and exposes config names only", () => {
    const prep = prepareSmallSmokeExecution();
    expect(prep.liveExecutionAllowed).toBe(false);
    expect(prep.requiresExplicitGo).toBe(true);
    expect(prep.privacy.status).toBe("PASS");
    expect(prep.configVariableNames).toContain("UMTUBA_AI_MODE");
    expect(prep.configVariableNames).toContain(
      "PROFESSIONAL_TRANSLATION_GENERATOR_MODEL"
    );
    expect(prep.configVariableNames).toContain(
      "UMTUBA_PROFESSIONAL_SMOKE_EXPLICIT_GO"
    );
    expect(prep.sensitiveReviewerPolicy.neverWeakenHumanRequirement).toBe(
      true
    );
  });

  it("invalid config / budget / missing GO refuse live", () => {
    const prep = prepareSmallSmokeExecution();
    expect(
      refuseLiveSmallSmokeIfNotReady({
        readiness: prep.readiness,
        explicitGo: false,
        maxCalls: 10,
        callCeiling: 20,
      }).ok
    ).toBe(false);
    expect(
      refuseLiveSmallSmokeIfNotReady({
        readiness: prep.readiness,
        explicitGo: true,
        maxCalls: 10,
        callCeiling: 20,
      })
    ).toMatchObject({ ok: false, reason: "provider_not_configured" });
    expect(
      refuseLiveSmallSmokeIfNotReady({
        readiness: {
          ...prep.readiness,
          overall: "LIVE_BENCHMARK_READY",
        },
        explicitGo: true,
        maxCalls: 99,
        callCeiling: 20,
      })
    ).toMatchObject({ ok: false, reason: "call_budget_exceeded" });
    expect(
      refuseLiveSmallSmokeIfNotReady({
        readiness: {
          ...prep.readiness,
          overall: "LIVE_PROVIDER_CONFIG_INVALID",
        },
        explicitGo: true,
        maxCalls: 10,
        callCeiling: 20,
      })
    ).toMatchObject({ ok: false, reason: "config_invalid" });
  });

  it("offline five-case full path: Refund HUMAN_REVIEW, placeholder intact, no mutation", async () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const sugBefore = wf.getSnapshot().suggestions.length;
    const valuesBefore = wf.getSnapshot().values.map((v) => ({
      id: v.id,
      value: v.value,
      status: v.status,
    }));

    const report = await runSmallSmokeOffline();
    expect(report.cases).toHaveLength(5);
    expect(report.mutatedStudio).toBe(false);
    expect(report.secretsPresent).toBe(false);
    expect(report.providerCallsAttempted).toBe(10);
    expect(report.privacy.status).toBe("PASS");

    const refund = report.cases.find((c) => c.caseId === "commerce_refund")!;
    expect(refund.recommendation).toBe("HUMAN_REVIEW");
    expect(refund.humanReviewEnforced).toBe(true);
    expect(refund.usedFallbackNormalReviewer).toBe(true);

    const ph = report.cases.find((c) => c.caseId === "ph_hello_name")!;
    expect(ph.locale).toBe("fr");
    expect(ph.placeholderIntact).toBe(true);
    expect(ph.candidateText).toContain("{name}");

    expect(report.verdict).toBe("SMOKE_PASS");
    expect(report.successCriteria.structuredFailureRateZero).toBe(true);
    expect(report.successCriteria.noStudioMutation).toBe(true);

    // Blind artifacts hide labels on surface
    for (const c of report.cases) {
      expect(c.blindSurface).not.toHaveProperty("_reveal");
      expect(c.blindHumanReview._reveal).toBeTruthy();
      expect(JSON.stringify(c.blindSurface)).not.toMatch(/openai|anthropic/i);
    }

    expect(wf.getSnapshot().suggestions.length).toBe(sugBefore);
    for (const v of valuesBefore) {
      const after = wf.getValue(v.id)!;
      expect(after.value).toBe(v.value);
      expect(after.status).toBe(v.status);
    }
  });

  it("sensitive reviewer path when configured; human gate never weakened", async () => {
    const report = await runSmallSmokeOffline({
      sensitiveReviewerConfigured: true,
    });
    const refund = report.cases.find((c) => c.caseId === "commerce_refund")!;
    expect(refund.sensitiveReviewerUsed).toBe(true);
    expect(refund.usedFallbackNormalReviewer).toBe(false);
    expect(refund.humanReviewEnforced).toBe(true);
    expect(refund.recommendation).toBe("HUMAN_REVIEW");
  });

  it("provider matrix reuse + eligibility classification", () => {
    const matrix = buildProfessionalBenchmarkMatrix({
      candidates: [
        { providerId: "openai", modelId: "g1", role: "generator" },
        { providerId: "gemini", modelId: "r1", role: "reviewer" },
        { providerId: "anthropic", modelId: "r2", role: "reviewer" },
      ],
    });
    expect(matrix.length).toBeGreaterThanOrEqual(2);
    expect(matrix.every((s) => s.independent)).toBe(true);

    const byId = Object.fromEntries(
      SMALL_SMOKE_PROVIDER_ELIGIBILITY.map((e) => [e.providerId, e])
    );
    expect(byId.openai?.classification).toBe("READY_ARCHITECTURALLY");
    expect(byId.gemini?.classification).toBe("READY_ARCHITECTURALLY");
    expect(byId.anthropic?.classification).toBe("WEAKER_STRUCTURED_OUTPUT");
    expect(byId.local?.classification).toBe("NOT_RECOMMENDED_FOR_FIRST_SMOKE");
    expect(RECOMMENDED_FIRST_SMOKE_CONFIGURATION_PATTERN.preferIndependentPair).toBe(
      true
    );
    expect(SMALL_SMOKE_CONFIG_VARIABLE_NAMES.length).toBeGreaterThan(10);
  });

  it("scripted transport failure reports structured invalid / SMOKE_FAIL", async () => {
    const bad = createScriptedProfessionalAiTransport({
      delayMs: 0,
      generator: { candidateText: "x", publish: true },
      reviewer: { dimensionScores: { semantic_accuracy: 90 }, findings: [] },
    });
    const report = await runSmallSmokeOffline({ transport: bad });
    expect(["SMOKE_FAIL", "SMOKE_PARTIAL"]).toContain(report.verdict);
    expect(report.mutatedStudio).toBe(false);
  });

  it("phase helper defaults offline; live GO without ready refuses", async () => {
    const offline = await runSmallSmokePhase({ forceOffline: true });
    expect(offline.mode).toBe("offline_scripted");
    expect(offline.cases).toHaveLength(5);

    const refused = await runSmallSmokePhase({
      explicitGo: true,
      forceOffline: false,
    });
    expect(refused.mode).toBe("live_refused");
    expect(refused.refusalReason).toBe("provider_not_configured");
    expect(refused.providerCallsAttempted).toBe(0);
    expect(refused.mutatedStudio).toBe(false);
  });
});
