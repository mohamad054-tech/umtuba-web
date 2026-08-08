/**
 * TRANSLATION_STUDIO_PROFESSIONAL_AI_UX_INTEGRATION_V1 focused tests.
 * No paid provider calls.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PROFESSIONAL_AI_AUTHORITY,
  TRANSLATION_QUALITY_DIMENSIONS,
  applyProfessionalCandidateToDraft,
  buildProfessionalAiUxReadinessSummary,
  buildProfessionalSuggestionPanelViewModel,
  clearProfessionalReviewCacheForTests,
  createTranslationStudioWorkflow,
  mapFailureToUxCode,
  runProfessionalGenerateReviewAndSuggest,
  runProfessionalReviewExistingDraft,
  selectProfessionalProviders,
} from "./index";

beforeEach(() => {
  clearProfessionalReviewCacheForTests();
});

const KEY_DETAIL_PAGE = join(
  process.cwd(),
  "app/admin/translation-studio/keys/[keyId]/page.tsx"
);
const PANEL_SOURCE = join(
  process.cwd(),
  "app/admin/translation-studio/ProfessionalSuggestionPanel.tsx"
);
const ACTIONS_SOURCE = join(
  process.cwd(),
  "app/actions/translationStudioProfessionalGeneration.ts"
);

function read(path: string): string {
  return readFileSync(path, "utf8");
}

describe("professional AI UX integration V1", () => {
  it("1. readiness status renders safely (sanitized summary)", () => {
    const summary = buildProfessionalAiUxReadinessSummary({
      aiMode: "stub",
    });
    expect(["READY", "NOT_READY", "DEGRADED"]).toContain(summary.status);
    expect(["live", "offline_heuristic", "unknown"]).toContain(summary.modeLabel);
    expect(summary.authority.generatorCanApprove).toBe(false);
    expect(summary.authority.reviewerCanPublish).toBe(false);
    const blob = JSON.stringify(summary);
    expect(blob).not.toMatch(/sk-[a-zA-Z0-9]/i);
    expect(blob).not.toMatch(/OPENAI_API_KEY\s*=/);
    expect(blob).not.toMatch(/Bearer\s+/i);
    expect(summary.configVariableNames.every((n) => !n.includes("="))).toBe(
      true
    );
    // Chip source wires readiness
    const page = read(KEY_DETAIL_PAGE);
    expect(page).toContain("ProfessionalAiReadinessChip");
    expect(page).toContain("buildProfessionalAiUxReadinessSummary");
  });

  it("2. professional Generate + Review produces preview without changing current value", async () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const value = wf.getSnapshot().values.find((v) => v.language === "ar");
    expect(value).toBeTruthy();
    const prior = { text: value!.value, status: value!.status };
    const result = await runProfessionalGenerateReviewAndSuggest({
      workflow: wf,
      valueId: value!.id,
      actorUserId: "ux-admin",
      providers: selectProfessionalProviders({
        locale: "ar",
        profileId: "standard_ui",
        forceOffline: true,
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.suggestion.candidateText.length).toBeGreaterThan(0);
    expect(result.valueTextUnchanged).toBe(true);
    const after = wf.getValue(value!.id)!;
    expect(after.value).toBe(prior.text);
    expect(after.status).toBe(prior.status);
  });

  it("3. Review Current remains read-only", async () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const value = wf.getSnapshot().values.find((v) => v.language === "ar");
    expect(value).toBeTruthy();
    const prior = {
      text: value!.value,
      status: value!.status,
      version: value!.version,
    };
    const review = await runProfessionalReviewExistingDraft({
      workflow: wf,
      valueId: value!.id,
      providers: selectProfessionalProviders({
        locale: "ar",
        profileId: "standard_ui",
        forceOffline: true,
      }),
      useCache: false,
    });
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    expect(review.mutated).toBe(false);
    const after = wf.getValue(value!.id)!;
    expect(after.value).toBe(prior.text);
    expect(after.status).toBe(prior.status);
    expect(after.version).toBe(prior.version);
  });

  it("4–7. PASS / HUMAN_REVIEW / BLOCK panel models + all 10 dimensions", () => {
    const dims = TRANSLATION_QUALITY_DIMENSIONS.map((dimension) => ({
      dimension,
      score: 100,
    }));
    const baseQuality = {
      confidence: 0.9,
      reusedFromMemory: false,
      terminologyHits: [] as string[],
      terminologyConflicts: [] as [],
      providerVia: "stub" as const,
    };

    const passVm = buildProfessionalSuggestionPanelViewModel({
      ...baseQuality,
      professionalQuality: {
        tag: "professional_quality_v1",
        recommendation: "PASS",
        overallScore: 92,
        providerId: "heuristic",
        modelId: "offline",
        humanReviewRequired: false,
        report: { dimensionScores: dims, deterministicFindings: [] },
      },
    });
    expect(passVm?.recommendation).toBe("PASS");
    expect(passVm?.dimensions).toHaveLength(10);
    expect(passVm?.dimensions.map((d) => d.id)).toEqual([
      ...TRANSLATION_QUALITY_DIMENSIONS,
    ]);
    expect(passVm?.safetyCopy).toMatch(/NOT applied, approved, or published/i);

    const humanVm = buildProfessionalSuggestionPanelViewModel({
      ...baseQuality,
      professionalQuality: {
        tag: "professional_quality_v1",
        recommendation: "HUMAN_REVIEW",
        overallScore: 70,
        providerId: "heuristic",
        modelId: "offline",
        humanReviewRequired: true,
        report: {
          dimensionScores: dims.map((d) =>
            d.dimension === "semantic_accuracy" ? { ...d, score: 60 } : d
          ),
          deterministicFindings: [],
          reviewerFindings: [
            {
              code: "commerce_refund_sensitivity",
              severity: "warning",
              message: "Refund wording needs human check",
            },
          ],
        },
      },
    });
    expect(humanVm?.recommendation).toBe("HUMAN_REVIEW");
    expect(humanVm?.humanReviewRequired).toBe(true);
    expect(humanVm?.dimensions).toHaveLength(10);

    const blockVm = buildProfessionalSuggestionPanelViewModel({
      ...baseQuality,
      professionalQuality: {
        tag: "professional_quality_v1",
        recommendation: "BLOCK",
        overallScore: 20,
        providerId: "heuristic",
        modelId: "offline",
        humanReviewRequired: true,
        report: {
          dimensionScores: dims.map((d) =>
            d.dimension === "placeholder_integrity" ? { ...d, score: 0 } : d
          ),
          deterministicFindings: [
            {
              code: "placeholder_missing",
              severity: "blocking",
              message: "Missing {count}",
              dimension: "placeholder_integrity",
            },
          ],
        },
      },
    });
    expect(blockVm?.recommendation).toBe("BLOCK");
    expect(blockVm?.disqualifierCodes).toContain("placeholder_missing");
    expect(blockVm?.dimensions).toHaveLength(10);

    const panelSrc = read(PANEL_SOURCE);
    expect(panelSrc).toContain("professional-dimensions");
    expect(panelSrc).toContain("buildProfessionalSuggestionPanelViewModel");
  });

  it("8. placeholder integrity failure is clearly blocking", () => {
    const dims = TRANSLATION_QUALITY_DIMENSIONS.map((dimension) => ({
      dimension,
      score: dimension === "placeholder_integrity" ? 0 : 90,
    }));
    const vm = buildProfessionalSuggestionPanelViewModel({
      confidence: 0.5,
      reusedFromMemory: false,
      terminologyHits: [],
      terminologyConflicts: [],
      providerVia: "stub",
      professionalQuality: {
        tag: "professional_quality_v1",
        recommendation: "BLOCK",
        overallScore: 40,
        providerId: "heuristic",
        modelId: "offline",
        report: {
          dimensionScores: dims,
          deterministicFindings: [
            {
              code: "placeholder_missing",
              severity: "blocking",
              message: "Missing {{name}}",
              dimension: "placeholder_integrity",
            },
          ],
        },
      },
    });
    expect(vm?.placeholderIntegrityBlocking).toBe(true);
    expect(
      vm?.dimensions.find((d) => d.id === "placeholder_integrity")?.blocking
    ).toBe(true);
    expect(read(PANEL_SOURCE)).toContain("placeholder-integrity-block");
  });

  it("9. formatting integrity failure is clearly blocking", () => {
    const dims = TRANSLATION_QUALITY_DIMENSIONS.map((dimension) => ({
      dimension,
      score: dimension === "formatting_integrity" ? 0 : 90,
    }));
    const vm = buildProfessionalSuggestionPanelViewModel({
      confidence: 0.5,
      reusedFromMemory: false,
      terminologyHits: [],
      terminologyConflicts: [],
      providerVia: "stub",
      professionalQuality: {
        tag: "professional_quality_v1",
        recommendation: "BLOCK",
        overallScore: 40,
        providerId: "heuristic",
        modelId: "offline",
        report: {
          dimensionScores: dims,
          deterministicFindings: [
            {
              code: "html_tag_mismatch",
              severity: "blocking",
              message: "Tag mismatch",
              dimension: "formatting_integrity",
            },
          ],
        },
      },
    });
    expect(vm?.formattingIntegrityBlocking).toBe(true);
    expect(
      vm?.dimensions.find((d) => d.id === "formatting_integrity")?.blocking
    ).toBe(true);
    expect(read(PANEL_SOURCE)).toContain("formatting-integrity-block");
  });

  it("10. provider-unavailable error is sanitized", () => {
    expect(mapFailureToUxCode("provider_unavailable")).toBe(
      "professional_provider_unavailable"
    );
    expect(mapFailureToUxCode("generation_unavailable")).toBe(
      "professional_provider_unavailable"
    );
    const actions = read(ACTIONS_SOURCE);
    expect(actions).toContain("mapFailureToUxCode");
    expect(actions).toContain("sanitizeCaughtProfessionalError");
    // Redirect catch paths must not leak Error.message into query params
    expect(actions).not.toMatch(
      /encodeURIComponent\(\s*(?:error\s+instanceof\s+Error\s*\?\s*)?error\.message/
    );
    expect(actions).toMatch(
      /redirect\(`\$\{back\}\?error=\$\{encodeURIComponent\(message\)\}`\)/
    );
  });

  it("11–14. Apply candidate to draft writes draft only; not approve/publish; auth gated", async () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const value = wf.getSnapshot().values.find((v) => v.language === "ar");
    expect(value).toBeTruthy();

    const gen = await runProfessionalGenerateReviewAndSuggest({
      workflow: wf,
      valueId: value!.id,
      actorUserId: "ux-admin",
      providers: selectProfessionalProviders({
        locale: "ar",
        profileId: "standard_ui",
        forceOffline: true,
      }),
    });
    expect(gen.ok).toBe(true);
    if (!gen.ok) return;

    const priorStatus = wf.getValue(value!.id)!.status;
    const apply = applyProfessionalCandidateToDraft({
      workflow: wf,
      suggestionId: gen.suggestion.id,
      actorUserId: "ux-admin",
    });
    expect(apply.ok).toBe(true);
    if (!apply.ok) return;
    expect(apply.nextStatus).toBe("draft");
    const after = wf.getValue(value!.id)!;
    expect(after.value).toBe(gen.suggestion.candidateText);
    expect(after.status).toBe("draft");
    expect(after.status).not.toBe("approved");
    expect(after.status).not.toBe("ready_for_publish");
    expect(after.status).not.toBe("needs_review");
    // Prior may already have been draft; ensure we never jumped to approve/publish
    expect(["approved", "ready_for_publish"]).not.toContain(after.status);
    if (priorStatus === "needs_review") {
      expect(after.status).toBe("draft");
    }

    // Reject non-professional suggestion
    const bad = applyProfessionalCandidateToDraft({
      workflow: wf,
      suggestionId: "missing-suggestion",
      actorUserId: "ux-admin",
    });
    expect(bad.ok).toBe(false);

    const actions = read(ACTIONS_SOURCE);
    expect(actions).toContain("applyProfessionalCandidateToDraftAction");
    expect(actions).toContain("requireStudioAdmin");
    expect(actions).toMatch(
      /applyProfessionalCandidateToDraftAction[\s\S]*requireStudioAdmin/
    );
    // Apply path must not invoke approve/publish APIs
    const applyFn = applyProfessionalCandidateToDraft.toString();
    expect(applyFn).not.toContain("approve");
    expect(applyFn).not.toContain("publish");
    expect(applyFn).toContain("saveDraft");
  });

  it("15–16. professional AI cannot auto-approve or auto-publish", async () => {
    expect(PROFESSIONAL_AI_AUTHORITY.generatorCanApprove).toBe(false);
    expect(PROFESSIONAL_AI_AUTHORITY.reviewerCanPublish).toBe(false);
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const value = wf.getSnapshot().values.find((v) => v.language === "ar");
    const prior = wf.getValue(value!.id)!;
    const result = await runProfessionalGenerateReviewAndSuggest({
      workflow: wf,
      valueId: value!.id,
      actorUserId: "ux-admin",
      providers: selectProfessionalProviders({
        locale: "ar",
        profileId: "standard_ui",
        forceOffline: true,
      }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.authority.generatorCanApprove).toBe(false);
    expect(result.authority.reviewerCanPublish).toBe(false);
    const after = wf.getValue(value!.id)!;
    expect(after.status).toBe(prior.status);
    expect(after.status).not.toBe("ready_for_publish");
  });

  it("17. legacy/stub AI no longer competes as primary path", () => {
    const page = read(KEY_DETAIL_PAGE);
    expect(page).not.toContain("requestAiSuggestionAction");
    expect(page).not.toContain("Request AI suggestion");
    expect(page).toContain("Primary AI path · Professional generate + review");
    expect(page).toContain("Professional generate + review");
    expect(page).toContain("Review current professionally");
    expect(page).toContain("applyProfessionalCandidateToDraftAction");
    expect(read(PANEL_SOURCE)).toContain("Apply candidate to draft");
    // Legacy service API retained
    const workflowSrc = read(
      join(process.cwd(), "lib/translationStudio/workflow/workflowService.ts")
    );
    expect(workflowSrc).toContain("requestAiSuggestion");
  });

  it("18. no paid provider calls in these tests (offline force)", async () => {
    const providers = selectProfessionalProviders({
      locale: "ar",
      profileId: "standard_ui",
      forceOffline: true,
    });
    expect(providers.mode).toBe("heuristic_offline");
    // Smoke one generate to ensure still offline
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const value = wf.getSnapshot().values.find((v) => v.language === "ar");
    const result = await runProfessionalGenerateReviewAndSuggest({
      workflow: wf,
      valueId: value!.id,
      actorUserId: "offline-only",
      providers,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const providerId =
      result.suggestion.quality.professionalQuality?.providerId ?? "";
    expect(providerId).not.toMatch(/openai|anthropic|gemini/i);
  });
});
