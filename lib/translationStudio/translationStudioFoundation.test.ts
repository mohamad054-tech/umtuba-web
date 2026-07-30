import { describe, expect, it, vi } from "vitest";
import {
  TRANSLATION_CSV_EXPORT_CONTRACT,
  TRANSLATION_XLIFF_EXPORT_CONTRACT,
  assertStudioLanguage,
  buildJsonExportEnvelope,
  canTransitionTranslationStatus,
  createAiServiceTranslationPort,
  createStubTranslationAiPort,
  createSuggestionPipeline,
  createTerminologyStore,
  createTranslationMemory,
  createTranslationStudio,
  isPublishableToMemory,
  isStudioLanguageCode,
  normalizeSourceText,
  seedUmtubaTerminology,
  sourceFingerprint,
} from "./index";

describe("Translation Studio languages", () => {
  it("validates supported studio languages", () => {
    expect(isStudioLanguageCode("ar")).toBe(true);
    expect(isStudioLanguageCode("en")).toBe(true);
    expect(isStudioLanguageCode("zh")).toBe(false);
    expect(assertStudioLanguage("fr")).toBe("fr");
    expect(() => assertStudioLanguage("xx")).toThrow(/Unsupported/);
  });
});

describe("Translation Memory", () => {
  it("looks up approved translations and detects duplicates", () => {
    const memory = createTranslationMemory();
    memory.rememberApproved({
      sourceText: "Save",
      language: "ar",
      translatedText: "حفظ",
    });
    memory.rememberApproved({
      sourceText: "  SAVE  ",
      language: "ar",
      translatedText: "حفظ",
    });

    expect(normalizeSourceText("  Save\n")).toBe("save");
    expect(sourceFingerprint("Save")).toBe(sourceFingerprint(" save "));
    expect(memory.findDuplicates("Save")).toHaveLength(1);
    expect(memory.lookup({ sourceText: "Save", language: "ar" })?.translatedText).toBe(
      "حفظ"
    );
    expect(memory.lookup({ sourceText: "Save", language: "fr" })).toBeNull();
  });
});

describe("Terminology", () => {
  it("looks up approved term translations and finds terms in source text", () => {
    const terms = createTerminologyStore(seedUmtubaTerminology());
    expect(terms.lookupTerm("Home")?.term).toBe("Home");
    expect(
      terms.lookupApprovedTranslation({ term: "Learning", language: "ar" })
    ).toBe("التعلّم");
    expect(
      terms.findInSourceText("Open Learning and continue the Course").map((t) => t.term)
    ).toEqual(expect.arrayContaining(["Learning", "Course", "Continue"]));
  });
});

describe("Status transitions", () => {
  it("allows human-review transitions and blocks illegal ones", () => {
    expect(canTransitionTranslationStatus("missing", "ai_suggested")).toBe(true);
    expect(canTransitionTranslationStatus("ai_suggested", "needs_review")).toBe(
      true
    );
    expect(canTransitionTranslationStatus("needs_review", "approved")).toBe(true);
    expect(canTransitionTranslationStatus("approved", "missing")).toBe(false);
    expect(isPublishableToMemory("approved")).toBe(true);
    expect(isPublishableToMemory("ai_suggested")).toBe(false);
  });
});

describe("AI provider abstraction", () => {
  it("uses stub port without provider-specific imports", async () => {
    const port = createStubTranslationAiPort();
    expect(port.kind).toBe("stub");
    const result = await port.suggest({
      sourceText: "Cancel",
      targetLanguage: "ar",
      terminologyHints: [{ term: "Cancel", translation: "إلغاء" }],
    });
    expect(result.candidateText).toBe("إلغاء");
  });

  it("routes live suggestions through injected aiService runner only", async () => {
    const runCapability = vi.fn(async () => ({
      ok: true as const,
      data: {
        result: {
          candidateText: "الرئيسية",
          confidence: 0.81,
          notes: "via aiService",
        },
      },
    }));
    const port = createAiServiceTranslationPort(runCapability);
    expect(port.kind).toBe("ai_service");
    const result = await port.suggest({
      sourceText: "Home",
      targetLanguage: "ar",
    });
    expect(result.candidateText).toBe("الرئيسية");
    expect(runCapability).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilityId: "platform.translation_suggest",
        context: expect.objectContaining({
          productDomain: "platform",
          surface: "admin.translation_studio",
        }),
      })
    );
  });
});

describe("Suggestion pipeline", () => {
  it("reuses Translation Memory before calling AI and requires approval for memory write", async () => {
    const memory = createTranslationMemory();
    memory.rememberApproved({
      sourceText: "Profile",
      language: "ar",
      translatedText: "الملف",
    });
    const terminology = createTerminologyStore(seedUmtubaTerminology());
    const ai = createStubTranslationAiPort();
    const suggestSpy = vi.spyOn(ai, "suggest");
    const pipeline = createSuggestionPipeline({ memory, terminology, ai });

    const suggestion = await pipeline.propose({
      sourceText: "Profile",
      targetLanguage: "ar",
    });
    expect(suggestion.quality.reusedFromMemory).toBe(true);
    expect(suggestion.candidateText).toBe("الملف");
    expect(suggestSpy).not.toHaveBeenCalled();

    const approved = pipeline.approve({
      suggestion,
      value: {
        id: "v1",
        keyId: "k1",
        language: "ar",
        value: "",
        status: "needs_review",
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        createdBy: null,
        updatedBy: null,
        approvedBy: null,
        suggestionId: null,
        version: 1,
      },
    });
    expect(approved.value?.status).toBe("approved");
    expect(approved.memoryId).toBeTruthy();
  });
});

describe("Import/export contracts", () => {
  it("exposes JSON/CSV/XLIFF contracts without integrating writers", () => {
    const envelope = buildJsonExportEnvelope([
      {
        namespace: "nav",
        key: "nav.home",
        sourceText: "Home",
        language: "ar",
        value: "الرئيسية",
        status: "approved",
      },
    ]);
    expect(envelope.format).toBe("umtuba.translation_catalog.json");
    expect(TRANSLATION_CSV_EXPORT_CONTRACT.columns).toContain("namespace");
    expect(TRANSLATION_XLIFF_EXPORT_CONTRACT.xliffVersion).toBe("2.0");
  });
});

describe("Studio seed", () => {
  it("seeds languages, namespaces, keys, and terminology for read-only UI", () => {
    const studio = createTranslationStudio({ ephemeral: true });
    const snap = studio.getSnapshot();
    expect(snap.languages.map((l) => l.code)).toEqual([
      "ar",
      "en",
      "fr",
      "es",
      "de",
      "pt",
    ]);
    expect(snap.namespaces.length).toBeGreaterThan(0);
    expect(snap.keys.length).toBeGreaterThan(10);
    expect(snap.terminology.some((t) => t.term === "Wallet")).toBe(true);
    expect(snap.memory.length).toBeGreaterThan(0);
  });
});
