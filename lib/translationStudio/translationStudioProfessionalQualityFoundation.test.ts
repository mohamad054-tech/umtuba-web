import { describe, expect, it } from "vitest";
import {
  PROFESSIONAL_AI_AUTHORITY,
  PROFESSIONAL_QUALITY_PROFILES,
  buildProfessionalTranslationRequestContext,
  createFailClosedStubGenerator,
  createFailClosedStubReviewer,
  evaluateProfessionalTranslationDraft,
  evaluateQualityGate,
  findApplicableTerminology,
  getLocaleStyleGuide,
  parseProfessionalTranslationGeneratorOutput,
  parseProfessionalTranslationReviewResult,
  rankMemoryCandidates,
  requiresHumanReview,
  resolveContextPack,
  runDeterministicTranslationQa,
  runTwoPassProfessionalWorkflow,
  seedUmtubaOfficialTerminologyCatalog,
  sourceFingerprint,
  type OfficialTerminologyEntry,
} from "./index";

const catalog = seedUmtubaOfficialTerminologyCatalog();

describe("professional terminology policy", () => {
  it("finds approved terms and respects scope precedence", () => {
    const commerce = findApplicableTerminology(catalog, "Issue a Refund", "commerce");
    expect(commerce.some((t) => t.sourceTerm === "Refund")).toBe(true);
    const learning = findApplicableTerminology(catalog, "Issue a Refund", "learning");
    // Refund scoped to commerce — not learning-only list unless global
    expect(learning.some((t) => t.sourceTerm === "Refund")).toBe(false);
    const brand = findApplicableTerminology(catalog, "Welcome to UMTUBA", "global");
    expect(brand[0]?.doNotTranslate).toBe(true);
  });

  it("flags forbidden alternatives and do-not-translate alterations", () => {
    const terms = findApplicableTerminology(catalog, "Open Dashboard", "admin");
    const score = runDeterministicTranslationQa({
      sourceText: "Open Dashboard",
      targetText: "افتح الداشبورد",
      sourceLocale: "en",
      targetLocale: "ar",
      glossaryTerms: terms,
      styleGuide: getLocaleStyleGuide("ar"),
    });
    expect(
      score.findings.some((f) => f.code === "forbidden_glossary_alternative")
    ).toBe(true);
    expect(score.findings.some((f) => f.severity === "blocking")).toBe(true);

    const brandTerms = findApplicableTerminology(catalog, "UMTUBA Admin", "admin");
    const altered = runDeterministicTranslationQa({
      sourceText: "UMTUBA Admin",
      targetText: "امتوبا المسؤول",
      sourceLocale: "en",
      targetLocale: "ar",
      glossaryTerms: brandTerms,
    });
    expect(
      altered.findings.some((f) => f.code === "do_not_translate_altered")
    ).toBe(true);
  });
});

describe("style guides + context packs", () => {
  it("resolves locale style guides including Arabic professional rules", () => {
    const ar = getLocaleStyleGuide("ar");
    expect(ar.tone).toBe("concise_ui");
    expect(ar.localeNotes.some((n) => /Modern Standard|calques|transliteration|brand/i.test(n + ar.sentenceStyle + ar.productNameHandling))).toBe(true);
    expect(getLocaleStyleGuide("fr").locale).toBe("fr");
  });

  it("context pack precedence: key > domain > global", () => {
    expect(resolveContextPack({ keyContextPackId: "commerce" }).id).toBe(
      "commerce"
    );
    expect(
      resolveContextPack({ domainHint: "learning course" }).id
    ).toBe("learning");
    expect(resolveContextPack({}).id).toBe("global");
  });
});

describe("deterministic QA", () => {
  it("runs Arabic-specific safe checks without flagging normal brand code-switch", () => {
    const brandOk = runDeterministicTranslationQa({
      sourceText: "Welcome to UMTUBA",
      targetText: "مرحباً بك في UMTUBA",
      sourceLocale: "en",
      targetLocale: "ar",
      glossaryTerms: findApplicableTerminology(
        catalog,
        "Welcome to UMTUBA",
        "global"
      ),
    });
    expect(
      brandOk.findings.some((f) => f.code === "do_not_translate_altered")
    ).toBe(false);
    expect(
      brandOk.findings.some((f) => f.code === "arabic_untranslated_token")
    ).toBe(false);

    const punct = runDeterministicTranslationQa({
      sourceText: "Hello",
      targetText: "مرحبا,,",
      sourceLocale: "en",
      targetLocale: "ar",
    });
    // Punctuation duplication / LTR anomaly may warn; never blocks solely for code-switch
    expect(punct.findings.every((f) => f.severity !== "blocking" || f.code.includes("placeholder"))).toBe(true);
  });

  it("placeholder loss is blocking; preservation passes integrity", () => {
    const missing = runDeterministicTranslationQa({
      sourceText: "Hello {name}",
      targetText: "مرحبا",
      sourceLocale: "en",
      targetLocale: "ar",
    });
    expect(
      missing.findings.some((f) => f.code === "placeholder_missing")
    ).toBe(true);
    expect(
      missing.dimensions.find((d) => d.dimension === "placeholder_integrity")
        ?.score
    ).toBe(0);

    const ok = runDeterministicTranslationQa({
      sourceText: "Hello {name}",
      targetText: "مرحبا {name}",
      sourceLocale: "en",
      targetLocale: "ar",
    });
    expect(
      ok.dimensions.find((d) => d.dimension === "placeholder_integrity")?.score
    ).toBe(100);
  });

  it("detects whitespace, source-copy, and UI length warning", () => {
    const ws = runDeterministicTranslationQa({
      sourceText: "Back",
      targetText: " رجوع ",
      sourceLocale: "en",
      targetLocale: "ar",
    });
    expect(
      ws.findings.some((f) => f.code === "whitespace_leading_trailing")
    ).toBe(true);

    const copy = runDeterministicTranslationQa({
      sourceText: "Cancel",
      targetText: "Cancel",
      sourceLocale: "en",
      targetLocale: "ar",
    });
    expect(copy.findings.some((f) => f.code === "source_copy")).toBe(true);

    const long = runDeterministicTranslationQa({
      sourceText: "OK",
      targetText: "هذا نص طويل جداً جداً جداً جداً جداً جداً جداً جداً جداً جداً جداً",
      sourceLocale: "en",
      targetLocale: "ar",
      maxAbsoluteLength: 20,
    });
    expect(long.findings.some((f) => f.code === "ui_length_warning")).toBe(
      true
    );
  });
});

describe("quality thresholds + human review", () => {
  it("pass/fail gates and commerce/financial human review", () => {
    const good = runDeterministicTranslationQa({
      sourceText: "Back",
      targetText: "رجوع",
      sourceLocale: "en",
      targetLocale: "ar",
    });
    const gate = evaluateQualityGate({
      score: good,
      profile: PROFESSIONAL_QUALITY_PROFILES.standard_ui,
    });
    // May be REVIEW_REQUIRED due to info semantic note / soft dims — ensure not blocked
    expect(gate.decision).not.toBe("QUALITY_BLOCKED");

    const passScore = {
      ...good,
      findings: good.findings.filter((f) => f.severity !== "info"),
      overall: 96,
      dimensions: good.dimensions.map((d) =>
        d.dimension === "semantic_accuracy" ||
        d.dimension === "fluency_naturalness" ||
        d.dimension === "contextual_fit"
          ? { ...d, score: 96 }
          : d
      ),
    };
    const passGate = evaluateQualityGate({
      score: passScore,
      profile: PROFESSIONAL_QUALITY_PROFILES.standard_ui,
    });
    expect(passGate.decision).toBe("QUALITY_PASS");

    const blocked = evaluateQualityGate({
      score: runDeterministicTranslationQa({
        sourceText: "Hello {name}",
        targetText: "مرحبا",
        sourceLocale: "en",
        targetLocale: "ar",
      }),
      profile: PROFESSIONAL_QUALITY_PROFILES.standard_ui,
    });
    expect(blocked.decision).toBe("QUALITY_BLOCKED");

    const human = requiresHumanReview({
      sourceText: "Request a refund now",
      profile: PROFESSIONAL_QUALITY_PROFILES.commerce_sensitive,
      contextPack: resolveContextPack({ domainHint: "commerce" }),
    });
    expect(human.required).toBe(true);
    expect(human.reasons.length).toBeGreaterThan(0);
  });
});

describe("memory policy", () => {
  it("prefers approved exact matches; ignores non-approved", () => {
    const fp = sourceFingerprint("Workspace");
    const ranked = rankMemoryCandidates({
      sourceText: "Workspace",
      targetLocale: "ar",
      entries: [
        {
          id: "tm1",
          sourceFingerprint: fp,
          sourceText: "Workspace",
          language: "ar",
          translatedText: "مساحة العمل",
          status: "approved",
          createdAt: new Date().toISOString(),
        },
      ],
    });
    expect(ranked[0]?.matchKind).toBe("exact");
    expect(ranked[0]?.approvedOnly).toBe(true);
  });
});

describe("AI contracts + two-pass", () => {
  it("generator/reviewer cannot approve or publish; invalid AI fails closed", async () => {
    expect(PROFESSIONAL_AI_AUTHORITY.generatorCanApprove).toBe(false);
    expect(PROFESSIONAL_AI_AUTHORITY.reviewerCanPublish).toBe(false);
    expect(parseProfessionalTranslationGeneratorOutput({}).ok).toBe(false);
    expect(parseProfessionalTranslationReviewResult({ findings: "x" }).ok).toBe(
      false
    );

    const ctx = buildProfessionalTranslationRequestContext({
      targetLocale: "ar",
      sourceText: "Translation Studio",
      terminologyCatalog: catalog,
      domainHint: "admin",
    });
    const result = await runTwoPassProfessionalWorkflow({
      context: ctx,
      generator: createFailClosedStubGenerator(),
      reviewer: createFailClosedStubReviewer(),
    });
    expect(result.authority.generatorCanApprove).toBe(false);
    expect(result.candidateText.length).toBeGreaterThan(0);
    expect(["PASS", "HUMAN_REVIEW", "BLOCK"]).toContain(result.recommendation);
  });

  it("independent generator/reviewer kinds", () => {
    expect(createFailClosedStubGenerator().kind).toBe("professional_generator");
    expect(createFailClosedStubReviewer().kind).toBe("professional_reviewer");
  });
});

describe("seed examples + evaluateDraft integration", () => {
  const examples: Array<{
    source: string;
    ar: string;
    domain?: string;
  }> = [
    { source: "Back", ar: "رجوع" },
    { source: "Cancel", ar: "إلغاء" },
    { source: "Refund", ar: "استرداد", domain: "commerce" },
    { source: "Course", ar: "دورة", domain: "learning" },
    { source: "Workspace", ar: "مساحة العمل", domain: "collaboration" },
    {
      source: "Translation Studio",
      ar: "استوديو الترجمة",
      domain: "admin",
    },
  ];

  it("evaluates realistic UMTUBA examples without mutating workflow", () => {
    for (const ex of examples) {
      const out = evaluateProfessionalTranslationDraft({
        sourceText: ex.source,
        draftText: ex.ar,
        targetLocale: "ar",
        domainHint: ex.domain,
        keyStableId: `example_${ex.source}`,
      });
      expect(out.report.schemaVersion).toBe(1);
      expect(out.report.locale).toBe("ar");
      expect(["PASS", "HUMAN_REVIEW", "BLOCK"]).toContain(out.recommendation);
    }
  });

  it("required terminology present for Refund", () => {
    const out = evaluateProfessionalTranslationDraft({
      sourceText: "Refund",
      draftText: "استرداد",
      targetLocale: "ar",
      domainHint: "commerce",
    });
    expect(
      out.report.deterministicFindings.some(
        (f) => f.code === "required_terminology_missing"
      )
    ).toBe(false);
  });
});

describe("existing Studio surface unchanged markers", () => {
  it("official terminology entry type remains additive", () => {
    const sample: OfficialTerminologyEntry = catalog.entries[0]!;
    expect(sample.id).toBeTruthy();
    expect(Array.isArray(sample.scopes)).toBe(true);
  });
});
