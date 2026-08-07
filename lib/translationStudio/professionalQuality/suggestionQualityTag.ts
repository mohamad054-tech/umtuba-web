/**
 * Suggestion quality metadata tagging for professional pipeline V1.
 * Stored in existing suggestion.quality jsonb — no DB migration.
 */

import type {
  SuggestionQualityMetadata,
  SuggestionAiMetadata,
} from "../types";
import type { ProfessionalTranslationQualityReport } from "./qualityReport";
import type { ProfessionalReviewObservation } from "./observability";

export const PROFESSIONAL_QUALITY_SUGGESTION_TAG = "professional_quality_v1" as const;

export type ProfessionalQualitySuggestionEnvelope = {
  tag: typeof PROFESSIONAL_QUALITY_SUGGESTION_TAG;
  recommendation: ProfessionalTranslationQualityReport["recommendation"];
  overallScore: number;
  gateDecision?: ProfessionalTranslationQualityReport["gateDecision"];
  providerId: string | null;
  modelId: string | null;
  findingCounts?: ProfessionalReviewObservation["findingCounts"];
  qualityProfileId?: string;
  contextPackId?: string;
  glossaryVersion?: string;
  cacheKey?: string;
  generatedAt?: string;
  humanReviewRequired?: boolean;
  suggestedRevision?: string | null;
  providerMode?: string;
  /** Compact report — never secrets / CoT. */
  report?: ProfessionalTranslationQualityReport;
};

export type SuggestionQualityMetadataWithProfessional = SuggestionQualityMetadata & {
  professionalQuality?: ProfessionalQualitySuggestionEnvelope | null;
};

export function buildProfessionalSuggestionQuality(input: {
  base: SuggestionQualityMetadata;
  report: ProfessionalTranslationQualityReport;
  observation: ProfessionalReviewObservation;
  ai?: SuggestionAiMetadata | null;
}): SuggestionQualityMetadataWithProfessional {
  return {
    ...input.base,
    ai: input.ai ?? input.base.ai ?? null,
    professionalQuality: {
      tag: PROFESSIONAL_QUALITY_SUGGESTION_TAG,
      recommendation: input.report.recommendation,
      overallScore: input.report.overallScore,
      gateDecision: input.report.gateDecision,
      providerId: input.observation.providerId,
      modelId: input.observation.modelId,
      findingCounts: input.observation.findingCounts,
      report: input.report,
    },
  };
}
