/**
 * Compact professional quality report (no secrets / provider payloads).
 */

import type { StudioLanguageCode } from "../types";
import type { ProfessionalTranslationRequestContext } from "./contextBuilder";
import type {
  ProfessionalQualityRecommendation,
  TranslationQualityFinding,
  TranslationQualityGateDecision,
  TranslationQualityScore,
} from "./types";

export type ProfessionalTranslationQualityReport = {
  schemaVersion: 1;
  keyStableId: string | null;
  locale: StudioLanguageCode;
  contextPackId: string;
  overallScore: number;
  dimensionScores: Array<{ dimension: string; score: number }>;
  deterministicFindings: TranslationQualityFinding[];
  reviewerFindings: TranslationQualityFinding[];
  glossaryCompliance: {
    applicableTerms: number;
    blockingGlossaryFindings: number;
  };
  recommendation: ProfessionalQualityRecommendation;
  gateDecision?: TranslationQualityGateDecision;
  humanReviewReasons?: string[];
};

export function buildProfessionalQualityReport(input: {
  context: ProfessionalTranslationRequestContext;
  score: TranslationQualityScore;
  recommendation: ProfessionalQualityRecommendation;
  gateDecision?: TranslationQualityGateDecision;
  humanReviewReasons?: string[];
}): ProfessionalTranslationQualityReport {
  const reviewerFindings = input.score.findings.filter(
    (f) => f.code === "reviewer_finding"
  );
  const deterministicFindings = input.score.findings.filter(
    (f) => f.code !== "reviewer_finding"
  );
  const blockingGlossaryFindings = deterministicFindings.filter(
    (f) =>
      f.severity === "blocking" &&
      (f.code === "forbidden_glossary_alternative" ||
        f.code === "do_not_translate_altered" ||
        f.code === "required_terminology_missing")
  ).length;

  return {
    schemaVersion: 1,
    keyStableId: input.context.keyStableId,
    locale: input.context.targetLocale,
    contextPackId: input.context.contextPack.id,
    overallScore: input.score.overall,
    dimensionScores: input.score.dimensions.map((d) => ({
      dimension: d.dimension,
      score: d.score,
    })),
    deterministicFindings,
    reviewerFindings,
    glossaryCompliance: {
      applicableTerms: input.context.glossaryTerms.length,
      blockingGlossaryFindings,
    },
    recommendation: input.recommendation,
    gateDecision: input.gateDecision,
    humanReviewReasons: input.humanReviewReasons,
  };
}
