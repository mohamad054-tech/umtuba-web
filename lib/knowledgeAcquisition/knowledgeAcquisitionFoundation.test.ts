import { afterEach, describe, expect, it } from "vitest";
import {
  assertAdvanceAcquisitionStage,
  assertRightsAllowTraining,
  canAdvanceAcquisitionStage,
  classifyKnowledgeDomains,
  contentFingerprint,
  createAcquisitionHistoryEntry,
  createGraphEdge,
  createGraphNode,
  createKnowledgeAcquisitionService,
  createKnowledgeRights,
  decideKnowledgeEligibility,
  detectPrivacyFindings,
  findDuplicateFingerprints,
  resetKnowledgeAcquisitionForTests,
  scoreKnowledgeQuality,
} from "./index";

afterEach(() => {
  resetKnowledgeAcquisitionForTests();
});

describe("Knowledge Acquisition Platform Foundation", () => {
  it("fail-closes unknown rights for training", () => {
    const unknown = createKnowledgeRights({ status: "unknown" });
    expect(unknown.trainingPermission).toBe(false);
    expect(unknown.modelCustomizationPermission).toBe(false);
    expect(unknown.internalUse).toBe(false);
    expect(assertRightsAllowTraining(unknown)).toBe(false);

    const owned = createKnowledgeRights({ status: "owned_internal" });
    expect(assertRightsAllowTraining(owned)).toBe(true);
  });

  it("decides eligibility with multi-flag fail-closed rules", () => {
    const quality = scoreKnowledgeQuality({
      title: "Lesson glossary",
      contentPreview: "Educational terminology for learning platform UI.",
      hasMetadata: true,
      languageCount: 1,
      domainCount: 1,
      freshnessDays: 2,
      humanReviewed: true,
    });
    const privacy = detectPrivacyFindings("clean educational text");
    const rights = createKnowledgeRights({ status: "owned_internal" });

    const early = decideKnowledgeEligibility({
      stage: "imported",
      rights,
      quality,
      privacy,
    });
    expect(early).toEqual(["eligible_for_internal_reuse"]);
    expect(early).not.toContain("eligible_for_training");

    const ready = decideKnowledgeEligibility({
      stage: "dataset_eligible",
      rights,
      quality,
      privacy,
    });
    expect(ready).toContain("dataset_eligible");
    expect(ready).toContain("eligible_for_training");

    const blocked = decideKnowledgeEligibility({
      stage: "dataset_eligible",
      rights: createKnowledgeRights({ status: "unknown" }),
      quality,
      privacy,
    });
    expect(blocked).toEqual(["ineligible"]);
  });

  it("registers sources and datasets in the service registry", () => {
    const svc = createKnowledgeAcquisitionService({
      ephemeral: true,
      seed: false,
    });
    const source = svc.registerSource({
      id: "ks_test_internal",
      name: "Test internal",
      kind: "internal",
      description: "Unit test source",
      rightsStatus: "owned_internal",
      languages: ["en"],
      domains: ["general"],
    });
    expect(svc.listSources()).toHaveLength(1);
    expect(source.stage).toBe("discovered");

    const asset = svc.importAsset({
      id: "ka_test_1",
      sourceId: source.id,
      title: "Programming notes",
      contentPreview: "TypeScript SDK documentation for internal API usage.",
      languages: ["en"],
    });
    expect(asset.domains).toContain("programming");
    expect(asset.stage).toBe("imported");

    let current = asset;
    for (const to of [
      "validated",
      "rights_checked",
      "quality_checked",
      "privacy_checked",
      "deduplicated",
      "classified",
      "approved",
    ] as const) {
      current = svc.advanceAssetStage({ assetId: current.id, to });
    }
    expect(current.stage).toBe("approved");

    const dataset = svc.registerDataset({
      id: "kd_test_v1",
      version: "1.0.0",
      name: "Test dataset",
      sourceId: source.id,
      assetIds: [current.id],
    });
    expect(dataset.linkedAssetIds).toEqual([current.id]);
    expect(svc.listDatasets()).toHaveLength(1);
    expect(svc.getDataset("kd_test_v1")?.version).toBe("1.0.0");
  });

  it("classifies domains from content hints", () => {
    expect(
      classifyKnowledgeDomains({
        title: "Medical manual",
        contentPreview: "clinical patient guidance",
      })
    ).toContain("medical");
    expect(
      classifyKnowledgeDomains({
        title: "Untitled",
        contentPreview: "zzz",
      })
    ).toEqual(["general"]);
  });

  it("scores quality dimensions deterministically", () => {
    const report = scoreKnowledgeQuality({
      title: "Doc",
      contentPreview: "Short",
      hasMetadata: false,
      languageCount: 0,
      domainCount: 0,
      freshnessDays: null,
    });
    expect(report.scoringMode).toBe("deterministic_v1");
    expect(report.blockingFindings).toContain("language_quality");
    expect(report.blockingFindings).toContain("metadata_quality");
    expect(report.dimensions.length).toBeGreaterThanOrEqual(10);
  });

  it("detects privacy contract findings", () => {
    const report = detectPrivacyFindings(
      "contact user@example.com with api_key=sk-abcdefg12345678 and password: hunter2"
    );
    expect(report.findings.some((f) => f.kind === "personal_information")).toBe(
      true
    );
    expect(report.findings.some((f) => f.kind === "api_keys")).toBe(true);
    expect(report.findings.some((f) => f.kind === "passwords")).toBe(true);
    expect(report.blocking).toBe(true);
  });

  it("deduplicates by content fingerprint", () => {
    const a = contentFingerprint("Hello   World");
    const b = contentFingerprint("hello world");
    expect(a).toBe(b);
    expect(findDuplicateFingerprints([a, b, "other"])).toEqual([a]);
  });

  it("enforces acquisition pipeline stage transitions", () => {
    expect(canAdvanceAcquisitionStage("discovered", "imported")).toBe(true);
    expect(canAdvanceAcquisitionStage("discovered", "approved")).toBe(false);
    expect(() =>
      assertAdvanceAcquisitionStage("imported", "approved")
    ).toThrow(/Invalid acquisition stage/);
  });

  it("records acquisition history and graph contracts", () => {
    const entry = createAcquisitionHistoryEntry({
      entityType: "source",
      entityId: "ks_x",
      action: "registered",
      actorId: "admin_1",
      detail: { where: "unit-test" },
      now: "2026-07-26T12:00:00.000Z",
    });
    expect(entry.actorId).toBe("admin_1");
    expect(entry.detail.where).toBe("unit-test");

    const node = createGraphNode({
      kind: "dataset",
      label: "D",
      refId: "kd_1",
    });
    const edge = createGraphEdge({
      type: "version_of",
      fromNodeId: node.id,
      toNodeId: "node_dataset_kd_0",
    });
    expect(edge.type).toBe("version_of");

    const svc = createKnowledgeAcquisitionService({ ephemeral: true });
    expect(svc.listHistory().length).toBeGreaterThan(0);
    expect(svc.getState().graphNodes.length).toBeGreaterThan(0);
  });
});
