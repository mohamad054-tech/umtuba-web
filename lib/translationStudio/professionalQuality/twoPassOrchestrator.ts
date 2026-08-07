/**
 * Two-pass orchestrator: generate → deterministic QA → reviewer → quality decision.
 * Independent generator/reviewer. No auto-publish.
 */

import type { StudioLanguageCode, TranslationMemoryEntry } from "../types";
import { buildProfessionalTranslationRequestContext } from "./contextBuilder";
import { seedUmtubaOfficialTerminologyCatalog } from "./terminologySeed";
import type { TerminologyPolicyCatalog } from "./terminologyPolicy";
import {
  PROFESSIONAL_AI_AUTHORITY,
  type ProfessionalTranslationGenerator,
  type ProfessionalTranslationReviewer,
} from "./aiContracts";
import { generateProfessionalTranslationCandidate } from "./generateCandidate";
import { runProfessionalTranslationReview } from "./reviewPipeline";
import type { ProfessionalTranslationQualityReport } from "./qualityReport";
import type { ProfessionalQualityRecommendation } from "./types";
import type { TranslationQualityScore } from "./types";
import type { ProfessionalReviewObservation } from "./observability";
import {
  PROFESSIONAL_REVIEW_UNAVAILABLE,
  type ProfessionalReviewFailure,
} from "./reviewFailures";

export type RunProfessionalGenerateAndReviewInput = {
  sourceText: string;
  sourceLocale?: StudioLanguageCode;
  targetLocale: StudioLanguageCode;
  keyStableId?: string | null;
  namespaceId?: string | null;
  namespaceName?: string | null;
  keyDescription?: string | null;
  domainHint?: string | null;
  keyContextPackId?: string | null;
  terminologyCatalog?: TerminologyPolicyCatalog;
  memoryEntries?: TranslationMemoryEntry[];
  generator: ProfessionalTranslationGenerator;
  reviewer: ProfessionalTranslationReviewer;
};

export type RunProfessionalGenerateAndReviewResult = {
  candidateText: string;
  deterministicScore: TranslationQualityScore | null;
  reviewerResultAvailable: boolean;
  report: ProfessionalTranslationQualityReport | null;
  recommendation: ProfessionalQualityRecommendation;
  observation: ProfessionalReviewObservation;
  authority: typeof PROFESSIONAL_AI_AUTHORITY;
  failure?: ProfessionalReviewFailure;
  status?: typeof PROFESSIONAL_REVIEW_UNAVAILABLE;
};

export async function runProfessionalGenerateAndReview(
  input: RunProfessionalGenerateAndReviewInput
): Promise<RunProfessionalGenerateAndReviewResult> {
  // Independence check — callers may pass different providers/models.
  if (input.generator.kind !== "professional_generator") {
    throw new Error("generator must be professional_generator");
  }
  if (input.reviewer.kind !== "professional_reviewer") {
    throw new Error("reviewer must be professional_reviewer");
  }

  const gen = await generateProfessionalTranslationCandidate(input);
  if (!gen.ok) {
    return {
      candidateText: "",
      deterministicScore: null,
      reviewerResultAvailable: false,
      report: null,
      recommendation: "HUMAN_REVIEW",
      observation: gen.observation,
      authority: PROFESSIONAL_AI_AUTHORITY,
      failure: gen.failure,
      status: PROFESSIONAL_REVIEW_UNAVAILABLE,
    };
  }

  const review = await runProfessionalTranslationReview({
    ...input,
    targetText: gen.candidate.candidateText,
    reviewer: input.reviewer,
  });

  return {
    candidateText: gen.candidate.candidateText,
    deterministicScore: review.deterministicScore,
    reviewerResultAvailable: review.availability.available,
    report: review.report,
    recommendation: review.recommendation,
    observation: {
      ...review.observation,
      role: "two_pass",
      providerId: [
        gen.candidate.provider.providerId,
        review.observation.providerId,
      ]
        .filter(Boolean)
        .join("+"),
      modelId: [
        gen.candidate.provider.modelId,
        review.observation.modelId,
      ]
        .filter(Boolean)
        .join("+"),
    },
    authority: PROFESSIONAL_AI_AUTHORITY,
    failure:
      review.availability.available === false
        ? review.availability.failure
        : undefined,
    status:
      review.availability.available === false
        ? PROFESSIONAL_REVIEW_UNAVAILABLE
        : undefined,
  };
}

/** Convenience: build context without running AI (for actions). */
export function buildServerProfessionalContext(input: {
  sourceText: string;
  targetLocale: StudioLanguageCode;
  sourceLocale?: StudioLanguageCode;
  keyStableId?: string | null;
  namespaceId?: string | null;
  namespaceName?: string | null;
  keyDescription?: string | null;
  domainHint?: string | null;
  keyContextPackId?: string | null;
  memoryEntries?: TranslationMemoryEntry[];
  terminologyCatalog?: TerminologyPolicyCatalog;
}) {
  const catalog =
    input.terminologyCatalog ?? seedUmtubaOfficialTerminologyCatalog();
  return buildProfessionalTranslationRequestContext({
    ...input,
    terminologyCatalog: catalog,
  });
}
