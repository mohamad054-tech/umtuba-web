import { describe, expect, it } from "vitest";
import { resolvePrompt, validateStructuredAgainstPrompt } from "../ai/prompts/registry";
import {
  TRANSLATION_QUALITY_DIMENSIONS,
  PROFESSIONAL_REVIEW_REQUIRED_DIMENSIONS,
  buildProfessionalReviewerPromptPayload,
  buildProfessionalTranslationRequestContext,
  parseStrictProfessionalReviewResult,
  prepareSmallSmokeExecution,
  runProfessionalTranslationReview,
  runSmallSmokePhase,
  createAiServiceProfessionalTransport,
  createHeuristicProfessionalReviewer,
  seedUmtubaOfficialTerminologyCatalog,
  type LiveProfessionalProviderReadinessReport,
} from "./index";

const ALL_SCORES = Object.fromEntries(
  TRANSLATION_QUALITY_DIMENSIONS.map((d) => [d, 92])
) as Record<(typeof TRANSLATION_QUALITY_DIMENSIONS)[number], number>;

function scoresWithoutPlaceholderIntegrity() {
  const scores = { ...ALL_SCORES };
  delete (scores as { placeholder_integrity?: number }).placeholder_integrity;
  return scores;
}

function readyReadiness(): LiveProfessionalProviderReadinessReport {
  const prep = prepareSmallSmokeExecution();
  return {
    ...prep.readiness,
    overall: "LIVE_BENCHMARK_READY",
    state: "LIVE_PROVIDER_READY",
    generator: { ...prep.readiness.generator, state: "READY", provider: "openai" },
    reviewer: { ...prep.readiness.reviewer, state: "READY", provider: "openai" },
    sensitiveReviewer: {
      ...prep.readiness.sensitiveReviewer,
      state: "OPTIONAL",
      provider: "unset",
    },
  };
}

describe("professional review schema alignment V1", () => {
  it("authoritative dimensions require placeholder_integrity and formatting_integrity", () => {
    expect(TRANSLATION_QUALITY_DIMENSIONS).toContain("placeholder_integrity");
    expect(TRANSLATION_QUALITY_DIMENSIONS).toContain("formatting_integrity");
    expect([...PROFESSIONAL_REVIEW_REQUIRED_DIMENSIONS]).toEqual([
      ...TRANSLATION_QUALITY_DIMENSIONS,
    ]);
  });

  it("provider-facing evaluateDimensions lists the full authoritative set", () => {
    const context = buildProfessionalTranslationRequestContext({
      sourceText: "Back",
      targetLocale: "ar",
      terminologyCatalog: seedUmtubaOfficialTerminologyCatalog(),
    });
    const payload = buildProfessionalReviewerPromptPayload({
      context,
      targetText: "رجوع",
      deterministicFindings: [],
    });
    expect(payload.user.evaluateDimensions).toEqual([
      ...TRANSLATION_QUALITY_DIMENSIONS,
    ]);
    expect(payload.user.evaluateDimensions).toContain("placeholder_integrity");
    expect(payload.user.evaluateDimensions).toContain("formatting_integrity");
    expect(String(payload.system)).toMatch(/placeholder_integrity/);
    const rules = payload.user.dimensionScoreRules as {
      placeholder_integrity: string;
      allKeysRequired: boolean;
    };
    expect(rules.allKeysRequired).toBe(true);
    expect(rules.placeholder_integrity).toMatch(/Always required/i);
  });

  it("strict parser rejects JSON missing dimensionScores.placeholder_integrity", () => {
    const parsed = parseStrictProfessionalReviewResult({
      schemaVersion: 1,
      dimensionScores: scoresWithoutPlaceholderIntegrity(),
      findings: [],
      provider: { providerId: "openai", modelId: "gpt-4o-mini" },
    });
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toBe(
      "missing required dimension score: placeholder_integrity"
    );
  });

  it("complete reviewer JSON with all dimensions parses successfully", () => {
    const parsed = parseStrictProfessionalReviewResult({
      schemaVersion: 1,
      dimensionScores: ALL_SCORES,
      findings: [
        {
          severity: "info",
          dimension: "placeholder_integrity",
          message: "No placeholders present; integrity intact.",
        },
      ],
      provider: { providerId: "openai", modelId: "gpt-4o-mini" },
    });
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.dimensionScores.placeholder_integrity).toBe(92);
    expect(parsed.value.dimensionScores.formatting_integrity).toBe(92);
  });

  it("AI Core professional review prompt/schema requires placeholder_integrity", () => {
    const prompt = resolvePrompt({
      promptId: "platform.translation_professional_review",
    });
    expect(prompt.version).toBe("1.0.1");
    expect(prompt.systemInstructions).toMatch(/placeholder_integrity/);
    expect(prompt.systemInstructions).toMatch(/formatting_integrity/);
    expect(prompt.systemInstructions).toMatch(
      /dimensionScores MUST include ALL of these keys/i
    );

    expect(
      validateStructuredAgainstPrompt(prompt, {
        schemaVersion: 1,
        dimensionScores: scoresWithoutPlaceholderIntegrity(),
        findings: [],
        provider: { providerId: "openai", modelId: "gpt-4o-mini" },
      }).ok
    ).toBe(false);

    expect(
      validateStructuredAgainstPrompt(prompt, {
        schemaVersion: 1,
        dimensionScores: ALL_SCORES,
        findings: [],
        provider: { providerId: "openai", modelId: "gpt-4o-mini" },
      }).ok
    ).toBe(true);
  });

  it("placeholder and non-placeholder cases evaluate correctly under live-shaped smoke", async () => {
    const transport = createAiServiceProfessionalTransport({
      providerId: "openai",
      generatorModelId: "gpt-4o-mini",
      reviewerModelId: "gpt-4o-mini",
      runCapability: async (req) => {
        if (req.capabilityId === "platform.translation_professional_generate") {
          let sourceText = "Back";
          try {
            const parsed = JSON.parse(req.input.text ?? "{}") as {
              sourceText?: string;
            };
            if (typeof parsed.sourceText === "string") sourceText = parsed.sourceText;
          } catch {
            // keep default
          }
          const map: Record<string, string> = {
            Back: "رجوع",
            Cancel: "إلغاء",
            Workspace: "مساحة العمل",
            Refund: "استرداد",
            "Hello {name}": "Bonjour {name}",
          };
          return {
            ok: true as const,
            data: {
              result: {
                schemaVersion: 1,
                candidateText: map[sourceText] ?? sourceText,
                provider: { providerId: "openai", modelId: "gpt-4o-mini" },
              },
              runId: "g",
            },
          };
        }
        return {
          ok: true as const,
          data: {
            result: {
              schemaVersion: 1,
              dimensionScores: ALL_SCORES,
              findings: [],
              provider: { providerId: "openai", modelId: "gpt-4o-mini" },
            },
            runId: "r",
          },
        };
      },
    });

    const report = await runSmallSmokePhase({
      explicitGo: true,
      forceOffline: false,
      readinessOverride: readyReadiness(),
      liveTransport: transport,
      maxCalls: 10,
    });

    expect(report.cases).toHaveLength(5);
    expect(report.mutatedStudio).toBe(false);
    const ph = report.cases.find((c) => c.caseId === "ph_hello_name")!;
    expect(ph.placeholderIntact).toBe(true);
    expect(ph.structuredReviewValid).toBe(true);
    const nonPh = report.cases.find((c) => c.caseId === "appshell_back")!;
    expect(nonPh.placeholderIntact).toBeNull();
    expect(nonPh.structuredReviewValid).toBe(true);
    const refund = report.cases.find((c) => c.caseId === "commerce_refund")!;
    expect(refund.recommendation).toBe("HUMAN_REVIEW");
    expect(refund.humanReviewEnforced).toBe(true);
  });

  it("commerce_refund uses heuristic_sensitive when sensitive readiness is READY", async () => {
    let liveReviewCalls = 0;
    const transport = createAiServiceProfessionalTransport({
      providerId: "openai",
      generatorModelId: "gpt-4o-mini",
      reviewerModelId: "gpt-4o-mini",
      runCapability: async (req) => {
        if (req.capabilityId === "platform.translation_professional_review") {
          liveReviewCalls += 1;
          // Intentionally incomplete to prove refund does not use live reviewer.
          return {
            ok: true as const,
            data: {
              result: {
                schemaVersion: 1,
                dimensionScores: scoresWithoutPlaceholderIntegrity(),
                findings: [],
                provider: { providerId: "openai", modelId: "gpt-4o-mini" },
              },
              runId: "bad-live-rev",
            },
          };
        }
        return {
          ok: true as const,
          data: {
            result: {
              schemaVersion: 1,
              candidateText: "استرداد",
              provider: { providerId: "openai", modelId: "gpt-4o-mini" },
            },
            runId: "g",
          },
        };
      },
    });

    const prep = prepareSmallSmokeExecution();
    const readiness: LiveProfessionalProviderReadinessReport = {
      ...readyReadiness(),
      sensitiveReviewer: {
        ...prep.readiness.sensitiveReviewer,
        state: "READY",
        provider: "openai",
      },
    };

    const report = await runSmallSmokePhase({
      explicitGo: true,
      forceOffline: false,
      readinessOverride: readiness,
      liveTransport: transport,
      maxCalls: 10,
    });

    const refund = report.cases.find((c) => c.caseId === "commerce_refund")!;
    expect(refund.sensitiveReviewerUsed).toBe(true);
    expect(refund.structuredReviewValid).toBe(true);
    expect(refund.recommendation).toBe("HUMAN_REVIEW");
    expect(refund.humanReviewEnforced).toBe(true);
    // Four non-sensitive cases hit live reviewer (incomplete schema); refund does not.
    expect(liveReviewCalls).toBe(4);
    expect(refund.reviewerFailureDiagnostics).toBeUndefined();
  });

  it("heuristic sensitive reviewer itself remains structurally valid", async () => {
    const out = await runProfessionalTranslationReview({
      sourceText: "Refund",
      targetText: "استرداد",
      targetLocale: "ar",
      domainHint: "commerce",
      terminologyCatalog: seedUmtubaOfficialTerminologyCatalog(),
      reviewer: createHeuristicProfessionalReviewer({
        providerId: "heuristic",
        modelId: "heuristic-sensitive-reviewer-v1",
      }),
    });
    expect(out.availability.available).toBe(true);
    expect(out.recommendation).toBe("HUMAN_REVIEW");
    expect(out.report.dimensionScores.some((d) => d.dimension === "placeholder_integrity")).toBe(
      true
    );
  });
});
