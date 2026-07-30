/**
 * AI Data Platform Workflow & Dataset Approval V1 — additive contracts.
 * Operational lifecycle without training, fine-tuning, or inference.
 */

import type {
  KnowledgeEligibility,
  KnowledgeQualityReport,
  KnowledgeRightsRecord,
  PrivacyReport,
} from "../../knowledgeAcquisition/types";
import type {
  AiDatasetRecord,
  ExperimentStatus,
} from "../types";

export type DatasetApprovalState =
  | "draft"
  | "review"
  | "needs_changes"
  | "approved"
  | "rejected"
  | "archived";

export type DatasetWorkflowAction =
  | "create"
  | "validate"
  | "quality_check"
  | "rights_check"
  | "privacy_check"
  | "eligibility_check"
  | "submit_review"
  | "request_changes"
  | "approve"
  | "reject"
  | "archive"
  | "clone"
  | "version"
  | "create_experiment_candidate"
  | "create_model_candidate";

export type ValidationCheckResult = {
  ok: boolean;
  blockers: string[];
  warnings: string[];
  checkedAt: string;
};

export type DatasetWorkflowChecks = {
  validated: ValidationCheckResult | null;
  quality: ValidationCheckResult | null;
  rights: ValidationCheckResult | null;
  privacy: ValidationCheckResult | null;
  eligibility: ValidationCheckResult | null;
};

export type DatasetWorkflowRecord = {
  datasetId: string;
  approvalState: DatasetApprovalState;
  checks: DatasetWorkflowChecks;
  rejectionReason: string | null;
  cloneOfDatasetId: string | null;
  updatedAt: string;
};

export type VersionLifecycle =
  | "draft"
  | "review"
  | "approved"
  | "rollback_candidate"
  | "superseded"
  | "archived";

export type VersionApprovalEvent = {
  id: string;
  action: string;
  actorId: string | null;
  reason: string | null;
  fromState: VersionLifecycle | null;
  toState: VersionLifecycle;
  createdAt: string;
};

export type DatasetVersionWorkflowRecord = {
  versionId: string;
  datasetId: string;
  lifecycle: VersionLifecycle;
  diffSummary: string;
  changeHistory: string[];
  approvalHistory: VersionApprovalEvent[];
  rollbackCandidate: boolean;
  updatedAt: string;
};

export type ExperimentCandidateRecord = {
  id: string;
  candidateDatasetId: string;
  candidateDatasetVersionId: string;
  candidateModelId: string | null;
  evaluationSetId: string | null;
  expectedMetrics: Record<string, number>;
  owner: string | null;
  status: ExperimentStatus | "candidate";
  artifactRefs: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelCandidateRecord = {
  id: string;
  modelId: string;
  datasetVersionId: string;
  evaluationSetId: string | null;
  promotionEligible: boolean;
  promotionBlockers: string[];
  approvalState: DatasetApprovalState;
  rollbackTargetId: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditTrailEntry = {
  id: string;
  actorId: string | null;
  timestamp: string;
  action: DatasetWorkflowAction | string;
  reason: string | null;
  previousState: string | null;
  newState: string | null;
  datasetId: string | null;
  versionId: string | null;
  detail: Record<string, unknown>;
};

export type PersistedAiDataWorkflowState = {
  schemaVersion: 1;
  updatedAt: string;
  datasets: DatasetWorkflowRecord[];
  versions: DatasetVersionWorkflowRecord[];
  experimentCandidates: ExperimentCandidateRecord[];
  modelCandidates: ModelCandidateRecord[];
  auditTrail: AuditTrailEntry[];
};

export type ApprovalTransitionInput = {
  dataset: AiDatasetRecord;
  workflow: DatasetWorkflowRecord;
  to: DatasetApprovalState;
  actorId?: string | null;
  reason?: string | null;
  now?: string;
};

export type RightsValidationInput = {
  rights: KnowledgeRightsRecord;
  eligibility: KnowledgeEligibility[];
  sourceAssetIds: string[];
  unapprovedAssetIds?: string[];
  now?: string;
};

export type QualityValidationInput = {
  quality: KnowledgeQualityReport;
  privacy: PrivacyReport;
  rights: KnowledgeRightsRecord;
  eligibility: KnowledgeEligibility[];
  languages: string[];
  domains: string[];
  description: string;
  minimumOverallScore?: number;
};

export type WorkflowDashboardSnapshot = {
  draftDatasets: AiDatasetRecord[];
  reviewQueue: AiDatasetRecord[];
  approvedDatasets: AiDatasetRecord[];
  rejectedDatasets: AiDatasetRecord[];
  modelCandidates: ModelCandidateRecord[];
  experimentCandidates: ExperimentCandidateRecord[];
  promotionQueueCount: number;
};
