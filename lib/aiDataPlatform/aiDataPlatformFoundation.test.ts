import { afterEach, describe, expect, it } from "vitest";
import {
  assertDatasetEligibleForExperiment,
  canPromoteModel,
  createAiDataPlatformService,
  createPromotionQueueEntry,
  EMPTY_PROMOTION_CHECKLIST,
  evaluatePromotionGates,
  getDatasetBuilderContract,
  hasExperimentEligibility,
  listDatasetBuilderContracts,
  resetAiDataPlatformForTests,
  summarizeRightsForDataset,
} from "./index";
import { createKnowledgeRights } from "../knowledgeAcquisition/rightsEngine";

afterEach(() => {
  resetAiDataPlatformForTests();
});

describe("AI Data Platform Foundation", () => {
  it("registers datasets and versions", () => {
    const svc = createAiDataPlatformService({ ephemeral: true, seed: false });
    const ds = svc.registerDataset({
      id: "ads_test",
      name: "Test Dataset",
      version: "1.0.0",
      description: "Unit test dataset for coding domain.",
      kind: "coding",
      rightsStatus: "owned_internal",
      languages: ["en"],
      domains: ["programming"],
      status: "approved",
      eligibility: [
        "eligible_for_internal_reuse",
        "dataset_eligible",
        "eligible_for_training",
      ],
      sourceAssetIds: ["a1"],
    });
    expect(svc.listDatasets()).toHaveLength(1);
    expect(ds.kind).toBe("coding");

    const ver = svc.createDatasetVersion({
      id: "adv_test_1",
      datasetId: ds.id,
      version: "1.1.0",
      parentVersion: "1.0.0",
      createdFrom: "unit-test",
      changes: "Bump version",
      approved: true,
    });
    expect(ver.parentVersion).toBe("1.0.0");
    expect(svc.getDataset(ds.id)?.version).toBe("1.1.0");
  });

  it("lists dataset builder contracts without training", () => {
    expect(listDatasetBuilderContracts().length).toBe(8);
    expect(getDatasetBuilderContract("translation")?.label).toContain(
      "Translation"
    );
  });

  it("registers experiments only when dataset is eligible", () => {
    const svc = createAiDataPlatformService({ ephemeral: true });
    const ok = svc.registerExperiment({
      id: "aex_ok",
      modelFamily: "test-family",
      datasetVersionId: "adv_internal_translation_1_0_0",
      notes: "planned only",
    });
    expect(ok.status).toBe("planned");

    const blocked = svc.registerExperiment({
      id: "aex_blocked",
      modelFamily: "test-family",
      datasetVersionId: "adv_unknown_blocked_0_1_0",
    });
    expect(blocked.status).toBe("blocked");
    expect(blocked.notes).toMatch(/Blocked/);
  });

  it("registers models and promotion queue with fail-closed gates", () => {
    const svc = createAiDataPlatformService({ ephemeral: true, seed: false });
    const model = svc.registerModel({
      id: "amd_test",
      family: "umtuba-test",
      version: "0.0.1",
      provider: "umtuba-internal",
      architecture: "placeholder",
    });
    expect(model.lifecycle).toBe("draft");

    const incomplete = svc.enqueuePromotion({
      id: "apq_1",
      modelId: model.id,
      toStatus: "candidate",
      checklist: EMPTY_PROMOTION_CHECKLIST,
    });
    expect(incomplete.eligible).toBe(false);
    expect(incomplete.blockers).toContain("human_approval_required");

    const complete = evaluatePromotionGates({
      fromStatus: "draft",
      toStatus: "candidate",
      checklist: {
        datasetApproved: true,
        rightsApproved: true,
        qualityApproved: true,
        evaluationApproved: true,
        humanApproved: true,
      },
    });
    expect(complete.eligible).toBe(true);
    expect(canPromoteModel("draft", "production")).toBe(false);
  });

  it("integrates rights and eligibility fail-closed", () => {
    const svc = createAiDataPlatformService({ ephemeral: true });
    const dataset = svc.getDataset("ads_unknown_blocked")!;
    const version = svc.getVersion("adv_unknown_blocked_0_1_0")!;
    const gate = assertDatasetEligibleForExperiment({ dataset, version });
    expect(gate.allowed).toBe(false);
    expect(gate.blockers.length).toBeGreaterThan(0);

    const rights = summarizeRightsForDataset(
      createKnowledgeRights({ status: "unknown" })
    );
    expect(rights.trainingAllowed).toBe(false);
    expect(hasExperimentEligibility(["ineligible"])).toBe(false);
    expect(
      hasExperimentEligibility(["dataset_eligible", "eligible_for_training"])
    ).toBe(true);
  });

  it("registers evaluation sets as contracts only", () => {
    const svc = createAiDataPlatformService({ ephemeral: true, seed: false });
    const set = svc.registerEvaluationSet({
      id: "aes_safety",
      name: "Safety Benchmark",
      kind: "safety_benchmark",
      description: "No execution in V1",
      languages: ["en"],
    });
    expect(set.status).toBe("draft");
    expect(svc.listEvaluationSets()).toHaveLength(1);
  });

  it("creates promotion queue entries with checklist", () => {
    const entry = createPromotionQueueEntry({
      id: "apq_x",
      modelId: "amd_x",
      fromStatus: "candidate",
      toStatus: "internal_testing",
      checklist: {
        datasetApproved: true,
        rightsApproved: true,
        qualityApproved: true,
        evaluationApproved: true,
        humanApproved: true,
      },
    });
    expect(entry.eligible).toBe(true);
  });
});
