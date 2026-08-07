/**
 * Combine deterministic QA + AI reviewer scores with hard rules.
 * AI confidence cannot override blockers / absolute integrity dimensions.
 */

import {
  clampScore100,
  computeOverallQualityScore,
  hasBlockingFindings,
  TRANSLATION_QUALITY_DIMENSIONS,
  type TranslationQualityDimension,
  type TranslationQualityFinding,
  type TranslationQualityScore,
  type ProfessionalQualityRecommendation,
} from "./types";
import { evaluateQualityGate, type ProfessionalQualityProfile } from "./thresholds";
import { requiresHumanReview } from "./humanReviewPolicy";
import type { TranslationContextPack } from "./contextPacks";

/** Absolute dimensions — reviewer may only lower, never raise above deterministic. */
const ABSOLUTE_INTEGRITY_DIMENSIONS: TranslationQualityDimension[] = [
  "placeholder_integrity",
  "formatting_integrity",
  "terminology_compliance",
];

export function aggregateProfessionalQualityScores(input: {
  deterministic: TranslationQualityScore;
  reviewerScores?: Partial<Record<TranslationQualityDimension, number>>;
  reviewerFindings?: TranslationQualityFinding[];
}): TranslationQualityScore {
  const reviewerScores = input.reviewerScores ?? {};
  const reviewerFindings = input.reviewerFindings ?? [];

  const dimensions = input.deterministic.dimensions.map((d) => {
    const ai = reviewerScores[d.dimension];
    if (typeof ai !== "number" || !Number.isFinite(ai)) {
      return d;
    }
    const clampedAi = clampScore100(ai);
    if (ABSOLUTE_INTEGRITY_DIMENSIONS.includes(d.dimension)) {
      // Hard rule: AI cannot override/raise absolute integrity above deterministic floor.
      return { ...d, score: Math.min(d.score, clampedAi) };
    }
    return { ...d, score: clampedAi };
  });

  // Ensure every known dimension exists.
  for (const dim of TRANSLATION_QUALITY_DIMENSIONS) {
    if (!dimensions.some((d) => d.dimension === dim)) {
      const det =
        input.deterministic.dimensions.find((d) => d.dimension === dim)?.score ??
        100;
      const ai = reviewerScores[dim];
      const score =
        typeof ai === "number"
          ? ABSOLUTE_INTEGRITY_DIMENSIONS.includes(dim)
            ? Math.min(det, clampScore100(ai))
            : clampScore100(ai)
          : det;
      dimensions.push({
        dimension: dim,
        score,
        weight:
          input.deterministic.dimensions.find((d) => d.dimension === dim)
            ?.weight ?? 1,
      });
    }
  }

  const findings = [
    ...input.deterministic.findings,
    ...reviewerFindings,
  ];

  // Blocking deterministic findings cannot be removed by AI.
  if (
    hasBlockingFindings(input.deterministic.findings) &&
    !hasBlockingFindings(findings.filter((f) => f.code !== "reviewer_finding"))
  ) {
    // Still present via spread of deterministic findings — assert preserved.
  }

  return {
    overall: computeOverallQualityScore(dimensions),
    dimensions,
    findings,
  };
}

export function decideProfessionalRecommendation(input: {
  score: TranslationQualityScore;
  profile: ProfessionalQualityProfile;
  sourceText: string;
  targetText: string;
  contextPack: TranslationContextPack;
  reviewerUnavailable?: boolean;
}): {
  recommendation: ProfessionalQualityRecommendation;
  gateDecision: ReturnType<typeof evaluateQualityGate>["decision"];
  humanReviewReasons: string[];
  findings: TranslationQualityFinding[];
} {
  const gate = evaluateQualityGate({
    score: input.score,
    profile: input.profile,
  });

  const human = requiresHumanReview({
    sourceText: input.sourceText,
    targetText: input.targetText,
    score: input.score,
    findings: gate.findings,
    profile: input.profile,
    contextPack: input.contextPack,
  });

  const reasons = [...human.reasons];
  if (input.reviewerUnavailable) {
    reasons.push("professional_review_unavailable");
  }

  let recommendation: ProfessionalQualityRecommendation = "PASS";
  if (gate.decision === "QUALITY_BLOCKED") {
    recommendation = "BLOCK";
  } else if (
    gate.decision === "QUALITY_REVIEW_REQUIRED" ||
    human.required ||
    input.reviewerUnavailable
  ) {
    recommendation = "HUMAN_REVIEW";
  }

  // Hard rule: blocking deterministic findings always BLOCK regardless of AI confidence.
  if (hasBlockingFindings(input.score.findings.filter((f) => f.code !== "reviewer_finding"))) {
    recommendation = "BLOCK";
  }

  return {
    recommendation,
    gateDecision: gate.decision,
    humanReviewReasons: reasons,
    findings: gate.findings,
  };
}
