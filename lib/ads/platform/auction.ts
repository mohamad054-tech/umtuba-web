import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import {
  ADS_RANKING_CONTRACT_VERSION,
  ADS_RANKING_MAX_CANDIDATES,
  ADS_RANKING_STRATEGY,
  ADS_RANKING_TIE_BREAK_RULES,
} from "./ranking";
import {
  ADS_SCORING_CONTRACT_VERSION,
  ADS_SCORING_WEIGHTS,
} from "./scoring";

/**
 * Ads Auction Foundation V1 — pure, deterministic, fail-closed.
 *
 * Selects at most one winner from already-ranked candidates using an explicit
 * eligibility snapshot. This is NOT a production auction and does not price,
 * clear, charge, or spend. Never mutates budgets/pacing, randomizes, or
 * consults wall-clock / network / database / AI / ML / product modules.
 *
 * Winner selection is deterministic rank-order among eligible candidates only.
 * productionEnabled, deliveryEnabled, and executionEnabled are always false.
 */

export const ADS_AUCTION_CONTRACT_VERSION = "v1" as const;

/** Sole supported V1 auction strategy (rank-order only; no price formation). */
export const ADS_AUCTION_STRATEGY =
  "deterministic_first_eligible_rank_v1" as const;

/** Sole supported V1 winner selection rule. */
export const ADS_AUCTION_SELECTION_RULE =
  "first_eligible_by_rank_v1" as const;

/** Max ranked candidates accepted in one auction request. */
export const ADS_AUCTION_MAX_CANDIDATES = ADS_RANKING_MAX_CANDIDATES;

/**
 * Stable winner / tie-break rule order (first difference wins).
 * Documented for tests — do not reorder lightly.
 *
 * 1. rank ASC (lower rank wins)
 * 2. totalScore DESC
 * 3. candidateId ASC (UTF-16 code-unit order)
 */
export const ADS_AUCTION_TIE_BREAK_RULES = [
  "rank_asc",
  "total_score_desc",
  "candidate_id_asc",
] as const;

export type AdsAuctionTieBreakRule =
  (typeof ADS_AUCTION_TIE_BREAK_RULES)[number];

/**
 * Reasons when no winner is selected (valid empty outcome).
 * Order is documentation-only; both are mutually exclusive by input shape.
 */
export const ADS_AUCTION_NO_WINNER_REASONS = [
  "no_ranked_candidates",
  "no_eligible_candidates",
] as const;

export type AdsAuctionNoWinnerReason =
  (typeof ADS_AUCTION_NO_WINNER_REASONS)[number];

/**
 * Top-level keys allowed on AdsAuctionRankedCandidate.
 * Unknown fields fail closed.
 */
export const ADS_AUCTION_RANKED_CANDIDATE_ALLOWED_FIELDS = [
  "candidateId",
  "rank",
  "totalScore",
] as const;

/**
 * Top-level keys allowed on AdsAuctionEligibilityEntry.
 * Unknown fields fail closed.
 */
export const ADS_AUCTION_ELIGIBILITY_ENTRY_ALLOWED_FIELDS = [
  "candidateId",
  "eligible",
] as const;

/**
 * Top-level keys allowed on ranking metadata accepted by auction input.
 * Mirrors AdsRankingMetadata identity — unknown fields fail closed.
 */
export const ADS_AUCTION_RANKING_METADATA_ALLOWED_FIELDS = [
  "contractVersion",
  "scoringContractVersion",
  "strategy",
  "weights",
  "tieBreakRules",
] as const;

/**
 * Top-level keys allowed on AdsAuctionInput.
 * Unknown fields fail closed.
 */
export const ADS_AUCTION_INPUT_ALLOWED_FIELDS = [
  "rankedCandidates",
  "rankingMetadata",
  "eligibilityState",
] as const;

/**
 * Top-level keys allowed on AdsAuctionWinner.
 * Unknown fields fail closed.
 */
export const ADS_AUCTION_WINNER_ALLOWED_FIELDS = [
  "candidateId",
  "rank",
  "totalScore",
  "selectionRule",
  "tieBreakRuleApplied",
] as const;

/**
 * Top-level keys allowed on AdsAuctionDiagnostics.
 * Unknown fields fail closed.
 */
export const ADS_AUCTION_DIAGNOSTICS_ALLOWED_FIELDS = [
  "evaluatedCandidateCount",
  "eligibleCandidateCount",
  "ineligibleCandidateCount",
  "winnerSelected",
  "noWinnerReason",
  "tieBreakEvents",
] as const;

/**
 * Top-level keys allowed on AdsAuctionMetadata.
 * Unknown fields fail closed.
 */
export const ADS_AUCTION_METADATA_ALLOWED_FIELDS = [
  "contractVersion",
  "rankingContractVersion",
  "scoringContractVersion",
  "rankingStrategy",
  "strategy",
  "selectionRule",
  "tieBreakRules",
] as const;

/**
 * Top-level keys allowed on AdsAuctionResult.
 * Unknown fields fail closed.
 */
export const ADS_AUCTION_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "strategy",
  "auctionWinner",
  "auctionDiagnostics",
  "auctionMetadata",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

export type AdsAuctionRankedCandidate = Readonly<{
  candidateId: string;
  /** 1-based rank from Ranking Foundation. */
  rank: number;
  /** Finite number in [0, 1]. */
  totalScore: number;
}>;

export type AdsAuctionEligibilityEntry = Readonly<{
  candidateId: string;
  eligible: boolean;
}>;

/**
 * Ranking provenance snapshot required by the auction.
 * Must match Ranking Foundation V1 identity constants.
 */
export type AdsAuctionRankingMetadata = Readonly<{
  contractVersion: typeof ADS_RANKING_CONTRACT_VERSION;
  scoringContractVersion: typeof ADS_SCORING_CONTRACT_VERSION;
  strategy: typeof ADS_RANKING_STRATEGY;
  weights: typeof ADS_SCORING_WEIGHTS;
  tieBreakRules: typeof ADS_RANKING_TIE_BREAK_RULES;
}>;

export type AdsAuctionInput = Readonly<{
  rankedCandidates: readonly AdsAuctionRankedCandidate[];
  rankingMetadata: AdsAuctionRankingMetadata;
  /**
   * Per-candidate eligibility. Must cover every ranked candidateId exactly once.
   */
  eligibilityState: readonly AdsAuctionEligibilityEntry[];
}>;

export type AdsAuctionWinner = Readonly<{
  candidateId: string;
  rank: number;
  totalScore: number;
  selectionRule: typeof ADS_AUCTION_SELECTION_RULE;
  /**
   * Tie-break rule that decided this winner vs the next-best eligible candidate.
   * Null when there is only one eligible candidate.
   */
  tieBreakRuleApplied: AdsAuctionTieBreakRule | null;
}>;

export type AdsAuctionTieBreakEvent = Readonly<{
  leftCandidateId: string;
  rightCandidateId: string;
  rule: AdsAuctionTieBreakRule;
}>;

export type AdsAuctionDiagnostics = Readonly<{
  evaluatedCandidateCount: number;
  eligibleCandidateCount: number;
  ineligibleCandidateCount: number;
  winnerSelected: boolean;
  noWinnerReason: AdsAuctionNoWinnerReason | null;
  tieBreakEvents: readonly AdsAuctionTieBreakEvent[];
}>;

export type AdsAuctionMetadata = Readonly<{
  contractVersion: typeof ADS_AUCTION_CONTRACT_VERSION;
  rankingContractVersion: typeof ADS_RANKING_CONTRACT_VERSION;
  scoringContractVersion: typeof ADS_SCORING_CONTRACT_VERSION;
  rankingStrategy: typeof ADS_RANKING_STRATEGY;
  strategy: typeof ADS_AUCTION_STRATEGY;
  selectionRule: typeof ADS_AUCTION_SELECTION_RULE;
  tieBreakRules: typeof ADS_AUCTION_TIE_BREAK_RULES;
}>;

/**
 * Canonical Auction Result V1.
 * Immutable; never enables production / delivery / execution.
 */
export type AdsAuctionResult = Readonly<{
  contractVersion: typeof ADS_AUCTION_CONTRACT_VERSION;
  strategy: typeof ADS_AUCTION_STRATEGY;
  auctionWinner: AdsAuctionWinner | null;
  auctionDiagnostics: AdsAuctionDiagnostics;
  auctionMetadata: AdsAuctionMetadata;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

export type AdsAuctionOutcome =
  | Readonly<{ valid: true; result: AdsAuctionResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsAuctionInputParseResult =
  | Readonly<{ valid: true; input: AdsAuctionInput }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

type AuctionableCandidate = Readonly<{
  candidate: AdsAuctionRankedCandidate;
}>;

const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_AUCTION_INPUT_ALLOWED_FIELDS
);
const RANKED_ALLOWED_FIELD_SET = new Set<string>(
  ADS_AUCTION_RANKED_CANDIDATE_ALLOWED_FIELDS
);
const ELIGIBILITY_ALLOWED_FIELD_SET = new Set<string>(
  ADS_AUCTION_ELIGIBILITY_ENTRY_ALLOWED_FIELDS
);
const RANKING_METADATA_ALLOWED_FIELD_SET = new Set<string>(
  ADS_AUCTION_RANKING_METADATA_ALLOWED_FIELDS
);
const WINNER_ALLOWED_FIELD_SET = new Set<string>(
  ADS_AUCTION_WINNER_ALLOWED_FIELDS
);
const DIAGNOSTICS_ALLOWED_FIELD_SET = new Set<string>(
  ADS_AUCTION_DIAGNOSTICS_ALLOWED_FIELDS
);
const METADATA_ALLOWED_FIELD_SET = new Set<string>(
  ADS_AUCTION_METADATA_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_AUCTION_RESULT_ALLOWED_FIELDS
);
const TIE_BREAK_RULE_SET = new Set<string>(ADS_AUCTION_TIE_BREAK_RULES);
const NO_WINNER_REASON_SET = new Set<string>(ADS_AUCTION_NO_WINNER_REASONS);

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

function isUnitIntervalScore(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function isAdsAuctionTieBreakRule(
  value: unknown
): value is AdsAuctionTieBreakRule {
  return typeof value === "string" && TIE_BREAK_RULE_SET.has(value);
}

function isAdsAuctionNoWinnerReason(
  value: unknown
): value is AdsAuctionNoWinnerReason {
  return typeof value === "string" && NO_WINNER_REASON_SET.has(value);
}

function compareCandidateIdAsc(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Compare two auctionable candidates. Returns the deciding tie-break rule.
 * Deterministic — no randomness, no wall-clock, no input-order fallback.
 *
 * Same-rank totalScore / candidateId branches are defensive: after input
 * integrity validation, ranks are a unique permutation of 1..n, so
 * runAdsAuction never reaches same-rank ordering among eligible candidates.
 * order === 0 means fully ambiguous identity (same rank + score + id) and
 * must be treated as invalid by callers — never resolved by input position.
 */
export function compareAdsAuctionableCandidates(
  left: AuctionableCandidate,
  right: AuctionableCandidate
): Readonly<{ order: number; rule: AdsAuctionTieBreakRule }> {
  if (left.candidate.rank !== right.candidate.rank) {
    return {
      order: left.candidate.rank - right.candidate.rank,
      rule: "rank_asc",
    };
  }
  if (left.candidate.totalScore !== right.candidate.totalScore) {
    return {
      order: right.candidate.totalScore - left.candidate.totalScore,
      rule: "total_score_desc",
    };
  }
  return {
    order: compareCandidateIdAsc(
      left.candidate.candidateId,
      right.candidate.candidateId
    ),
    rule: "candidate_id_asc",
  };
}

function freezeRankedCandidate(
  candidate: AdsAuctionRankedCandidate
): AdsAuctionRankedCandidate {
  return Object.freeze({
    candidateId: candidate.candidateId,
    rank: candidate.rank,
    totalScore: candidate.totalScore,
  });
}

function freezeEligibilityEntry(
  entry: AdsAuctionEligibilityEntry
): AdsAuctionEligibilityEntry {
  return Object.freeze({
    candidateId: entry.candidateId,
    eligible: entry.eligible,
  });
}

function freezeRankingMetadata(): AdsAuctionRankingMetadata {
  return Object.freeze({
    contractVersion: ADS_RANKING_CONTRACT_VERSION,
    scoringContractVersion: ADS_SCORING_CONTRACT_VERSION,
    strategy: ADS_RANKING_STRATEGY,
    weights: ADS_SCORING_WEIGHTS,
    tieBreakRules: ADS_RANKING_TIE_BREAK_RULES,
  });
}

function freezeWinner(winner: AdsAuctionWinner): AdsAuctionWinner {
  return Object.freeze({
    candidateId: winner.candidateId,
    rank: winner.rank,
    totalScore: winner.totalScore,
    selectionRule: ADS_AUCTION_SELECTION_RULE,
    tieBreakRuleApplied: winner.tieBreakRuleApplied,
  });
}

function freezeDiagnostics(
  diagnostics: AdsAuctionDiagnostics
): AdsAuctionDiagnostics {
  return Object.freeze({
    evaluatedCandidateCount: diagnostics.evaluatedCandidateCount,
    eligibleCandidateCount: diagnostics.eligibleCandidateCount,
    ineligibleCandidateCount: diagnostics.ineligibleCandidateCount,
    winnerSelected: diagnostics.winnerSelected,
    noWinnerReason: diagnostics.noWinnerReason,
    tieBreakEvents: Object.freeze(
      diagnostics.tieBreakEvents.map((event) => Object.freeze({ ...event }))
    ),
  });
}

function freezeMetadata(): AdsAuctionMetadata {
  return Object.freeze({
    contractVersion: ADS_AUCTION_CONTRACT_VERSION,
    rankingContractVersion: ADS_RANKING_CONTRACT_VERSION,
    scoringContractVersion: ADS_SCORING_CONTRACT_VERSION,
    rankingStrategy: ADS_RANKING_STRATEGY,
    strategy: ADS_AUCTION_STRATEGY,
    selectionRule: ADS_AUCTION_SELECTION_RULE,
    tieBreakRules: ADS_AUCTION_TIE_BREAK_RULES,
  });
}

function freezeAuctionResult(result: AdsAuctionResult): AdsAuctionResult {
  return Object.freeze({
    contractVersion: ADS_AUCTION_CONTRACT_VERSION,
    strategy: ADS_AUCTION_STRATEGY,
    auctionWinner:
      result.auctionWinner === null
        ? null
        : freezeWinner(result.auctionWinner),
    auctionDiagnostics: freezeDiagnostics(result.auctionDiagnostics),
    auctionMetadata: freezeMetadata(),
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

function parseRankedCandidate(
  value: unknown,
  fieldPrefix: string,
  issues: string[],
  seenIds: Set<string>
): AdsAuctionRankedCandidate | null {
  if (!isRecord(value)) {
    issues.push(`${fieldPrefix} must be an object.`);
    return null;
  }

  for (const key of Object.keys(value)) {
    if (!RANKED_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`${fieldPrefix} contains unknown field "${key}".`);
    }
  }

  let candidateId: string | null = null;
  if (!isNonEmptyString(value.candidateId)) {
    issues.push(
      `${fieldPrefix}.candidateId is required and must be a non-empty string.`
    );
  } else if (value.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldPrefix}.candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  } else if (seenIds.has(value.candidateId)) {
    issues.push(
      `rankedCandidates contain duplicate candidateId "${value.candidateId}".`
    );
  } else {
    candidateId = value.candidateId;
    seenIds.add(value.candidateId);
  }

  let rank: number | null = null;
  if (!isPositiveInteger(value.rank)) {
    issues.push(`${fieldPrefix}.rank must be a positive integer.`);
  } else {
    rank = value.rank;
  }

  let totalScore: number | null = null;
  if (!isUnitIntervalScore(value.totalScore)) {
    issues.push(
      `${fieldPrefix}.totalScore must be a finite number in [0, 1].`
    );
  } else {
    totalScore = value.totalScore;
  }

  if (candidateId === null || rank === null || totalScore === null) {
    return null;
  }

  return freezeRankedCandidate({
    candidateId,
    rank,
    totalScore,
  });
}

function parseEligibilityEntry(
  value: unknown,
  fieldPrefix: string,
  issues: string[],
  seenIds: Set<string>
): AdsAuctionEligibilityEntry | null {
  if (!isRecord(value)) {
    issues.push(`${fieldPrefix} must be an object.`);
    return null;
  }

  for (const key of Object.keys(value)) {
    if (!ELIGIBILITY_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`${fieldPrefix} contains unknown field "${key}".`);
    }
  }

  let candidateId: string | null = null;
  if (!isNonEmptyString(value.candidateId)) {
    issues.push(
      `${fieldPrefix}.candidateId is required and must be a non-empty string.`
    );
  } else if (value.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldPrefix}.candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  } else if (seenIds.has(value.candidateId)) {
    issues.push(
      `eligibilityState contain duplicate candidateId "${value.candidateId}".`
    );
  } else {
    candidateId = value.candidateId;
    seenIds.add(value.candidateId);
  }

  if (typeof value.eligible !== "boolean") {
    issues.push(`${fieldPrefix}.eligible must be a boolean.`);
    return null;
  }

  if (candidateId === null) {
    return null;
  }

  return freezeEligibilityEntry({
    candidateId,
    eligible: value.eligible,
  });
}

function parseRankingMetadata(
  value: unknown,
  issues: string[]
): AdsAuctionRankingMetadata | null {
  if (!isRecord(value)) {
    issues.push("rankingMetadata must be an object.");
    return null;
  }

  for (const key of Object.keys(value)) {
    if (!RANKING_METADATA_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`rankingMetadata contains unknown field "${key}".`);
    }
  }

  if (value.contractVersion !== ADS_RANKING_CONTRACT_VERSION) {
    issues.push(
      `rankingMetadata.contractVersion must be "${ADS_RANKING_CONTRACT_VERSION}".`
    );
  }
  if (value.scoringContractVersion !== ADS_SCORING_CONTRACT_VERSION) {
    issues.push(
      `rankingMetadata.scoringContractVersion must be "${ADS_SCORING_CONTRACT_VERSION}".`
    );
  }
  if (value.strategy !== ADS_RANKING_STRATEGY) {
    issues.push(
      `rankingMetadata.strategy must be "${ADS_RANKING_STRATEGY}".`
    );
  }

  if (!isRecord(value.weights)) {
    issues.push("rankingMetadata.weights must be an object.");
  } else {
    if (value.weights.quality !== ADS_SCORING_WEIGHTS.quality) {
      issues.push("rankingMetadata.weights.quality mismatch.");
    }
    if (value.weights.relevance !== ADS_SCORING_WEIGHTS.relevance) {
      issues.push("rankingMetadata.weights.relevance mismatch.");
    }
    if (value.weights.freshness !== ADS_SCORING_WEIGHTS.freshness) {
      issues.push("rankingMetadata.weights.freshness mismatch.");
    }
    for (const key of Object.keys(value.weights)) {
      if (
        key !== "quality" &&
        key !== "relevance" &&
        key !== "freshness"
      ) {
        issues.push(`rankingMetadata.weights contains unknown field "${key}".`);
      }
    }
  }

  if (!Array.isArray(value.tieBreakRules)) {
    issues.push("rankingMetadata.tieBreakRules must be an array.");
  } else if (value.tieBreakRules.length !== ADS_RANKING_TIE_BREAK_RULES.length) {
    issues.push("rankingMetadata.tieBreakRules length mismatch.");
  } else {
    for (let i = 0; i < ADS_RANKING_TIE_BREAK_RULES.length; i++) {
      if (value.tieBreakRules[i] !== ADS_RANKING_TIE_BREAK_RULES[i]) {
        issues.push(`rankingMetadata.tieBreakRules[${i}] mismatch.`);
      }
    }
  }

  if (
    value.contractVersion !== ADS_RANKING_CONTRACT_VERSION ||
    value.scoringContractVersion !== ADS_SCORING_CONTRACT_VERSION ||
    value.strategy !== ADS_RANKING_STRATEGY ||
    !isRecord(value.weights) ||
    value.weights.quality !== ADS_SCORING_WEIGHTS.quality ||
    value.weights.relevance !== ADS_SCORING_WEIGHTS.relevance ||
    value.weights.freshness !== ADS_SCORING_WEIGHTS.freshness ||
    !Array.isArray(value.tieBreakRules) ||
    value.tieBreakRules.length !== ADS_RANKING_TIE_BREAK_RULES.length
  ) {
    return null;
  }

  for (let i = 0; i < ADS_RANKING_TIE_BREAK_RULES.length; i++) {
    if (value.tieBreakRules[i] !== ADS_RANKING_TIE_BREAK_RULES[i]) {
      return null;
    }
  }

  return freezeRankingMetadata();
}

/**
 * Parse and narrow auction input.
 * Fail-closed — constructs a fresh immutable input on success.
 */
export function parseAdsAuctionInput(
  input: unknown
): AdsAuctionInputParseResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Auction input must be an object."]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Auction input contains unknown field "${key}".`);
    }
  }

  if (!Array.isArray(input.rankedCandidates)) {
    issues.push("rankedCandidates must be an array.");
  }
  if (!Array.isArray(input.eligibilityState)) {
    issues.push("eligibilityState must be an array.");
  }

  const rankingMetadata = parseRankingMetadata(input.rankingMetadata, issues);

  const rankedCandidates: AdsAuctionRankedCandidate[] = [];
  const seenRankedIds = new Set<string>();
  if (Array.isArray(input.rankedCandidates)) {
    if (input.rankedCandidates.length > ADS_AUCTION_MAX_CANDIDATES) {
      issues.push(
        `rankedCandidates exceeds max length of ${ADS_AUCTION_MAX_CANDIDATES}.`
      );
    }
    for (let i = 0; i < input.rankedCandidates.length; i++) {
      const parsed = parseRankedCandidate(
        input.rankedCandidates[i],
        `rankedCandidates[${i}]`,
        issues,
        seenRankedIds
      );
      if (parsed !== null) {
        rankedCandidates.push(parsed);
      }
    }
  }

  const eligibilityState: AdsAuctionEligibilityEntry[] = [];
  const seenEligibilityIds = new Set<string>();
  if (Array.isArray(input.eligibilityState)) {
    if (input.eligibilityState.length > ADS_AUCTION_MAX_CANDIDATES) {
      issues.push(
        `eligibilityState exceeds max length of ${ADS_AUCTION_MAX_CANDIDATES}.`
      );
    }
    for (let i = 0; i < input.eligibilityState.length; i++) {
      const parsed = parseEligibilityEntry(
        input.eligibilityState[i],
        `eligibilityState[${i}]`,
        issues,
        seenEligibilityIds
      );
      if (parsed !== null) {
        eligibilityState.push(parsed);
      }
    }
  }

  // Rank integrity: unique positive ranks must equal 1..n in some order.
  if (
    rankedCandidates.length > 0 &&
    rankedCandidates.length ===
      (Array.isArray(input.rankedCandidates)
        ? input.rankedCandidates.length
        : -1)
  ) {
    const ranks = rankedCandidates.map((entry) => entry.rank).sort((a, b) => a - b);
    for (let i = 0; i < ranks.length; i++) {
      if (ranks[i] !== i + 1) {
        issues.push(
          "rankedCandidates ranks must be a permutation of 1..n with no gaps or duplicates."
        );
        break;
      }
    }
  }

  // Eligibility must cover every ranked candidate exactly; no extras.
  if (
    rankedCandidates.length ===
      (Array.isArray(input.rankedCandidates)
        ? input.rankedCandidates.length
        : -1) &&
    eligibilityState.length ===
      (Array.isArray(input.eligibilityState)
        ? input.eligibilityState.length
        : -1)
  ) {
    if (eligibilityState.length !== rankedCandidates.length) {
      issues.push(
        "eligibilityState length must equal rankedCandidates length."
      );
    } else {
      for (const ranked of rankedCandidates) {
        if (!seenEligibilityIds.has(ranked.candidateId)) {
          issues.push(
            `eligibilityState is missing candidateId "${ranked.candidateId}".`
          );
        }
      }
      for (const entry of eligibilityState) {
        if (!seenRankedIds.has(entry.candidateId)) {
          issues.push(
            `eligibilityState contains unknown candidateId "${entry.candidateId}".`
          );
        }
      }
    }
  }

  if (issues.length > 0 || rankingMetadata === null) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    input: Object.freeze({
      rankedCandidates: Object.freeze([...rankedCandidates]),
      rankingMetadata,
      eligibilityState: Object.freeze([...eligibilityState]),
    }),
  };
}

/**
 * Run Auction Foundation V1 winner selection.
 * Same input always yields an identical immutable result.
 * Does not mutate the caller-provided input object or nested arrays.
 */
export function runAdsAuction(input: unknown): AdsAuctionOutcome {
  const parsedInput = parseAdsAuctionInput(input);
  if (!parsedInput.valid) {
    return { valid: false, issues: parsedInput.issues };
  }

  const { rankedCandidates, eligibilityState } = parsedInput.input;
  const eligibilityById = new Map<string, boolean>();
  for (const entry of eligibilityState) {
    eligibilityById.set(entry.candidateId, entry.eligible);
  }

  const eligible: AuctionableCandidate[] = [];
  let ineligibleCandidateCount = 0;

  for (const candidate of rankedCandidates) {
    const eligibleFlag = eligibilityById.get(candidate.candidateId);
    if (eligibleFlag !== true) {
      ineligibleCandidateCount += 1;
      continue;
    }
    eligible.push({ candidate });
  }

  const tieBreakEvents: AdsAuctionTieBreakEvent[] = [];
  let auctionWinner: AdsAuctionWinner | null = null;
  let noWinnerReason: AdsAuctionNoWinnerReason | null = null;

  if (rankedCandidates.length === 0) {
    noWinnerReason = "no_ranked_candidates";
  } else if (eligible.length === 0) {
    noWinnerReason = "no_eligible_candidates";
  } else {
    const sorted = [...eligible].sort((left, right) => {
      const comparison = compareAdsAuctionableCandidates(left, right);
      if (comparison.order < 0) return -1;
      if (comparison.order > 0) return 1;
      return 0;
    });

    for (let i = 1; i < sorted.length; i++) {
      const previous = sorted[i - 1];
      const current = sorted[i];
      const comparison = compareAdsAuctionableCandidates(previous, current);
      if (comparison.order === 0) {
        return {
          valid: false,
          issues: Object.freeze([
            "Eligible candidates are ambiguous under auction tie-break rules.",
          ]),
        };
      }
      if (comparison.rule !== "rank_asc") {
        tieBreakEvents.push(
          Object.freeze({
            leftCandidateId: previous.candidate.candidateId,
            rightCandidateId: current.candidate.candidateId,
            rule: comparison.rule,
          })
        );
      }
    }

    const winnerCandidate = sorted[0];
    let tieBreakRuleApplied: AdsAuctionTieBreakRule | null = null;
    if (sorted.length > 1) {
      const comparison = compareAdsAuctionableCandidates(
        winnerCandidate,
        sorted[1]
      );
      tieBreakRuleApplied = comparison.rule;
    }

    auctionWinner = freezeWinner({
      candidateId: winnerCandidate.candidate.candidateId,
      rank: winnerCandidate.candidate.rank,
      totalScore: winnerCandidate.candidate.totalScore,
      selectionRule: ADS_AUCTION_SELECTION_RULE,
      tieBreakRuleApplied,
    });
  }

  const result = freezeAuctionResult({
    contractVersion: ADS_AUCTION_CONTRACT_VERSION,
    strategy: ADS_AUCTION_STRATEGY,
    auctionWinner,
    auctionDiagnostics: {
      evaluatedCandidateCount: rankedCandidates.length,
      eligibleCandidateCount: eligible.length,
      ineligibleCandidateCount,
      winnerSelected: auctionWinner !== null,
      noWinnerReason,
      tieBreakEvents,
    },
    auctionMetadata: freezeMetadata(),
    productionEnabled: false,
    deliveryEnabled: false,
    executionEnabled: false,
  });

  return { valid: true, result };
}

function validateWinner(
  value: unknown,
  issues: string[]
): void {
  if (value === null) {
    return;
  }
  if (!isRecord(value)) {
    issues.push("auctionWinner must be an object or null.");
    return;
  }

  for (const key of Object.keys(value)) {
    if (!WINNER_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`auctionWinner contains unknown field "${key}".`);
    }
  }

  if (!isNonEmptyString(value.candidateId)) {
    issues.push(
      "auctionWinner.candidateId is required and must be a non-empty string."
    );
  } else if (value.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `auctionWinner.candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  }

  if (!isPositiveInteger(value.rank)) {
    issues.push("auctionWinner.rank must be a positive integer.");
  }

  if (!isUnitIntervalScore(value.totalScore)) {
    issues.push(
      "auctionWinner.totalScore must be a finite number in [0, 1]."
    );
  }

  if (value.selectionRule !== ADS_AUCTION_SELECTION_RULE) {
    issues.push(
      `auctionWinner.selectionRule must be "${ADS_AUCTION_SELECTION_RULE}".`
    );
  }

  if (
    value.tieBreakRuleApplied !== null &&
    !isAdsAuctionTieBreakRule(value.tieBreakRuleApplied)
  ) {
    issues.push(
      "auctionWinner.tieBreakRuleApplied must be null or a supported tie-break rule."
    );
  }
}

/**
 * Pure shape validator for auction results.
 * Fail-closed — does not re-run winner selection.
 */
export function validateAdsAuctionResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Auction result must be an object."]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!RESULT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Auction result contains unknown field "${key}".`);
    }
  }

  if (input.contractVersion !== ADS_AUCTION_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_AUCTION_CONTRACT_VERSION}".`
    );
  }

  if (input.strategy !== ADS_AUCTION_STRATEGY) {
    issues.push(`strategy must be "${ADS_AUCTION_STRATEGY}".`);
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

  validateWinner(input.auctionWinner, issues);

  if (!isRecord(input.auctionDiagnostics)) {
    issues.push("auctionDiagnostics must be an object.");
  } else {
    for (const key of Object.keys(input.auctionDiagnostics)) {
      if (!DIAGNOSTICS_ALLOWED_FIELD_SET.has(key)) {
        issues.push(`auctionDiagnostics contains unknown field "${key}".`);
      }
    }
    const diagnostics = input.auctionDiagnostics;
    if (!isNonNegativeInteger(diagnostics.evaluatedCandidateCount)) {
      issues.push(
        "auctionDiagnostics.evaluatedCandidateCount must be a non-negative integer."
      );
    }
    if (!isNonNegativeInteger(diagnostics.eligibleCandidateCount)) {
      issues.push(
        "auctionDiagnostics.eligibleCandidateCount must be a non-negative integer."
      );
    }
    if (!isNonNegativeInteger(diagnostics.ineligibleCandidateCount)) {
      issues.push(
        "auctionDiagnostics.ineligibleCandidateCount must be a non-negative integer."
      );
    }
    if (typeof diagnostics.winnerSelected !== "boolean") {
      issues.push("auctionDiagnostics.winnerSelected must be a boolean.");
    }
    if (
      diagnostics.noWinnerReason !== null &&
      !isAdsAuctionNoWinnerReason(diagnostics.noWinnerReason)
    ) {
      issues.push(
        "auctionDiagnostics.noWinnerReason must be null or a supported reason."
      );
    }
    if (!Array.isArray(diagnostics.tieBreakEvents)) {
      issues.push("auctionDiagnostics.tieBreakEvents must be an array.");
    } else {
      for (let i = 0; i < diagnostics.tieBreakEvents.length; i++) {
        const event = diagnostics.tieBreakEvents[i];
        const prefix = `auctionDiagnostics.tieBreakEvents[${i}]`;
        if (!isRecord(event)) {
          issues.push(`${prefix} must be an object.`);
          continue;
        }
        if (!isNonEmptyString(event.leftCandidateId)) {
          issues.push(`${prefix}.leftCandidateId must be a non-empty string.`);
        }
        if (!isNonEmptyString(event.rightCandidateId)) {
          issues.push(`${prefix}.rightCandidateId must be a non-empty string.`);
        }
        if (!isAdsAuctionTieBreakRule(event.rule)) {
          issues.push(`${prefix}.rule is not a supported tie-break rule.`);
        }
      }
    }

    if (
      isNonNegativeInteger(diagnostics.evaluatedCandidateCount) &&
      isNonNegativeInteger(diagnostics.eligibleCandidateCount) &&
      isNonNegativeInteger(diagnostics.ineligibleCandidateCount) &&
      diagnostics.evaluatedCandidateCount !==
        diagnostics.eligibleCandidateCount +
          diagnostics.ineligibleCandidateCount
    ) {
      issues.push(
        "auctionDiagnostics.evaluatedCandidateCount must equal eligible + ineligible counts."
      );
    }

    if (typeof diagnostics.winnerSelected === "boolean") {
      if (diagnostics.winnerSelected) {
        if (input.auctionWinner === null) {
          issues.push(
            "auctionWinner is required when auctionDiagnostics.winnerSelected is true."
          );
        }
        if (diagnostics.noWinnerReason !== null) {
          issues.push(
            "auctionDiagnostics.noWinnerReason must be null when a winner is selected."
          );
        }
      } else {
        if (input.auctionWinner !== null) {
          issues.push(
            "auctionWinner must be null when auctionDiagnostics.winnerSelected is false."
          );
        }
        if (diagnostics.noWinnerReason === null) {
          issues.push(
            "auctionDiagnostics.noWinnerReason is required when no winner is selected."
          );
        }
      }
    }
  }

  if (!isRecord(input.auctionMetadata)) {
    issues.push("auctionMetadata must be an object.");
  } else {
    for (const key of Object.keys(input.auctionMetadata)) {
      if (!METADATA_ALLOWED_FIELD_SET.has(key)) {
        issues.push(`auctionMetadata contains unknown field "${key}".`);
      }
    }
    const metadata = input.auctionMetadata;
    if (metadata.contractVersion !== ADS_AUCTION_CONTRACT_VERSION) {
      issues.push(
        `auctionMetadata.contractVersion must be "${ADS_AUCTION_CONTRACT_VERSION}".`
      );
    }
    if (metadata.rankingContractVersion !== ADS_RANKING_CONTRACT_VERSION) {
      issues.push(
        `auctionMetadata.rankingContractVersion must be "${ADS_RANKING_CONTRACT_VERSION}".`
      );
    }
    if (metadata.scoringContractVersion !== ADS_SCORING_CONTRACT_VERSION) {
      issues.push(
        `auctionMetadata.scoringContractVersion must be "${ADS_SCORING_CONTRACT_VERSION}".`
      );
    }
    if (metadata.rankingStrategy !== ADS_RANKING_STRATEGY) {
      issues.push(
        `auctionMetadata.rankingStrategy must be "${ADS_RANKING_STRATEGY}".`
      );
    }
    if (metadata.strategy !== ADS_AUCTION_STRATEGY) {
      issues.push(
        `auctionMetadata.strategy must be "${ADS_AUCTION_STRATEGY}".`
      );
    }
    if (metadata.selectionRule !== ADS_AUCTION_SELECTION_RULE) {
      issues.push(
        `auctionMetadata.selectionRule must be "${ADS_AUCTION_SELECTION_RULE}".`
      );
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Empty auction result helper — production/delivery/execution remain disabled.
 */
export function createEmptyAdsAuctionResult(): AdsAuctionResult {
  return freezeAuctionResult({
    contractVersion: ADS_AUCTION_CONTRACT_VERSION,
    strategy: ADS_AUCTION_STRATEGY,
    auctionWinner: null,
    auctionDiagnostics: {
      evaluatedCandidateCount: 0,
      eligibleCandidateCount: 0,
      ineligibleCandidateCount: 0,
      winnerSelected: false,
      noWinnerReason: "no_ranked_candidates",
      tieBreakEvents: [],
    },
    auctionMetadata: freezeMetadata(),
    productionEnabled: false,
    deliveryEnabled: false,
    executionEnabled: false,
  });
}
