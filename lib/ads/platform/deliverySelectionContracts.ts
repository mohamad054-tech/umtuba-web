import type { ContractValidationResult } from "./creativeContracts";
import {
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
  ADS_DELIVERY_MAX_ID_LENGTH,
} from "./deliveryContracts";
import {
  isAdsDeliveryExclusionReason,
  type AdsDeliveryExclusionReason,
} from "./deliveryEligibilityContracts";

/**
 * Ads Delivery Selection Contracts V1 — future selection result shapes only.
 *
 * No ranking, auction, randomization, scoring, or pacing is performed here.
 * productionEnabled is always false in V1.
 */

/** Counts of exclusion reasons observed during evaluation (future). */
export type AdsDeliveryExclusionSummary = Readonly<
  Partial<Record<AdsDeliveryExclusionReason, number>>
>;

/**
 * Future delivery selection result. Selected candidate is a reference only.
 */
export type AdsDeliverySelectionResult = Readonly<{
  contractVersion: typeof ADS_DELIVERY_ENGINE_CONTRACT_VERSION;
  /** Opaque candidate id when a selection exists; null when none selected. */
  selectedCandidateId: string | null;
  evaluatedCandidateCount: number;
  rejectedCandidateCount: number;
  exclusionSummary: AdsDeliveryExclusionSummary;
  /** Always false in V1 — production delivery is disabled. */
  productionEnabled: false;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function validateExclusionSummary(
  value: unknown,
  issues: string[]
): void {
  if (!isRecord(value)) {
    issues.push("exclusionSummary is required.");
    return;
  }

  for (const [key, count] of Object.entries(value)) {
    if (!isAdsDeliveryExclusionReason(key)) {
      issues.push(
        `exclusionSummary contains invalid exclusion reason "${key}".`
      );
      continue;
    }
    if (!isNonNegativeInteger(count)) {
      issues.push(
        `exclusionSummary.${key} must be a non-negative integer.`
      );
    }
  }
}

/**
 * Pure shape validator for selection results.
 * Does not select, rank, score, or serve ads.
 */
export function validateDeliverySelectionResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: ["Selection result must be an object."],
    };
  }

  const issues: string[] = [];

  if (input.contractVersion !== ADS_DELIVERY_ENGINE_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_DELIVERY_ENGINE_CONTRACT_VERSION}".`
    );
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  if (input.selectedCandidateId !== null) {
    if (!isNonEmptyString(input.selectedCandidateId)) {
      issues.push(
        "selectedCandidateId must be a non-empty string or null."
      );
    } else if (input.selectedCandidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
      issues.push(
        `selectedCandidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
      );
    }
  }

  if (!isNonNegativeInteger(input.evaluatedCandidateCount)) {
    issues.push("evaluatedCandidateCount must be a non-negative integer.");
  }
  if (!isNonNegativeInteger(input.rejectedCandidateCount)) {
    issues.push("rejectedCandidateCount must be a non-negative integer.");
  }

  if (
    isNonNegativeInteger(input.evaluatedCandidateCount) &&
    isNonNegativeInteger(input.rejectedCandidateCount) &&
    input.rejectedCandidateCount > input.evaluatedCandidateCount
  ) {
    issues.push(
      "rejectedCandidateCount cannot exceed evaluatedCandidateCount."
    );
  }

  if (
    input.selectedCandidateId !== null &&
    isNonNegativeInteger(input.evaluatedCandidateCount) &&
    input.evaluatedCandidateCount === 0
  ) {
    issues.push(
      "selectedCandidateId requires evaluatedCandidateCount to be greater than 0."
    );
  }

  validateExclusionSummary(input.exclusionSummary, issues);

  if (
    isRecord(input.exclusionSummary) &&
    isNonNegativeInteger(input.rejectedCandidateCount)
  ) {
    const summaryTotal = Object.values(input.exclusionSummary).reduce(
      (sum: number, count) =>
        sum + (typeof count === "number" ? count : 0),
      0
    );
    if (summaryTotal > input.rejectedCandidateCount) {
      issues.push(
        "exclusionSummary counts cannot exceed rejectedCandidateCount."
      );
    }
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}

/**
 * Builds a contract-valid empty selection result with production disabled.
 * Does not run selection algorithms.
 */
export function createEmptySelectionResult(
  evaluatedCandidateCount = 0,
  exclusionSummary: AdsDeliveryExclusionSummary = {}
): AdsDeliverySelectionResult {
  const rejectedCandidateCount = Object.values(exclusionSummary).reduce(
    (sum, count) => sum + (count ?? 0),
    0
  );

  return Object.freeze({
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    selectedCandidateId: null,
    evaluatedCandidateCount,
    rejectedCandidateCount,
    exclusionSummary: Object.freeze({ ...exclusionSummary }),
    productionEnabled: false,
  });
}
