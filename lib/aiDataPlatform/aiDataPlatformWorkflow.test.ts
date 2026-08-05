import { afterEach, describe, expect, it } from "vitest";
import {
  createKnowledgeRights,
  detectPrivacyFindings,
} from "../knowledgeAcquisition";
import {
  canTransitionApproval,
  createAiDataPlatformService,
  createAiDataWorkflowService,
  createAuditTrailEntry,
  resetAiDataPlatformForTests,
  resetAiDataWorkflowForTests,
  validateDatasetPrivacy,
  validateDatasetQualityForApproval,
  validateDatasetRights,
} from "./index";

afterEach(() => {
  resetAiDataWorkflowForTests();
  resetAiDataPlatformForTests();
});

describe("AI Data Platform Workflow & Approval", () => {
  it("runs dataset checks and approval workflow with audit", () => {
    const platform = createAiDataPlatformService({ ephemeral: true, seed: false });
    const wf = createAiDataWorkflowService({
      ephemeral: true,
      seed: false,
      platform,
    });

    const ds = platform.registerDataset({
      id: "ads_wf_1",
      name: "Workflow Dataset",
      version: "1.0.0",
      description: "Governed coding documentation for workflow approval tests.",
      kind: "coding",
      rightsStatus: "owned_internal",
      languages: ["en"],
      domains: ["programming"],
      status: "ready",
      eligibility: [
        "eligible_for_internal_reuse",
        "dataset_eligible",
        "eligible_for_training",
      ],
      sourceAssetIds: ["a1"],
    });
    platform.createDatasetVersion({
      id: "adv_wf_1",
      datasetId: ds.id,
      version: "1.0.0",
      changes: "initial",
      approved: true,
    });

    expect(wf.runValidate({ datasetId: ds.id, actorId: "admin" }).ok).toBe(
      true
    );
    expect(wf.runQualityCheck({ datasetId: ds.id }).ok).toBe(true);
    expect(wf.runRightsCheck({ datasetId: ds.id }).ok).toBe(true);
    expect(wf.runPrivacyCheck({ datasetId: ds.id }).ok).toBe(true);
    expect(wf.runEligibilityCheck({ datasetId: ds.id }).ok).toBe(true);

    const review = wf.submitForReview({
      datasetId: ds.id,
      actorId: "admin",
      reason: "ready for review",
    });
    expect(review.approvalState).toBe("review");

    const approved = wf.approveDataset({
      datasetId: ds.id,
      actorId: "approver",
      reason: "all gates passed",
    });
    expect(approved.approvalState).toBe("approved");

    const trail = wf.listAuditTrail();
    expect(trail.some((e) => e.action === "submit_review")).toBe(true);
    expect(trail.some((e) => e.action === "approve")).toBe(true);
    expect(trail[0]?.actorId).toBeTruthy();
  });

  it("rejects approval when rights/privacy gates fail", () => {
    const platform = createAiDataPlatformService({ ephemeral: true, seed: false });
    const wf = createAiDataWorkflowService({
      ephemeral: true,
      seed: false,
      platform,
    });
    const ds = platform.registerDataset({
      id: "ads_bad",
      name: "Bad",
      version: "0.1.0",
      description: "Unknown rights sample",
      kind: "mixed",
      rightsStatus: "unknown",
      languages: ["en"],
      domains: ["general"],
      eligibility: ["ineligible"],
    });
    expect(wf.runRightsCheck({ datasetId: ds.id }).ok).toBe(false);
    expect(wf.runEligibilityCheck({ datasetId: ds.id }).ok).toBe(false);
    wf.runValidate({ datasetId: ds.id });
    wf.runQualityCheck({ datasetId: ds.id });
    wf.runPrivacyCheck({ datasetId: ds.id });
    wf.submitForReview({ datasetId: ds.id });
    expect(() =>
      wf.approveDataset({ datasetId: ds.id, actorId: "x" })
    ).toThrow(/Cannot approve/);
  });

  it("supports version workflow, clone, experiment and model candidates", () => {
    const platform = createAiDataPlatformService({ ephemeral: true });
    const wf = createAiDataWorkflowService({
      ephemeral: true,
      platform,
    });

    const versionWf = wf.createVersionWithWorkflow({
      id: "adv_wf_new",
      datasetId: "ads_internal_translation_v1",
      version: "1.1.0",
      parentVersion: "1.0.0",
      diffSummary: "Add terminology coverage",
      changes: "Bump patch with terminology",
      actorId: "admin",
    });
    expect(versionWf.lifecycle).toBe("draft");
    expect(versionWf.rollbackCandidate).toBe(true);

    const cloned = wf.cloneDataset({
      sourceDatasetId: "ads_internal_translation_v1",
      newDatasetId: "ads_clone_1",
      newVersionId: "adv_clone_1",
      actorId: "admin",
    });
    expect(cloned.workflow.cloneOfDatasetId).toBe(
      "ads_internal_translation_v1"
    );
    expect(cloned.workflow.approvalState).toBe("draft");

    const exp = wf.createExperimentCandidate({
      id: "aexc_1",
      candidateDatasetId: "ads_internal_translation_v1",
      candidateDatasetVersionId: "adv_internal_translation_1_0_0",
      expectedMetrics: { bleu: 0.4 },
      owner: "platform",
    });
    expect(exp.status).toBe("candidate");

    const model = wf.createModelCandidate({
      id: "amc_1",
      model: {
        id: "amd_cand_1",
        family: "umtuba-translator",
        version: "0.1.0-candidate",
        provider: "umtuba-internal",
        architecture: "registry-placeholder",
      },
      datasetVersionId: "adv_internal_translation_1_0_0",
      evaluationSetId: "aes_translation_benchmark_v1",
    });
    expect(model.model.lifecycle).toBe("candidate");
    expect(model.candidate.promotionEligible).toBe(true);

    const dash = wf.dashboard();
    expect(dash.approvedDatasets.length).toBeGreaterThan(0);
    expect(dash.experimentCandidates.length).toBe(1);
    expect(dash.modelCandidates.length).toBe(1);
  });

  it("validates rights, privacy, eligibility contracts", () => {
    const unknown = validateDatasetRights({
      rights: createKnowledgeRights({ status: "unknown" }),
      eligibility: ["ineligible"],
      sourceAssetIds: [],
    });
    expect(unknown.ok).toBe(false);
    expect(unknown.blockers).toContain("rights_unknown");

    const expired = validateDatasetRights({
      rights: createKnowledgeRights({
        status: "licensed_ok",
        expiration: "2020-01-01T00:00:00.000Z",
        internalUse: true,
      }),
      eligibility: ["dataset_eligible"],
      sourceAssetIds: ["a"],
      now: "2026-07-30T00:00:00.000Z",
    });
    expect(expired.blockers).toContain("rights_expired");

    const unapproved = validateDatasetRights({
      rights: createKnowledgeRights({ status: "owned_internal" }),
      eligibility: ["dataset_eligible"],
      sourceAssetIds: ["a"],
      unapprovedAssetIds: ["a"],
    });
    expect(unapproved.blockers.some((b) => b.startsWith("unapproved_assets"))).toBe(
      true
    );

    const privacy = validateDatasetPrivacy(
      detectPrivacyFindings("password: secret123")
    );
    expect(privacy.ok).toBe(false);
  });

  it("enforces approval transitions and records audit entries", () => {
    expect(canTransitionApproval("draft", "review")).toBe(true);
    expect(canTransitionApproval("draft", "approved")).toBe(false);
    const entry = createAuditTrailEntry({
      action: "reject",
      actorId: "r1",
      reason: "rights",
      previousState: "review",
      newState: "rejected",
      datasetId: "ads_x",
    });
    expect(entry.previousState).toBe("review");
    expect(entry.newState).toBe("rejected");
  });

  it("quality validation blocks incomplete metadata", () => {
    const platform = createAiDataPlatformService({ ephemeral: true, seed: false });
    const ds = platform.registerDataset({
      id: "ads_q",
      name: "Q",
      version: "1",
      description: "",
      kind: "mixed",
      rightsStatus: "owned_internal",
      languages: [],
      domains: [],
      eligibility: ["eligible_for_internal_reuse"],
    });
    const report = validateDatasetQualityForApproval({
      quality: ds.quality,
      privacy: { findings: [], blocking: false, notes: "" },
      rights: ds.rights,
      eligibility: ds.eligibility,
      languages: ds.languages,
      domains: ds.domains,
      description: ds.description,
    });
    expect(report.ok).toBe(false);
    expect(report.blockers).toContain("metadata_description_missing");
  });
});
