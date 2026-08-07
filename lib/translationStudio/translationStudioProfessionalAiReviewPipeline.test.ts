import { describe, expect, it } from "vitest";
import {
  PROFESSIONAL_AI_AUTHORITY,
  buildProfessionalReviewCacheKey,
  buildProfessionalReviewerPromptPayload,
  buildProfessionalTranslationRequestContext,
  createFailClosedStubGenerator,
  createHeuristicProfessionalReviewer,
  createScriptedProfessionalAiTransport,
  createTransportBackedProfessionalGenerator,
  createTransportBackedProfessionalReviewer,
  createUnavailableProfessionalAiTransport,
  evaluateSuggestedRevision,
  generateProfessionalTranslationCandidate,
  getLocaleStyleGuide,
  getStyleGuideLocaleFromReviewerPayload,
  parseStrictProfessionalGeneratorOutput,
  parseStrictProfessionalReviewResult,
  runProfessionalGenerateAndReview,
  runProfessionalTranslationReview,
  seedUmtubaOfficialTerminologyCatalog,
  createTranslationStudioWorkflow,
  buildProfessionalSuggestionQuality,
} from "./index";

const catalog = seedUmtubaOfficialTerminologyCatalog();

function cleanReviewerJson(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    dimensionScores: {
      semantic_accuracy: 95,
      terminology_compliance: 100,
      contextual_fit: 92,
      fluency_naturalness: 93,
      ui_conciseness: 94,
      consistency: 92,
      grammar_spelling: 95,
      locale_conventions: 92,
    },
    findings: [],
    confidence: 0.6,
    provider: { providerId: "test", modelId: "review-v1" },
    ...overrides,
  };
}

describe("professional AI review pipeline", () => {
  it("clean professional translation → PASS", async () => {
    const transport = createScriptedProfessionalAiTransport({
      reviewer: cleanReviewerJson(),
    });
    const reviewer = createTransportBackedProfessionalReviewer(transport);
    const result = await runProfessionalTranslationReview({
      sourceText: "Back",
      targetText: "رجوع",
      targetLocale: "ar",
      sourceLocale: "en",
      terminologyCatalog: catalog,
      reviewer,
    });
    expect(result.availability.available).toBe(true);
    expect(result.recommendation).toBe("PASS");
    expect(result.authority.reviewerCanPublish).toBe(false);
    expect(result.report.overallScore).toBeGreaterThanOrEqual(90);
  });

  it("semantic issue → HUMAN_REVIEW or BLOCK", async () => {
    const transport = createScriptedProfessionalAiTransport({
      reviewer: cleanReviewerJson({
        dimensionScores: {
          semantic_accuracy: 40,
          terminology_compliance: 100,
          contextual_fit: 80,
          fluency_naturalness: 80,
          ui_conciseness: 80,
          consistency: 80,
          grammar_spelling: 80,
          locale_conventions: 80,
        },
        findings: [
          {
            severity: "error",
            dimension: "semantic_accuracy",
            message: "Meaning drift",
          },
        ],
      }),
    });
    const result = await runProfessionalTranslationReview({
      sourceText: "Cancel",
      targetText: "حفظ",
      targetLocale: "ar",
      reviewer: createTransportBackedProfessionalReviewer(transport),
      terminologyCatalog: catalog,
    });
    expect(["HUMAN_REVIEW", "BLOCK"]).toContain(result.recommendation);
  });

  it("glossary violation and placeholder blocker cannot be overridden by AI", async () => {
    const transport = createScriptedProfessionalAiTransport({
      reviewer: cleanReviewerJson({
        dimensionScores: {
          semantic_accuracy: 100,
          terminology_compliance: 100,
          placeholder_integrity: 100,
          formatting_integrity: 100,
          contextual_fit: 100,
          fluency_naturalness: 100,
          ui_conciseness: 100,
          consistency: 100,
          grammar_spelling: 100,
          locale_conventions: 100,
        },
        confidence: 0.99,
      }),
    });
    const glossary = await runProfessionalTranslationReview({
      sourceText: "Open Dashboard",
      targetText: "افتح الداشبورد",
      targetLocale: "ar",
      domainHint: "admin",
      terminologyCatalog: catalog,
      reviewer: createTransportBackedProfessionalReviewer(transport),
    });
    expect(glossary.recommendation).toBe("BLOCK");
    expect(
      glossary.deterministicScore.findings.some(
        (f) => f.code === "forbidden_glossary_alternative"
      )
    ).toBe(true);

    const placeholder = await runProfessionalTranslationReview({
      sourceText: "Hello {name}",
      targetText: "مرحبا",
      targetLocale: "ar",
      terminologyCatalog: catalog,
      reviewer: createTransportBackedProfessionalReviewer(transport),
    });
    expect(placeholder.recommendation).toBe("BLOCK");
    expect(
      placeholder.mergedScore.dimensions.find(
        (d) => d.dimension === "placeholder_integrity"
      )?.score
    ).toBe(0);
  });

  it("Arabic literal flagged; natural Arabic accepted", async () => {
    const reviewer = createHeuristicProfessionalReviewer();
    const literal = await runProfessionalTranslationReview({
      sourceText: "Click here for refund",
      targetText: "من فضلك انقر هنا للريفند",
      targetLocale: "ar",
      domainHint: "commerce",
      terminologyCatalog: catalog,
      reviewer,
    });
    expect(
      literal.report.reviewerFindings.some((f) =>
        /literal|calqued/i.test(f.message)
      )
    ).toBe(true);

    const natural = await runProfessionalTranslationReview({
      sourceText: "Back",
      targetText: "رجوع",
      targetLocale: "ar",
      terminologyCatalog: catalog,
      reviewer,
    });
    expect(natural.recommendation).not.toBe("BLOCK");
    expect(
      natural.report.reviewerFindings.some((f) =>
        /literal|calqued/i.test(f.message)
      )
    ).toBe(false);
  });

  it("commerce-sensitive copy forces human review", async () => {
    const result = await runProfessionalTranslationReview({
      sourceText: "Request a refund now",
      targetText: "اطلب استرداد الآن",
      targetLocale: "ar",
      domainHint: "commerce",
      terminologyCatalog: catalog,
      reviewer: createHeuristicProfessionalReviewer(),
    });
    expect(result.recommendation).toBe("HUMAN_REVIEW");
    expect(result.report.humanReviewReasons?.length).toBeGreaterThan(0);
  });

  it("learning-context handling surfaces pedagogical note", async () => {
    const result = await runProfessionalTranslationReview({
      sourceText: "Course",
      targetText: "دورة",
      targetLocale: "ar",
      domainHint: "learning",
      terminologyCatalog: catalog,
      reviewer: createHeuristicProfessionalReviewer(),
    });
    expect(result.report.contextPackId).toBe("learning");
    expect(
      result.report.reviewerFindings.some((f) =>
        /pedagogical|Learning/i.test(f.message)
      )
    ).toBe(true);
  });

  it("malformed JSON / invalid score / authority fields fail closed", async () => {
    expect(parseStrictProfessionalReviewResult("nope").ok).toBe(false);
    expect(
      parseStrictProfessionalReviewResult({
        provider: { providerId: "x", modelId: "y" },
        dimensionScores: { semantic_accuracy: 200 },
      }).ok
    ).toBe(false);
    expect(
      parseStrictProfessionalReviewResult({
        provider: { providerId: "x", modelId: "y" },
        approve: true,
        dimensionScores: { semantic_accuracy: 90 },
      }).ok
    ).toBe(false);
    expect(
      parseStrictProfessionalReviewResult({
        provider: { providerId: "x", modelId: "y" },
        chainOfThought: "secret reasoning",
        dimensionScores: { semantic_accuracy: 90 },
      }).ok
    ).toBe(false);
    expect(PROFESSIONAL_AI_AUTHORITY.reviewerCanPublish).toBe(false);
    expect(PROFESSIONAL_AI_AUTHORITY.generatorCanApprove).toBe(false);
  });

  it("suggested revision re-QA rejects blockers", () => {
    const context = buildProfessionalTranslationRequestContext({
      targetLocale: "ar",
      sourceText: "Hello {name}",
      terminologyCatalog: catalog,
    });
    const rejected = evaluateSuggestedRevision({
      context,
      suggestedRevision: "مرحبا بدون متغير",
    });
    expect(rejected.accepted).toBe(false);
    expect(rejected.suggestedRevision).toBeNull();

    const ok = evaluateSuggestedRevision({
      context,
      suggestedRevision: "مرحبا {name}",
    });
    expect(ok.accepted).toBe(true);
  });

  it("provider timeout fails closed without mutating draft semantics", async () => {
    const transport = createScriptedProfessionalAiTransport({
      delayMs: 50,
      failWith: {
        code: "provider_timeout",
        message: "timeout",
      },
    });
    // Force timeout by zero timeout via bounded transport wrapping — use unavailable path
    const unavailable = createUnavailableProfessionalAiTransport();
    const reviewer = createTransportBackedProfessionalReviewer(unavailable);
    const result = await runProfessionalTranslationReview({
      sourceText: "Back",
      targetText: "رجوع",
      targetLocale: "ar",
      terminologyCatalog: catalog,
      reviewer,
    });
    expect(result.availability.available).toBe(false);
    if (result.availability.available) return;
    expect(result.availability.status).toBe("PROFESSIONAL_REVIEW_UNAVAILABLE");
    expect(["HUMAN_REVIEW", "BLOCK"]).toContain(result.recommendation);

    // Also exercise timeout script path
    const timed = createScriptedProfessionalAiTransport({
      reviewer: cleanReviewerJson(),
      delayMs: 30,
    });
    const bounded = createTransportBackedProfessionalReviewer({
      kind: "scripted",
      completeJson: (req) =>
        timed.completeJson({ ...req, timeoutMs: 1, maxRetries: 0 }),
    });
    const timeoutResult = await runProfessionalTranslationReview({
      sourceText: "Back",
      targetText: "رجوع",
      targetLocale: "ar",
      terminologyCatalog: catalog,
      reviewer: bounded,
    });
    expect(timeoutResult.availability.available).toBe(false);
  });

  it("locale-specific style guides appear in reviewer context (fr/es/de/pt)", () => {
    for (const locale of ["fr", "es", "de", "pt"] as const) {
      const context = buildProfessionalTranslationRequestContext({
        targetLocale: locale,
        sourceText: "Cancel",
        terminologyCatalog: catalog,
      });
      expect(context.styleGuide.locale).toBe(locale);
      expect(getLocaleStyleGuide(locale).locale).toBe(locale);
      const payload = buildProfessionalReviewerPromptPayload({
        context,
        targetText: "x",
        deterministicFindings: [],
      });
      expect(getStyleGuideLocaleFromReviewerPayload(payload)).toBe(locale);
      expect(
        (payload.user.styleGuide as { sentenceStyle: string }).sentenceStyle
          .length
      ).toBeGreaterThan(10);
    }
  });

  it("independent generator/reviewer + two-pass orchestrator", async () => {
    const genTransport = createScriptedProfessionalAiTransport({
      generator: {
        candidateText: "إلغاء",
        confidence: 0.5,
        provider: { providerId: "gen-provider", modelId: "gen-model" },
      },
    });
    const revTransport = createScriptedProfessionalAiTransport({
      reviewer: cleanReviewerJson({
        provider: { providerId: "rev-provider", modelId: "rev-model" },
      }),
    });
    const generator = createTransportBackedProfessionalGenerator(genTransport);
    const reviewer = createTransportBackedProfessionalReviewer(revTransport);
    expect(generator.kind).toBe("professional_generator");
    expect(reviewer.kind).toBe("professional_reviewer");

    const result = await runProfessionalGenerateAndReview({
      sourceText: "Cancel",
      targetLocale: "ar",
      terminologyCatalog: catalog,
      generator,
      reviewer,
    });
    expect(result.candidateText).toBe("إلغاء");
    expect(result.report).toBeTruthy();
    expect(result.authority.generatorCanApprove).toBe(false);
    expect(result.observation.providerId).toContain("gen-provider");
    expect(result.observation.providerId).toContain("rev-provider");
  });

  it("deterministic cache key changes with content/profile", () => {
    const a = buildProfessionalReviewCacheKey({
      sourceText: "Back",
      targetText: "رجوع",
      sourceLocale: "en",
      targetLocale: "ar",
      profileId: "standard_ui",
    });
    const b = buildProfessionalReviewCacheKey({
      sourceText: "Back",
      targetText: "رجوع ",
      sourceLocale: "en",
      targetLocale: "ar",
      profileId: "standard_ui",
    });
    const c = buildProfessionalReviewCacheKey({
      sourceText: "Back",
      targetText: "رجوع",
      sourceLocale: "en",
      targetLocale: "ar",
      profileId: "commerce_sensitive",
    });
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });

  it("suggestion metadata tag + workflow createProfessionalCandidateSuggestion", () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const snap = wf.getSnapshot();
    const value = snap.values.find((v) => v.language === "ar");
    expect(value).toBeTruthy();
    const quality = buildProfessionalSuggestionQuality({
      base: {
        confidence: 0.5,
        reusedFromMemory: false,
        terminologyHits: [],
        terminologyConflicts: [],
        providerVia: "stub",
        notes: "professional_quality_v1",
      },
      report: {
        schemaVersion: 1,
        keyStableId: value!.keyId,
        locale: "ar",
        contextPackId: "global",
        overallScore: 91,
        dimensionScores: [],
        deterministicFindings: [],
        reviewerFindings: [],
        glossaryCompliance: {
          applicableTerms: 0,
          blockingGlossaryFindings: 0,
        },
        recommendation: "PASS",
      },
      observation: {
        schemaVersion: 1,
        role: "generator",
        providerId: "stub",
        modelId: "stub-v1",
        profileId: "standard_ui",
        locale: "ar",
        durationMs: 1,
        success: true,
        overallScore: 91,
        findingCounts: {
          total: 0,
          blocking: 0,
          error: 0,
          warning: 0,
          info: 0,
        },
        recommendation: "PASS",
      },
    });
    expect(quality.professionalQuality?.tag).toBe("professional_quality_v1");
    const suggestion = wf.createProfessionalCandidateSuggestion({
      valueId: value!.id,
      actor: { userId: "test-admin" },
      candidateText: "رجوع",
      quality,
    });
    expect(suggestion.status).toBe("pending_review");
    expect(suggestion.quality.professionalQuality?.tag).toBe(
      "professional_quality_v1"
    );
    const updated = wf.getValue(value!.id);
    // Professional suggestion must NOT replace current translation or change status
    expect(updated?.value).toBe(value!.value);
    expect(updated?.status).toBe(value!.status);
    expect(suggestion.status).toBe("pending_review");
  });

  it("generator pipeline cannot approve; no secrets in observation", async () => {
    const generated = await generateProfessionalTranslationCandidate({
      sourceText: "Workspace",
      targetLocale: "ar",
      domainHint: "collaboration",
      terminologyCatalog: catalog,
      generator: createFailClosedStubGenerator(),
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;
    expect(generated.authority.generatorCanApprove).toBe(false);
    const blob = JSON.stringify(generated.observation);
    expect(blob).not.toMatch(/api[_-]?key/i);
    expect(blob).not.toMatch(/Bearer /);
    expect(parseStrictProfessionalGeneratorOutput({ approve: true }).ok).toBe(
      false
    );
  });

  it("existing Studio save/review workflow still works", () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const value = wf.getSnapshot().values.find((v) => v.language === "ar")!;
    const draft = wf.saveDraft({
      valueId: value.id,
      text: "مسودة",
      actor: { userId: "u1" },
    });
    expect(draft.status).toBe("draft");
    const submitted = wf.submitForReview({
      valueId: value.id,
      actor: { userId: "u1" },
    });
    expect(submitted.status).toBe("needs_review");
  });
});
