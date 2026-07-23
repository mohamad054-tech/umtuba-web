import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";

/**
 * Ads Frequency Capping Foundation V1 — pure, deterministic, fail-closed.
 *
 * Evaluates frequency eligibility from an explicit exposure-counter snapshot
 * only. Never mutates counters, writes events, persists state, or consults
 * wall-clock / network / database / cache / product modules.
 *
 * Caps are explicit inputs. Counters are per-impression exposure counts
 * provided by the caller — this module does not increment or store them.
 *
 * productionEnabled, deliveryEnabled, and executionEnabled are always false.
 */

export const ADS_FREQUENCY_CONTRACT_VERSION = "v1" as const;

/** Soft upper bound for exposure counts and caps. */
export const ADS_FREQUENCY_MAX_COUNT = 1_000_000_000;

/**
 * Hard-gate frequency rejection reasons.
 * Order is the exact first-match evaluation order in resolveRejectionReason.
 * Do not reorder without updating that function and its tests.
 *
 * Cap semantics (V1 snapshot):
 * A constraint is active when its cap is a positive integer. Exposure counts
 * are inclusive of prior impressions; the next impression is ineligible when
 * count >= cap for any active constraint.
 */
export const ADS_FREQUENCY_REJECTION_REASONS = [
  "no_frequency_cap_configured",
  "daily_cap_exceeded",
  "lifetime_cap_exceeded",
  "campaign_cap_exceeded",
] as const;

export type AdsFrequencyRejectionReason =
  (typeof ADS_FREQUENCY_REJECTION_REASONS)[number];

/**
 * Top-level keys allowed on AdsFrequencySnapshot.
 * Unknown fields fail closed.
 */
export const ADS_FREQUENCY_SNAPSHOT_ALLOWED_FIELDS = [
  "candidateId",
  "campaignId",
  "userExposureCount",
  "dailyExposureCount",
  "campaignExposureCount",
  "dailyCap",
  "lifetimeCap",
  "campaignCap",
] as const;

/**
 * Top-level keys allowed on AdsFrequencyDiagnostics.
 * Unknown fields fail closed.
 */
export const ADS_FREQUENCY_DIAGNOSTICS_ALLOWED_FIELDS = [
  "userExposureCount",
  "dailyExposureCount",
  "campaignExposureCount",
  "dailyCap",
  "lifetimeCap",
  "campaignCap",
  "dailyConstraintActive",
  "lifetimeConstraintActive",
  "campaignConstraintActive",
] as const;

/**
 * Top-level keys allowed on AdsFrequencyMetadata.
 * Unknown fields fail closed.
 */
export const ADS_FREQUENCY_METADATA_ALLOWED_FIELDS = [
  "contractVersion",
  "maxCount",
] as const;

/**
 * Top-level keys allowed on AdsFrequencyEvaluationResult.
 * Unknown fields fail closed.
 */
export const ADS_FREQUENCY_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "candidateId",
  "campaignId",
  "frequencyEligible",
  "rejectionReason",
  "diagnostics",
  "metadata",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

/**
 * Explicit frequency snapshot for one candidate / campaign / user exposure.
 *
 * Counters are non-negative integers (per-impression exposure counts).
 * Caps are positive integers when active, or null when inactive.
 * At least one cap must be configured for a valid evaluation path that can
 * succeed; all-null caps reject as `no_frequency_cap_configured`.
 */
export type AdsFrequencySnapshot = Readonly<{
  candidateId: string;
  campaignId: string;
  /** Lifetime user exposure count (impressions). */
  userExposureCount: number;
  /** Daily user exposure count (impressions). */
  dailyExposureCount: number;
  /** Campaign-scoped user exposure count (impressions). */
  campaignExposureCount: number;
  /** Finite integer in (0, ADS_FREQUENCY_MAX_COUNT], or null when inactive. */
  dailyCap: number | null;
  /** Finite integer in (0, ADS_FREQUENCY_MAX_COUNT], or null when inactive. */
  lifetimeCap: number | null;
  /** Finite integer in (0, ADS_FREQUENCY_MAX_COUNT], or null when inactive. */
  campaignCap: number | null;
}>;

export type AdsFrequencyDiagnostics = Readonly<{
  userExposureCount: number;
  dailyExposureCount: number;
  campaignExposureCount: number;
  dailyCap: number | null;
  lifetimeCap: number | null;
  campaignCap: number | null;
  dailyConstraintActive: boolean;
  lifetimeConstraintActive: boolean;
  campaignConstraintActive: boolean;
}>;

export type AdsFrequencyMetadata = Readonly<{
  contractVersion: typeof ADS_FREQUENCY_CONTRACT_VERSION;
  maxCount: typeof ADS_FREQUENCY_MAX_COUNT;
}>;

/**
 * Canonical Frequency Evaluation Result V1.
 * Immutable; never enables production / delivery / execution.
 */
export type AdsFrequencyEvaluationResult = Readonly<{
  contractVersion: typeof ADS_FREQUENCY_CONTRACT_VERSION;
  candidateId: string;
  campaignId: string;
  frequencyEligible: boolean;
  rejectionReason: AdsFrequencyRejectionReason | null;
  diagnostics: AdsFrequencyDiagnostics;
  metadata: AdsFrequencyMetadata;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

export type AdsFrequencyEvaluationOutcome =
  | Readonly<{ valid: true; result: AdsFrequencyEvaluationResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsFrequencySnapshotParseResult =
  | Readonly<{ valid: true; snapshot: AdsFrequencySnapshot }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const SNAPSHOT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_FREQUENCY_SNAPSHOT_ALLOWED_FIELDS
);
const DIAGNOSTICS_ALLOWED_FIELD_SET = new Set<string>(
  ADS_FREQUENCY_DIAGNOSTICS_ALLOWED_FIELDS
);
const METADATA_ALLOWED_FIELD_SET = new Set<string>(
  ADS_FREQUENCY_METADATA_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_FREQUENCY_RESULT_ALLOWED_FIELDS
);
const REJECTION_REASON_SET = new Set<string>(ADS_FREQUENCY_REJECTION_REASONS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeCount(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= ADS_FREQUENCY_MAX_COUNT
  );
}

function isPositiveCap(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= ADS_FREQUENCY_MAX_COUNT
  );
}

function isAdsFrequencyRejectionReason(
  value: unknown
): value is AdsFrequencyRejectionReason {
  return typeof value === "string" && REJECTION_REASON_SET.has(value);
}

function freezeSnapshot(snapshot: AdsFrequencySnapshot): AdsFrequencySnapshot {
  return Object.freeze({
    candidateId: snapshot.candidateId,
    campaignId: snapshot.campaignId,
    userExposureCount: snapshot.userExposureCount,
    dailyExposureCount: snapshot.dailyExposureCount,
    campaignExposureCount: snapshot.campaignExposureCount,
    dailyCap: snapshot.dailyCap,
    lifetimeCap: snapshot.lifetimeCap,
    campaignCap: snapshot.campaignCap,
  });
}

function freezeDiagnostics(
  diagnostics: AdsFrequencyDiagnostics
): AdsFrequencyDiagnostics {
  return Object.freeze({
    userExposureCount: diagnostics.userExposureCount,
    dailyExposureCount: diagnostics.dailyExposureCount,
    campaignExposureCount: diagnostics.campaignExposureCount,
    dailyCap: diagnostics.dailyCap,
    lifetimeCap: diagnostics.lifetimeCap,
    campaignCap: diagnostics.campaignCap,
    dailyConstraintActive: diagnostics.dailyConstraintActive,
    lifetimeConstraintActive: diagnostics.lifetimeConstraintActive,
    campaignConstraintActive: diagnostics.campaignConstraintActive,
  });
}

function freezeMetadata(): AdsFrequencyMetadata {
  return Object.freeze({
    contractVersion: ADS_FREQUENCY_CONTRACT_VERSION,
    maxCount: ADS_FREQUENCY_MAX_COUNT,
  });
}

function freezeResult(
  result: AdsFrequencyEvaluationResult
): AdsFrequencyEvaluationResult {
  return Object.freeze({
    contractVersion: ADS_FREQUENCY_CONTRACT_VERSION,
    candidateId: result.candidateId,
    campaignId: result.campaignId,
    frequencyEligible: result.frequencyEligible,
    rejectionReason: result.rejectionReason,
    diagnostics: freezeDiagnostics(result.diagnostics),
    metadata: freezeMetadata(),
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

/**
 * Parse and narrow a frequency snapshot.
 * Fail-closed — constructs a fresh immutable snapshot on success.
 */
export function parseAdsFrequencySnapshot(
  input: unknown,
  fieldPrefix = "snapshot"
): AdsFrequencySnapshotParseResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([`${fieldPrefix} must be an object.`]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!SNAPSHOT_ALLOWED_FIELD_SET.has(key)) {
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

  let campaignId: string | null = null;
  if (!isNonEmptyString(input.campaignId)) {
    issues.push(
      `${fieldPrefix}.campaignId is required and must be a non-empty string.`
    );
  } else if (input.campaignId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldPrefix}.campaignId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  } else {
    campaignId = input.campaignId;
  }

  const userExposureCount = input.userExposureCount;
  const dailyExposureCount = input.dailyExposureCount;
  const campaignExposureCount = input.campaignExposureCount;
  const dailyCap = input.dailyCap;
  const lifetimeCap = input.lifetimeCap;
  const campaignCap = input.campaignCap;

  if (!isNonNegativeCount(userExposureCount)) {
    issues.push(
      `${fieldPrefix}.userExposureCount must be a non-negative integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
    );
  }
  if (!isNonNegativeCount(dailyExposureCount)) {
    issues.push(
      `${fieldPrefix}.dailyExposureCount must be a non-negative integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
    );
  }
  if (!isNonNegativeCount(campaignExposureCount)) {
    issues.push(
      `${fieldPrefix}.campaignExposureCount must be a non-negative integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
    );
  }

  if (dailyCap !== null && !isPositiveCap(dailyCap)) {
    issues.push(
      `${fieldPrefix}.dailyCap must be null or a positive integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
    );
  }
  if (lifetimeCap !== null && !isPositiveCap(lifetimeCap)) {
    issues.push(
      `${fieldPrefix}.lifetimeCap must be null or a positive integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
    );
  }
  if (campaignCap !== null && !isPositiveCap(campaignCap)) {
    issues.push(
      `${fieldPrefix}.campaignCap must be null or a positive integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
    );
  }

  if (
    isNonNegativeCount(userExposureCount) &&
    isNonNegativeCount(dailyExposureCount) &&
    dailyExposureCount > userExposureCount
  ) {
    issues.push(
      `${fieldPrefix}.dailyExposureCount must be less than or equal to userExposureCount.`
    );
  }

  if (
    isNonNegativeCount(userExposureCount) &&
    isNonNegativeCount(campaignExposureCount) &&
    campaignExposureCount > userExposureCount
  ) {
    issues.push(
      `${fieldPrefix}.campaignExposureCount must be less than or equal to userExposureCount.`
    );
  }

  if (
    isPositiveCap(dailyCap) &&
    isPositiveCap(lifetimeCap) &&
    lifetimeCap < dailyCap
  ) {
    issues.push(
      `${fieldPrefix}.lifetimeCap must be greater than or equal to dailyCap when both are set.`
    );
  }

  if (
    issues.length > 0 ||
    candidateId === null ||
    campaignId === null ||
    !isNonNegativeCount(userExposureCount) ||
    !isNonNegativeCount(dailyExposureCount) ||
    !isNonNegativeCount(campaignExposureCount) ||
    (dailyCap !== null && !isPositiveCap(dailyCap)) ||
    (lifetimeCap !== null && !isPositiveCap(lifetimeCap)) ||
    (campaignCap !== null && !isPositiveCap(campaignCap))
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    snapshot: freezeSnapshot({
      candidateId,
      campaignId,
      userExposureCount,
      dailyExposureCount,
      campaignExposureCount,
      dailyCap,
      lifetimeCap,
      campaignCap,
    }),
  };
}

/**
 * Pure shape validator for frequency snapshots.
 * Fail-closed — does not evaluate eligibility.
 */
export function validateAdsFrequencySnapshot(
  input: unknown,
  fieldPrefix = "snapshot"
): ContractValidationResult {
  const parsed = parseAdsFrequencySnapshot(input, fieldPrefix);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

function resolveRejectionReason(
  snapshot: AdsFrequencySnapshot
): AdsFrequencyRejectionReason | null {
  const dailyActive = snapshot.dailyCap !== null;
  const lifetimeActive = snapshot.lifetimeCap !== null;
  const campaignActive = snapshot.campaignCap !== null;

  if (!dailyActive && !lifetimeActive && !campaignActive) {
    return "no_frequency_cap_configured";
  }
  if (
    dailyActive &&
    snapshot.dailyCap !== null &&
    snapshot.dailyExposureCount >= snapshot.dailyCap
  ) {
    return "daily_cap_exceeded";
  }
  if (
    lifetimeActive &&
    snapshot.lifetimeCap !== null &&
    snapshot.userExposureCount >= snapshot.lifetimeCap
  ) {
    return "lifetime_cap_exceeded";
  }
  if (
    campaignActive &&
    snapshot.campaignCap !== null &&
    snapshot.campaignExposureCount >= snapshot.campaignCap
  ) {
    return "campaign_cap_exceeded";
  }
  return null;
}

/**
 * Evaluate frequency eligibility from an explicit snapshot.
 * Same input always yields an identical immutable result.
 */
export function evaluateAdsFrequency(
  input: unknown
): AdsFrequencyEvaluationOutcome {
  const parsed = parseAdsFrequencySnapshot(input);
  if (!parsed.valid) {
    return {
      valid: false,
      issues: parsed.issues,
    };
  }

  const { snapshot } = parsed;
  const rejectionReason = resolveRejectionReason(snapshot);
  const frequencyEligible = rejectionReason === null;

  return {
    valid: true,
    result: freezeResult({
      contractVersion: ADS_FREQUENCY_CONTRACT_VERSION,
      candidateId: snapshot.candidateId,
      campaignId: snapshot.campaignId,
      frequencyEligible,
      rejectionReason,
      diagnostics: {
        userExposureCount: snapshot.userExposureCount,
        dailyExposureCount: snapshot.dailyExposureCount,
        campaignExposureCount: snapshot.campaignExposureCount,
        dailyCap: snapshot.dailyCap,
        lifetimeCap: snapshot.lifetimeCap,
        campaignCap: snapshot.campaignCap,
        dailyConstraintActive: snapshot.dailyCap !== null,
        lifetimeConstraintActive: snapshot.lifetimeCap !== null,
        campaignConstraintActive: snapshot.campaignCap !== null,
      },
      metadata: freezeMetadata(),
      productionEnabled: false,
      deliveryEnabled: false,
      executionEnabled: false,
    }),
  };
}

/**
 * Pure shape validator for frequency evaluation results.
 * Fail-closed — does not re-evaluate.
 */
export function validateAdsFrequencyEvaluationResult(
  input: unknown,
  fieldPrefix = "result"
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([`${fieldPrefix} must be an object.`]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!RESULT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`${fieldPrefix} contains unknown field "${key}".`);
    }
  }

  if (input.contractVersion !== ADS_FREQUENCY_CONTRACT_VERSION) {
    issues.push(
      `${fieldPrefix}.contractVersion must be "${ADS_FREQUENCY_CONTRACT_VERSION}".`
    );
  }

  if (!isNonEmptyString(input.candidateId)) {
    issues.push(
      `${fieldPrefix}.candidateId is required and must be a non-empty string.`
    );
  } else if (input.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldPrefix}.candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  }

  if (!isNonEmptyString(input.campaignId)) {
    issues.push(
      `${fieldPrefix}.campaignId is required and must be a non-empty string.`
    );
  } else if (input.campaignId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldPrefix}.campaignId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  }

  if (typeof input.frequencyEligible !== "boolean") {
    issues.push(`${fieldPrefix}.frequencyEligible must be a boolean.`);
  }

  if (
    input.rejectionReason !== null &&
    !isAdsFrequencyRejectionReason(input.rejectionReason)
  ) {
    issues.push(
      `${fieldPrefix}.rejectionReason is not a valid rejection reason.`
    );
  }

  if (typeof input.frequencyEligible === "boolean") {
    if (input.frequencyEligible && input.rejectionReason !== null) {
      issues.push(
        `${fieldPrefix}.rejectionReason must be null when frequencyEligible is true.`
      );
    }
    if (!input.frequencyEligible && input.rejectionReason === null) {
      issues.push(
        `${fieldPrefix}.rejectionReason is required when frequencyEligible is false.`
      );
    }
  }

  if (input.productionEnabled !== false) {
    issues.push(`${fieldPrefix}.productionEnabled must be false.`);
  }
  if (input.deliveryEnabled !== false) {
    issues.push(`${fieldPrefix}.deliveryEnabled must be false.`);
  }
  if (input.executionEnabled !== false) {
    issues.push(`${fieldPrefix}.executionEnabled must be false.`);
  }

  if (!isRecord(input.diagnostics)) {
    issues.push(`${fieldPrefix}.diagnostics must be an object.`);
  } else {
    for (const key of Object.keys(input.diagnostics)) {
      if (!DIAGNOSTICS_ALLOWED_FIELD_SET.has(key)) {
        issues.push(
          `${fieldPrefix}.diagnostics contains unknown field "${key}".`
        );
      }
    }
    const diagnostics = input.diagnostics;
    if (!isNonNegativeCount(diagnostics.userExposureCount)) {
      issues.push(
        `${fieldPrefix}.diagnostics.userExposureCount must be a non-negative integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
      );
    }
    if (!isNonNegativeCount(diagnostics.dailyExposureCount)) {
      issues.push(
        `${fieldPrefix}.diagnostics.dailyExposureCount must be a non-negative integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
      );
    }
    if (!isNonNegativeCount(diagnostics.campaignExposureCount)) {
      issues.push(
        `${fieldPrefix}.diagnostics.campaignExposureCount must be a non-negative integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
      );
    }
    if (diagnostics.dailyCap !== null && !isPositiveCap(diagnostics.dailyCap)) {
      issues.push(
        `${fieldPrefix}.diagnostics.dailyCap must be null or a positive integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
      );
    }
    if (
      diagnostics.lifetimeCap !== null &&
      !isPositiveCap(diagnostics.lifetimeCap)
    ) {
      issues.push(
        `${fieldPrefix}.diagnostics.lifetimeCap must be null or a positive integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
      );
    }
    if (
      diagnostics.campaignCap !== null &&
      !isPositiveCap(diagnostics.campaignCap)
    ) {
      issues.push(
        `${fieldPrefix}.diagnostics.campaignCap must be null or a positive integer <= ${ADS_FREQUENCY_MAX_COUNT}.`
      );
    }
    if (typeof diagnostics.dailyConstraintActive !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.dailyConstraintActive must be a boolean.`
      );
    }
    if (typeof diagnostics.lifetimeConstraintActive !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.lifetimeConstraintActive must be a boolean.`
      );
    }
    if (typeof diagnostics.campaignConstraintActive !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.campaignConstraintActive must be a boolean.`
      );
    }
  }

  if (!isRecord(input.metadata)) {
    issues.push(`${fieldPrefix}.metadata must be an object.`);
  } else {
    for (const key of Object.keys(input.metadata)) {
      if (!METADATA_ALLOWED_FIELD_SET.has(key)) {
        issues.push(`${fieldPrefix}.metadata contains unknown field "${key}".`);
      }
    }
    if (input.metadata.contractVersion !== ADS_FREQUENCY_CONTRACT_VERSION) {
      issues.push(
        `${fieldPrefix}.metadata.contractVersion must be "${ADS_FREQUENCY_CONTRACT_VERSION}".`
      );
    }
    if (input.metadata.maxCount !== ADS_FREQUENCY_MAX_COUNT) {
      issues.push(
        `${fieldPrefix}.metadata.maxCount must be ${ADS_FREQUENCY_MAX_COUNT}.`
      );
    }
  }

  return issues.length > 0
    ? { valid: false, issues: Object.freeze([...issues]) }
    : { valid: true };
}
