import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import {
  ADS_SCORING_CONTRACT_VERSION,
  ADS_SCORING_EXCLUSION_REASONS,
  ADS_SCORING_MAX_CANDIDATES,
  ADS_SCORING_WEIGHTS,
  explainAdsCandidateScore,
  parseAdsRankingCandidateSignals,
  scoreAdsCandidates,
  validateAdsCandidateScoreBreakdown,
  validateAdsCandidateScoreExplanation,
  type AdsCandidateScoreBreakdown,
  type AdsCandidateScoreExplanation,
  type AdsRankingCandidateSignals,
  type AdsScoringExclusionReason,
} from "./scoring";

/**
 * Ads Ranking Foundation V1 — pure, deterministic, fail-closed.
 *
 * Orders already-signaled candidates by score with stable tie-breaking.
 * Never auctions, paces, bills, delivers, randomizes, optimizes live, or
 * consults wall-clock / network / database / product modules.
 *
 * productionEnabled, deliveryEnabled, and executionEnabled are always false.
 */

export const ADS_RANKING_CONTRACT_VERSION = "v1" as const;

/** Sole supported V1 ranking strategy. */
export const ADS_RANKING_STRATEGY = "weighted_score_v1" as const;

/** Max candidates accepted in one ranking request. */
export const ADS_RANKING_MAX_CANDIDATES = ADS_SCORING_MAX_CANDIDATES;

/**
 * Stable sort / tie-break rule order (first difference wins).
 * Documented for tests — do not reorder lightly.
 *
 * 1. totalScore DESC
 * 2. qualityScore DESC
 * 3. relevanceScore DESC
 * 4. candidateId ASC (UTF-16 code-unit order)
 *
 * Freshness remains part of the weighted total score only. It is intentionally
 * omitted from the secondary tie-break sequence because, with fixed V1 weights,
 * equal totalScore + quality + relevance already implies equal freshness.
 */
export const ADS_RANKING_TIE_BREAK_RULES = [
  "total_score_desc",
  "quality_score_desc",
  "relevance_score_desc",
  "candidate_id_asc",
] as const;

export type AdsRankingTieBreakRule =
  (typeof ADS_RANKING_TIE_BREAK_RULES)[number];

export const ADS_RANKING_EXCLUSION_REASONS = ADS_SCORING_EXCLUSION_REASONS;

export type AdsRankingExclusionReason = AdsScoringExclusionReason;

/**
 * Top-level keys allowed on AdsRankingInput.
 * Unknown fields fail closed.
 */
export const ADS_RANKING_INPUT_ALLOWED_FIELDS = ["candidates"] as const;

/**
 * Top-level keys allowed on AdsRankedCandidate.
 * Unknown fields fail closed.
 */
export const ADS_RANKED_CANDIDATE_ALLOWED_FIELDS = [
  "candidateId",
  "rank",
  "totalScore",
  "scoreBreakdown",
  "scoreExplanation",
  "tieBreakRuleApplied",
] as const;

/**
 * Top-level keys allowed on AdsRankingDiagnostics.
 * Unknown fields fail closed.
 */
export const ADS_RANKING_DIAGNOSTICS_ALLOWED_FIELDS = [
  "evaluatedCandidateCount",
  "rankedCandidateCount",
  "excludedCandidateCount",
  "exclusionSummary",
  "tieBreakEvents",
] as const;

/**
 * Top-level keys allowed on AdsRankingMetadata.
 * Unknown fields fail closed.
 */
export const ADS_RANKING_METADATA_ALLOWED_FIELDS = [
  "contractVersion",
  "scoringContractVersion",
  "strategy",
  "weights",
  "tieBreakRules",
] as const;

/**
 * Top-level keys allowed on AdsRankingResult.
 * Unknown fields fail closed.
 */
export const ADS_RANKING_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "strategy",
  "rankedCandidates",
  "excludedCandidates",
  "scoreBreakdowns",
  "diagnostics",
  "metadata",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

export type AdsRankingInput = Readonly<{
  candidates: readonly AdsRankingCandidateSignals[];
}>;

export type AdsRankingExcludedCandidate = Readonly<{
  candidateId: string;
  reason: AdsRankingExclusionReason;
}>;

export type AdsRankingExclusionSummary = Readonly<
  Partial<Record<AdsRankingExclusionReason, number>>
>;

export type AdsRankingTieBreakEvent = Readonly<{
  leftCandidateId: string;
  rightCandidateId: string;
  rule: AdsRankingTieBreakRule;
}>;

export type AdsRankedCandidate = Readonly<{
  candidateId: string;
  /** 1-based rank in the ordered result. */
  rank: number;
  totalScore: number;
  scoreBreakdown: AdsCandidateScoreBreakdown;
  scoreExplanation: AdsCandidateScoreExplanation;
  /**
   * Tie-break rule that decided order vs the previous ranked candidate.
   * Null for the first ranked candidate.
   */
  tieBreakRuleApplied: AdsRankingTieBreakRule | null;
}>;

export type AdsRankingDiagnostics = Readonly<{
  evaluatedCandidateCount: number;
  rankedCandidateCount: number;
  excludedCandidateCount: number;
  exclusionSummary: AdsRankingExclusionSummary;
  tieBreakEvents: readonly AdsRankingTieBreakEvent[];
}>;

export type AdsRankingMetadata = Readonly<{
  contractVersion: typeof ADS_RANKING_CONTRACT_VERSION;
  scoringContractVersion: typeof ADS_SCORING_CONTRACT_VERSION;
  strategy: typeof ADS_RANKING_STRATEGY;
  weights: typeof ADS_SCORING_WEIGHTS;
  tieBreakRules: typeof ADS_RANKING_TIE_BREAK_RULES;
}>;

/**
 * Canonical Ranking Result V1.
 * Immutable; never enables production / delivery / execution.
 */
export type AdsRankingResult = Readonly<{
  contractVersion: typeof ADS_RANKING_CONTRACT_VERSION;
  strategy: typeof ADS_RANKING_STRATEGY;
  rankedCandidates: readonly AdsRankedCandidate[];
  excludedCandidates: readonly AdsRankingExcludedCandidate[];
  scoreBreakdowns: readonly AdsCandidateScoreBreakdown[];
  diagnostics: AdsRankingDiagnostics;
  metadata: AdsRankingMetadata;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

export type AdsRankingOutcome =
  | Readonly<{ valid: true; result: AdsRankingResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsRankingInputParseResult =
  | Readonly<{ valid: true; input: AdsRankingInput }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

type RankableScoredCandidate = Readonly<{
  signals: AdsRankingCandidateSignals;
  breakdown: AdsCandidateScoreBreakdown;
  explanation: AdsCandidateScoreExplanation;
  inputIndex: number;
}>;

const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_RANKING_INPUT_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_RANKING_RESULT_ALLOWED_FIELDS
);
const RANKED_ALLOWED_FIELD_SET = new Set<string>(
  ADS_RANKED_CANDIDATE_ALLOWED_FIELDS
);
const DIAGNOSTICS_ALLOWED_FIELD_SET = new Set<string>(
  ADS_RANKING_DIAGNOSTICS_ALLOWED_FIELDS
);
const METADATA_ALLOWED_FIELD_SET = new Set<string>(
  ADS_RANKING_METADATA_ALLOWED_FIELDS
);
const TIE_BREAK_RULE_SET = new Set<string>(ADS_RANKING_TIE_BREAK_RULES);
const EXCLUSION_REASON_SET = new Set<string>(ADS_RANKING_EXCLUSION_REASONS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isAdsRankingExclusionReason(
  value: unknown
): value is AdsRankingExclusionReason {
  return typeof value === "string" && EXCLUSION_REASON_SET.has(value);
}

function isAdsRankingTieBreakRule(
  value: unknown
): value is AdsRankingTieBreakRule {
  return typeof value === "string" && TIE_BREAK_RULE_SET.has(value);
}

function compareCandidateIdAsc(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Compare two rankable candidates. Returns the deciding tie-break rule.
 * Deterministic — no randomness, no wall-clock.
 */
export function compareAdsRankableCandidates(
  left: RankableScoredCandidate,
  right: RankableScoredCandidate
): Readonly<{ order: number; rule: AdsRankingTieBreakRule }> {
  if (left.breakdown.totalScore !== right.breakdown.totalScore) {
    return {
      order: right.breakdown.totalScore - left.breakdown.totalScore,
      rule: "total_score_desc",
    };
  }
  if (left.signals.qualityScore !== right.signals.qualityScore) {
    return {
      order: right.signals.qualityScore - left.signals.qualityScore,
      rule: "quality_score_desc",
    };
  }
  if (left.signals.relevanceScore !== right.signals.relevanceScore) {
    return {
      order: right.signals.relevanceScore - left.signals.relevanceScore,
      rule: "relevance_score_desc",
    };
  }
  return {
    order: compareCandidateIdAsc(
      left.signals.candidateId,
      right.signals.candidateId
    ),
    rule: "candidate_id_asc",
  };
}

function freezeExclusionSummary(
  summary: AdsRankingExclusionSummary
): AdsRankingExclusionSummary {
  return Object.freeze({ ...summary });
}

function freezeDiagnostics(
  diagnostics: AdsRankingDiagnostics
): AdsRankingDiagnostics {
  return Object.freeze({
    evaluatedCandidateCount: diagnostics.evaluatedCandidateCount,
    rankedCandidateCount: diagnostics.rankedCandidateCount,
    excludedCandidateCount: diagnostics.excludedCandidateCount,
    exclusionSummary: freezeExclusionSummary(diagnostics.exclusionSummary),
    tieBreakEvents: Object.freeze(
      diagnostics.tieBreakEvents.map((event) => Object.freeze({ ...event }))
    ),
  });
}

function freezeMetadata(): AdsRankingMetadata {
  return Object.freeze({
    contractVersion: ADS_RANKING_CONTRACT_VERSION,
    scoringContractVersion: ADS_SCORING_CONTRACT_VERSION,
    strategy: ADS_RANKING_STRATEGY,
    weights: ADS_SCORING_WEIGHTS,
    tieBreakRules: ADS_RANKING_TIE_BREAK_RULES,
  });
}

function freezeRankedCandidate(
  candidate: AdsRankedCandidate
): AdsRankedCandidate {
  return Object.freeze({
    candidateId: candidate.candidateId,
    rank: candidate.rank,
    totalScore: candidate.totalScore,
    scoreBreakdown: candidate.scoreBreakdown,
    scoreExplanation: candidate.scoreExplanation,
    tieBreakRuleApplied: candidate.tieBreakRuleApplied,
  });
}

function freezeRankingResult(result: AdsRankingResult): AdsRankingResult {
  return Object.freeze({
    contractVersion: ADS_RANKING_CONTRACT_VERSION,
    strategy: ADS_RANKING_STRATEGY,
    rankedCandidates: Object.freeze(
      result.rankedCandidates.map(freezeRankedCandidate)
    ),
    excludedCandidates: Object.freeze(
      result.excludedCandidates.map((entry) => Object.freeze({ ...entry }))
    ),
    scoreBreakdowns: Object.freeze([...result.scoreBreakdowns]),
    diagnostics: freezeDiagnostics(result.diagnostics),
    metadata: freezeMetadata(),
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

/**
 * Parse and narrow ranking input.
 * Fail-closed — constructs a fresh immutable candidates array on success.
 */
export function parseAdsRankingInput(
  input: unknown
): AdsRankingInputParseResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Ranking input must be an object."]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Ranking input contains unknown field "${key}".`);
    }
  }

  if (!Array.isArray(input.candidates)) {
    issues.push("candidates must be an array.");
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  if (input.candidates.length > ADS_RANKING_MAX_CANDIDATES) {
    issues.push(
      `candidates exceeds max length of ${ADS_RANKING_MAX_CANDIDATES}.`
    );
  }

  const candidates: AdsRankingCandidateSignals[] = [];
  for (let i = 0; i < input.candidates.length; i++) {
    const parsed = parseAdsRankingCandidateSignals(
      input.candidates[i],
      `candidates[${i}]`
    );
    if (!parsed.valid) {
      issues.push(...parsed.issues);
      continue;
    }
    candidates.push(parsed.signals);
  }

  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    input: Object.freeze({
      candidates: Object.freeze([...candidates]),
    }),
  };
}

/**
 * Rank candidates from explicit signals.
 * Same input always yields an identical immutable result.
 * Does not mutate the caller-provided input object or candidate array.
 */
export function rankAdsCandidates(input: unknown): AdsRankingOutcome {
  const parsedInput = parseAdsRankingInput(input);
  if (!parsedInput.valid) {
    return { valid: false, issues: parsedInput.issues };
  }

  const { candidates } = parsedInput.input;
  const scored = scoreAdsCandidates(candidates);
  if (!scored.valid) {
    return { valid: false, issues: scored.issues };
  }

  const excludedCandidates: AdsRankingExcludedCandidate[] = [];
  const exclusionSummary: Partial<Record<AdsRankingExclusionReason, number>> =
    {};
  const rankable: RankableScoredCandidate[] = [];
  const scoreBreakdowns = scored.breakdowns;

  for (let i = 0; i < candidates.length; i++) {
    const signals = candidates[i];
    const breakdown = scoreBreakdowns[i];
    if (!breakdown.rankable) {
      if (!isAdsRankingExclusionReason(breakdown.exclusionReason)) {
        return {
          valid: false,
          issues: Object.freeze([
            `candidates[${i}] is unrankable without a supported exclusion reason.`,
          ]),
        };
      }
      const reason = breakdown.exclusionReason;
      excludedCandidates.push(
        Object.freeze({ candidateId: signals.candidateId, reason })
      );
      exclusionSummary[reason] = (exclusionSummary[reason] ?? 0) + 1;
      continue;
    }

    const explained = explainAdsCandidateScore(signals);
    if (!explained.valid) {
      return { valid: false, issues: explained.issues };
    }

    rankable.push({
      signals,
      breakdown,
      explanation: explained.explanation,
      inputIndex: i,
    });
  }

  // Stable deterministic sort: comparator is total order via candidateId.
  const sorted = [...rankable].sort((left, right) => {
    const comparison = compareAdsRankableCandidates(left, right);
    if (comparison.order !== 0) {
      return comparison.order < 0 ? -1 : 1;
    }
    // Defensive: identical ids already fail closed upstream.
    return left.inputIndex - right.inputIndex;
  });

  const tieBreakEvents: AdsRankingTieBreakEvent[] = [];
  const rankedCandidates: AdsRankedCandidate[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    let tieBreakRuleApplied: AdsRankingTieBreakRule | null = null;

    if (i > 0) {
      const previous = sorted[i - 1];
      const comparison = compareAdsRankableCandidates(previous, current);
      tieBreakRuleApplied = comparison.rule;
      if (comparison.rule !== "total_score_desc") {
        tieBreakEvents.push(
          Object.freeze({
            leftCandidateId: previous.signals.candidateId,
            rightCandidateId: current.signals.candidateId,
            rule: comparison.rule,
          })
        );
      }
    }

    rankedCandidates.push(
      freezeRankedCandidate({
        candidateId: current.signals.candidateId,
        rank: i + 1,
        totalScore: current.breakdown.totalScore,
        scoreBreakdown: current.breakdown,
        scoreExplanation: current.explanation,
        tieBreakRuleApplied,
      })
    );
  }

  // Preserve input order for excluded list (fail-closed diagnostics).
  const result = freezeRankingResult({
    contractVersion: ADS_RANKING_CONTRACT_VERSION,
    strategy: ADS_RANKING_STRATEGY,
    rankedCandidates,
    excludedCandidates,
    scoreBreakdowns,
    diagnostics: {
      evaluatedCandidateCount: candidates.length,
      rankedCandidateCount: rankedCandidates.length,
      excludedCandidateCount: excludedCandidates.length,
      exclusionSummary,
      tieBreakEvents,
    },
    metadata: freezeMetadata(),
    productionEnabled: false,
    deliveryEnabled: false,
    executionEnabled: false,
  });

  return { valid: true, result };
}

function validateExclusionSummary(
  value: unknown,
  issues: string[]
): void {
  if (!isRecord(value)) {
    issues.push("diagnostics.exclusionSummary must be an object.");
    return;
  }

  for (const [key, count] of Object.entries(value)) {
    if (!EXCLUSION_REASON_SET.has(key)) {
      issues.push(
        `diagnostics.exclusionSummary contains invalid reason "${key}".`
      );
      continue;
    }
    if (!isNonNegativeInteger(count)) {
      issues.push(
        `diagnostics.exclusionSummary.${key} must be a non-negative integer.`
      );
    }
  }
}

function validateRankedCandidate(
  value: unknown,
  index: number,
  issues: string[],
  seenIds: Set<string>
): void {
  const prefix = `rankedCandidates[${index}]`;
  if (!isRecord(value)) {
    issues.push(`${prefix} must be an object.`);
    return;
  }

  for (const key of Object.keys(value)) {
    if (!RANKED_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`${prefix} contains unknown field "${key}".`);
    }
  }

  if (!isNonEmptyString(value.candidateId)) {
    issues.push(
      `${prefix}.candidateId is required and must be a non-empty string.`
    );
  } else if (value.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${prefix}.candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  } else if (seenIds.has(value.candidateId)) {
    issues.push(
      `rankedCandidates contain duplicate candidateId "${value.candidateId}".`
    );
  } else {
    seenIds.add(value.candidateId);
  }

  if (!isPositiveInteger(value.rank)) {
    issues.push(`${prefix}.rank must be a positive integer.`);
  } else if (value.rank !== index + 1) {
    issues.push(`${prefix}.rank must equal ${index + 1}.`);
  }

  if (
    typeof value.totalScore !== "number" ||
    !Number.isFinite(value.totalScore) ||
    value.totalScore < 0 ||
    value.totalScore > 1
  ) {
    issues.push(`${prefix}.totalScore must be a finite number in [0, 1].`);
  }

  const breakdownCheck = validateAdsCandidateScoreBreakdown(
    value.scoreBreakdown
  );
  if (!breakdownCheck.valid) {
    issues.push(
      ...breakdownCheck.issues.map(
        (issue) => `${prefix}.scoreBreakdown: ${issue}`
      )
    );
  } else if (
    isRecord(value.scoreBreakdown) &&
    value.scoreBreakdown.candidateId !== value.candidateId
  ) {
    issues.push(`${prefix}.scoreBreakdown.candidateId mismatch.`);
  } else if (
    isRecord(value.scoreBreakdown) &&
    value.scoreBreakdown.rankable !== true
  ) {
    issues.push(`${prefix}.scoreBreakdown.rankable must be true.`);
  }

  const explanationCheck = validateAdsCandidateScoreExplanation(
    value.scoreExplanation
  );
  if (!explanationCheck.valid) {
    issues.push(
      ...explanationCheck.issues.map(
        (issue) => `${prefix}.scoreExplanation: ${issue}`
      )
    );
  }

  if (index === 0) {
    if (value.tieBreakRuleApplied !== null) {
      issues.push(
        `${prefix}.tieBreakRuleApplied must be null for the first ranked candidate.`
      );
    }
  } else if (!isAdsRankingTieBreakRule(value.tieBreakRuleApplied)) {
    issues.push(
      `${prefix}.tieBreakRuleApplied must be a supported tie-break rule.`
    );
  }
}

/**
 * Pure shape validator for ranking results.
 * Fail-closed — does not rank or deliver.
 */
export function validateAdsRankingResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Ranking result must be an object."]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!RESULT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Ranking result contains unknown field "${key}".`);
    }
  }

  if (input.contractVersion !== ADS_RANKING_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_RANKING_CONTRACT_VERSION}".`
    );
  }

  if (input.strategy !== ADS_RANKING_STRATEGY) {
    issues.push(`strategy must be "${ADS_RANKING_STRATEGY}".`);
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }
  if (input.deliveryEnabled !== false) {
    issues.push("deliveryEnabled must be false.");
  }
  if (input.executionEnabled !== false) {
    issues.push("executionEnabled must be false.");
  }

  if (!Array.isArray(input.rankedCandidates)) {
    issues.push("rankedCandidates must be an array.");
  }
  if (!Array.isArray(input.excludedCandidates)) {
    issues.push("excludedCandidates must be an array.");
  }
  if (!Array.isArray(input.scoreBreakdowns)) {
    issues.push("scoreBreakdowns must be an array.");
  }

  if (!isRecord(input.diagnostics)) {
    issues.push("diagnostics must be an object.");
  } else {
    for (const key of Object.keys(input.diagnostics)) {
      if (!DIAGNOSTICS_ALLOWED_FIELD_SET.has(key)) {
        issues.push(`diagnostics contains unknown field "${key}".`);
      }
    }
    if (!isNonNegativeInteger(input.diagnostics.evaluatedCandidateCount)) {
      issues.push(
        "diagnostics.evaluatedCandidateCount must be a non-negative integer."
      );
    }
    if (!isNonNegativeInteger(input.diagnostics.rankedCandidateCount)) {
      issues.push(
        "diagnostics.rankedCandidateCount must be a non-negative integer."
      );
    }
    if (!isNonNegativeInteger(input.diagnostics.excludedCandidateCount)) {
      issues.push(
        "diagnostics.excludedCandidateCount must be a non-negative integer."
      );
    }
    validateExclusionSummary(input.diagnostics.exclusionSummary, issues);
    if (!Array.isArray(input.diagnostics.tieBreakEvents)) {
      issues.push("diagnostics.tieBreakEvents must be an array.");
    } else {
      for (let i = 0; i < input.diagnostics.tieBreakEvents.length; i++) {
        const event = input.diagnostics.tieBreakEvents[i];
        const prefix = `diagnostics.tieBreakEvents[${i}]`;
        if (!isRecord(event)) {
          issues.push(`${prefix} must be an object.`);
          continue;
        }
        if (!isNonEmptyString(event.leftCandidateId)) {
          issues.push(`${prefix}.leftCandidateId must be a non-empty string.`);
        }
        if (!isNonEmptyString(event.rightCandidateId)) {
          issues.push(
            `${prefix}.rightCandidateId must be a non-empty string.`
          );
        }
        if (!isAdsRankingTieBreakRule(event.rule)) {
          issues.push(`${prefix}.rule is not a supported tie-break rule.`);
        }
      }
    }
  }

  if (!isRecord(input.metadata)) {
    issues.push("metadata must be an object.");
  } else {
    for (const key of Object.keys(input.metadata)) {
      if (!METADATA_ALLOWED_FIELD_SET.has(key)) {
        issues.push(`metadata contains unknown field "${key}".`);
      }
    }
    if (input.metadata.contractVersion !== ADS_RANKING_CONTRACT_VERSION) {
      issues.push(
        `metadata.contractVersion must be "${ADS_RANKING_CONTRACT_VERSION}".`
      );
    }
    if (
      input.metadata.scoringContractVersion !== ADS_SCORING_CONTRACT_VERSION
    ) {
      issues.push(
        `metadata.scoringContractVersion must be "${ADS_SCORING_CONTRACT_VERSION}".`
      );
    }
    if (input.metadata.strategy !== ADS_RANKING_STRATEGY) {
      issues.push(`metadata.strategy must be "${ADS_RANKING_STRATEGY}".`);
    }
  }

  const seenRankedIds = new Set<string>();
  if (Array.isArray(input.rankedCandidates)) {
    for (let i = 0; i < input.rankedCandidates.length; i++) {
      validateRankedCandidate(
        input.rankedCandidates[i],
        i,
        issues,
        seenRankedIds
      );
    }
  }

  if (Array.isArray(input.excludedCandidates)) {
    const seenExcluded = new Set<string>();
    for (let i = 0; i < input.excludedCandidates.length; i++) {
      const entry = input.excludedCandidates[i];
      const prefix = `excludedCandidates[${i}]`;
      if (!isRecord(entry)) {
        issues.push(`${prefix} must be an object.`);
        continue;
      }
      if (!isNonEmptyString(entry.candidateId)) {
        issues.push(`${prefix}.candidateId must be a non-empty string.`);
      } else if (seenExcluded.has(entry.candidateId)) {
        issues.push(
          `excludedCandidates contain duplicate candidateId "${entry.candidateId}".`
        );
      } else if (seenRankedIds.has(entry.candidateId)) {
        issues.push(
          `candidateId "${entry.candidateId}" cannot be both ranked and excluded.`
        );
      } else {
        seenExcluded.add(entry.candidateId);
      }
      if (!isAdsRankingExclusionReason(entry.reason)) {
        issues.push(`${prefix}.reason is not a supported exclusion reason.`);
      }
    }
  }

  if (
    isRecord(input.diagnostics) &&
    isNonNegativeInteger(input.diagnostics.rankedCandidateCount) &&
    Array.isArray(input.rankedCandidates) &&
    input.diagnostics.rankedCandidateCount !== input.rankedCandidates.length
  ) {
    issues.push(
      "diagnostics.rankedCandidateCount is inconsistent with rankedCandidates length."
    );
  }

  if (
    isRecord(input.diagnostics) &&
    isNonNegativeInteger(input.diagnostics.excludedCandidateCount) &&
    Array.isArray(input.excludedCandidates) &&
    input.diagnostics.excludedCandidateCount !==
      input.excludedCandidates.length
  ) {
    issues.push(
      "diagnostics.excludedCandidateCount is inconsistent with excludedCandidates length."
    );
  }

  if (
    isRecord(input.diagnostics) &&
    isNonNegativeInteger(input.diagnostics.evaluatedCandidateCount) &&
    isNonNegativeInteger(input.diagnostics.rankedCandidateCount) &&
    isNonNegativeInteger(input.diagnostics.excludedCandidateCount) &&
    input.diagnostics.evaluatedCandidateCount !==
      input.diagnostics.rankedCandidateCount +
        input.diagnostics.excludedCandidateCount
  ) {
    issues.push(
      "diagnostics.evaluatedCandidateCount must equal ranked + excluded counts."
    );
  }

  if (
    Array.isArray(input.scoreBreakdowns) &&
    isRecord(input.diagnostics) &&
    isNonNegativeInteger(input.diagnostics.evaluatedCandidateCount) &&
    input.scoreBreakdowns.length !==
      input.diagnostics.evaluatedCandidateCount
  ) {
    issues.push(
      "scoreBreakdowns length must equal diagnostics.evaluatedCandidateCount."
    );
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Empty ranking result helper — production/delivery/execution remain disabled.
 */
export function createEmptyAdsRankingResult(): AdsRankingResult {
  return freezeRankingResult({
    contractVersion: ADS_RANKING_CONTRACT_VERSION,
    strategy: ADS_RANKING_STRATEGY,
    rankedCandidates: [],
    excludedCandidates: [],
    scoreBreakdowns: [],
    diagnostics: {
      evaluatedCandidateCount: 0,
      rankedCandidateCount: 0,
      excludedCandidateCount: 0,
      exclusionSummary: {},
      tieBreakEvents: [],
    },
    metadata: freezeMetadata(),
    productionEnabled: false,
    deliveryEnabled: false,
    executionEnabled: false,
  });
}
