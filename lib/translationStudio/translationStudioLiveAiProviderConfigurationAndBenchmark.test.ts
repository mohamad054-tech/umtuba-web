import { describe, expect, it } from "vitest";
import { runCapability } from "../ai/services/aiService";
import { resolvePrompt, validateStructuredAgainstPrompt } from "../ai/prompts/registry";
import {
  ARABIC_ACCEPTANCE_BAR,
  LIVE_BENCHMARK_PHASES,
  LIVE_FAILURE_RETRY_POLICY,
  MULTILINGUAL_ACCEPTANCE_FLOOR,
  PHASE_A_SMOKE_CASE_IDS,
  PROFESSIONAL_AI_AUTHORITY,
  STRUCTURED_RELIABILITY_THRESHOLDS,
  assessLiveProfessionalProviderReadiness,
  buildProfessionalBenchmarkMatrix,
  calculateBenchmarkCostPreflight,
  createAiServiceProfessionalTransport,
  createBlindHumanReviewArtifact,
  createTransportBackedProfessionalGenerator,
  createTransportBackedProfessionalReviewer,
  defaultOfflineBenchmarkMatrix,
  parseStrictProfessionalGeneratorOutput,
  parseStrictProfessionalReviewResult,
  runProfessionalGenerateAndReview,
  runProfessionalTranslationReview,
  seedUmtubaOfficialTerminologyCatalog,
  validateBenchmarkCorpusPrivacy,
  createHeuristicProfessionalReviewer,
} from "./index";

const TEST_USER = "11111111-1111-4111-8111-111111111111";

describe("live AI provider configuration and benchmark V1", () => {
  it("registers dedicated professional capabilities with strict schemas", () => {
    const gen = resolvePrompt({
      promptId: "platform.translation_professional_generate",
    });
    const rev = resolvePrompt({
      promptId: "platform.translation_professional_review",
    });
    expect(gen.capabilityId).toBe("platform.translation_professional_generate");
    expect(rev.capabilityId).toBe("platform.translation_professional_review");
    expect(gen.outputSchema?.required).toContain("candidateText");
    expect(rev.outputSchema?.required).toContain("dimensionScores");

    expect(
      validateStructuredAgainstPrompt(gen, {
        schemaVersion: 1,
        candidateText: "رجوع",
        provider: { providerId: "stub", modelId: "m" },
        approve: true,
      }).ok
    ).toBe(false);

    expect(
      validateStructuredAgainstPrompt(rev, {
        schemaVersion: 1,
        dimensionScores: { semantic_accuracy: 90 },
        findings: [],
        provider: { providerId: "stub", modelId: "m" },
        chainOfThought: "nope",
      }).ok
    ).toBe(false);
  });

  it("offline full-path: AI Core stub preserves rich professional payloads", async () => {
    const deps = {
      supabase: {} as never,
      userId: TEST_USER,
      forceStub: true,
    };

    const genResult = await runCapability(
      {
        capabilityId: "platform.translation_professional_generate",
        input: {
          text: JSON.stringify({
            sourceText: "Back",
            targetLocale: "ar",
            sourceLocale: "en",
          }),
        },
        context: {
          productDomain: "platform",
          surface: "test.professional",
          locale: "ar",
        },
      },
      deps
    );
    if (!genResult.ok) {
      expect.fail(`generate failed: ${genResult.error.code} ${genResult.error.message}`);
    }
    expect(genResult.ok).toBe(true);
    expect(genResult.data.result.schemaVersion).toBe(1);
    expect(genResult.data.result.candidateText).toBeTruthy();
    expect(genResult.data.result.dimensionScores).toBeUndefined(); // not stripped suggest-only
    const genParsed = parseStrictProfessionalGeneratorOutput({
      ...genResult.data.result,
      provider:
        genResult.data.result.provider ??
        { providerId: "stub", modelId: "stub" },
    });
    expect(genParsed.ok).toBe(true);

    const revResult = await runCapability(
      {
        capabilityId: "platform.translation_professional_review",
        input: {
          text: JSON.stringify({
            sourceText: "Back",
            targetText: "رجوع",
            targetLocale: "ar",
          }),
        },
        context: {
          productDomain: "platform",
          surface: "test.professional",
          locale: "ar",
        },
      },
      deps
    );
    expect(revResult.ok).toBe(true);
    if (!revResult.ok) return;
    expect(revResult.data.result.schemaVersion).toBe(1);
    expect(revResult.data.result.dimensionScores).toBeTruthy();
    expect(revResult.data.result.findings).toBeTruthy();
    // Must NOT be narrow suggest-only shape
    expect(revResult.data.result).toHaveProperty("dimensionScores");
    expect(revResult.data.result).toHaveProperty("findings");
    expect(revResult.data.result).not.toEqual(
      expect.objectContaining({
        candidateText: expect.anything(),
        confidence: expect.anything(),
        notes: expect.anything(),
      })
    );
    const revParsed = parseStrictProfessionalReviewResult(
      revResult.data.result
    );
    expect(revParsed.ok).toBe(true);

    // Transport + two-pass via dedicated capabilities
    const transport = createAiServiceProfessionalTransport({
      runCapability: async (req) => {
        const result = await runCapability(
          {
            capabilityId: req.capabilityId as
              | "platform.translation_professional_generate"
              | "platform.translation_professional_review",
            input: req.input,
            context: {
              surface: req.context.surface,
              productDomain: "platform",
              locale: req.context.locale,
            },
          },
          deps
        );
        if (!result.ok) {
          return { ok: false as const, error: { message: result.error.message } };
        }
        return {
          ok: true as const,
          data: {
            result: result.data.result as Record<string, unknown>,
            runId: result.data.runId,
          },
        };
      },
    });

    const twoPass = await runProfessionalGenerateAndReview({
      sourceText: "Back",
      targetLocale: "ar",
      terminologyCatalog: seedUmtubaOfficialTerminologyCatalog(),
      generator: createTransportBackedProfessionalGenerator(transport),
      reviewer: createTransportBackedProfessionalReviewer(transport),
    });
    expect(twoPass.candidateText.length).toBeGreaterThan(0);
    expect(twoPass.report).toBeTruthy();
    expect(twoPass.authority.generatorCanApprove).toBe(false);
    expect(twoPass.authority.reviewerCanPublish).toBe(false);
  });

  it("legacy platform.translation_suggest remains backwards-compatible", async () => {
    const result = await runCapability(
      {
        capabilityId: "platform.translation_suggest",
        input: { text: "Hello", notes: "targetLanguage=ar" },
        context: {
          productDomain: "platform",
          surface: "test.suggest",
          locale: "ar",
        },
      },
      { supabase: {} as never, userId: TEST_USER, forceStub: true }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(typeof result.data.result.candidateText).toBe("string");
    expect(typeof result.data.result.confidence).toBe("number");
  });

  it("sensitive Refund forces HUMAN_REVIEW; provider cannot override", async () => {
    const out = await runProfessionalTranslationReview({
      sourceText: "Refund",
      targetText: "استرداد",
      targetLocale: "ar",
      domainHint: "commerce",
      terminologyCatalog: seedUmtubaOfficialTerminologyCatalog(),
      reviewer: createHeuristicProfessionalReviewer(),
    });
    expect(out.recommendation).toBe("HUMAN_REVIEW");
    expect(out.report.humanReviewReasons?.length).toBeGreaterThan(0);
    expect(PROFESSIONAL_AI_AUTHORITY.reviewerCanApprove).toBe(false);
  });

  it("malformed / partial / unknown dimension / forbidden fields fail closed", () => {
    expect(parseStrictProfessionalReviewResult({}).ok).toBe(false);
    expect(
      parseStrictProfessionalReviewResult({
        schemaVersion: 1,
        provider: { providerId: "x", modelId: "y" },
        dimensionScores: { not_a_real_dimension: 90 },
        findings: [],
      }).ok
    ).toBe(false);
    expect(
      parseStrictProfessionalReviewResult({
        schemaVersion: 1,
        provider: { providerId: "x", modelId: "y" },
        dimensionScores: { semantic_accuracy: 90 },
        findings: [],
      }).ok
    ).toBe(false); // partial set
    expect(
      parseStrictProfessionalReviewResult({
        schemaVersion: 1,
        provider: { providerId: "x", modelId: "y" },
        dimensionScores: {
          semantic_accuracy: 150,
          terminology_compliance: 90,
          contextual_fit: 90,
          fluency_naturalness: 90,
          ui_conciseness: 90,
          consistency: 90,
          grammar_spelling: 90,
          locale_conventions: 90,
          placeholder_integrity: 90,
          formatting_integrity: 90,
        },
        findings: [],
      }).ok
    ).toBe(false);
    expect(
      parseStrictProfessionalGeneratorOutput({
        candidateText: "x",
        provider: { providerId: "x", modelId: "y" },
        publish: true,
      }).ok
    ).toBe(false);
  });

  it("readiness, phases, cost/privacy preflight, acceptance bars", () => {
    const ready = assessLiveProfessionalProviderReadiness();
    expect(ready.overall).toBe("LIVE_PROVIDER_NOT_CONFIGURED");
    expect(ready.activated).toBe(false);
    expect(ready.secretsExposed).toBe(false);

    expect(LIVE_BENCHMARK_PHASES.map((p) => p.id)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
    expect(PHASE_A_SMOKE_CASE_IDS.length).toBe(5);

    const matrix = defaultOfflineBenchmarkMatrix();
    const cost = calculateBenchmarkCostPreflight({
      phase: LIVE_BENCHMARK_PHASES[0]!,
      matrixSlots: matrix,
      caseCount: 5,
    });
    expect(cost.requiresExplicitGo).toBe(true);
    expect(cost.totalCallCeiling).toBeGreaterThan(0);

    const privacy = validateBenchmarkCorpusPrivacy();
    expect(privacy.ok).toBe(true);

    expect(STRUCTURED_RELIABILITY_THRESHOLDS.maxMalformedRate).toBe(0.02);
    expect(ARABIC_ACCEPTANCE_BAR.minSemanticScore).toBeGreaterThanOrEqual(85);
    expect(MULTILINGUAL_ACCEPTANCE_FLOOR.fr.minOverall).toBe(80);
    expect(LIVE_FAILURE_RETRY_POLICY.noSilentHeuristicReplacementDuringLiveBenchmark).toBe(
      true
    );

    const blind = createBlindHumanReviewArtifact({
      caseId: "appshell_back",
      locale: "ar",
      sourceText: "Back",
      context: "nav",
      glossaryExpectations: [],
      candidateText: "رجوع",
      automatedRecommendation: "PASS",
      automatedOverallScore: 92,
      majorFindings: [],
      matrixSlotId: "G1_R1",
      generatorLabel: "openai/x",
      reviewerLabel: "anthropic/y",
      blind: true,
    });
    expect(blind.blindId).toBeTruthy();
    expect(JSON.stringify(blind)).not.toMatch(/api[_-]?key/i);
  });

  it("matrix resolves server-side slots and call guardrails", () => {
    const matrix = buildProfessionalBenchmarkMatrix({
      candidates: [
        { providerId: "openai", modelId: "gen-model", role: "generator" },
        { providerId: "anthropic", modelId: "rev-model", role: "reviewer" },
      ],
    });
    expect(matrix[0]?.independent).toBe(true);
    const phaseB = LIVE_BENCHMARK_PHASES.find((p) => p.id === "B")!;
    const pre = calculateBenchmarkCostPreflight({
      phase: phaseB,
      matrixSlots: matrix,
    });
    expect(pre.generatorCalls).toBe(pre.caseCount * matrix.length);
  });

  it("config missing / invalid roles report NOT_CONFIGURED or INVALID; no secrets", () => {
    const missing = assessLiveProfessionalProviderReadiness({
      schemaVersion: 1,
      generator: { providerId: "unset", modelId: "" },
      reviewer: { providerId: "unset", modelId: "" },
      sensitiveReviewer: { providerId: "unset", modelId: "" },
      timeouts: {
        generationTimeoutMs: 20_000,
        reviewTimeoutMs: 20_000,
        generationMaxRetries: 1,
        reviewMaxRetries: 1,
      },
      preferIndependentReviewer: true,
      selectionGoals: [],
    });
    expect(missing.generator.state).toBe("NOT_CONFIGURED");
    expect(missing.reviewer.state).toBe("NOT_CONFIGURED");
    expect(missing.overall).toBe("LIVE_PROVIDER_NOT_CONFIGURED");
    expect(JSON.stringify(missing)).not.toMatch(/sk-|api[_-]?key\s*[:=]/i);

    const invalid = assessLiveProfessionalProviderReadiness({
      schemaVersion: 1,
      generator: { providerId: "openai", modelId: "gpt-test" },
      reviewer: { providerId: "anthropic", modelId: "claude-test" },
      sensitiveReviewer: { providerId: "unset", modelId: "" },
      timeouts: {
        generationTimeoutMs: 20_000,
        reviewTimeoutMs: 20_000,
        generationMaxRetries: 1,
        reviewMaxRetries: 1,
      },
      preferIndependentReviewer: true,
      selectionGoals: [],
    });
    // Without live credentials / live mode: not READY overall
    expect(invalid.overall).not.toBe("LIVE_BENCHMARK_READY");
    expect(invalid.activated).toBe(false);
  });

  it("benchmark runner stays non-mutating", async () => {
    const { runProfessionalProviderBenchmark } = await import("./index");
    const report = await runProfessionalProviderBenchmark({
      locales: ["ar"],
      guardrails: { maxCases: 3, maxProviderCalls: 10 },
    });
    expect(report.mutatedStudio).toBe(false);
  });
});
