/**
 * UMTUBA AI Data Platform & Model Registry Foundation V1 — domain contracts.
 * Lifecycle registry for future internal models. Not training. Not inference.
 */

import type {
  KnowledgeDomain,
  KnowledgeEligibility,
  KnowledgeRightsRecord,
  KnowledgeQualityReport,
} from "../knowledgeAcquisition/types";

export type DatasetKind =
  | "translation"
  | "learning"
  | "coding"
  | "commerce"
  | "media"
  | "conversation"
  | "evaluation"
  | "mixed";

export type DatasetStatus =
  | "draft"
  | "building"
  | "ready"
  | "approved"
  | "deprecated"
  | "archived";

export type ContentSensitivity =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

export type EvaluationSetKind =
  | "translation_benchmark"
  | "coding_benchmark"
  | "learning_benchmark"
  | "commerce_benchmark"
  | "general_benchmark"
  | "safety_benchmark"
  | "regression_benchmark";

export type ExperimentStatus =
  | "planned"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "blocked";

export type ModelLifecycle =
  | "draft"
  | "candidate"
  | "internal_testing"
  | "approved"
  | "production"
  | "deprecated"
  | "archived";

export type PromotionDecision = ModelLifecycle;

export type DatasetStatistics = {
  assetCount: number;
  sizeBytes: number;
  languageDistribution: Record<string, number>;
  domainDistribution: Record<string, number>;
};

export type AiDatasetRecord = {
  id: string;
  name: string;
  version: string;
  description: string;
  owner: string | null;
  kind: DatasetKind;
  status: DatasetStatus;
  sourceAssetIds: string[];
  knowledgeSourceIds: string[];
  translationSourceIds: string[];
  learningSourceIds: string[];
  codingSourceIds: string[];
  commerceSourceIds: string[];
  languages: string[];
  domains: KnowledgeDomain[];
  rights: KnowledgeRightsRecord;
  quality: KnowledgeQualityReport;
  eligibility: KnowledgeEligibility[];
  sensitivity: ContentSensitivity;
  statistics: DatasetStatistics;
  createdAt: string;
  updatedAt: string;
};

export type DatasetVersionRecord = {
  id: string;
  datasetId: string;
  version: string;
  parentVersion: string | null;
  createdFrom: string | null;
  changes: string;
  sizeBytes: number;
  languageDistribution: Record<string, number>;
  domainDistribution: Record<string, number>;
  qualityMetrics: KnowledgeQualityReport;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DatasetBuilderContract = {
  kind: DatasetKind;
  label: string;
  description: string;
  requiredSourceKinds: string[];
  notes: string;
};

export type EvaluationSetRecord = {
  id: string;
  name: string;
  kind: EvaluationSetKind;
  description: string;
  languages: string[];
  domains: KnowledgeDomain[];
  itemCount: number;
  linkedDatasetIds: string[];
  status: "draft" | "ready" | "approved" | "deprecated";
  createdAt: string;
  updatedAt: string;
};

export type ExperimentRecord = {
  id: string;
  modelId: string | null;
  modelFamily: string;
  datasetVersionId: string;
  hyperparameters: Record<string, unknown>;
  startedAt: string | null;
  finishedAt: string | null;
  metrics: Record<string, number>;
  artifactRefs: string[];
  status: ExperimentStatus;
  owner: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelRecord = {
  id: string;
  family: string;
  version: string;
  provider: string;
  architecture: string;
  capabilities: string[];
  datasetVersionId: string | null;
  evaluationResults: Record<string, number>;
  releaseStatus: ModelLifecycle;
  rollbackTargetId: string | null;
  lifecycle: ModelLifecycle;
  experimentIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type PromotionGateChecklist = {
  datasetApproved: boolean;
  rightsApproved: boolean;
  qualityApproved: boolean;
  evaluationApproved: boolean;
  humanApproved: boolean;
};

export type PromotionQueueEntry = {
  id: string;
  modelId: string;
  fromStatus: ModelLifecycle;
  toStatus: ModelLifecycle;
  checklist: PromotionGateChecklist;
  eligible: boolean;
  blockers: string[];
  requestedBy: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PersistedAiDataPlatformState = {
  schemaVersion: 1;
  updatedAt: string;
  datasets: AiDatasetRecord[];
  versions: DatasetVersionRecord[];
  evaluationSets: EvaluationSetRecord[];
  experiments: ExperimentRecord[];
  models: ModelRecord[];
  promotionQueue: PromotionQueueEntry[];
};
