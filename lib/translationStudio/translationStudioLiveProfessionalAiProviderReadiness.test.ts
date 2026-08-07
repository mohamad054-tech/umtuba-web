import { describe, expect, it } from "vitest";
import {
  PROFESSIONAL_AI_AUTHORITY,
  assertBenchmarkCorpusIntegrity,
  assessLiveProfessionalProviderReadiness,
  AI_CORE_PROVIDER_AUDIT_V1,
  BENCHMARK_DISQUALIFICATION_THRESHOLDS,
  BENCHMARK_SCORE_WEIGHTS,
  PROFESSIONAL_LIVE_ENV_NAMES,
  buildProfessionalBenchmarkMatrix,
  combineAutomatedAndHumanScores,
  createHumanBenchmarkRating,
  createTranslationStudioWorkflow,
  defaultOfflineBenchmarkMatrix,
  getLocaleBenchmarkRubric,
  listBenchmarkCases,
  loadProfessionalLiveModelPolicy,
  runProfessionalProviderBenchmark,
  scoreBenchmarkCase,
  aggregateProviderMatrixScores,
  ARABIC_BENCHMARK_RUBRIC,
} from "./index";

describe("live professional AI provider readiness", () => {
  it("benchmark corpus is valid with locales, glossary, placeholders, sensitive", () => {
    const integrity = assertBenchmarkCorpusIntegrity();
    expect(integrity.ok).toBe(true);
    expect(integrity.caseCount).toBeGreaterThanOrEqual(30);
    expect(integrity.locales).toEqual(
      expect.arrayContaining(["ar", "fr", "es", "de", "pt"])
    );
    expect(integrity.placeholderCases).toBeGreaterThan(0);
    expect(integrity.sensitiveCases).toBeGreaterThan(0);
    expect(integrity.glossaryCases).toBeGreaterThan(0);
    expect(integrity.domains).toEqual(
      expect.arrayContaining([
        "app_shell",
        "commerce",
        "learning",
        "collaboration",
        "sensitive",
        "placeholder",
      ])
    );
  });

  it("Arabic and other-locale rubrics exist", () => {
    expect(ARABIC_BENCHMARK_RUBRIC.locale).toBe("ar");
    expect(ARABIC_BENCHMARK_RUBRIC.passPhilosophy).toMatch(/unnatural/i);
    for (const loc of ["fr", "es", "de", "pt"]) {
      const r = getLocaleBenchmarkRubric(loc);
      expect(r.locale).toBe(loc);
      expect(r.dimensions.length).toBeGreaterThan(5);
    }
  });

  it("provider matrix supports independent generator/reviewer slots", () => {
    const matrix = buildProfessionalBenchmarkMatrix({
      candidates: [
        { providerId: "openai", modelId: "model-a", role: "generator" },
        { providerId: "anthropic", modelId: "model-b", role: "reviewer" },
        { providerId: "gemini", modelId: "model-c", role: "both" },
      ],
    });
    expect(matrix.length).toBeGreaterThan(0);
    expect(matrix.some((s) => s.independent)).toBe(true);
    const offline = defaultOfflineBenchmarkMatrix();
    expect(offline[0]?.generator.providerId).toBe("heuristic");
    expect(offline[0]?.reviewer.providerId).toBe("heuristic");
    expect(offline[0]?.independent).toBe(true);
  });

  it("quality-weight scoring and hard failure disqualification", () => {
    expect(BENCHMARK_SCORE_WEIGHTS.quality).toBeGreaterThan(
      BENCHMARK_SCORE_WEIGHTS.cost
    );
    const good = scoreBenchmarkCase({
      overallScore: 92,
      recommendation: "PASS",
      findings: [],
      humanReviewRequired: false,
      sensitiveCase: false,
      structuredResponseValid: true,
      latencyMs: 800,
    });
    expect(good.disqualifiedCase).toBe(false);
    expect(good.composite).toBeGreaterThan(80);

    const badPh = scoreBenchmarkCase({
      overallScore: 99,
      recommendation: "PASS",
      findings: [
        {
          code: "placeholder_missing",
          severity: "blocking",
          dimension: "placeholder_integrity",
          message: "missing",
        },
      ],
      humanReviewRequired: false,
      sensitiveCase: false,
      structuredResponseValid: true,
      latencyMs: 100,
    });
    expect(badPh.disqualifiedCase).toBe(true);
    expect(badPh.disqualifyReasons).toContain("placeholder_corruption");

    const invalid = scoreBenchmarkCase({
      overallScore: 40,
      recommendation: "HUMAN_REVIEW",
      findings: [],
      humanReviewRequired: true,
      sensitiveCase: false,
      structuredResponseValid: false,
      latencyMs: 100,
    });
    expect(invalid.structuredPenalty).toBeGreaterThan(0);

    const sensitivePass = scoreBenchmarkCase({
      overallScore: 95,
      recommendation: "PASS",
      findings: [],
      humanReviewRequired: false,
      sensitiveCase: true,
      structuredResponseValid: true,
      latencyMs: 100,
    });
    expect(sensitivePass.disqualifyReasons).toContain(
      "sensitive_copy_mishandling"
    );

    const agg = aggregateProviderMatrixScores([badPh, badPh, badPh]);
    expect(agg.eligibility).toBe("NOT_ELIGIBLE");
    expect(BENCHMARK_DISQUALIFICATION_THRESHOLDS.professionalQualityFloor).toBe(
      75
    );
  });

  it("human rating integration", () => {
    const rating = createHumanBenchmarkRating({
      caseId: "appshell_back",
      locale: "ar",
      matrixSlotId: "G1_R1",
      rating: "excellent",
      notes: "Natural MSA",
    });
    expect(rating.schemaVersion).toBe(1);
    const combined = combineAutomatedAndHumanScores({
      automatedComposite: 80,
      humanRatings: [rating],
    });
    expect(combined).toBe(90);
  });

  it("server-only provider config env names; no secret exposure", () => {
    const policy = loadProfessionalLiveModelPolicy();
    expect(policy.preferIndependentReviewer).toBe(true);
    expect(PROFESSIONAL_LIVE_ENV_NAMES).toContain("OPENAI_API_KEY");
    expect(PROFESSIONAL_LIVE_ENV_NAMES).toContain(
      "UMTUBA_PROFESSIONAL_GENERATOR_MODEL"
    );
    const blob = JSON.stringify(policy);
    expect(blob).not.toMatch(/sk-/);
    expect(blob).not.toMatch(/Bearer /);
  });

  it("provider readiness states without activating", () => {
    const report = assessLiveProfessionalProviderReadiness();
    expect(report.activated).toBe(false);
    expect(report.secretsExposed).toBe(false);
    expect(report.offlinePipelineRemainsUsable).toBe(true);
    expect(report.professionalCapabilitiesRegistered).toBe(true);
    expect(report.translationSuggestRemainsCompatible).toBe(true);
    expect([
      "LIVE_BENCHMARK_READY",
      "LIVE_PROVIDER_NOT_CONFIGURED",
      "LIVE_PROVIDER_CONFIG_INVALID",
    ]).toContain(report.overall);
    // Current Computer 2 expectation
    expect(report.overall).toBe("LIVE_PROVIDER_NOT_CONFIGURED");
    expect(report.generator.state).toBe("NOT_CONFIGURED");
    expect(report.reviewer.state).toBe("NOT_CONFIGURED");
    expect(AI_CORE_PROVIDER_AUDIT_V1.length).toBeGreaterThanOrEqual(4);
  });

  it("non-mutating benchmark run with max call guardrail", async () => {
    const wfBefore = createTranslationStudioWorkflow({ ephemeral: true });
    const sugBefore = wfBefore.getSnapshot().suggestions.length;
    const valuesBefore = wfBefore.getSnapshot().values.map((v) => ({
      id: v.id,
      value: v.value,
      status: v.status,
    }));

    const report = await runProfessionalProviderBenchmark({
      locales: ["ar"],
      guardrails: { maxCases: 6, maxProviderCalls: 20 },
    });

    expect(report.mutatedStudio).toBe(false);
    expect(report.secretsPresent).toBe(false);
    expect(report.results.length).toBeGreaterThan(0);
    expect(report.results.length).toBeLessThanOrEqual(6);
    expect(report.providerCalls).toBeLessThanOrEqual(20);
    expect(report.independentGeneratorReviewer).toBe(true);
    expect(report.aggregate.caseCount).toBe(report.results.length);

    // Studio singleton may be separate from ephemeral — assert ephemeral untouched
    expect(wfBefore.getSnapshot().suggestions.length).toBe(sugBefore);
    for (const v of valuesBefore) {
      const after = wfBefore.getValue(v.id)!;
      expect(after.value).toBe(v.value);
      expect(after.status).toBe(v.status);
    }
    expect(PROFESSIONAL_AI_AUTHORITY.generatorCanApprove).toBe(false);
  });

  it("corpus includes required App Shell / Refund / placeholder examples", () => {
    const ids = listBenchmarkCases().map((c) => c.id);
    for (const id of [
      "appshell_back",
      "appshell_cancel",
      "commerce_refund",
      "ph_hello_name",
      "ph_count_items",
      "collab_workspace",
      "learning_course",
      "sensitive_refund_notice",
    ]) {
      expect(ids).toContain(id);
    }
  });
});
