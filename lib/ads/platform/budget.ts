import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";

/**
 * Ads Budget Foundation V1 — pure, deterministic, fail-closed.
 *
 * Evaluates budget eligibility from an explicit snapshot only. Never mutates
 * budgets, performs payment side-effects, or consults wall-clock / network /
 * database / product modules.
 *
 * productionEnabled, deliveryEnabled, and executionEnabled are always false.
 */

export const ADS_BUDGET_CONTRACT_VERSION = "v1" as const;

/** Soft upper bound for budget amounts (minor units). */
export const ADS_BUDGET_MAX_MINOR = 1_000_000_000_000;

/**
 * Hard-gate budget rejection reasons.
 * Order is the exact first-match evaluation order in resolveRejectionReason.
 * Do not reorder without updating that function and its tests.
 *
 * Exhaustion semantics (V1 snapshot):
 * The contract exposes a single `remainingBudgetMinor`. When it is <= 0, the
 * canonical reason is `remaining_budget_exhausted`. Per-constraint exhaustion
 * reason codes are intentionally omitted — they cannot be derived reliably from
 * this snapshot without inventing state (which constraint depleted remaining).
 */
export const ADS_BUDGET_REJECTION_REASONS = [
  "no_budget_configured",
  "remaining_exceeds_daily_budget",
  "remaining_exceeds_lifetime_budget",
  "remaining_budget_exhausted",
] as const;

export type AdsBudgetRejectionReason =
  (typeof ADS_BUDGET_REJECTION_REASONS)[number];

/**
 * Top-level keys allowed on AdsBudgetSnapshot.
 * Unknown fields fail closed.
 */
export const ADS_BUDGET_SNAPSHOT_ALLOWED_FIELDS = [
  "candidateId",
  "dailyBudgetMinor",
  "lifetimeBudgetMinor",
  "remainingBudgetMinor",
] as const;

/**
 * Top-level keys allowed on AdsBudgetDiagnostics.
 * Unknown fields fail closed.
 */
export const ADS_BUDGET_DIAGNOSTICS_ALLOWED_FIELDS = [
  "dailyBudgetMinor",
  "lifetimeBudgetMinor",
  "remainingBudgetMinor",
  "dailyConstraintActive",
  "lifetimeConstraintActive",
] as const;

/**
 * Top-level keys allowed on AdsBudgetMetadata.
 * Unknown fields fail closed.
 */
export const ADS_BUDGET_METADATA_ALLOWED_FIELDS = [
  "contractVersion",
  "maxBudgetMinor",
] as const;

/**
 * Top-level keys allowed on AdsBudgetEvaluationResult.
 * Unknown fields fail closed.
 */
export const ADS_BUDGET_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "candidateId",
  "budgetEligible",
  "rejectionReason",
  "diagnostics",
  "metadata",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

/**
 * Explicit budget snapshot for one candidate.
 * Amounts are integer minor units. Null daily/lifetime means that constraint
 * is inactive. At least one constraint must be configured for a valid snapshot.
 */
export type AdsBudgetSnapshot = Readonly<{
  candidateId: string;
  /** Finite integer in (0, ADS_BUDGET_MAX_MINOR], or null when inactive. */
  dailyBudgetMinor: number | null;
  /** Finite integer in (0, ADS_BUDGET_MAX_MINOR], or null when inactive. */
  lifetimeBudgetMinor: number | null;
  /** Finite integer in [0, ADS_BUDGET_MAX_MINOR]. */
  remainingBudgetMinor: number;
}>;

export type AdsBudgetDiagnostics = Readonly<{
  dailyBudgetMinor: number | null;
  lifetimeBudgetMinor: number | null;
  remainingBudgetMinor: number;
  dailyConstraintActive: boolean;
  lifetimeConstraintActive: boolean;
}>;

export type AdsBudgetMetadata = Readonly<{
  contractVersion: typeof ADS_BUDGET_CONTRACT_VERSION;
  maxBudgetMinor: typeof ADS_BUDGET_MAX_MINOR;
}>;

/**
 * Canonical Budget Evaluation Result V1.
 * Immutable; never enables production / delivery / execution.
 */
export type AdsBudgetEvaluationResult = Readonly<{
  contractVersion: typeof ADS_BUDGET_CONTRACT_VERSION;
  candidateId: string;
  budgetEligible: boolean;
  rejectionReason: AdsBudgetRejectionReason | null;
  diagnostics: AdsBudgetDiagnostics;
  metadata: AdsBudgetMetadata;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

export type AdsBudgetEvaluationOutcome =
  | Readonly<{ valid: true; result: AdsBudgetEvaluationResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsBudgetSnapshotParseResult =
  | Readonly<{ valid: true; snapshot: AdsBudgetSnapshot }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const SNAPSHOT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BUDGET_SNAPSHOT_ALLOWED_FIELDS
);
const DIAGNOSTICS_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BUDGET_DIAGNOSTICS_ALLOWED_FIELDS
);
const METADATA_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BUDGET_METADATA_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BUDGET_RESULT_ALLOWED_FIELDS
);
const REJECTION_REASON_SET = new Set<string>(ADS_BUDGET_REJECTION_REASONS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveBudgetMinor(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0 &&
    value <= ADS_BUDGET_MAX_MINOR
  );
}

function isAdsBudgetRejectionReason(
  value: unknown
): value is AdsBudgetRejectionReason {
  return typeof value === "string" && REJECTION_REASON_SET.has(value);
}

function freezeSnapshot(snapshot: AdsBudgetSnapshot): AdsBudgetSnapshot {
  return Object.freeze({
    candidateId: snapshot.candidateId,
    dailyBudgetMinor: snapshot.dailyBudgetMinor,
    lifetimeBudgetMinor: snapshot.lifetimeBudgetMinor,
    remainingBudgetMinor: snapshot.remainingBudgetMinor,
  });
}

function freezeDiagnostics(
  diagnostics: AdsBudgetDiagnostics
): AdsBudgetDiagnostics {
  return Object.freeze({
    dailyBudgetMinor: diagnostics.dailyBudgetMinor,
    lifetimeBudgetMinor: diagnostics.lifetimeBudgetMinor,
    remainingBudgetMinor: diagnostics.remainingBudgetMinor,
    dailyConstraintActive: diagnostics.dailyConstraintActive,
    lifetimeConstraintActive: diagnostics.lifetimeConstraintActive,
  });
}

function freezeMetadata(): AdsBudgetMetadata {
  return Object.freeze({
    contractVersion: ADS_BUDGET_CONTRACT_VERSION,
    maxBudgetMinor: ADS_BUDGET_MAX_MINOR,
  });
}

function freezeResult(
  result: AdsBudgetEvaluationResult
): AdsBudgetEvaluationResult {
  return Object.freeze({
    contractVersion: ADS_BUDGET_CONTRACT_VERSION,
    candidateId: result.candidateId,
    budgetEligible: result.budgetEligible,
    rejectionReason: result.rejectionReason,
    diagnostics: freezeDiagnostics(result.diagnostics),
    metadata: freezeMetadata(),
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

/**
 * Parse and narrow a budget snapshot.
 * Fail-closed — constructs a fresh immutable snapshot on success.
 */
export function parseAdsBudgetSnapshot(
  input: unknown,
  fieldPrefix = "snapshot"
): AdsBudgetSnapshotParseResult {
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

  const dailyBudgetMinor = input.dailyBudgetMinor;
  const lifetimeBudgetMinor = input.lifetimeBudgetMinor;
  const remainingBudgetMinor = input.remainingBudgetMinor;

  if (dailyBudgetMinor !== null && !isPositiveBudgetMinor(dailyBudgetMinor)) {
    issues.push(
      `${fieldPrefix}.dailyBudgetMinor must be null or a positive integer <= ${ADS_BUDGET_MAX_MINOR}.`
    );
  }

  if (
    lifetimeBudgetMinor !== null &&
    !isPositiveBudgetMinor(lifetimeBudgetMinor)
  ) {
    issues.push(
      `${fieldPrefix}.lifetimeBudgetMinor must be null or a positive integer <= ${ADS_BUDGET_MAX_MINOR}.`
    );
  }

  if (
    !isNonNegativeInteger(remainingBudgetMinor) ||
    remainingBudgetMinor > ADS_BUDGET_MAX_MINOR
  ) {
    issues.push(
      `${fieldPrefix}.remainingBudgetMinor must be a non-negative integer <= ${ADS_BUDGET_MAX_MINOR}.`
    );
  }

  if (
    isPositiveBudgetMinor(dailyBudgetMinor) &&
    isPositiveBudgetMinor(lifetimeBudgetMinor) &&
    lifetimeBudgetMinor < dailyBudgetMinor
  ) {
    issues.push(
      `${fieldPrefix}.lifetimeBudgetMinor must be greater than or equal to dailyBudgetMinor when both are set.`
    );
  }

  if (
    issues.length > 0 ||
    candidateId === null ||
    (dailyBudgetMinor !== null && !isPositiveBudgetMinor(dailyBudgetMinor)) ||
    (lifetimeBudgetMinor !== null &&
      !isPositiveBudgetMinor(lifetimeBudgetMinor)) ||
    !isNonNegativeInteger(remainingBudgetMinor) ||
    remainingBudgetMinor > ADS_BUDGET_MAX_MINOR
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    snapshot: freezeSnapshot({
      candidateId,
      dailyBudgetMinor,
      lifetimeBudgetMinor,
      remainingBudgetMinor,
    }),
  };
}

/**
 * Pure shape validator for budget snapshots.
 * Fail-closed — does not evaluate eligibility.
 */
export function validateAdsBudgetSnapshot(
  input: unknown,
  fieldPrefix = "snapshot"
): ContractValidationResult {
  const parsed = parseAdsBudgetSnapshot(input, fieldPrefix);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

function resolveRejectionReason(
  snapshot: AdsBudgetSnapshot
): AdsBudgetRejectionReason | null {
  const dailyActive = snapshot.dailyBudgetMinor !== null;
  const lifetimeActive = snapshot.lifetimeBudgetMinor !== null;

  if (!dailyActive && !lifetimeActive) {
    return "no_budget_configured";
  }
  if (
    dailyActive &&
    snapshot.dailyBudgetMinor !== null &&
    snapshot.remainingBudgetMinor > snapshot.dailyBudgetMinor
  ) {
    return "remaining_exceeds_daily_budget";
  }
  if (
    lifetimeActive &&
    snapshot.lifetimeBudgetMinor !== null &&
    snapshot.remainingBudgetMinor > snapshot.lifetimeBudgetMinor
  ) {
    return "remaining_exceeds_lifetime_budget";
  }
  if (snapshot.remainingBudgetMinor <= 0) {
    return "remaining_budget_exhausted";
  }
  return null;
}

/**
 * Evaluate budget eligibility from an explicit snapshot.
 * Same input always yields an identical immutable result.
 */
export function evaluateAdsBudget(input: unknown): AdsBudgetEvaluationOutcome {
  const parsed = parseAdsBudgetSnapshot(input);
  if (!parsed.valid) {
    return {
      valid: false,
      issues: parsed.issues,
    };
  }

  const { snapshot } = parsed;
  const rejectionReason = resolveRejectionReason(snapshot);
  const budgetEligible = rejectionReason === null;

  return {
    valid: true,
    result: freezeResult({
      contractVersion: ADS_BUDGET_CONTRACT_VERSION,
      candidateId: snapshot.candidateId,
      budgetEligible,
      rejectionReason,
      diagnostics: {
        dailyBudgetMinor: snapshot.dailyBudgetMinor,
        lifetimeBudgetMinor: snapshot.lifetimeBudgetMinor,
        remainingBudgetMinor: snapshot.remainingBudgetMinor,
        dailyConstraintActive: snapshot.dailyBudgetMinor !== null,
        lifetimeConstraintActive: snapshot.lifetimeBudgetMinor !== null,
      },
      metadata: freezeMetadata(),
      productionEnabled: false,
      deliveryEnabled: false,
      executionEnabled: false,
    }),
  };
}

/**
 * Pure shape validator for budget evaluation results.
 * Fail-closed — does not re-evaluate.
 */
export function validateAdsBudgetEvaluationResult(
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

  if (input.contractVersion !== ADS_BUDGET_CONTRACT_VERSION) {
    issues.push(
      `${fieldPrefix}.contractVersion must be "${ADS_BUDGET_CONTRACT_VERSION}".`
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

  if (typeof input.budgetEligible !== "boolean") {
    issues.push(`${fieldPrefix}.budgetEligible must be a boolean.`);
  }

  if (
    input.rejectionReason !== null &&
    !isAdsBudgetRejectionReason(input.rejectionReason)
  ) {
    issues.push(
      `${fieldPrefix}.rejectionReason is not a valid rejection reason.`
    );
  }

  if (typeof input.budgetEligible === "boolean") {
    if (input.budgetEligible && input.rejectionReason !== null) {
      issues.push(
        `${fieldPrefix}.rejectionReason must be null when budgetEligible is true.`
      );
    }
    if (!input.budgetEligible && input.rejectionReason === null) {
      issues.push(
        `${fieldPrefix}.rejectionReason is required when budgetEligible is false.`
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
    if (
      diagnostics.dailyBudgetMinor !== null &&
      !isPositiveBudgetMinor(diagnostics.dailyBudgetMinor)
    ) {
      issues.push(
        `${fieldPrefix}.diagnostics.dailyBudgetMinor must be null or a positive integer <= ${ADS_BUDGET_MAX_MINOR}.`
      );
    }
    if (
      diagnostics.lifetimeBudgetMinor !== null &&
      !isPositiveBudgetMinor(diagnostics.lifetimeBudgetMinor)
    ) {
      issues.push(
        `${fieldPrefix}.diagnostics.lifetimeBudgetMinor must be null or a positive integer <= ${ADS_BUDGET_MAX_MINOR}.`
      );
    }
    if (
      !isNonNegativeInteger(diagnostics.remainingBudgetMinor) ||
      diagnostics.remainingBudgetMinor > ADS_BUDGET_MAX_MINOR
    ) {
      issues.push(
        `${fieldPrefix}.diagnostics.remainingBudgetMinor must be a non-negative integer <= ${ADS_BUDGET_MAX_MINOR}.`
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
  }

  if (!isRecord(input.metadata)) {
    issues.push(`${fieldPrefix}.metadata must be an object.`);
  } else {
    for (const key of Object.keys(input.metadata)) {
      if (!METADATA_ALLOWED_FIELD_SET.has(key)) {
        issues.push(`${fieldPrefix}.metadata contains unknown field "${key}".`);
      }
    }
    if (input.metadata.contractVersion !== ADS_BUDGET_CONTRACT_VERSION) {
      issues.push(
        `${fieldPrefix}.metadata.contractVersion must be "${ADS_BUDGET_CONTRACT_VERSION}".`
      );
    }
    if (input.metadata.maxBudgetMinor !== ADS_BUDGET_MAX_MINOR) {
      issues.push(
        `${fieldPrefix}.metadata.maxBudgetMinor must be ${ADS_BUDGET_MAX_MINOR}.`
      );
    }
  }

  return issues.length > 0
    ? { valid: false, issues: Object.freeze([...issues]) }
    : { valid: true };
}
