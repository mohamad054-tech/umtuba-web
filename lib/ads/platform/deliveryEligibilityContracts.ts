import type { ContractValidationResult } from "./creativeContracts";
import {
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
  ADS_DELIVERY_MAX_ID_LENGTH,
} from "./deliveryContracts";

/**
 * Ads Delivery Eligibility Contracts V1 — result shapes only.
 *
 * Candidates are represented as metadata references. No database objects,
 * ORM rows, RPC calls, or product imports. This layer never evaluates
 * eligibility against live campaign state.
 */

export const ADS_DELIVERY_EXCLUSION_REASONS = [
  "placement_disabled",
  "placement_mismatch",
  "campaign_paused",
  "campaign_not_started",
  "campaign_expired",
  "ad_set_inactive",
  "ad_set_not_started",
  "ad_set_expired",
  "ad_inactive",
  "budget_exhausted",
  "geo_mismatch",
  "language_mismatch",
  "audience_mismatch",
  "creative_missing",
  "creative_not_approved",
  "policy_blocked",
  "delivery_disabled",
  "unknown",
] as const;

export type AdsDeliveryExclusionReason =
  (typeof ADS_DELIVERY_EXCLUSION_REASONS)[number];

export function isAdsDeliveryExclusionReason(
  value: unknown
): value is AdsDeliveryExclusionReason {
  return (
    typeof value === "string" &&
    (ADS_DELIVERY_EXCLUSION_REASONS as readonly string[]).includes(value)
  );
}

/** Metadata-only reference for an evaluated candidate. */
export type AdsDeliveryCandidateReference = Readonly<{
  candidateId: string;
}>;

/** A candidate excluded during eligibility evaluation (future). */
export type AdsDeliveryExcludedCandidate = Readonly<{
  candidateId: string;
  reason: AdsDeliveryExclusionReason;
}>;

/**
 * Successful eligibility result — eligible candidates are metadata only.
 * productionEnabled is always false in V1.
 */
export type AdsDeliveryEligibilitySuccess = Readonly<{
  contractVersion: typeof ADS_DELIVERY_ENGINE_CONTRACT_VERSION;
  status: "eligible";
  eligibleCandidates: readonly AdsDeliveryCandidateReference[];
  excludedCandidates: readonly AdsDeliveryExcludedCandidate[];
  productionEnabled: false;
}>;

/**
 * Empty / fully excluded eligibility result — still a valid contract shape.
 * productionEnabled is always false in V1.
 */
export type AdsDeliveryEligibilityEmpty = Readonly<{
  contractVersion: typeof ADS_DELIVERY_ENGINE_CONTRACT_VERSION;
  status: "empty";
  eligibleCandidates: readonly [];
  excludedCandidates: readonly AdsDeliveryExcludedCandidate[];
  productionEnabled: false;
}>;

export type AdsDeliveryEligibilityResult =
  | AdsDeliveryEligibilitySuccess
  | AdsDeliveryEligibilityEmpty;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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

function validateExcludedCandidate(
  value: unknown,
  index: number,
  issues: string[],
  seenIds: Set<string>
): void {
  const prefix = `excludedCandidates[${index}]`;
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
        `eligibility result contains duplicate candidateId "${value.candidateId}".`
      );
    } else {
      seenIds.add(value.candidateId);
    }
  }
}

function validateEligibleCandidate(
  value: unknown,
  index: number,
  issues: string[],
  seenIds: Set<string>
): void {
  const prefix = `eligibleCandidates[${index}]`;
  if (!isRecord(value)) {
    issues.push(`${prefix} must be an object.`);
    return;
  }
  validateIdField(value.candidateId, `${prefix}.candidateId`, issues);
  if (isNonEmptyString(value.candidateId)) {
    if (seenIds.has(value.candidateId)) {
      issues.push(
        `eligibility result contains duplicate candidateId "${value.candidateId}".`
      );
    } else {
      seenIds.add(value.candidateId);
    }
  }
}

/**
 * Pure shape validator for eligibility results.
 * Does not decide eligibility, score candidates, or enable delivery.
 */
export function validateDeliveryEligibilityResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: ["Eligibility result must be an object."],
    };
  }

  const issues: string[] = [];

  if (input.contractVersion !== ADS_DELIVERY_ENGINE_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_DELIVERY_ENGINE_CONTRACT_VERSION}".`
    );
  }

  if (input.status !== "eligible" && input.status !== "empty") {
    issues.push('status must be "eligible" or "empty".');
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  if (!Array.isArray(input.eligibleCandidates)) {
    issues.push("eligibleCandidates must be an array.");
  }
  if (!Array.isArray(input.excludedCandidates)) {
    issues.push("excludedCandidates must be an array.");
  }

  if (
    input.status === "empty" &&
    Array.isArray(input.eligibleCandidates) &&
    input.eligibleCandidates.length !== 0
  ) {
    issues.push('status "empty" requires eligibleCandidates to be empty.');
  }

  if (
    input.status === "eligible" &&
    Array.isArray(input.eligibleCandidates) &&
    input.eligibleCandidates.length === 0
  ) {
    issues.push(
      'status "eligible" requires at least one eligibleCandidates entry.'
    );
  }

  const seenIds = new Set<string>();
  if (Array.isArray(input.eligibleCandidates)) {
    input.eligibleCandidates.forEach((candidate, index) => {
      validateEligibleCandidate(candidate, index, issues, seenIds);
    });
  }
  if (Array.isArray(input.excludedCandidates)) {
    input.excludedCandidates.forEach((candidate, index) => {
      validateExcludedCandidate(candidate, index, issues, seenIds);
    });
  }

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}

/**
 * Builds a contract-valid empty eligibility result with production disabled.
 * Does not evaluate campaigns or run delivery.
 */
export function createEmptyEligibilityResult(
  excludedCandidates: readonly AdsDeliveryExcludedCandidate[] = []
): AdsDeliveryEligibilityEmpty {
  return Object.freeze({
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    status: "empty",
    eligibleCandidates: Object.freeze([]) as readonly [],
    excludedCandidates: Object.freeze(
      excludedCandidates.map((entry) => Object.freeze({ ...entry }))
    ),
    productionEnabled: false,
  });
}
