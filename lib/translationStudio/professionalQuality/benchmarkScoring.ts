/**
 * Benchmark weighted scoring + disqualification rules.
 * Quality beats cheapest/fastest. Hard integrity failures heavily penalize or disqualify.
 */

import type { ProfessionalQualityRecommendation } from "./types";
import type { TranslationQualityFinding } from "./types";

export type BenchmarkDisqualificationReason =
  | "placeholder_corruption"
  | "protected_terminology_violation"
  | "invalid_structured_response"
  | "semantic_failure"
  | "sensitive_copy_mishandling"
  | "do_not_translate_violation"
  | "excessive_provider_failures";

export type BenchmarkEligibility = "ELIGIBLE" | "NOT_ELIGIBLE";

/** Disqualification thresholds (V1 policy). */
export const BENCHMARK_DISQUALIFICATION_THRESHOLDS = {
  /** Fraction of cases with placeholder blockers → NOT_ELIGIBLE */
  maxPlaceholderFailureRate: 0.05,
  /** Fraction with glossary/DNT blockers */
  maxTerminologyFailureRate: 0.08,
  /** Fraction with invalid structured responses */
  maxInvalidStructuredRate: 0.1,
  /** Fraction with semantic BLOCK on non-sensitive */
  maxSemanticFailureRate: 0.15,
  /** Sensitive cases that PASS without human-review flag */
  maxSensitivePassWithoutHumanReviewRate: 0.0,
  /** Min overall professional score to remain competitive */
  professionalQualityFloor: 75,
} as const;

export type BenchmarkCaseScoreInput = {
  overallScore: number;
  recommendation: ProfessionalQualityRecommendation;
  findings: TranslationQualityFinding[];
  humanReviewRequired: boolean;
  sensitiveCase: boolean;
  structuredResponseValid: boolean;
  latencyMs: number;
  /** Optional safe usage if provider exposes it (never secrets). */
  usage?: { inputTokens?: number; outputTokens?: number; estimatedCostUsd?: number };
};

export type BenchmarkCaseScore = {
  qualityWeighted: number;
  latencyPenalty: number;
  costPenalty: number;
  structuredPenalty: number;
  hardIntegrityPenalty: number;
  composite: number;
  disqualifiedCase: boolean;
  disqualifyReasons: BenchmarkDisqualificationReason[];
};

/**
 * Weights: quality highest; hard integrity heavy; latency/cost secondary.
 */
export const BENCHMARK_SCORE_WEIGHTS = {
  quality: 0.55,
  hardIntegrity: 0.25,
  structuredReliability: 0.1,
  latency: 0.05,
  cost: 0.05,
} as const;

export function scoreBenchmarkCase(
  input: BenchmarkCaseScoreInput
): BenchmarkCaseScore {
  const reasons: BenchmarkDisqualificationReason[] = [];
  const blocking = input.findings.filter((f) => f.severity === "blocking");
  const hasPlaceholder = blocking.some(
    (f) =>
      f.code.includes("placeholder") || f.dimension === "placeholder_integrity"
  );
  const hasTerminology = blocking.some(
    (f) =>
      f.code.includes("glossary") ||
      f.code.includes("terminology") ||
      f.code.includes("do_not_translate")
  );
  const hasDnt = blocking.some((f) => f.code.includes("do_not_translate"));

  if (hasPlaceholder) reasons.push("placeholder_corruption");
  if (hasTerminology) reasons.push("protected_terminology_violation");
  if (hasDnt) reasons.push("do_not_translate_violation");
  if (!input.structuredResponseValid) {
    reasons.push("invalid_structured_response");
  }
  if (input.recommendation === "BLOCK" && !hasPlaceholder && !hasTerminology) {
    reasons.push("semantic_failure");
  }
  if (
    input.sensitiveCase &&
    input.recommendation === "PASS" &&
    !input.humanReviewRequired
  ) {
    reasons.push("sensitive_copy_mishandling");
  }

  const hardIntegrityPenalty =
    hasPlaceholder || hasTerminology || hasDnt ? 100 : 0;
  const structuredPenalty = input.structuredResponseValid ? 0 : 80;
  const latencyPenalty = Math.min(100, Math.max(0, (input.latencyMs - 2000) / 100));
  const costPenalty =
    input.usage?.estimatedCostUsd != null
      ? Math.min(100, input.usage.estimatedCostUsd * 1000)
      : 0;

  const quality = Math.max(0, Math.min(100, input.overallScore));
  const integrityScore = 100 - hardIntegrityPenalty;
  const structuredScore = 100 - structuredPenalty;
  const latencyScore = 100 - latencyPenalty;
  const costScore = 100 - costPenalty;

  const composite =
    quality * BENCHMARK_SCORE_WEIGHTS.quality +
    integrityScore * BENCHMARK_SCORE_WEIGHTS.hardIntegrity +
    structuredScore * BENCHMARK_SCORE_WEIGHTS.structuredReliability +
    latencyScore * BENCHMARK_SCORE_WEIGHTS.latency +
    costScore * BENCHMARK_SCORE_WEIGHTS.cost;

  const disqualifiedCase =
    hasPlaceholder ||
    hasDnt ||
    (!input.structuredResponseValid && input.overallScore < 50) ||
    (input.sensitiveCase &&
      input.recommendation === "PASS" &&
      !input.humanReviewRequired);

  return {
    qualityWeighted: quality,
    latencyPenalty,
    costPenalty,
    structuredPenalty,
    hardIntegrityPenalty,
    composite: Math.round(composite * 10) / 10,
    disqualifiedCase,
    disqualifyReasons: reasons,
  };
}

export type ProviderMatrixAggregate = {
  eligibility: BenchmarkEligibility;
  reasons: BenchmarkDisqualificationReason[];
  meanComposite: number;
  meanQuality: number;
  caseCount: number;
  belowQualityFloor: boolean;
};

export function aggregateProviderMatrixScores(
  caseScores: BenchmarkCaseScore[]
): ProviderMatrixAggregate {
  const n = caseScores.length || 1;
  const meanComposite =
    caseScores.reduce((s, c) => s + c.composite, 0) / n;
  const meanQuality =
    caseScores.reduce((s, c) => s + c.qualityWeighted, 0) / n;

  const placeholderRate =
    caseScores.filter((c) =>
      c.disqualifyReasons.includes("placeholder_corruption")
    ).length / n;
  const termRate =
    caseScores.filter((c) =>
      c.disqualifyReasons.includes("protected_terminology_violation")
    ).length / n;
  const invalidRate =
    caseScores.filter((c) =>
      c.disqualifyReasons.includes("invalid_structured_response")
    ).length / n;
  const semanticRate =
    caseScores.filter((c) => c.disqualifyReasons.includes("semantic_failure"))
      .length / n;
  const sensitiveBadRate =
    caseScores.filter((c) =>
      c.disqualifyReasons.includes("sensitive_copy_mishandling")
    ).length / n;

  const reasons: BenchmarkDisqualificationReason[] = [];
  const t = BENCHMARK_DISQUALIFICATION_THRESHOLDS;
  if (placeholderRate > t.maxPlaceholderFailureRate) {
    reasons.push("placeholder_corruption");
  }
  if (termRate > t.maxTerminologyFailureRate) {
    reasons.push("protected_terminology_violation");
  }
  if (invalidRate > t.maxInvalidStructuredRate) {
    reasons.push("invalid_structured_response");
  }
  if (semanticRate > t.maxSemanticFailureRate) {
    reasons.push("semantic_failure");
  }
  if (sensitiveBadRate > t.maxSensitivePassWithoutHumanReviewRate) {
    reasons.push("sensitive_copy_mishandling");
  }

  const belowQualityFloor = meanQuality < t.professionalQualityFloor;
  if (belowQualityFloor && reasons.length === 0) {
    // Not automatically NOT_ELIGIBLE solely for floor — flagged for operator.
  }

  return {
    eligibility: reasons.length > 0 ? "NOT_ELIGIBLE" : "ELIGIBLE",
    reasons,
    meanComposite: Math.round(meanComposite * 10) / 10,
    meanQuality: Math.round(meanQuality * 10) / 10,
    caseCount: caseScores.length,
    belowQualityFloor,
  };
}
