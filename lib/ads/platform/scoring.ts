import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";

/**
 * Ads Scoring Foundation V1 — pure, deterministic, fail-closed.
 *
 * Computes per-candidate score breakdowns and explanations from explicit
 * ranking signals only. Never ranks, auctions, paces, bills, delivers,
 * randomizes, or consults wall-clock / network / database / product modules.
 *
 * productionEnabled, deliveryEnabled, and executionEnabled are always false.
 */

export const ADS_SCORING_CONTRACT_VERSION = "v1" as const;

/** Max candidates accepted in one scoring batch. */
export const ADS_SCORING_MAX_CANDIDATES = 256;

/**
 * Fixed V1 continuous-signal weights. Sum is exactly 1.
 * Boolean gates are hard filters and do not contribute weight.
 * quality = 0.40, relevance = 0.35, freshness = 0.25.
 */
export const ADS_SCORING_WEIGHTS = Object.freeze({
  quality: 0.4,
  relevance: 0.35,
  freshness: 0.25,
} as const);

/** Continuous score component ids (weighted). */
export const ADS_SCORING_COMPONENT_IDS = [
  "quality",
  "relevance",
  "freshness",
] as const;

export type AdsScoringComponentId =
  (typeof ADS_SCORING_COMPONENT_IDS)[number];

/**
 * Hard-gate exclusion reasons (first match wins).
 * Documented order — do not reorder lightly.
 */
export const ADS_SCORING_EXCLUSION_REASONS = [
  "placement_incompatible",
  "creative_incompatible",
  "policy_ineligible",
  "delivery_ineligible",
] as const;

export type AdsScoringExclusionReason =
  (typeof ADS_SCORING_EXCLUSION_REASONS)[number];

/**
 * Top-level keys allowed on AdsRankingCandidateSignals.
 * Unknown fields fail closed.
 */
export const ADS_RANKING_CANDIDATE_SIGNALS_ALLOWED_FIELDS = [
  "candidateId",
  "placementCompatible",
  "creativeCompatible",
  "policyEligible",
  "deliveryEligible",
  "qualityScore",
  "relevanceScore",
  "freshnessScore",
] as const;

/**
 * Top-level keys allowed on AdsCandidateScoreBreakdown.
 * Unknown fields fail closed.
 */
export const ADS_CANDIDATE_SCORE_BREAKDOWN_ALLOWED_FIELDS = [
  "contractVersion",
  "candidateId",
  "components",
  "totalScore",
  "rankable",
  "exclusionReason",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

/**
 * Top-level keys allowed on AdsCandidateScoreExplanation.
 * Unknown fields fail closed.
 */
export const ADS_CANDIDATE_SCORE_EXPLANATION_ALLOWED_FIELDS = [
  "contractVersion",
  "candidateId",
  "rankable",
  "exclusionReason",
  "gates",
  "components",
  "totalScore",
  "summary",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

/**
 * Explicit ranking/scoring signals for one candidate.
 * Continuous scores must be finite numbers in [0, 1].
 */
export type AdsRankingCandidateSignals = Readonly<{
  candidateId: string;
  placementCompatible: boolean;
  creativeCompatible: boolean;
  policyEligible: boolean;
  deliveryEligible: boolean;
  /** Finite number in [0, 1]. */
  qualityScore: number;
  /** Finite number in [0, 1]. */
  relevanceScore: number;
  /** Finite number in [0, 1]. */
  freshnessScore: number;
}>;

export type AdsScoreComponentContribution = Readonly<{
  componentId: AdsScoringComponentId;
  rawValue: number;
  weight: number;
  contribution: number;
}>;

/**
 * Per-candidate score breakdown. Immutable result shape.
 */
export type AdsCandidateScoreBreakdown = Readonly<{
  contractVersion: typeof ADS_SCORING_CONTRACT_VERSION;
  candidateId: string;
  components: readonly AdsScoreComponentContribution[];
  totalScore: number;
  rankable: boolean;
  exclusionReason: AdsScoringExclusionReason | null;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

export type AdsScoreGateSnapshot = Readonly<{
  placementCompatible: boolean;
  creativeCompatible: boolean;
  policyEligible: boolean;
  deliveryEligible: boolean;
}>;

/**
 * Human-auditable score explanation for one candidate.
 */
export type AdsCandidateScoreExplanation = Readonly<{
  contractVersion: typeof ADS_SCORING_CONTRACT_VERSION;
  candidateId: string;
  rankable: boolean;
  exclusionReason: AdsScoringExclusionReason | null;
  gates: AdsScoreGateSnapshot;
  components: readonly AdsScoreComponentContribution[];
  totalScore: number;
  /** Deterministic, machine-stable summary string. */
  summary: string;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

export type AdsScoringOutcome =
  | Readonly<{ valid: true; breakdown: AdsCandidateScoreBreakdown }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsScoringBatchOutcome =
  | Readonly<{
      valid: true;
      breakdowns: readonly AdsCandidateScoreBreakdown[];
    }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsRankingCandidateSignalsParseResult =
  | Readonly<{ valid: true; signals: AdsRankingCandidateSignals }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const SIGNALS_ALLOWED_FIELD_SET = new Set<string>(
  ADS_RANKING_CANDIDATE_SIGNALS_ALLOWED_FIELDS
);
const BREAKDOWN_ALLOWED_FIELD_SET = new Set<string>(
  ADS_CANDIDATE_SCORE_BREAKDOWN_ALLOWED_FIELDS
);
const EXPLANATION_ALLOWED_FIELD_SET = new Set<string>(
  ADS_CANDIDATE_SCORE_EXPLANATION_ALLOWED_FIELDS
);
const COMPONENT_ID_SET = new Set<string>(ADS_SCORING_COMPONENT_IDS);
const EXCLUSION_REASON_SET = new Set<string>(ADS_SCORING_EXCLUSION_REASONS);

const SCORE_SCALE = 1_000_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUnitInterval(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function isAdsScoringExclusionReason(
  value: unknown
): value is AdsScoringExclusionReason {
  return typeof value === "string" && EXCLUSION_REASON_SET.has(value);
}

/** Round to micro-precision for deterministic floating results. */
export function roundAdsScore(value: number): number {
  return Math.round(value * SCORE_SCALE) / SCORE_SCALE;
}

function freezeComponents(
  components: readonly AdsScoreComponentContribution[]
): readonly AdsScoreComponentContribution[] {
  return Object.freeze(
    components.map((component) =>
      Object.freeze({
        componentId: component.componentId,
        rawValue: component.rawValue,
        weight: component.weight,
        contribution: component.contribution,
      })
    )
  );
}

function freezeBreakdown(
  breakdown: AdsCandidateScoreBreakdown
): AdsCandidateScoreBreakdown {
  return Object.freeze({
    contractVersion: ADS_SCORING_CONTRACT_VERSION,
    candidateId: breakdown.candidateId,
    components: freezeComponents(breakdown.components),
    totalScore: breakdown.totalScore,
    rankable: breakdown.rankable,
    exclusionReason: breakdown.exclusionReason,
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

function freezeExplanation(
  explanation: AdsCandidateScoreExplanation
): AdsCandidateScoreExplanation {
  return Object.freeze({
    contractVersion: ADS_SCORING_CONTRACT_VERSION,
    candidateId: explanation.candidateId,
    rankable: explanation.rankable,
    exclusionReason: explanation.exclusionReason,
    gates: Object.freeze({ ...explanation.gates }),
    components: freezeComponents(explanation.components),
    totalScore: explanation.totalScore,
    summary: explanation.summary,
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

function freezeSignals(
  signals: AdsRankingCandidateSignals
): AdsRankingCandidateSignals {
  return Object.freeze({
    candidateId: signals.candidateId,
    placementCompatible: signals.placementCompatible,
    creativeCompatible: signals.creativeCompatible,
    policyEligible: signals.policyEligible,
    deliveryEligible: signals.deliveryEligible,
    qualityScore: signals.qualityScore,
    relevanceScore: signals.relevanceScore,
    freshnessScore: signals.freshnessScore,
  });
}

/**
 * Parse and narrow ranking candidate signals.
 * Fail-closed — constructs a fresh immutable signals object on success.
 */
export function parseAdsRankingCandidateSignals(
  input: unknown,
  fieldPrefix = "signals"
): AdsRankingCandidateSignalsParseResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([`${fieldPrefix} must be an object.`]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!SIGNALS_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`${fieldPrefix} contains unknown field "${key}".`);
    }
  }

  let candidateId: string | null = null;
  if (!isNonEmptyString(input.candidateId)) {
    issues.push(
      `${fieldPrefix}.candidateId is required and must be a non-empty string.`
    );
  } else if (input.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldPrefix}.candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  } else {
    candidateId = input.candidateId;
  }

  const placementCompatible = input.placementCompatible;
  const creativeCompatible = input.creativeCompatible;
  const policyEligible = input.policyEligible;
  const deliveryEligible = input.deliveryEligible;

  if (typeof placementCompatible !== "boolean") {
    issues.push(`${fieldPrefix}.placementCompatible must be a boolean.`);
  }
  if (typeof creativeCompatible !== "boolean") {
    issues.push(`${fieldPrefix}.creativeCompatible must be a boolean.`);
  }
  if (typeof policyEligible !== "boolean") {
    issues.push(`${fieldPrefix}.policyEligible must be a boolean.`);
  }
  if (typeof deliveryEligible !== "boolean") {
    issues.push(`${fieldPrefix}.deliveryEligible must be a boolean.`);
  }

  const qualityScore = input.qualityScore;
  const relevanceScore = input.relevanceScore;
  const freshnessScore = input.freshnessScore;

  if (!isUnitInterval(qualityScore)) {
    issues.push(
      `${fieldPrefix}.qualityScore must be a finite number in [0, 1].`
    );
  }
  if (!isUnitInterval(relevanceScore)) {
    issues.push(
      `${fieldPrefix}.relevanceScore must be a finite number in [0, 1].`
    );
  }
  if (!isUnitInterval(freshnessScore)) {
    issues.push(
      `${fieldPrefix}.freshnessScore must be a finite number in [0, 1].`
    );
  }

  if (
    issues.length > 0 ||
    candidateId === null ||
    typeof placementCompatible !== "boolean" ||
    typeof creativeCompatible !== "boolean" ||
    typeof policyEligible !== "boolean" ||
    typeof deliveryEligible !== "boolean" ||
    !isUnitInterval(qualityScore) ||
    !isUnitInterval(relevanceScore) ||
    !isUnitInterval(freshnessScore)
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    signals: freezeSignals({
      candidateId,
      placementCompatible,
      creativeCompatible,
      policyEligible,
      deliveryEligible,
      qualityScore,
      relevanceScore,
      freshnessScore,
    }),
  };
}

/**
 * Pure shape validator for ranking candidate signals.
 * Fail-closed — does not score.
 */
export function validateAdsRankingCandidateSignals(
  input: unknown,
  fieldPrefix = "signals"
): ContractValidationResult {
  const parsed = parseAdsRankingCandidateSignals(input, fieldPrefix);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

function resolveExclusionReason(
  signals: AdsRankingCandidateSignals
): AdsScoringExclusionReason | null {
  if (!signals.placementCompatible) {
    return "placement_incompatible";
  }
  if (!signals.creativeCompatible) {
    return "creative_incompatible";
  }
  if (!signals.policyEligible) {
    return "policy_ineligible";
  }
  if (!signals.deliveryEligible) {
    return "delivery_ineligible";
  }
  return null;
}

function buildComponents(
  signals: AdsRankingCandidateSignals
): AdsScoreComponentContribution[] {
  return [
    {
      componentId: "quality",
      rawValue: roundAdsScore(signals.qualityScore),
      weight: ADS_SCORING_WEIGHTS.quality,
      contribution: roundAdsScore(
        signals.qualityScore * ADS_SCORING_WEIGHTS.quality
      ),
    },
    {
      componentId: "relevance",
      rawValue: roundAdsScore(signals.relevanceScore),
      weight: ADS_SCORING_WEIGHTS.relevance,
      contribution: roundAdsScore(
        signals.relevanceScore * ADS_SCORING_WEIGHTS.relevance
      ),
    },
    {
      componentId: "freshness",
      rawValue: roundAdsScore(signals.freshnessScore),
      weight: ADS_SCORING_WEIGHTS.freshness,
      contribution: roundAdsScore(
        signals.freshnessScore * ADS_SCORING_WEIGHTS.freshness
      ),
    },
  ];
}

function buildSummary(
  candidateId: string,
  rankable: boolean,
  exclusionReason: AdsScoringExclusionReason | null,
  totalScore: number,
  components: readonly AdsScoreComponentContribution[]
): string {
  if (!rankable) {
    return `candidate=${candidateId};rankable=false;exclusion=${exclusionReason};totalScore=0`;
  }
  const componentPart = components
    .map(
      (component) =>
        `${component.componentId}=${component.rawValue}*${component.weight}->${component.contribution}`
    )
    .join(",");
  return `candidate=${candidateId};rankable=true;totalScore=${totalScore};components=${componentPart}`;
}

/**
 * Score a single candidate from explicit signals.
 * Same input always yields identical breakdown.
 */
export function scoreAdsCandidate(input: unknown): AdsScoringOutcome {
  const parsed = parseAdsRankingCandidateSignals(input);
  if (!parsed.valid) {
    return {
      valid: false,
      issues: parsed.issues,
    };
  }

  const { signals } = parsed;
  const exclusionReason = resolveExclusionReason(signals);
  const rankable = exclusionReason === null;
  const components = rankable ? buildComponents(signals) : [];
  const totalScore = rankable
    ? roundAdsScore(
        components.reduce((sum, component) => sum + component.contribution, 0)
      )
    : 0;

  return {
    valid: true,
    breakdown: freezeBreakdown({
      contractVersion: ADS_SCORING_CONTRACT_VERSION,
      candidateId: signals.candidateId,
      components,
      totalScore,
      rankable,
      exclusionReason,
      productionEnabled: false,
      deliveryEnabled: false,
      executionEnabled: false,
    }),
  };
}

/**
 * Score a batch of candidates. Fail-closed on any invalid entry or duplicate id.
 */
export function scoreAdsCandidates(input: unknown): AdsScoringBatchOutcome {
  if (!Array.isArray(input)) {
    return {
      valid: false,
      issues: Object.freeze(["candidates must be an array."]),
    };
  }

  if (input.length > ADS_SCORING_MAX_CANDIDATES) {
    return {
      valid: false,
      issues: Object.freeze([
        `candidates exceeds max length of ${ADS_SCORING_MAX_CANDIDATES}.`,
      ]),
    };
  }

  const issues: string[] = [];
  const seenIds = new Set<string>();
  const breakdowns: AdsCandidateScoreBreakdown[] = [];

  for (let i = 0; i < input.length; i++) {
    const prefix = `candidates[${i}]`;
    const parsed = parseAdsRankingCandidateSignals(input[i], prefix);
    if (!parsed.valid) {
      issues.push(...parsed.issues);
      continue;
    }

    if (seenIds.has(parsed.signals.candidateId)) {
      issues.push(
        `${prefix}.candidateId "${parsed.signals.candidateId}" is duplicated.`
      );
      continue;
    }
    seenIds.add(parsed.signals.candidateId);

    const outcome = scoreAdsCandidate(parsed.signals);
    if (!outcome.valid) {
      issues.push(...outcome.issues.map((issue) => `${prefix}: ${issue}`));
      continue;
    }
    breakdowns.push(outcome.breakdown);
  }

  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    breakdowns: Object.freeze([...breakdowns]),
  };
}

/**
 * Build a deterministic score explanation for one candidate.
 */
export function explainAdsCandidateScore(
  input: unknown
):
  | Readonly<{ valid: true; explanation: AdsCandidateScoreExplanation }>
  | Readonly<{ valid: false; issues: readonly string[] }> {
  const parsed = parseAdsRankingCandidateSignals(input);
  if (!parsed.valid) {
    return { valid: false, issues: parsed.issues };
  }

  const scored = scoreAdsCandidate(parsed.signals);
  if (!scored.valid) {
    return { valid: false, issues: scored.issues };
  }

  const { signals } = parsed;
  const summary = buildSummary(
    scored.breakdown.candidateId,
    scored.breakdown.rankable,
    scored.breakdown.exclusionReason,
    scored.breakdown.totalScore,
    scored.breakdown.components
  );

  return {
    valid: true,
    explanation: freezeExplanation({
      contractVersion: ADS_SCORING_CONTRACT_VERSION,
      candidateId: scored.breakdown.candidateId,
      rankable: scored.breakdown.rankable,
      exclusionReason: scored.breakdown.exclusionReason,
      gates: {
        placementCompatible: signals.placementCompatible,
        creativeCompatible: signals.creativeCompatible,
        policyEligible: signals.policyEligible,
        deliveryEligible: signals.deliveryEligible,
      },
      components: scored.breakdown.components,
      totalScore: scored.breakdown.totalScore,
      summary,
      productionEnabled: false,
      deliveryEnabled: false,
      executionEnabled: false,
    }),
  };
}

/**
 * Pure shape validator for score breakdowns.
 */
export function validateAdsCandidateScoreBreakdown(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Score breakdown must be an object."]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!BREAKDOWN_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Score breakdown contains unknown field "${key}".`);
    }
  }

  if (input.contractVersion !== ADS_SCORING_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_SCORING_CONTRACT_VERSION}".`
    );
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

  if (!isNonEmptyString(input.candidateId)) {
    issues.push("candidateId is required and must be a non-empty string.");
  } else if (input.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  }

  if (typeof input.rankable !== "boolean") {
    issues.push("rankable must be a boolean.");
  }

  if (input.rankable === true) {
    if (input.exclusionReason !== null) {
      issues.push("exclusionReason must be null when rankable is true.");
    }
  } else if (input.rankable === false) {
    if (!isAdsScoringExclusionReason(input.exclusionReason)) {
      issues.push(
        "exclusionReason must be a supported scoring exclusion reason when rankable is false."
      );
    }
  }

  if (!isUnitInterval(input.totalScore)) {
    issues.push("totalScore must be a finite number in [0, 1].");
  } else if (input.rankable === false && input.totalScore !== 0) {
    issues.push("totalScore must be 0 when rankable is false.");
  }

  if (!Array.isArray(input.components)) {
    issues.push("components must be an array.");
  } else if (input.rankable === false && input.components.length !== 0) {
    issues.push("components must be empty when rankable is false.");
  } else if (input.rankable === true) {
    if (input.components.length !== ADS_SCORING_COMPONENT_IDS.length) {
      issues.push(
        `components must contain exactly ${ADS_SCORING_COMPONENT_IDS.length} entries when rankable.`
      );
    }
    let contributionSum = 0;
    for (let i = 0; i < input.components.length; i++) {
      const component = input.components[i];
      const prefix = `components[${i}]`;
      if (!isRecord(component)) {
        issues.push(`${prefix} must be an object.`);
        continue;
      }
      if (
        !isNonEmptyString(component.componentId) ||
        !COMPONENT_ID_SET.has(component.componentId)
      ) {
        issues.push(
          `${prefix}.componentId is not a supported scoring component.`
        );
      } else if (component.componentId !== ADS_SCORING_COMPONENT_IDS[i]) {
        issues.push(
          `${prefix}.componentId must be "${ADS_SCORING_COMPONENT_IDS[i]}" in stable order.`
        );
      }
      if (!isUnitInterval(component.rawValue)) {
        issues.push(`${prefix}.rawValue must be a finite number in [0, 1].`);
      }
      if (
        typeof component.weight !== "number" ||
        !Number.isFinite(component.weight) ||
        component.weight < 0 ||
        component.weight > 1
      ) {
        issues.push(`${prefix}.weight must be a finite number in [0, 1].`);
      }
      if (!isUnitInterval(component.contribution)) {
        issues.push(
          `${prefix}.contribution must be a finite number in [0, 1].`
        );
      } else {
        contributionSum += component.contribution;
      }
    }
    if (
      isUnitInterval(input.totalScore) &&
      roundAdsScore(contributionSum) !== roundAdsScore(input.totalScore)
    ) {
      issues.push("totalScore must equal the sum of component contributions.");
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Pure shape validator for score explanations.
 */
export function validateAdsCandidateScoreExplanation(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Score explanation must be an object."]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!EXPLANATION_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Score explanation contains unknown field "${key}".`);
    }
  }

  if (input.contractVersion !== ADS_SCORING_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_SCORING_CONTRACT_VERSION}".`
    );
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

  if (!isNonEmptyString(input.candidateId)) {
    issues.push("candidateId is required and must be a non-empty string.");
  }

  if (typeof input.rankable !== "boolean") {
    issues.push("rankable must be a boolean.");
  }

  if (!isNonEmptyString(input.summary)) {
    issues.push("summary is required and must be a non-empty string.");
  }

  if (!isRecord(input.gates)) {
    issues.push("gates must be an object.");
  } else {
    for (const flag of [
      "placementCompatible",
      "creativeCompatible",
      "policyEligible",
      "deliveryEligible",
    ] as const) {
      if (typeof input.gates[flag] !== "boolean") {
        issues.push(`gates.${flag} must be a boolean.`);
      }
    }
  }

  const breakdownCheck = validateAdsCandidateScoreBreakdown({
    contractVersion: input.contractVersion,
    candidateId: input.candidateId,
    components: input.components,
    totalScore: input.totalScore,
    rankable: input.rankable,
    exclusionReason: input.exclusionReason,
    productionEnabled: input.productionEnabled,
    deliveryEnabled: input.deliveryEnabled,
    executionEnabled: input.executionEnabled,
  });
  if (!breakdownCheck.valid) {
    issues.push(...breakdownCheck.issues);
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}
