/**
 * Translation Intelligence Foundation V1 — domain contracts.
 * Learning/quality layer over approved translations. No model training.
 */

import type { StudioLanguageCode } from "../types";

export type IntelligenceContentType =
  | "ui_text"
  | "document_text"
  | "subtitle_segment"
  | "voice_script"
  | "dubbing_segment";

export type ProvenanceType =
  | "human_authored"
  | "internal_ai_suggestion"
  | "external_translation_service"
  | "imported_customer_translation"
  | "subtitle_transcription"
  | "speech_translation"
  | "manual_revision";

export type UsageRightsStatus =
  | "owned_internal"
  | "licensed_reuse_ok"
  | "licensed_project_only"
  | "restricted"
  | "unknown";

export type TrustLevel =
  | "trusted_approved"
  | "trusted_internal"
  | "untrusted_candidate"
  | "rejected";

export type IntelligenceEligibility =
  | "eligible_for_translation_memory"
  | "eligible_for_quality_analysis"
  | "eligible_for_prompt_examples"
  | "eligible_for_model_customization"
  | "ineligible";

export type FeedbackOutcome =
  | "accepted_without_edits"
  | "accepted_with_minor_edits"
  | "accepted_with_major_edits"
  | "rejected"
  | "corrected_terminology"
  | "corrected_meaning"
  | "corrected_style"
  | "corrected_timing"
  | "corrected_pronunciation";

export type StyleProfileId =
  | "platform_ui"
  | "learning_educational"
  | "commerce_product"
  | "legal_formal"
  | "marketing_friendly"
  | "subtitles_concise"
  | "dubbing_natural";

export type ContentSensitivity = "public" | "internal" | "confidential" | "restricted";

export type ProvenanceRecord = {
  type: ProvenanceType;
  providerName: string | null;
  providerModel: string | null;
  originalSourceOwnership: string | null;
  attributionNotes: string | null;
  rawResponseRef: string | null;
  rawResponseHash: string | null;
};

export type UsageRightsRecord = {
  status: UsageRightsStatus;
  permissionReuseInternally: boolean;
  permissionModelCustomization: boolean;
  notes: string | null;
};

export type QualityDimensionId =
  | "terminology_consistency"
  | "source_meaning_coverage"
  | "target_fluency"
  | "formatting_preservation"
  | "placeholder_preservation"
  | "punctuation_capitalization"
  | "language_leakage"
  | "subtitle_timing_fitness"
  | "dubbing_duration_fitness";

export type QualityDimensionScore = {
  id: QualityDimensionId;
  score: number;
  weight: number;
  warning: string | null;
  blocking: boolean;
  detail: string;
};

export type QualityScoreReport = {
  overallScore: number;
  dimensions: QualityDimensionScore[];
  warnings: string[];
  blockingFindings: string[];
  /** Deterministic checks are authoritative for blockers. */
  scoringMode: "deterministic_v1";
  notes: string;
};

export type StyleProfile = {
  id: StyleProfileId;
  label: string;
  tone: string;
  formality: "low" | "medium" | "high";
  sentenceLengthPreference: "short" | "medium" | "flexible";
  terminologyStrictness: "strict" | "guided" | "flexible";
  punctuationPreferences: string;
  allowedAdaptationLevel: "literal" | "light" | "adaptive";
  subtitleConstraints: string | null;
  dubbingConstraints: string | null;
};

export type MediaIntelligenceMetadata = {
  mediaAssetId: string;
  speakerIdOrLabel: string | null;
  segmentId: string;
  sourceStartMs: number | null;
  sourceEndMs: number | null;
  transcriptConfidence: number | null;
  approvedTranscript: string | null;
  approvedTranslation: string | null;
  targetSpeechDurationMs: number | null;
  pronunciationNotes: string | null;
  namedEntityPronunciation: string | null;
  lipSyncRelevance: "none" | "low" | "high" | null;
  voiceConsentStatus: "granted" | "denied" | "unknown" | "not_applicable";
};

export type CorrectionFeedback = {
  outcome: FeedbackOutcome;
  candidateText: string | null;
  approvedText: string;
  editDistance: number;
  notes: string | null;
  recordedAt: string;
  recordedBy: string | null;
};

export type TranslationIntelligenceRecord = {
  id: string;
  /** Stable identity for idempotent indexing: valueId + version */
  approvedValueId: string;
  approvedVersion: number;
  sourceText: string;
  approvedTargetText: string;
  sourceLocale: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  namespaceId: string | null;
  domain: string | null;
  contentType: IntelligenceContentType;
  terminologyRefs: string[];
  styleProfileId: StyleProfileId;
  provenance: ProvenanceRecord;
  suggestionProvenance: ProvenanceRecord | null;
  reviewerId: string | null;
  approverId: string | null;
  quality: QualityScoreReport;
  createdAt: string;
  approvedAt: string;
  usageRights: UsageRightsRecord;
  trustLevel: TrustLevel;
  sensitivity: ContentSensitivity;
  eligibility: IntelligenceEligibility[];
  feedback: CorrectionFeedback | null;
  media: MediaIntelligenceMetadata | null;
  sourceFingerprint: string;
};

export type IntelligenceIndexEntry = {
  id: string;
  recordId: string;
  sourceFingerprint: string;
  domainTags: string[];
  terminologyUsage: string[];
  approvedTargetVariants: string[];
  qualityHistory: number[];
  reuseCount: number;
  reviewerCorrections: number;
  updatedAt: string;
};

export type ExternalTranslationImportCandidate = {
  id: string;
  serviceName: string;
  providerModel: string | null;
  sourceText: string;
  candidateText: string;
  sourceLocale: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  rawResponseRef: string;
  rawResponseHash: string;
  trustLevel: "untrusted_candidate";
  status: "pending_review";
  createdAt: string;
};

export type PersistedIntelligenceState = {
  schemaVersion: 1;
  updatedAt: string;
  records: TranslationIntelligenceRecord[];
  index: IntelligenceIndexEntry[];
  externalCandidates: ExternalTranslationImportCandidate[];
};
