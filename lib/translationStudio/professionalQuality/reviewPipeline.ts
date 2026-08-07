/**
 * Top-level professional translation REVIEW pipeline (no mutation).
 * Context → deterministic QA → AI reviewer → validate → aggregate → human policy → report.
 */

import type { StudioLanguageCode, TranslationMemoryEntry } from "../types";
import { buildProfessionalTranslationRequestContext } from "./contextBuilder";
import { runDeterministicTranslationQa } from "./deterministicQa";
import { seedUmtubaOfficialTerminologyCatalog } from "./terminologySeed";
import type { TerminologyPolicyCatalog } from "./terminologyPolicy";
import type { ProfessionalTranslationReviewer } from "./aiContracts";
import { PROFESSIONAL_AI_AUTHORITY } from "./aiContracts";
import {
  aggregateProfessionalQualityScores,
  decideProfessionalRecommendation,
} from "./qualityAggregation";
import { evaluateSuggestedRevision } from "./suggestedRevision";
import { buildProfessionalQualityReport } from "./qualityReport";
import type { ProfessionalTranslationQualityReport } from "./qualityReport";
import {
  buildProfessionalReviewCacheKeyFromContext,
} from "./reviewCache";
import {
  buildProfessionalReviewObservation,
  countFindingsBySeverity,
  type ProfessionalReviewObservation,
} from "./observability";
import {
  PROFESSIONAL_REVIEW_UNAVAILABLE,
  type ProfessionalReviewFailure,
} from "./reviewFailures";
import { mapTransportErrorToFailure } from "./transportAdapters";
import type { ProfessionalQualityRecommendation } from "./types";
import type { TranslationQualityScore } from "./types";

export type RunProfessionalTranslationReviewInput = {
  sourceText: string;
  targetText: string;
  sourceLocale?: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  keyStableId?: string | null;
  namespaceId?: string | null;
  namespaceName?: string | null;
  keyDescription?: string | null;
  domainHint?: string | null;
  keyContextPackId?: string | null;
  statusHint?: string | null;
  terminologyCatalog?: TerminologyPolicyCatalog;
  memoryEntries?: TranslationMemoryEntry[];
  reviewer: ProfessionalTranslationReviewer;
};

export type RunProfessionalTranslationReviewResult = {
  report: ProfessionalTranslationQualityReport;
  recommendation: ProfessionalQualityRecommendation;
  deterministicScore: TranslationQualityScore;
  mergedScore: TranslationQualityScore;
  suggestedRevision: string | null;
  revisionAccepted: boolean;
  cacheKey: string;
  observation: ProfessionalReviewObservation;
  authority: typeof PROFESSIONAL_AI_AUTHORITY;
  availability:
    | { available: true }
    | {
        available: false;
        status: typeof PROFESSIONAL_REVIEW_UNAVAILABLE;
        failure: ProfessionalReviewFailure;
      };
};

/**
 * Review an existing draft/suggestion professionally. No mutation.
 */
export async function runProfessionalTranslationReview(
  input: RunProfessionalTranslationReviewInput
): Promise<RunProfessionalTranslationReviewResult> {
  const catalog =
    input.terminologyCatalog ?? seedUmtubaOfficialTerminologyCatalog();
  const context = buildProfessionalTranslationRequestContext({
    keyStableId: input.keyStableId,
    namespaceId: input.namespaceId,
    namespaceName: input.namespaceName,
    sourceLocale: input.sourceLocale,
    targetLocale: input.targetLocale,
    sourceText: input.sourceText,
    currentTranslation: input.targetText,
    keyDescription: input.keyDescription,
    domainHint: input.domainHint,
    keyContextPackId: input.keyContextPackId,
    terminologyCatalog: catalog,
    memoryEntries: input.memoryEntries,
    statusHint: input.statusHint,
  });

  const cacheKey = buildProfessionalReviewCacheKeyFromContext({
    context,
    targetText: input.targetText,
  });

  const started = Date.now();
  const deterministicScore = runDeterministicTranslationQa({
    sourceText: context.sourceText,
    targetText: input.targetText,
    sourceLocale: context.sourceLocale,
    targetLocale: context.targetLocale,
    glossaryTerms: context.glossaryTerms,
    styleGuide: context.styleGuide,
  });

  let reviewerUnavailable = false;
  let failure: ProfessionalReviewFailure | null = null;
  let reviewerScores: Partial<Record<string, number>> = {};
  let reviewerFindings: typeof deterministicScore.findings = [];
  let suggestedRevision: string | null = null;
  let revisionAccepted = false;
  let providerId: string | null = null;
  let modelId: string | null = null;

  try {
    const rev = await input.reviewer.review({
      sourceText: context.sourceText,
      targetText: input.targetText,
      sourceLocale: context.sourceLocale,
      targetLocale: context.targetLocale,
      context,
      deterministicFindings: deterministicScore.findings,
    });
    providerId = rev.provider.providerId;
    modelId = rev.provider.modelId;
    reviewerScores = rev.dimensionScores;
    reviewerFindings = rev.findings;

    const revision = evaluateSuggestedRevision({
      context,
      suggestedRevision: rev.suggestedRevision,
    });
    suggestedRevision = revision.suggestedRevision;
    revisionAccepted = revision.accepted;
    if (!revision.accepted && revision.rejectionFindings.length > 0) {
      reviewerFindings = [
        ...reviewerFindings,
        ...revision.rejectionFindings,
      ];
    }
  } catch (err) {
    reviewerUnavailable = true;
    failure = mapTransportErrorToFailure(err);
    reviewerFindings = [
      {
        code: "reviewer_invalid",
        severity: "error",
        dimension: "overall",
        message: `Professional review unavailable: ${failure.message}`,
      },
    ];
  }

  const mergedScore = aggregateProfessionalQualityScores({
    deterministic: deterministicScore,
    reviewerScores,
    reviewerFindings,
  });

  const decision = decideProfessionalRecommendation({
    score: mergedScore,
    profile: context.qualityProfile,
    sourceText: context.sourceText,
    targetText: input.targetText,
    contextPack: context.contextPack,
    reviewerUnavailable,
  });

  const scoreForReport: TranslationQualityScore = {
    ...mergedScore,
    findings: decision.findings,
  };

  const report = buildProfessionalQualityReport({
    context,
    score: scoreForReport,
    recommendation: decision.recommendation,
    gateDecision: decision.gateDecision,
    humanReviewReasons: decision.humanReviewReasons,
  });

  const observation = buildProfessionalReviewObservation({
    role: "reviewer",
    providerId,
    modelId,
    profileId: context.qualityProfile.id,
    locale: context.targetLocale,
    durationMs: Date.now() - started,
    success: !reviewerUnavailable,
    failureCode: failure?.code,
    overallScore: report.overallScore,
    findingCounts: countFindingsBySeverity(scoreForReport.findings),
    recommendation: decision.recommendation,
    cacheKeyFingerprint: cacheKey.slice(0, 16),
  });

  return {
    report,
    recommendation: decision.recommendation,
    deterministicScore,
    mergedScore: scoreForReport,
    suggestedRevision,
    revisionAccepted,
    cacheKey,
    observation,
    authority: PROFESSIONAL_AI_AUTHORITY,
    availability: reviewerUnavailable
      ? {
          available: false,
          status: PROFESSIONAL_REVIEW_UNAVAILABLE,
          failure: failure!,
        }
      : { available: true },
  };
}
