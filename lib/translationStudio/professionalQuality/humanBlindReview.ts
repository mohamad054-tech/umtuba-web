/**
 * Human blind-review artifact format for provider benchmarks.
 */

import type { HumanBenchmarkRatingLabel } from "./humanBenchmarkRating";

export type BlindHumanReviewArtifact = {
  schemaVersion: 1;
  blindId: string;
  caseId: string;
  locale: string;
  sourceText: string;
  context: string;
  glossaryExpectations: string[];
  candidateText: string;
  automatedRecommendation: string;
  automatedOverallScore: number;
  majorFindings: string[];
  /** Hidden until after rating — for operators only. */
  _reveal?: {
    matrixSlotId: string;
    generatorLabel: string;
    reviewerLabel: string;
  };
  humanRating?: HumanBenchmarkRatingLabel;
  humanNotes?: string;
};

export function createBlindHumanReviewArtifact(input: {
  caseId: string;
  locale: string;
  sourceText: string;
  context: string;
  glossaryExpectations: string[];
  candidateText: string;
  automatedRecommendation: string;
  automatedOverallScore: number;
  majorFindings: string[];
  matrixSlotId: string;
  generatorLabel: string;
  reviewerLabel: string;
  /** When true, omit provider labels from visible surface. */
  blind?: boolean;
}): BlindHumanReviewArtifact {
  const blindId = `blind_${input.caseId}_${input.locale}_${hashLite(input.matrixSlotId)}`;
  const reveal = {
    matrixSlotId: input.matrixSlotId,
    generatorLabel: input.generatorLabel,
    reviewerLabel: input.reviewerLabel,
  };
  return {
    schemaVersion: 1,
    blindId,
    caseId: input.caseId,
    locale: input.locale,
    sourceText: input.sourceText,
    context: input.context,
    glossaryExpectations: input.glossaryExpectations,
    candidateText: input.candidateText,
    automatedRecommendation: input.automatedRecommendation,
    automatedOverallScore: input.automatedOverallScore,
    majorFindings: input.majorFindings.slice(0, 8),
    // When blind, labels stay only under `_reveal` for operators (strip before UI).
    _reveal: reveal,
  };
}

/** Strip reveal metadata for human raters (blind package). */
export function toBlindHumanReviewSurface(
  artifact: BlindHumanReviewArtifact
): Omit<BlindHumanReviewArtifact, "_reveal"> {
  const { _reveal: _hidden, ...visible } = artifact;
  void _hidden;
  return visible;
}

function hashLite(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h.toString(16).slice(0, 8);
}
