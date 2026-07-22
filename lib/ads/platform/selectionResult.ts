import type { ContractValidationResult } from "./creativeContracts";
import {
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
  ADS_DELIVERY_MAX_ID_LENGTH,
  type AdsDeliveryCandidateAd,
  type AdsDeliveryRequest,
} from "./deliveryContracts";
import {
  isAdsDeliveryExclusionReason,
  type AdsDeliveryCandidateReference,
  type AdsDeliveryExcludedCandidate,
  type AdsDeliveryExclusionReason,
} from "./deliveryEligibilityContracts";
import type { AdsDeliveryExclusionSummary } from "./deliverySelectionContracts";
import type { AdsCandidateEligibilityDecision } from "./eligibilityRules";

/**
 * Ads Selection Result Foundation V1 — deterministic selection summary only.
 *
 * Receives already-evaluated eligibility decisions and produces an immutable
 * summary. Never ranks, scores, randomizes, auctions, paces, or chooses an
 * advertisement for production. selectedCandidate is always null in V1.
 */

export const ADS_SELECTION_RESULT_CONTRACT_VERSION =
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION;

/** Immutable Selection Result contract V1. */
export type AdsSelectionResult = Readonly<{
  contractVersion: typeof ADS_SELECTION_RESULT_CONTRACT_VERSION;
  evaluatedCandidateCount: number;
  eligibleCandidateCount: number;
  rejectedCandidateCount: number;
  /** Counts by exclusion reason — only reasons with count > 0. */
  rejectionSummary: AdsDeliveryExclusionSummary;
  /** Eligible references in evaluated-candidate input order. */
  eligibleCandidates: readonly AdsDeliveryCandidateReference[];
  /** Rejected references in evaluated-candidate input order. */
  rejectedCandidates: readonly AdsDeliveryExcludedCandidate[];
  /** Always null in V1 — this layer never selects an ad for production. */
  selectedCandidate: null;
  /** Always false in V1. */
  productionEnabled: false;
  /** Always true — summary is ready for a future selection engine. */
  readyForFutureSelection: true;
}>;

/**
 * Build input: delivery request + evaluated candidate set + eligibility
 * decisions already produced by the eligibility layer.
 */
export type AdsSelectionResultInput = Readonly<{
  request: AdsDeliveryRequest;
  evaluatedCandidates: readonly AdsDeliveryCandidateAd[];
  eligibilityResults: readonly AdsCandidateEligibilityDecision[];
}>;

export type AdsSelectionResultBuildOutcome =
  | Readonly<{ valid: true; result: AdsSelectionResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function validateIdField(
  value: unknown,
  fieldName: string,
  issues: string[]
): void {
  if (!isNonEmptyString(value)) {
    issues.push(`${fieldName} is required and must be a non-empty string.`);
    return;
  }
  if (value.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldName} exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  }
}

function validateRejectionSummary(
  value: unknown,
  issues: string[],
  expectedTotal?: number
): void {
  if (!isRecord(value)) {
    issues.push("rejectionSummary must be an object.");
    return;
  }

  let summaryTotal = 0;
  for (const [key, count] of Object.entries(value)) {
    if (!isAdsDeliveryExclusionReason(key)) {
      issues.push(
        `rejectionSummary contains unknown exclusion reason "${key}".`
      );
      continue;
    }
    if (!isNonNegativeInteger(count)) {
      issues.push(
        `rejectionSummary.${key} must be a non-negative integer.`
      );
      continue;
    }
    if (count === 0) {
      issues.push(
        `rejectionSummary.${key} must be greater than 0 when present.`
      );
      continue;
    }
    summaryTotal += count;
  }

  if (
    expectedTotal !== undefined &&
    isNonNegativeInteger(expectedTotal) &&
    summaryTotal !== expectedTotal
  ) {
    issues.push(
      "rejectionSummary counts are inconsistent with rejectedCandidateCount."
    );
  }
}

function validateCandidateReference(
  value: unknown,
  prefix: string,
  issues: string[],
  seenIds: Set<string>
): void {
  if (!isRecord(value)) {
    issues.push(`${prefix} must be an object.`);
    return;
  }
  validateIdField(value.candidateId, `${prefix}.candidateId`, issues);
  if (isNonEmptyString(value.candidateId)) {
    if (seenIds.has(value.candidateId)) {
      issues.push(
        `selection result contains duplicate candidateId "${value.candidateId}".`
      );
    } else {
      seenIds.add(value.candidateId);
    }
  }
}

function validateRejectedCandidateReference(
  value: unknown,
  prefix: string,
  issues: string[],
  seenIds: Set<string>
): void {
  if (!isRecord(value)) {
    issues.push(`${prefix} must be an object.`);
    return;
  }
  validateIdField(value.candidateId, `${prefix}.candidateId`, issues);
  if (!isAdsDeliveryExclusionReason(value.reason)) {
    issues.push(`${prefix}.reason is not a valid exclusion reason.`);
  }
  if (isNonEmptyString(value.candidateId)) {
    if (seenIds.has(value.candidateId)) {
      issues.push(
        `selection result contains duplicate candidateId "${value.candidateId}".`
      );
    } else {
      seenIds.add(value.candidateId);
    }
  }
}

/**
 * Pure shape validator for Selection Result Foundation outputs.
 * Fail-closed — does not select, rank, score, or serve ads.
 */
export function validateAdsSelectionResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: ["Selection result must be an object."],
    };
  }

  const issues: string[] = [];

  if (input.contractVersion !== ADS_SELECTION_RESULT_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_SELECTION_RESULT_CONTRACT_VERSION}".`
    );
  }

  if (input.selectedCandidate !== null) {
    issues.push("selectedCandidate must be null.");
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  if (input.readyForFutureSelection !== true) {
    issues.push("readyForFutureSelection must be true.");
  }

  if (!isNonNegativeInteger(input.evaluatedCandidateCount)) {
    issues.push("evaluatedCandidateCount must be a non-negative integer.");
  }
  if (!isNonNegativeInteger(input.eligibleCandidateCount)) {
    issues.push("eligibleCandidateCount must be a non-negative integer.");
  }
  if (!isNonNegativeInteger(input.rejectedCandidateCount)) {
    issues.push("rejectedCandidateCount must be a non-negative integer.");
  }

  if (
    isNonNegativeInteger(input.evaluatedCandidateCount) &&
    isNonNegativeInteger(input.eligibleCandidateCount) &&
    isNonNegativeInteger(input.rejectedCandidateCount) &&
    input.eligibleCandidateCount + input.rejectedCandidateCount !==
      input.evaluatedCandidateCount
  ) {
    issues.push(
      "eligibleCandidateCount + rejectedCandidateCount must equal evaluatedCandidateCount."
    );
  }

  if (!Array.isArray(input.eligibleCandidates)) {
    issues.push("eligibleCandidates must be an array.");
  }
  if (!Array.isArray(input.rejectedCandidates)) {
    issues.push("rejectedCandidates must be an array.");
  }

  if (
    Array.isArray(input.eligibleCandidates) &&
    isNonNegativeInteger(input.eligibleCandidateCount) &&
    input.eligibleCandidates.length !== input.eligibleCandidateCount
  ) {
    issues.push(
      "eligibleCandidates length is inconsistent with eligibleCandidateCount."
    );
  }

  if (
    Array.isArray(input.rejectedCandidates) &&
    isNonNegativeInteger(input.rejectedCandidateCount) &&
    input.rejectedCandidates.length !== input.rejectedCandidateCount
  ) {
    issues.push(
      "rejectedCandidates length is inconsistent with rejectedCandidateCount."
    );
  }

  const seenIds = new Set<string>();
  if (Array.isArray(input.eligibleCandidates)) {
    input.eligibleCandidates.forEach((candidate, index) => {
      validateCandidateReference(
        candidate,
        `eligibleCandidates[${index}]`,
        issues,
        seenIds
      );
    });
  }
  if (Array.isArray(input.rejectedCandidates)) {
    input.rejectedCandidates.forEach((candidate, index) => {
      validateRejectedCandidateReference(
        candidate,
        `rejectedCandidates[${index}]`,
        issues,
        seenIds
      );
    });
  }

  validateRejectionSummary(
    input.rejectionSummary,
    issues,
    isNonNegativeInteger(input.rejectedCandidateCount)
      ? input.rejectedCandidateCount
      : undefined
  );

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}

function collectDuplicateIds(
  ids: readonly string[],
  label: string,
  issues: string[]
): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      issues.push(`${label} contain duplicate candidateId "${id}".`);
    } else {
      seen.add(id);
    }
  }
}

function validateBuildInput(input: AdsSelectionResultInput): string[] {
  const issues: string[] = [];

  if (!isRecord(input) || !isRecord(input.request)) {
    return ["Selection result input must include a delivery request object."];
  }

  if (!Array.isArray(input.evaluatedCandidates)) {
    issues.push("evaluatedCandidates must be an array.");
  }
  if (!Array.isArray(input.eligibilityResults)) {
    issues.push("eligibilityResults must be an array.");
  }
  if (!Array.isArray(input.request.candidates)) {
    issues.push("request.candidates must be an array.");
  }

  if (
    !Array.isArray(input.evaluatedCandidates) ||
    !Array.isArray(input.eligibilityResults) ||
    !Array.isArray(input.request.candidates)
  ) {
    return issues;
  }

  const evaluatedIds: string[] = [];
  for (let i = 0; i < input.evaluatedCandidates.length; i++) {
    const candidate = input.evaluatedCandidates[i];
    if (!isRecord(candidate) || !isNonEmptyString(candidate.candidateId)) {
      issues.push(
        `evaluatedCandidates[${i}].candidateId is required and must be a non-empty string.`
      );
      continue;
    }
    if (candidate.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
      issues.push(
        `evaluatedCandidates[${i}].candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
      );
    }
    evaluatedIds.push(candidate.candidateId);
  }

  collectDuplicateIds(evaluatedIds, "evaluatedCandidates", issues);

  const requestIds: string[] = [];
  for (let i = 0; i < input.request.candidates.length; i++) {
    const candidate = input.request.candidates[i];
    if (!isRecord(candidate) || !isNonEmptyString(candidate.candidateId)) {
      issues.push(
        `request.candidates[${i}].candidateId is required and must be a non-empty string.`
      );
      continue;
    }
    requestIds.push(candidate.candidateId);
  }

  collectDuplicateIds(requestIds, "request.candidates", issues);

  if (
    evaluatedIds.length === requestIds.length &&
    evaluatedIds.every((id, index) => id === requestIds[index])
  ) {
    // Order and membership match.
  } else if (
    evaluatedIds.length === requestIds.length &&
    new Set(evaluatedIds).size === evaluatedIds.length &&
    evaluatedIds.every((id) => requestIds.includes(id))
  ) {
    issues.push(
      "evaluatedCandidates order is inconsistent with request.candidates."
    );
  } else {
    issues.push(
      "evaluatedCandidates are inconsistent with request.candidates."
    );
  }

  if (input.eligibilityResults.length !== input.evaluatedCandidates.length) {
    issues.push(
      "eligibilityResults length is inconsistent with evaluatedCandidates length."
    );
  }

  const eligibilityIds: string[] = [];
  for (let i = 0; i < input.eligibilityResults.length; i++) {
    const decision = input.eligibilityResults[i];
    const prefix = `eligibilityResults[${i}]`;
    if (!isRecord(decision)) {
      issues.push(`${prefix} must be an object.`);
      continue;
    }

    if (!isNonEmptyString(decision.candidateId)) {
      issues.push(
        `${prefix}.candidateId is required and must be a non-empty string.`
      );
    } else {
      eligibilityIds.push(decision.candidateId);
    }

    if (decision.contractVersion !== ADS_DELIVERY_ENGINE_CONTRACT_VERSION) {
      issues.push(
        `${prefix}.contractVersion must be "${ADS_DELIVERY_ENGINE_CONTRACT_VERSION}".`
      );
    }

    if (typeof decision.eligible !== "boolean") {
      issues.push(`${prefix}.eligible must be a boolean.`);
      continue;
    }

    if (decision.productionEnabled !== false) {
      issues.push(`${prefix}.productionEnabled must be false.`);
    }

    if (decision.eligible === true) {
      if (decision.exclusionReason !== null) {
        issues.push(
          `${prefix}.exclusionReason must be null when eligible is true.`
        );
      }
    } else if (decision.exclusionReason === null) {
      issues.push(
        `${prefix}.exclusionReason is required when eligible is false.`
      );
    } else if (!isAdsDeliveryExclusionReason(decision.exclusionReason)) {
      issues.push(
        `${prefix}.exclusionReason is not a valid exclusion reason.`
      );
    }
  }

  collectDuplicateIds(eligibilityIds, "eligibilityResults", issues);

  const evaluatedIdSet = new Set(evaluatedIds);
  for (const id of eligibilityIds) {
    if (!evaluatedIdSet.has(id)) {
      issues.push(
        `eligibilityResults reference missing candidateId "${id}".`
      );
    }
  }

  if (
    eligibilityIds.length === evaluatedIds.length &&
    evaluatedIds.length > 0 &&
    new Set(eligibilityIds).size === eligibilityIds.length
  ) {
    for (let i = 0; i < evaluatedIds.length; i++) {
      if (eligibilityIds[i] !== evaluatedIds[i]) {
        issues.push(
          "eligibilityResults order is inconsistent with evaluatedCandidates."
        );
        break;
      }
    }
  }

  for (const id of evaluatedIds) {
    if (!eligibilityIds.includes(id)) {
      issues.push(
        `evaluatedCandidates include candidateId "${id}" with no eligibility result.`
      );
    }
  }

  return issues;
}

function freezeSelectionResult(result: AdsSelectionResult): AdsSelectionResult {
  return Object.freeze({
    ...result,
    rejectionSummary: Object.freeze({ ...result.rejectionSummary }),
    eligibleCandidates: Object.freeze(
      result.eligibleCandidates.map((entry) => Object.freeze({ ...entry }))
    ),
    rejectedCandidates: Object.freeze(
      result.rejectedCandidates.map((entry) => Object.freeze({ ...entry }))
    ),
  });
}

/**
 * Builds a deterministic Selection Result summary from eligibility decisions.
 * Fail-closed on invalid input. Never selects a production advertisement.
 */
export function buildAdsSelectionResult(
  input: AdsSelectionResultInput
): AdsSelectionResultBuildOutcome {
  const issues = validateBuildInput(input);
  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const eligibleCandidates: AdsDeliveryCandidateReference[] = [];
  const rejectedCandidates: AdsDeliveryExcludedCandidate[] = [];
  const rejectionSummary: Partial<
    Record<AdsDeliveryExclusionReason, number>
  > = {};

  // Preserve evaluated-candidate / eligibility-result input order.
  for (const decision of input.eligibilityResults) {
    if (decision.eligible) {
      eligibleCandidates.push(
        Object.freeze({ candidateId: decision.candidateId })
      );
      continue;
    }

    const reason = decision.exclusionReason as AdsDeliveryExclusionReason;
    rejectedCandidates.push(
      Object.freeze({
        candidateId: decision.candidateId,
        reason,
      })
    );
    rejectionSummary[reason] = (rejectionSummary[reason] ?? 0) + 1;
  }

  const result = freezeSelectionResult({
    contractVersion: ADS_SELECTION_RESULT_CONTRACT_VERSION,
    evaluatedCandidateCount: input.evaluatedCandidates.length,
    eligibleCandidateCount: eligibleCandidates.length,
    rejectedCandidateCount: rejectedCandidates.length,
    rejectionSummary: Object.freeze({ ...rejectionSummary }),
    eligibleCandidates: Object.freeze(eligibleCandidates),
    rejectedCandidates: Object.freeze(rejectedCandidates),
    selectedCandidate: null,
    productionEnabled: false,
    readyForFutureSelection: true,
  });

  const validation = validateAdsSelectionResult(result);
  if (!validation.valid) {
    return { valid: false, issues: validation.issues };
  }

  return { valid: true, result };
}

/**
 * Empty selection summary with production disabled and no selected candidate.
 * Does not run ranking, scoring, or selection algorithms.
 */
export function createEmptyAdsSelectionResult(
  evaluatedCandidateCount = 0
): AdsSelectionResult {
  return freezeSelectionResult({
    contractVersion: ADS_SELECTION_RESULT_CONTRACT_VERSION,
    evaluatedCandidateCount,
    eligibleCandidateCount: 0,
    rejectedCandidateCount: 0,
    rejectionSummary: Object.freeze({}),
    eligibleCandidates: Object.freeze([]),
    rejectedCandidates: Object.freeze([]),
    selectedCandidate: null,
    productionEnabled: false,
    readyForFutureSelection: true,
  });
}
