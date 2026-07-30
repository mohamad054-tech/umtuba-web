import { afterEach, describe, expect, it } from "vitest";
import {
  assertCandidateUntrusted,
  buildCorrectionFeedback,
  buildMediaIntelligenceContract,
  canEnterModelCustomizationDataset,
  canEnterTranslationMemory,
  createEmptyMediaMetadata,
  createExternalTranslationCandidate,
  createProvenance,
  createTranslationIntelligenceService,
  createUsageRights,
  decideIntelligenceEligibility,
  getStyleProfile,
  resetTranslationIntelligenceForTests,
  scoreTranslationQuality,
  selectStyleProfileForContent,
} from "./index";

afterEach(() => {
  resetTranslationIntelligenceForTests();
});

describe("Translation Intelligence Foundation", () => {
  it("creates intelligence record for approved translation only", () => {
    const svc = createTranslationIntelligenceService({ ephemeral: true });
    const denied = svc.recordApprovedTranslation({
      approvedValueId: "v1",
      approvedVersion: 1,
      sourceText: "Save",
      approvedTargetText: "حفظ",
      targetLocale: "ar",
      approved: false,
    });
    expect(denied).toBeNull();

    const record = svc.recordApprovedTranslation({
      approvedValueId: "v1",
      approvedVersion: 1,
      sourceText: "Save",
      approvedTargetText: "حفظ",
      targetLocale: "ar",
      namespaceId: "ns_actions",
    });
    expect(record?.id).toBe("ti_v1_v1");
    expect(record?.trustLevel).toBe("trusted_approved");
    expect(record?.provenance.type).toBe("human_authored");
    expect(canEnterTranslationMemory(record!.eligibility)).toBe(true);
  });

  it("is idempotent for same approved value version (no duplicate records)", () => {
    const svc = createTranslationIntelligenceService({ ephemeral: true });
    const a = svc.recordApprovedTranslation({
      approvedValueId: "v2",
      approvedVersion: 3,
      sourceText: "Home",
      approvedTargetText: "الرئيسية",
      targetLocale: "ar",
    });
    const b = svc.recordApprovedTranslation({
      approvedValueId: "v2",
      approvedVersion: 3,
      sourceText: "Home",
      approvedTargetText: "الرئيسية",
      targetLocale: "ar",
    });
    expect(a?.id).toBe(b?.id);
    expect(svc.listRecords()).toHaveLength(1);
  });

  it("keeps external service results untrusted before review", () => {
    const svc = createTranslationIntelligenceService({ ephemeral: true });
    const candidate = svc.ingestExternalCandidate({
      serviceName: "acme-translate",
      sourceText: "Cancel",
      candidateText: "Cancel",
      sourceLocale: "en",
      targetLocale: "ar",
      rawResponse: JSON.stringify({ text: "Cancel" }),
    });
    expect(candidate.trustLevel).toBe("untrusted_candidate");
    expect(candidate.status).toBe("pending_review");
    assertCandidateUntrusted(candidate);

    const eligibility = decideIntelligenceEligibility({
      approved: false,
      trustLevel: "untrusted_candidate",
      usageRights: createUsageRights({ status: "unknown" }),
      quality: scoreTranslationQuality({
        sourceText: "Cancel",
        targetText: "Cancel",
        sourceLocale: "en",
        targetLocale: "ar",
        contentType: "ui_text",
      }),
      sensitivity: "internal",
    });
    expect(eligibility).toEqual(["ineligible"]);
  });

  it("blocks model-customization eligibility for unknown/restricted rights", () => {
    const quality = scoreTranslationQuality({
      sourceText: "Save",
      targetText: "حفظ",
      sourceLocale: "en",
      targetLocale: "ar",
      contentType: "ui_text",
    });
    const unknown = decideIntelligenceEligibility({
      approved: true,
      trustLevel: "trusted_approved",
      usageRights: createUsageRights({ status: "unknown" }),
      quality,
      sensitivity: "internal",
    });
    expect(canEnterModelCustomizationDataset(unknown)).toBe(false);

    const restricted = decideIntelligenceEligibility({
      approved: true,
      trustLevel: "trusted_approved",
      usageRights: createUsageRights({ status: "restricted" }),
      quality,
      sensitivity: "internal",
    });
    expect(canEnterModelCustomizationDataset(restricted)).toBe(false);
  });

  it("allows owned approved translation into Translation Memory eligibility", () => {
    const quality = scoreTranslationQuality({
      sourceText: "Save",
      targetText: "حفظ",
      sourceLocale: "en",
      targetLocale: "ar",
      contentType: "ui_text",
    });
    const flags = decideIntelligenceEligibility({
      approved: true,
      trustLevel: "trusted_approved",
      usageRights: createUsageRights({
        status: "owned_internal",
        permissionReuseInternally: true,
        permissionModelCustomization: true,
      }),
      quality,
      sensitivity: "internal",
    });
    expect(canEnterTranslationMemory(flags)).toBe(true);
  });

  it("preserves provenance on approved records", () => {
    const svc = createTranslationIntelligenceService({ ephemeral: true });
    const record = svc.recordApprovedTranslation({
      approvedValueId: "v3",
      approvedVersion: 1,
      sourceText: "Profile",
      approvedTargetText: "الملف",
      targetLocale: "ar",
      provenance: createProvenance({
        type: "manual_revision",
        providerName: "reviewer-desk",
        attributionNotes: "Edited from AI draft",
      }),
      suggestionProvenance: createProvenance({
        type: "internal_ai_suggestion",
        providerName: "aiService",
        providerModel: "stub",
      }),
    });
    expect(record?.provenance.type).toBe("manual_revision");
    expect(record?.suggestionProvenance?.type).toBe("internal_ai_suggestion");
  });

  it("flags placeholder and language-leakage blockers", () => {
    const ph = scoreTranslationQuality({
      sourceText: "Hello {name}",
      targetText: "مرحبا",
      sourceLocale: "en",
      targetLocale: "ar",
      contentType: "ui_text",
    });
    expect(ph.blockingFindings).toContain("placeholder_preservation");

    const leak = scoreTranslationQuality({
      sourceText: "Home",
      targetText: "Home",
      sourceLocale: "en",
      targetLocale: "ar",
      contentType: "ui_text",
    });
    expect(leak.blockingFindings).toContain("language_leakage");
  });

  it("selects style profiles by content/domain", () => {
    expect(selectStyleProfileForContent({ contentType: "subtitle_segment" })).toBe(
      "subtitles_concise"
    );
    expect(
      selectStyleProfileForContent({
        contentType: "ui_text",
        domain: "ns_nav",
      })
    ).toBe("platform_ui");
    expect(getStyleProfile("platform_ui").terminologyStrictness).toBe("strict");
  });

  it("records text correction feedback metadata", () => {
    const feedback = buildCorrectionFeedback({
      candidateText: "حفظ التغييرات",
      approvedText: "حفظ",
      recordedBy: "reviewer",
    });
    expect(feedback.editDistance).toBeGreaterThan(0);
    expect(feedback.outcome).toMatch(/accepted_with_/);
  });

  it("exposes audio/video metadata contracts without processors", () => {
    const contract = buildMediaIntelligenceContract(
      createEmptyMediaMetadata({
        mediaAssetId: "asset_1",
        segmentId: "seg_1",
      })
    );
    expect(contract.processingImplemented).toBe(false);
    expect(contract.speechToText).toBe(false);
    expect(contract.textToSpeech).toBe(false);
    expect(contract.voiceCloning).toBe(false);
  });

  it("indexes approved records and increments reuse idempotently by fingerprint", () => {
    const svc = createTranslationIntelligenceService({ ephemeral: true });
    svc.recordApprovedTranslation({
      approvedValueId: "va",
      approvedVersion: 1,
      sourceText: "Search",
      approvedTargetText: "بحث",
      targetLocale: "ar",
    });
    svc.recordApprovedTranslation({
      approvedValueId: "vb",
      approvedVersion: 1,
      sourceText: "Search",
      approvedTargetText: "ابحث",
      targetLocale: "ar",
    });
    expect(svc.listIndex()).toHaveLength(1);
    expect(svc.listIndex()[0]?.reuseCount).toBe(2);
    expect(svc.listIndex()[0]?.approvedTargetVariants.length).toBe(2);
  });

  it("approves external candidate into trusted record with edit metadata", () => {
    const svc = createTranslationIntelligenceService({ ephemeral: true });
    const candidate = svc.ingestExternalCandidate({
      serviceName: "acme",
      sourceText: "Retry",
      candidateText: "Retry AR",
      sourceLocale: "en",
      targetLocale: "ar",
      rawResponse: '{"t":"Retry AR"}',
    });
    const approved = svc.approveExternalCandidate({
      candidateId: candidate.id,
      approvedText: "إعادة المحاولة",
      approverId: "admin",
      usageRights: createUsageRights({
        status: "owned_internal",
        permissionReuseInternally: true,
        permissionModelCustomization: false,
      }),
    });
    expect(approved.trustLevel).toBe("trusted_approved");
    expect(approved.suggestionProvenance?.type).toBe(
      "external_translation_service"
    );
    expect(approved.feedback?.editDistance).toBeGreaterThan(0);
  });
});
