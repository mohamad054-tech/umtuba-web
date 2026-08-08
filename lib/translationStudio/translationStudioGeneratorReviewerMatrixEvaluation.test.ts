import { describe, expect, it } from "vitest";
import {
  GENERATOR_REVIEWER_MATRIX_CONFIG_VARIABLE_NAMES,
  GENERATOR_REVIEWER_MATRIX_MAX_CELLS,
  SMALL_SMOKE_LOCKED_CASE_IDS,
  TRANSLATION_QUALITY_DIMENSIONS,
  assessLiveProfessionalProviderReadiness,
  buildGeneratorReviewerMatrixPlan,
  calculateGeneratorReviewerMatrixCallBudget,
  createScriptedProfessionalAiTransport,
  createTranslationStudioWorkflow,
  defaultOfflineComparisonMatrixPlan,
  defaultOfflineGeneratorReviewerMatrixPlan,
  loadProfessionalLiveModelPolicy,
  refuseLiveMatrixIfNotReady,
  runGeneratorReviewerMatrixEvaluation,
  toSanitizedMatrixEvalReport,
  validateSmallSmokePrivacy,
} from "./index";

describe("generator × reviewer matrix evaluation V1", () => {
  it("audits config surfaces without exposing secrets", () => {
    const policy = loadProfessionalLiveModelPolicy();
    expect(policy.generator.providerId).toBeTruthy();
    expect(policy.reviewer.providerId).toBeTruthy();
    expect(GENERATOR_REVIEWER_MATRIX_CONFIG_VARIABLE_NAMES).toEqual(
      expect.arrayContaining([
        "UMTUBA_AI_MODE",
        "PROFESSIONAL_TRANSLATION_GENERATOR_PROVIDER",
        "PROFESSIONAL_TRANSLATION_GENERATOR_MODEL",
        "PROFESSIONAL_TRANSLATION_REVIEWER_PROVIDER",
        "PROFESSIONAL_TRANSLATION_REVIEWER_MODEL",
        "UMTUBA_PROFESSIONAL_MATRIX_EXPLICIT_GO",
        "UMTUBA_PROFESSIONAL_MATRIX_MAX_CALLS",
      ])
    );
    const blob = JSON.stringify({
      policy,
      names: GENERATOR_REVIEWER_MATRIX_CONFIG_VARIABLE_NAMES,
    });
    expect(blob).not.toMatch(/sk-|api[_-]?key\s*[:=]/i);
    expect(blob).not.toMatch(/OPENAI_API_KEY\s*[:=]/i);
  });

  it("defines deterministic matrix + budget model from smoke package", () => {
    const plan = defaultOfflineGeneratorReviewerMatrixPlan();
    expect(plan.schemaVersion).toBe(1);
    expect(plan.cells).toHaveLength(1);
    expect(plan.caseIds).toEqual([...SMALL_SMOKE_LOCKED_CASE_IDS]);
    expect(plan.caseCount).toBe(5);
    expect(plan.callBudget.normalCallsPerCell).toBe(10);
    expect(plan.callBudget.normalCallsTotal).toBe(10);
    expect(plan.callBudget.totalCallCeiling).toBe(20);
    expect(plan.callBudget.maxCells).toBe(GENERATOR_REVIEWER_MATRIX_MAX_CELLS);

    const two = calculateGeneratorReviewerMatrixCallBudget({ cellCount: 2 });
    expect(two.normalCallsTotal).toBe(20);
    expect(two.totalCallCeiling).toBe(40);

    const capped = buildGeneratorReviewerMatrixPlan({
      cells: Array.from({ length: 6 }, (_, i) => ({
        cellId: `c${i}`,
        generator: { providerId: "heuristic" as const, modelId: `g${i}` },
        reviewer: { providerId: "heuristic" as const, modelId: `r${i}` },
      })),
    });
    expect(capped.cells).toHaveLength(GENERATOR_REVIEWER_MATRIX_MAX_CELLS);
  });

  it("offline default MATRIX_PASS: privacy, refund HUMAN_REVIEW, placeholders", async () => {
    const wf = createTranslationStudioWorkflow({ ephemeral: true });
    const sugBefore = wf.getSnapshot().suggestions.length;
    const valuesBefore = wf.getSnapshot().values.map((v) => ({
      id: v.id,
      value: v.value,
      status: v.status,
    }));

    const report = await runGeneratorReviewerMatrixEvaluation({
      forceOffline: true,
    });

    expect(report.mode).toBe("offline_scripted");
    expect(report.verdict).toBe("MATRIX_PASS");
    expect(report.mutatedStudio).toBe(false);
    expect(report.secretsPresent).toBe(false);
    expect(report.privacy.status).toBe("PASS");
    expect(validateSmallSmokePrivacy().status).toBe("PASS");
    expect(report.providerCallsAttempted).toBe(10);
    expect(report.aggregate.withinCallBudget).toBe(true);
    expect(report.aggregate.refundHumanReviewGated).toBe(true);
    expect(report.aggregate.zeroPlaceholderCorruption).toBe(true);
    expect(report.aggregate.allGenerateStructurallyValid).toBe(true);
    expect(report.aggregate.allReviewStructurallyValid).toBe(true);

    const cell = report.cells[0]!;
    expect(cell.cases).toHaveLength(5);
    expect(cell.generator.providerId).toBe("heuristic");
    expect(cell.reviewer.providerId).toBe("heuristic");

    const refund = cell.cases.find((c) => c.caseId === "commerce_refund")!;
    expect(refund.recommendation).toBe("HUMAN_REVIEW");
    expect(refund.humanReviewEnforced).toBe(true);

    const ph = cell.cases.find((c) => c.caseId === "ph_hello_name")!;
    expect(ph.placeholderIntact).toBe(true);
    expect(ph.dimensionScores).toHaveLength(
      TRANSLATION_QUALITY_DIMENSIONS.length
    );
    expect(ph.dimensionScores.every((d) => typeof d.dimension === "string")).toBe(
      true
    );

    const sanitized = toSanitizedMatrixEvalReport(report);
    const blob = JSON.stringify(sanitized);
    expect(blob).not.toContain("Back");
    expect(blob).not.toContain("{name}");
    expect(blob).not.toMatch(/sk-|OPENAI_API_KEY/i);
    expect(sanitized).not.toHaveProperty("sourceText");
    expect(sanitized).not.toHaveProperty("candidateText");

    expect(wf.getSnapshot().suggestions.length).toBe(sugBefore);
    for (const v of valuesBefore) {
      const after = wf.getValue(v.id)!;
      expect(after.value).toBe(v.value);
      expect(after.status).toBe(v.status);
    }
  });

  it("enforces call budget and refuses live without GO/readiness", async () => {
    const truncated = await runGeneratorReviewerMatrixEvaluation({
      forceOffline: true,
      maxCalls: 4,
    });
    expect(truncated.providerCallsAttempted).toBe(4);
    expect(truncated.cells[0]!.cases).toHaveLength(2);
    expect(truncated.aggregate.withinCallBudget).toBe(true);
    // Incomplete package → hard fail (refund gate / full validity not met)
    expect(truncated.verdict).toBe("MATRIX_FAIL");

    const readiness = assessLiveProfessionalProviderReadiness();
    const gate = refuseLiveMatrixIfNotReady({
      readiness,
      explicitGo: false,
      maxCalls: 10,
      callCeiling: 20,
      privacyOk: true,
      cellCount: 1,
    });
    expect(gate).toMatchObject({ ok: false, reason: "explicit_go_required" });

    const liveRefused = await runGeneratorReviewerMatrixEvaluation({
      explicitGo: true,
      forceOffline: false,
    });
    expect(liveRefused.mode).toBe("live_refused");
    expect(liveRefused.providerCallsAttempted).toBe(0);
    expect(liveRefused.refusalReason).toBeTruthy();
  });

  it("comparison matrix + fake transport stay unpaid and report attribution", async () => {
    const plan = defaultOfflineComparisonMatrixPlan();
    expect(plan.cells).toHaveLength(2);
    expect(plan.cells[1]!.independent).toBe(true);
    expect(plan.callBudget.normalCallsTotal).toBe(20);
    expect(plan.callBudget.totalCallCeiling).toBe(40);

    const dimensionScores = Object.fromEntries(
      TRANSLATION_QUALITY_DIMENSIONS.map((d) => [d, 90])
    );

    const fake = createScriptedProfessionalAiTransport({
      delayMs: 0,
      provider: { providerId: "fake", modelId: "scripted-matrix-v1" },
      generator: {
        candidateText: "Bonjour {name}",
        confidence: 0.7,
        provider: { providerId: "fake", modelId: "fake-gen" },
      },
      reviewer: {
        schemaVersion: 1,
        dimensionScores,
        findings: [],
        confidence: 0.7,
        provider: { providerId: "fake", modelId: "fake-rev" },
      },
    });

    const report = await runGeneratorReviewerMatrixEvaluation({
      plan,
      forceOffline: true,
      transportsByCellId: {
        offline_independent_labels: fake,
      },
    });

    expect(report.mode).toBe("offline_scripted");
    expect(report.providerCallsAttempted).toBe(20);
    expect(report.cells).toHaveLength(2);
    const fakeCell = report.cells.find(
      (c) => c.cellId === "offline_independent_labels"
    )!;
    expect(fakeCell.structuredGenerateValidCount).toBe(5);
    expect(fakeCell.structuredReviewValidCount).toBe(5);
    // commerce_refund still forced to HUMAN_REVIEW by policy
    const refund = fakeCell.cases.find((c) => c.caseId === "commerce_refund")!;
    expect(refund.recommendation).toBe("HUMAN_REVIEW");
    expect(report.verdict).toBe("MATRIX_PASS");
  });
});
