export type {
  AcquisitionHistoryEntry,
  AcquisitionStage,
  KnowledgeAssetRecord,
  KnowledgeDatasetRecord,
  KnowledgeDomain,
  KnowledgeEligibility,
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
  KnowledgeGraphNodeKind,
  KnowledgeQualityReport,
  KnowledgeRelationType,
  KnowledgeRightsRecord,
  KnowledgeSourceKind,
  KnowledgeSourceRecord,
  PersistedKnowledgeAcquisitionState,
  PrivacyFinding,
  PrivacyFindingKind,
  PrivacyReport,
  QualityDimensionId,
  QualityDimensionScore,
  RightsStatus,
} from "./types";

export {
  assertRightsAllowCustomization,
  assertRightsAllowTraining,
  createKnowledgeRights,
} from "./rightsEngine";

export { decideKnowledgeEligibility } from "./eligibility";
export { scoreKnowledgeQuality } from "./qualityEngine";
export { detectPrivacyFindings } from "./privacyLayer";
export { classifyKnowledgeDomains } from "./classification";
export {
  ACQUISITION_PIPELINE_ORDER,
  assertAdvanceAcquisitionStage,
  canAdvanceAcquisitionStage,
} from "./pipeline";
export { contentFingerprint, findDuplicateFingerprints } from "./dedupe";
export { createGraphEdge, createGraphNode } from "./knowledgeGraph";
export { createAcquisitionHistoryEntry } from "./history";
export { buildInternalSeedState } from "./seed";
export {
  emptyKnowledgeAcquisitionState,
  knowledgeAcquisitionStorePath,
  readPersistedKnowledgeAcquisitionState,
  resolveKnowledgeAcquisitionDataDir,
  writePersistedKnowledgeAcquisitionState,
} from "./fileStore";
export {
  createKnowledgeAcquisitionService,
  getKnowledgeAcquisitionService,
  resetKnowledgeAcquisitionForTests,
  type KnowledgeAcquisitionService,
} from "./service";
