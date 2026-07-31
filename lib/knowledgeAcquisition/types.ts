/**
 * UMTUBA Knowledge Acquisition Platform Foundation V1 — domain contracts.
 * Governance for long-term knowledge reuse. Not model training. Not scraping.
 */

export type KnowledgeSourceKind =
  | "internal"
  | "partner"
  | "purchased"
  | "open"
  | "public_domain"
  | "government"
  | "customer_import"
  | "ai_generated"
  | "human_authored"
  | "translation_partner"
  | "voice_partner"
  | "education_partner"
  | "developer_dataset"
  | "documentation"
  | "video"
  | "audio"
  | "images"
  | "documents"
  | "code";

export type AcquisitionStage =
  | "discovered"
  | "imported"
  | "validated"
  | "rights_checked"
  | "quality_checked"
  | "privacy_checked"
  | "deduplicated"
  | "classified"
  | "approved"
  | "dataset_eligible"
  | "rejected";

export type KnowledgeDomain =
  | "translation"
  | "programming"
  | "learning"
  | "commerce"
  | "creator"
  | "live"
  | "world"
  | "games"
  | "documents"
  | "legal"
  | "medical"
  | "finance"
  | "science"
  | "geography"
  | "media"
  | "general";

export type RightsStatus =
  | "owned_internal"
  | "licensed_ok"
  | "licensed_restricted"
  | "public_domain"
  | "open_license"
  | "customer_owned"
  | "restricted"
  | "unknown";

export type KnowledgeEligibility =
  | "eligible_for_internal_reuse"
  | "eligible_for_model_customization"
  | "eligible_for_training"
  | "eligible_for_redistribution"
  | "dataset_eligible"
  | "ineligible";

export type PrivacyFindingKind =
  | "personal_information"
  | "secrets"
  | "passwords"
  | "api_keys"
  | "financial_information"
  | "medical_information"
  | "children_data"
  | "restricted_information";

export type QualityDimensionId =
  | "completeness"
  | "consistency"
  | "freshness"
  | "reliability"
  | "terminology_quality"
  | "language_quality"
  | "technical_quality"
  | "media_quality"
  | "metadata_quality"
  | "confidence"
  | "human_review";

export type KnowledgeRightsRecord = {
  status: RightsStatus;
  owner: string | null;
  license: string | null;
  terms: string | null;
  expiration: string | null;
  commercialUse: boolean;
  internalUse: boolean;
  modelCustomizationPermission: boolean;
  trainingPermission: boolean;
  redistributionPermission: boolean;
  attributionRequired: boolean;
  attributionNotes: string | null;
  sensitiveRestrictions: string[];
};

export type QualityDimensionScore = {
  id: QualityDimensionId;
  score: number;
  weight: number;
  detail: string;
  blocking: boolean;
};

export type KnowledgeQualityReport = {
  overallScore: number;
  dimensions: QualityDimensionScore[];
  warnings: string[];
  blockingFindings: string[];
  scoringMode: "deterministic_v1";
  notes: string;
};

export type PrivacyFinding = {
  kind: PrivacyFindingKind;
  severity: "info" | "warning" | "blocking";
  detail: string;
  matchedFragment: string | null;
};

export type PrivacyReport = {
  findings: PrivacyFinding[];
  blocking: boolean;
  notes: string;
};

export type KnowledgeSourceRecord = {
  id: string;
  name: string;
  kind: KnowledgeSourceKind;
  description: string;
  rights: KnowledgeRightsRecord;
  stage: AcquisitionStage;
  domains: KnowledgeDomain[];
  languages: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
};

export type KnowledgeAssetRecord = {
  id: string;
  sourceId: string;
  title: string;
  contentFingerprint: string;
  contentPreview: string;
  mimeHint: string | null;
  domains: KnowledgeDomain[];
  languages: string[];
  stage: AcquisitionStage;
  rights: KnowledgeRightsRecord;
  quality: KnowledgeQualityReport;
  privacy: PrivacyReport;
  eligibility: KnowledgeEligibility[];
  datasetIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeDatasetRecord = {
  id: string;
  version: string;
  name: string;
  sourceId: string;
  rights: KnowledgeRightsRecord;
  qualitySummary: KnowledgeQualityReport;
  languages: string[];
  domains: KnowledgeDomain[];
  sizeBytes: number;
  assetCount: number;
  linkedAssetIds: string[];
  eligibility: KnowledgeEligibility[];
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeRelationType =
  | "derived_from"
  | "part_of"
  | "translates"
  | "media_of"
  | "version_of"
  | "sourced_from"
  | "dataset_contains";

export type KnowledgeGraphNodeKind =
  | "source"
  | "asset"
  | "dataset"
  | "translation"
  | "media"
  | "version";

export type KnowledgeGraphNode = {
  id: string;
  kind: KnowledgeGraphNodeKind;
  label: string;
  refId: string;
};

export type KnowledgeGraphEdge = {
  id: string;
  type: KnowledgeRelationType;
  fromNodeId: string;
  toNodeId: string;
  detail: string | null;
};

export type AcquisitionHistoryEntry = {
  id: string;
  entityType: "source" | "asset" | "dataset" | "rights" | "quality" | "privacy";
  entityId: string;
  action: string;
  actorId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
};

export type PersistedKnowledgeAcquisitionState = {
  schemaVersion: 1;
  updatedAt: string;
  sources: KnowledgeSourceRecord[];
  assets: KnowledgeAssetRecord[];
  datasets: KnowledgeDatasetRecord[];
  graphNodes: KnowledgeGraphNode[];
  graphEdges: KnowledgeGraphEdge[];
  history: AcquisitionHistoryEntry[];
};
