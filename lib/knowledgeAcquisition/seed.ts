/**
 * Internal seed only — no external downloads, scraping, or partner API calls.
 */

import { classifyKnowledgeDomains } from "./classification";
import { contentFingerprint } from "./dedupe";
import { decideKnowledgeEligibility } from "./eligibility";
import { createAcquisitionHistoryEntry } from "./history";
import { createGraphEdge, createGraphNode } from "./knowledgeGraph";
import { detectPrivacyFindings } from "./privacyLayer";
import { scoreKnowledgeQuality } from "./qualityEngine";
import { createKnowledgeRights } from "./rightsEngine";
import type {
  KnowledgeDatasetRecord,
  KnowledgeDomain,
  KnowledgeSourceRecord,
  PersistedKnowledgeAcquisitionState,
} from "./types";

export function buildInternalSeedState(
  now = new Date().toISOString()
): PersistedKnowledgeAcquisitionState {
  const internalRights = createKnowledgeRights({
    status: "owned_internal",
    owner: "UMTUBA",
    license: "internal-platform",
    terms: "Internal platform content for governed reuse.",
    commercialUse: true,
    internalUse: true,
    modelCustomizationPermission: true,
    trainingPermission: true,
    redistributionPermission: false,
    attributionRequired: false,
  });

  const unknownRights = createKnowledgeRights({
    status: "unknown",
    owner: null,
    license: null,
  });

  const sourceInternal: KnowledgeSourceRecord = {
    id: "ks_internal_app_shell_i18n",
    name: "Internal App Shell i18n catalog",
    kind: "internal",
    description:
      "First-party App Shell UI strings already owned by UMTUBA (seed reference).",
    rights: internalRights,
    stage: "approved",
    domains: ["translation", "general"],
    languages: ["en", "ar"],
    createdAt: now,
    updatedAt: now,
    createdBy: "system_seed",
  };

  const sourceUnknown: KnowledgeSourceRecord = {
    id: "ks_unknown_placeholder",
    name: "Unknown rights placeholder",
    kind: "partner",
    description:
      "Illustrates fail-closed behavior when rights are unknown. Not training eligible.",
    rights: unknownRights,
    stage: "rights_checked",
    domains: ["general"],
    languages: ["en"],
    createdAt: now,
    updatedAt: now,
    createdBy: "system_seed",
  };

  const previewA =
    "UMTUBA App Shell navigation labels for Save, Cancel, and Home actions.";
  const domainsA = classifyKnowledgeDomains({
    title: "App Shell labels sample",
    contentPreview: previewA,
    hints: ["translation", "general"],
  });
  const qualityA = scoreKnowledgeQuality({
    title: "App Shell labels sample",
    contentPreview: previewA,
    hasMetadata: true,
    languageCount: 2,
    domainCount: domainsA.length,
    freshnessDays: 1,
    humanReviewed: true,
  });
  const privacyA = detectPrivacyFindings(previewA);
  const assetA = {
    id: "ka_app_shell_labels",
    sourceId: sourceInternal.id,
    title: "App Shell labels sample",
    contentFingerprint: contentFingerprint(previewA),
    contentPreview: previewA,
    mimeHint: "text/plain",
    domains: domainsA,
    languages: ["en", "ar"],
    stage: "dataset_eligible" as const,
    rights: internalRights,
    quality: qualityA,
    privacy: privacyA,
    eligibility: decideKnowledgeEligibility({
      stage: "dataset_eligible",
      rights: internalRights,
      quality: qualityA,
      privacy: privacyA,
    }),
    datasetIds: ["kd_internal_ui_v1"],
    createdAt: now,
    updatedAt: now,
  };

  const previewB =
    "Partner sample with unknown license terms — must stay fail closed.";
  const domainsB = classifyKnowledgeDomains({
    title: "Unknown rights sample",
    contentPreview: previewB,
  });
  const qualityB = scoreKnowledgeQuality({
    title: "Unknown rights sample",
    contentPreview: previewB,
    hasMetadata: true,
    languageCount: 1,
    domainCount: domainsB.length,
    freshnessDays: 30,
    humanReviewed: false,
  });
  const privacyB = detectPrivacyFindings(previewB);
  const assetB = {
    id: "ka_unknown_partner_sample",
    sourceId: sourceUnknown.id,
    title: "Unknown rights sample",
    contentFingerprint: contentFingerprint(previewB),
    contentPreview: previewB,
    mimeHint: "text/plain",
    domains: domainsB,
    languages: ["en"],
    stage: "rights_checked" as const,
    rights: unknownRights,
    quality: qualityB,
    privacy: privacyB,
    eligibility: decideKnowledgeEligibility({
      stage: "rights_checked",
      rights: unknownRights,
      quality: qualityB,
      privacy: privacyB,
    }),
    datasetIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const datasetDomains: KnowledgeDomain[] = ["translation", "general"];
  const dataset: KnowledgeDatasetRecord = {
    id: "kd_internal_ui_v1",
    version: "1.0.0",
    name: "Internal UI knowledge v1",
    sourceId: sourceInternal.id,
    rights: internalRights,
    qualitySummary: qualityA,
    languages: ["en", "ar"],
    domains: datasetDomains,
    sizeBytes: previewA.length,
    assetCount: 1,
    linkedAssetIds: [assetA.id],
    eligibility: assetA.eligibility,
    createdAt: now,
    updatedAt: now,
  };

  const sourceNode = createGraphNode({
    kind: "source",
    label: sourceInternal.name,
    refId: sourceInternal.id,
  });
  const assetNode = createGraphNode({
    kind: "asset",
    label: assetA.title,
    refId: assetA.id,
  });
  const datasetNode = createGraphNode({
    kind: "dataset",
    label: dataset.name,
    refId: dataset.id,
  });
  const edgeSourced = createGraphEdge({
    type: "sourced_from",
    fromNodeId: assetNode.id,
    toNodeId: sourceNode.id,
    detail: "Seed lineage",
  });
  const edgeContains = createGraphEdge({
    type: "dataset_contains",
    fromNodeId: datasetNode.id,
    toNodeId: assetNode.id,
  });

  return {
    schemaVersion: 1,
    updatedAt: now,
    sources: [sourceInternal, sourceUnknown],
    assets: [assetA, assetB],
    datasets: [dataset],
    graphNodes: [sourceNode, assetNode, datasetNode],
    graphEdges: [edgeSourced, edgeContains],
    history: [
      createAcquisitionHistoryEntry({
        entityType: "source",
        entityId: sourceInternal.id,
        action: "seeded_internal_source",
        actorId: "system_seed",
        detail: { kind: sourceInternal.kind },
        now,
      }),
      createAcquisitionHistoryEntry({
        entityType: "dataset",
        entityId: dataset.id,
        action: "seeded_dataset",
        actorId: "system_seed",
        detail: { version: dataset.version },
        now,
      }),
      createAcquisitionHistoryEntry({
        entityType: "rights",
        entityId: assetB.id,
        action: "rights_unknown_fail_closed",
        actorId: "system_seed",
        detail: { status: "unknown", trainingEligible: false },
        now,
      }),
    ],
  };
}
