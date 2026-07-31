/**
 * Internal seed only — no training, scraping, or external downloads.
 */

import { createKnowledgeRights } from "../knowledgeAcquisition/rightsEngine";
import { scoreKnowledgeQuality } from "../knowledgeAcquisition/qualityEngine";
import {
  createPromotionQueueEntry,
  EMPTY_PROMOTION_CHECKLIST,
} from "./promotionGates";
import type { PersistedAiDataPlatformState } from "./types";

export function buildAiDataPlatformSeedState(
  now = new Date().toISOString()
): PersistedAiDataPlatformState {
  const rights = createKnowledgeRights({
    status: "owned_internal",
    owner: "UMTUBA",
    license: "internal-platform",
    trainingPermission: true,
    modelCustomizationPermission: true,
    internalUse: true,
    redistributionPermission: false,
  });

  const quality = scoreKnowledgeQuality({
    title: "Internal translation UI dataset",
    contentPreview:
      "Governed App Shell and Learning UI translation pairs for future experiments.",
    hasMetadata: true,
    languageCount: 2,
    domainCount: 2,
    freshnessDays: 1,
    humanReviewed: true,
  });

  const dataset = {
    id: "ads_internal_translation_v1",
    name: "Internal Translation UI Dataset",
    version: "1.0.0",
    description:
      "Seed dataset linking Knowledge Acquisition internal UI assets (registry only).",
    owner: "platform",
    kind: "translation" as const,
    status: "approved" as const,
    sourceAssetIds: ["ka_app_shell_labels"],
    knowledgeSourceIds: ["ks_internal_app_shell_i18n"],
    translationSourceIds: ["ti_seed_ref"],
    learningSourceIds: [],
    codingSourceIds: [],
    commerceSourceIds: [],
    languages: ["en", "ar"],
    domains: ["translation", "general"] as const,
    rights,
    quality,
    eligibility: [
      "eligible_for_internal_reuse",
      "dataset_eligible",
      "eligible_for_model_customization",
      "eligible_for_training",
    ] as const,
    sensitivity: "internal" as const,
    statistics: {
      assetCount: 1,
      sizeBytes: 128,
      languageDistribution: { en: 1, ar: 1 },
      domainDistribution: { translation: 1, general: 1 },
    },
    createdAt: now,
    updatedAt: now,
  };

  const version = {
    id: "adv_internal_translation_1_0_0",
    datasetId: dataset.id,
    version: "1.0.0",
    parentVersion: null,
    createdFrom: "knowledge_acquisition_seed",
    changes: "Initial approved seed version.",
    sizeBytes: 128,
    languageDistribution: { en: 1, ar: 1 },
    domainDistribution: { translation: 1, general: 1 },
    qualityMetrics: quality,
    approved: true,
    createdAt: now,
    updatedAt: now,
  };

  const unknownRights = createKnowledgeRights({ status: "unknown" });
  const blockedDataset = {
    id: "ads_unknown_blocked",
    name: "Unknown Rights Blocked Dataset",
    version: "0.1.0",
    description: "Illustrates fail-closed experiment gating.",
    owner: "platform",
    kind: "mixed" as const,
    status: "draft" as const,
    sourceAssetIds: [],
    knowledgeSourceIds: ["ks_unknown_placeholder"],
    translationSourceIds: [],
    learningSourceIds: [],
    codingSourceIds: [],
    commerceSourceIds: [],
    languages: ["en"],
    domains: ["general"] as const,
    rights: unknownRights,
    quality: scoreKnowledgeQuality({
      title: "Blocked",
      contentPreview: "Unknown rights sample.",
      hasMetadata: true,
      languageCount: 1,
      domainCount: 1,
      freshnessDays: 30,
    }),
    eligibility: ["ineligible"] as const,
    sensitivity: "internal" as const,
    statistics: {
      assetCount: 0,
      sizeBytes: 0,
      languageDistribution: { en: 1 },
      domainDistribution: { general: 1 },
    },
    createdAt: now,
    updatedAt: now,
  };

  const blockedVersion = {
    id: "adv_unknown_blocked_0_1_0",
    datasetId: blockedDataset.id,
    version: "0.1.0",
    parentVersion: null,
    createdFrom: "seed",
    changes: "Unapproved draft.",
    sizeBytes: 0,
    languageDistribution: { en: 1 },
    domainDistribution: { general: 1 },
    qualityMetrics: blockedDataset.quality,
    approved: false,
    createdAt: now,
    updatedAt: now,
  };

  const evaluationSet = {
    id: "aes_translation_benchmark_v1",
    name: "Translation Benchmark V1",
    kind: "translation_benchmark" as const,
    description: "Contract for future translation eval — no execution in V1.",
    languages: ["en", "ar"],
    domains: ["translation"] as const,
    itemCount: 0,
    linkedDatasetIds: [dataset.id],
    status: "ready" as const,
    createdAt: now,
    updatedAt: now,
  };

  const experiment = {
    id: "aex_planned_translation_smoke",
    modelId: null,
    modelFamily: "umtuba-internal-translator",
    datasetVersionId: version.id,
    hyperparameters: { notes: "registry-only; no training run" },
    startedAt: null,
    finishedAt: null,
    metrics: {},
    artifactRefs: [],
    status: "planned" as const,
    owner: "platform",
    notes: "Placeholder experiment record. Training not implemented.",
    createdAt: now,
    updatedAt: now,
  };

  const model = {
    id: "amd_umtuba_translator_draft",
    family: "umtuba-internal-translator",
    version: "0.0.1-draft",
    provider: "umtuba-internal",
    architecture: "registry-placeholder",
    capabilities: ["translation_ui"],
    datasetVersionId: version.id,
    evaluationResults: {},
    releaseStatus: "draft" as const,
    rollbackTargetId: null,
    lifecycle: "draft" as const,
    experimentIds: [experiment.id],
    createdAt: now,
    updatedAt: now,
  };

  const promotion = createPromotionQueueEntry({
    id: "apq_translator_to_candidate",
    modelId: model.id,
    fromStatus: "draft",
    toStatus: "candidate",
    checklist: {
      ...EMPTY_PROMOTION_CHECKLIST,
      datasetApproved: true,
      rightsApproved: true,
      qualityApproved: true,
      evaluationApproved: false,
      humanApproved: false,
    },
    requestedBy: "system_seed",
    notes: "Incomplete checklist — promotion blocked until human + eval approval.",
    now,
  });

  return {
    schemaVersion: 1,
    updatedAt: now,
    datasets: [
      {
        ...dataset,
        domains: [...dataset.domains],
        eligibility: [...dataset.eligibility],
      },
      {
        ...blockedDataset,
        domains: [...blockedDataset.domains],
        eligibility: [...blockedDataset.eligibility],
      },
    ],
    versions: [version, blockedVersion],
    evaluationSets: [
      {
        ...evaluationSet,
        domains: [...evaluationSet.domains],
      },
    ],
    experiments: [experiment],
    models: [model],
    promotionQueue: [promotion],
  };
}
