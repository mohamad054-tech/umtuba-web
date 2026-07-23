import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import {
  ADS_BUDGET_CONTRACT_VERSION,
  evaluateAdsBudget,
  parseAdsBudgetSnapshot,
  validateAdsBudgetEvaluationResult,
  type AdsBudgetEvaluationResult,
  type AdsBudgetRejectionReason,
  type AdsBudgetSnapshot,
} from "./budget";

/**
 * Ads Pacing Foundation V1 — pure, deterministic, fail-closed.
 *
 * Evaluates pacing eligibility from an explicit state + window snapshot only.
 * Never mutates budgets, performs payment side-effects, randomizes, or consults
 * wall-clock / network / database / product modules.
 *
 * Window fractions are explicit inputs — never derived from system time.
 * Elapsed wall-clock progress is out of scope for V1 eligibility.
 *
 * productionEnabled, deliveryEnabled, and executionEnabled are always false.
 */

export const ADS_PACING_CONTRACT_VERSION = "v1" as const;

/**
 * Supported pacing states. Delivery-eligible states are on_pace, behind, ahead.
 * throttled and paused fail closed for pacing eligibility.
 */
export const ADS_PACING_STATES = [
  "on_pace",
  "behind",
  "ahead",
  "throttled",
  "paused",
] as const;

export type AdsPacingState = (typeof ADS_PACING_STATES)[number];

/** States that pass pacing eligibility in V1. */
export const ADS_PACING_ELIGIBLE_STATES = [
  "on_pace",
  "behind",
  "ahead",
] as const;

export type AdsPacingEligibleState =
  (typeof ADS_PACING_ELIGIBLE_STATES)[number];

/**
 * Hard-gate pacing rejection reasons (first match wins).
 * Documented order — do not reorder lightly.
 */
export const ADS_PACING_REJECTION_REASONS = [
  "pacing_paused",
  "pacing_throttled",
  "pacing_window_exhausted",
  "pacing_ahead_of_plan",
] as const;

export type AdsPacingRejectionReason =
  (typeof ADS_PACING_REJECTION_REASONS)[number];

/**
 * Combined delivery-eligibility rejection reasons.
 * Budget reasons first (same order as ADS_BUDGET_REJECTION_REASONS), then pacing.
 */
export const ADS_BUDGET_PACING_REJECTION_REASONS = [
  "no_budget_configured",
  "remaining_exceeds_daily_budget",
  "remaining_exceeds_lifetime_budget",
  "remaining_budget_exhausted",
  "pacing_paused",
  "pacing_throttled",
  "pacing_window_exhausted",
  "pacing_ahead_of_plan",
] as const;

export type AdsBudgetPacingRejectionReason =
  (typeof ADS_BUDGET_PACING_REJECTION_REASONS)[number];

/**
 * Top-level keys allowed on AdsPacingWindow.
 * Unknown fields fail closed.
 *
 * V1 window progress is fraction-based only (no wall-clock timestamps).
 * `elapsedFraction` is intentionally out of scope for V1 eligibility and is
 * not part of this contract.
 */
export const ADS_PACING_WINDOW_ALLOWED_FIELDS = [
  "windowId",
  "targetDeliveryFraction",
  "actualDeliveryFraction",
] as const;

/**
 * Top-level keys allowed on AdsPacingSnapshot.
 * Unknown fields fail closed.
 */
export const ADS_PACING_SNAPSHOT_ALLOWED_FIELDS = [
  "candidateId",
  "pacingState",
  "pacingWindow",
] as const;

/**
 * Top-level keys allowed on AdsPacingDiagnostics.
 * Unknown fields fail closed.
 */
export const ADS_PACING_DIAGNOSTICS_ALLOWED_FIELDS = [
  "pacingState",
  "pacingWindow",
  "stateEligible",
  "windowEligible",
] as const;

/**
 * Top-level keys allowed on AdsPacingMetadata.
 * Unknown fields fail closed.
 */
export const ADS_PACING_METADATA_ALLOWED_FIELDS = [
  "contractVersion",
  "eligibleStates",
] as const;

/**
 * Top-level keys allowed on AdsPacingEvaluationResult.
 * Unknown fields fail closed.
 */
export const ADS_PACING_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "candidateId",
  "pacingEligible",
  "rejectionReason",
  "diagnostics",
  "metadata",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

/**
 * Top-level keys allowed on AdsBudgetPacingInput.
 * Unknown fields fail closed.
 */
export const ADS_BUDGET_PACING_INPUT_ALLOWED_FIELDS = [
  "budget",
  "pacing",
] as const;

/**
 * Top-level keys allowed on AdsBudgetPacingDiagnostics.
 * Unknown fields fail closed.
 */
export const ADS_BUDGET_PACING_DIAGNOSTICS_ALLOWED_FIELDS = [
  "budget",
  "pacing",
] as const;

/**
 * Top-level keys allowed on AdsBudgetPacingMetadata.
 * Unknown fields fail closed.
 */
export const ADS_BUDGET_PACING_METADATA_ALLOWED_FIELDS = [
  "contractVersion",
  "budgetContractVersion",
  "pacingContractVersion",
] as const;

/**
 * Top-level keys allowed on AdsBudgetPacingEvaluationResult.
 * Unknown fields fail closed.
 */
export const ADS_BUDGET_PACING_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "candidateId",
  "budgetEligible",
  "pacingEligible",
  "deliveryEligible",
  "rejectionReason",
  "diagnostics",
  "metadata",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

/**
 * Explicit pacing window progress.
 * Fractions are finite numbers in [0, 1] — never wall-clock derived here.
 * Time elapsed within the window is out of scope for V1 (no elapsedFraction).
 */
export type AdsPacingWindow = Readonly<{
  windowId: string;
  targetDeliveryFraction: number;
  actualDeliveryFraction: number;
}>;

/**
 * Explicit pacing snapshot for one candidate.
 */
export type AdsPacingSnapshot = Readonly<{
  candidateId: string;
  pacingState: AdsPacingState;
  pacingWindow: AdsPacingWindow;
}>;

export type AdsPacingDiagnostics = Readonly<{
  pacingState: AdsPacingState;
  pacingWindow: AdsPacingWindow;
  stateEligible: boolean;
  windowEligible: boolean;
}>;

export type AdsPacingMetadata = Readonly<{
  contractVersion: typeof ADS_PACING_CONTRACT_VERSION;
  eligibleStates: typeof ADS_PACING_ELIGIBLE_STATES;
}>;

/**
 * Canonical Pacing Evaluation Result V1.
 * Immutable; never enables production / delivery / execution.
 */
export type AdsPacingEvaluationResult = Readonly<{
  contractVersion: typeof ADS_PACING_CONTRACT_VERSION;
  candidateId: string;
  pacingEligible: boolean;
  rejectionReason: AdsPacingRejectionReason | null;
  diagnostics: AdsPacingDiagnostics;
  metadata: AdsPacingMetadata;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

export type AdsBudgetPacingInput = Readonly<{
  budget: AdsBudgetSnapshot;
  pacing: AdsPacingSnapshot;
}>;

export type AdsBudgetPacingDiagnostics = Readonly<{
  budget: AdsBudgetEvaluationResult;
  pacing: AdsPacingEvaluationResult;
}>;

export type AdsBudgetPacingMetadata = Readonly<{
  contractVersion: "v1";
  budgetContractVersion: typeof ADS_BUDGET_CONTRACT_VERSION;
  pacingContractVersion: typeof ADS_PACING_CONTRACT_VERSION;
}>;

/**
 * Combined Budget + Pacing delivery-eligibility result.
 * `deliveryEligible` is the contract gate only — kill switches stay false.
 */
export type AdsBudgetPacingEvaluationResult = Readonly<{
  contractVersion: "v1";
  candidateId: string;
  budgetEligible: boolean;
  pacingEligible: boolean;
  deliveryEligible: boolean;
  rejectionReason: AdsBudgetPacingRejectionReason | null;
  diagnostics: AdsBudgetPacingDiagnostics;
  metadata: AdsBudgetPacingMetadata;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

export type AdsPacingEvaluationOutcome =
  | Readonly<{ valid: true; result: AdsPacingEvaluationResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsBudgetPacingEvaluationOutcome =
  | Readonly<{ valid: true; result: AdsBudgetPacingEvaluationResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsPacingSnapshotParseResult =
  | Readonly<{ valid: true; snapshot: AdsPacingSnapshot }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsBudgetPacingInputParseResult =
  | Readonly<{ valid: true; input: AdsBudgetPacingInput }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const PACING_STATE_SET = new Set<string>(ADS_PACING_STATES);
const PACING_ELIGIBLE_STATE_SET = new Set<string>(ADS_PACING_ELIGIBLE_STATES);
const PACING_REJECTION_REASON_SET = new Set<string>(
  ADS_PACING_REJECTION_REASONS
);
const COMBINED_REJECTION_REASON_SET = new Set<string>(
  ADS_BUDGET_PACING_REJECTION_REASONS
);
const WINDOW_ALLOWED_FIELD_SET = new Set<string>(
  ADS_PACING_WINDOW_ALLOWED_FIELDS
);
const SNAPSHOT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_PACING_SNAPSHOT_ALLOWED_FIELDS
);
const DIAGNOSTICS_ALLOWED_FIELD_SET = new Set<string>(
  ADS_PACING_DIAGNOSTICS_ALLOWED_FIELDS
);
const METADATA_ALLOWED_FIELD_SET = new Set<string>(
  ADS_PACING_METADATA_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_PACING_RESULT_ALLOWED_FIELDS
);
const COMBINED_INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BUDGET_PACING_INPUT_ALLOWED_FIELDS
);
const COMBINED_DIAGNOSTICS_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BUDGET_PACING_DIAGNOSTICS_ALLOWED_FIELDS
);
const COMBINED_METADATA_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BUDGET_PACING_METADATA_ALLOWED_FIELDS
);
const COMBINED_RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BUDGET_PACING_RESULT_ALLOWED_FIELDS
);

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

function isAdsPacingState(value: unknown): value is AdsPacingState {
  return typeof value === "string" && PACING_STATE_SET.has(value);
}

function isAdsPacingRejectionReason(
  value: unknown
): value is AdsPacingRejectionReason {
  return typeof value === "string" && PACING_REJECTION_REASON_SET.has(value);
}

function isAdsBudgetPacingRejectionReason(
  value: unknown
): value is AdsBudgetPacingRejectionReason {
  return typeof value === "string" && COMBINED_REJECTION_REASON_SET.has(value);
}

function freezeWindow(window: AdsPacingWindow): AdsPacingWindow {
  return Object.freeze({
    windowId: window.windowId,
    targetDeliveryFraction: window.targetDeliveryFraction,
    actualDeliveryFraction: window.actualDeliveryFraction,
  });
}

function freezeSnapshot(snapshot: AdsPacingSnapshot): AdsPacingSnapshot {
  return Object.freeze({
    candidateId: snapshot.candidateId,
    pacingState: snapshot.pacingState,
    pacingWindow: freezeWindow(snapshot.pacingWindow),
  });
}

function freezeDiagnostics(
  diagnostics: AdsPacingDiagnostics
): AdsPacingDiagnostics {
  return Object.freeze({
    pacingState: diagnostics.pacingState,
    pacingWindow: freezeWindow(diagnostics.pacingWindow),
    stateEligible: diagnostics.stateEligible,
    windowEligible: diagnostics.windowEligible,
  });
}

function freezeMetadata(): AdsPacingMetadata {
  return Object.freeze({
    contractVersion: ADS_PACING_CONTRACT_VERSION,
    eligibleStates: ADS_PACING_ELIGIBLE_STATES,
  });
}

function freezeResult(
  result: AdsPacingEvaluationResult
): AdsPacingEvaluationResult {
  return Object.freeze({
    contractVersion: ADS_PACING_CONTRACT_VERSION,
    candidateId: result.candidateId,
    pacingEligible: result.pacingEligible,
    rejectionReason: result.rejectionReason,
    diagnostics: freezeDiagnostics(result.diagnostics),
    metadata: freezeMetadata(),
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

function freezeCombinedMetadata(): AdsBudgetPacingMetadata {
  return Object.freeze({
    contractVersion: "v1" as const,
    budgetContractVersion: ADS_BUDGET_CONTRACT_VERSION,
    pacingContractVersion: ADS_PACING_CONTRACT_VERSION,
  });
}

function freezeCombinedResult(
  result: AdsBudgetPacingEvaluationResult
): AdsBudgetPacingEvaluationResult {
  return Object.freeze({
    contractVersion: "v1" as const,
    candidateId: result.candidateId,
    budgetEligible: result.budgetEligible,
    pacingEligible: result.pacingEligible,
    deliveryEligible: result.deliveryEligible,
    rejectionReason: result.rejectionReason,
    diagnostics: Object.freeze({
      budget: result.diagnostics.budget,
      pacing: result.diagnostics.pacing,
    }),
    metadata: freezeCombinedMetadata(),
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

function parseAdsPacingWindow(
  input: unknown,
  fieldPrefix: string
):
  | Readonly<{ valid: true; window: AdsPacingWindow }>
  | Readonly<{ valid: false; issues: readonly string[] }> {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([`${fieldPrefix} must be an object.`]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!WINDOW_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`${fieldPrefix} contains unknown field "${key}".`);
    }
  }

  let windowId: string | null = null;
  if (!isNonEmptyString(input.windowId)) {
    issues.push(
      `${fieldPrefix}.windowId is required and must be a non-empty string.`
    );
  } else if (input.windowId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldPrefix}.windowId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  } else {
    windowId = input.windowId;
  }

  if (!isUnitInterval(input.targetDeliveryFraction)) {
    issues.push(
      `${fieldPrefix}.targetDeliveryFraction must be a finite number in [0, 1].`
    );
  }
  if (!isUnitInterval(input.actualDeliveryFraction)) {
    issues.push(
      `${fieldPrefix}.actualDeliveryFraction must be a finite number in [0, 1].`
    );
  }

  if (
    issues.length > 0 ||
    windowId === null ||
    !isUnitInterval(input.targetDeliveryFraction) ||
    !isUnitInterval(input.actualDeliveryFraction)
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    window: freezeWindow({
      windowId,
      targetDeliveryFraction: input.targetDeliveryFraction,
      actualDeliveryFraction: input.actualDeliveryFraction,
    }),
  };
}

/**
 * Parse and narrow a pacing snapshot.
 * Fail-closed — constructs a fresh immutable snapshot on success.
 */
export function parseAdsPacingSnapshot(
  input: unknown,
  fieldPrefix = "snapshot"
): AdsPacingSnapshotParseResult {
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

  if (!isAdsPacingState(input.pacingState)) {
    issues.push(`${fieldPrefix}.pacingState is not a valid pacing state.`);
  }

  const windowParsed = parseAdsPacingWindow(
    input.pacingWindow,
    `${fieldPrefix}.pacingWindow`
  );
  if (!windowParsed.valid) {
    issues.push(...windowParsed.issues);
  }

  if (
    issues.length > 0 ||
    candidateId === null ||
    !isAdsPacingState(input.pacingState) ||
    !windowParsed.valid
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    snapshot: freezeSnapshot({
      candidateId,
      pacingState: input.pacingState,
      pacingWindow: windowParsed.window,
    }),
  };
}

/**
 * Pure shape validator for pacing snapshots.
 * Fail-closed — does not evaluate eligibility.
 */
export function validateAdsPacingSnapshot(
  input: unknown,
  fieldPrefix = "snapshot"
): ContractValidationResult {
  const parsed = parseAdsPacingSnapshot(input, fieldPrefix);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

function resolvePacingRejectionReason(
  snapshot: AdsPacingSnapshot
): AdsPacingRejectionReason | null {
  if (snapshot.pacingState === "paused") {
    return "pacing_paused";
  }
  if (snapshot.pacingState === "throttled") {
    return "pacing_throttled";
  }
  if (snapshot.pacingWindow.actualDeliveryFraction >= 1) {
    return "pacing_window_exhausted";
  }
  if (
    snapshot.pacingWindow.actualDeliveryFraction >
    snapshot.pacingWindow.targetDeliveryFraction
  ) {
    return "pacing_ahead_of_plan";
  }
  if (!PACING_ELIGIBLE_STATE_SET.has(snapshot.pacingState)) {
    return "pacing_throttled";
  }
  return null;
}

/**
 * Evaluate pacing eligibility from an explicit snapshot.
 * Same input always yields an identical immutable result.
 */
export function evaluateAdsPacing(input: unknown): AdsPacingEvaluationOutcome {
  const parsed = parseAdsPacingSnapshot(input);
  if (!parsed.valid) {
    return {
      valid: false,
      issues: parsed.issues,
    };
  }

  const { snapshot } = parsed;
  const rejectionReason = resolvePacingRejectionReason(snapshot);
  const pacingEligible = rejectionReason === null;
  const stateEligible = PACING_ELIGIBLE_STATE_SET.has(snapshot.pacingState);
  const windowEligible =
    snapshot.pacingWindow.actualDeliveryFraction < 1 &&
    snapshot.pacingWindow.actualDeliveryFraction <=
      snapshot.pacingWindow.targetDeliveryFraction;

  return {
    valid: true,
    result: freezeResult({
      contractVersion: ADS_PACING_CONTRACT_VERSION,
      candidateId: snapshot.candidateId,
      pacingEligible,
      rejectionReason,
      diagnostics: {
        pacingState: snapshot.pacingState,
        pacingWindow: snapshot.pacingWindow,
        stateEligible,
        windowEligible,
      },
      metadata: freezeMetadata(),
      productionEnabled: false,
      deliveryEnabled: false,
      executionEnabled: false,
    }),
  };
}

/**
 * Pure shape validator for pacing evaluation results.
 * Fail-closed — does not re-evaluate.
 */
export function validateAdsPacingEvaluationResult(
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

  if (input.contractVersion !== ADS_PACING_CONTRACT_VERSION) {
    issues.push(
      `${fieldPrefix}.contractVersion must be "${ADS_PACING_CONTRACT_VERSION}".`
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

  if (typeof input.pacingEligible !== "boolean") {
    issues.push(`${fieldPrefix}.pacingEligible must be a boolean.`);
  }

  if (
    input.rejectionReason !== null &&
    !isAdsPacingRejectionReason(input.rejectionReason)
  ) {
    issues.push(`${fieldPrefix}.rejectionReason is not a valid rejection reason.`);
  }

  if (typeof input.pacingEligible === "boolean") {
    if (input.pacingEligible && input.rejectionReason !== null) {
      issues.push(
        `${fieldPrefix}.rejectionReason must be null when pacingEligible is true.`
      );
    }
    if (!input.pacingEligible && input.rejectionReason === null) {
      issues.push(
        `${fieldPrefix}.rejectionReason is required when pacingEligible is false.`
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
    if (!isAdsPacingState(input.diagnostics.pacingState)) {
      issues.push(
        `${fieldPrefix}.diagnostics.pacingState is not a valid pacing state.`
      );
    }
    if (typeof input.diagnostics.stateEligible !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.stateEligible must be a boolean.`
      );
    }
    if (typeof input.diagnostics.windowEligible !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.windowEligible must be a boolean.`
      );
    }
    const windowParsed = parseAdsPacingWindow(
      input.diagnostics.pacingWindow,
      `${fieldPrefix}.diagnostics.pacingWindow`
    );
    if (!windowParsed.valid) {
      issues.push(...windowParsed.issues);
    }
  }

  if (!isRecord(input.metadata)) {
    issues.push(`${fieldPrefix}.metadata must be an object.`);
  } else {
    const metadata = input.metadata;
    for (const key of Object.keys(metadata)) {
      if (!METADATA_ALLOWED_FIELD_SET.has(key)) {
        issues.push(`${fieldPrefix}.metadata contains unknown field "${key}".`);
      }
    }
    if (metadata.contractVersion !== ADS_PACING_CONTRACT_VERSION) {
      issues.push(
        `${fieldPrefix}.metadata.contractVersion must be "${ADS_PACING_CONTRACT_VERSION}".`
      );
    }
    const eligibleStates = metadata.eligibleStates;
    if (
      !Array.isArray(eligibleStates) ||
      eligibleStates.length !== ADS_PACING_ELIGIBLE_STATES.length ||
      !ADS_PACING_ELIGIBLE_STATES.every(
        (state, index) => eligibleStates[index] === state
      )
    ) {
      issues.push(
        `${fieldPrefix}.metadata.eligibleStates must match ADS_PACING_ELIGIBLE_STATES.`
      );
    }
  }

  return issues.length > 0
    ? { valid: false, issues: Object.freeze([...issues]) }
    : { valid: true };
}

/**
 * Parse combined budget + pacing input.
 * Candidate ids on both snapshots must match.
 */
export function parseAdsBudgetPacingInput(
  input: unknown,
  fieldPrefix = "input"
): AdsBudgetPacingInputParseResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([`${fieldPrefix} must be an object.`]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!COMBINED_INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`${fieldPrefix} contains unknown field "${key}".`);
    }
  }

  const budgetParsed = parseAdsBudgetSnapshot(
    input.budget,
    `${fieldPrefix}.budget`
  );
  if (!budgetParsed.valid) {
    issues.push(...budgetParsed.issues);
  }

  const pacingParsed = parseAdsPacingSnapshot(
    input.pacing,
    `${fieldPrefix}.pacing`
  );
  if (!pacingParsed.valid) {
    issues.push(...pacingParsed.issues);
  }

  if (
    budgetParsed.valid &&
    pacingParsed.valid &&
    budgetParsed.snapshot.candidateId !== pacingParsed.snapshot.candidateId
  ) {
    issues.push(
      `${fieldPrefix}.budget.candidateId and ${fieldPrefix}.pacing.candidateId must match.`
    );
  }

  if (issues.length > 0 || !budgetParsed.valid || !pacingParsed.valid) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    input: Object.freeze({
      budget: budgetParsed.snapshot,
      pacing: pacingParsed.snapshot,
    }),
  };
}

function mapBudgetRejection(
  reason: AdsBudgetRejectionReason | null
): AdsBudgetPacingRejectionReason | null {
  return reason;
}

function mapPacingRejection(
  reason: AdsPacingRejectionReason | null
): AdsBudgetPacingRejectionReason | null {
  return reason;
}

/**
 * Evaluate combined budget + pacing delivery eligibility.
 * Budget rejection wins first; then pacing. Kill switches stay false.
 */
export function evaluateAdsBudgetPacing(
  input: unknown
): AdsBudgetPacingEvaluationOutcome {
  const parsed = parseAdsBudgetPacingInput(input);
  if (!parsed.valid) {
    return {
      valid: false,
      issues: parsed.issues,
    };
  }

  const budgetOutcome = evaluateAdsBudget(parsed.input.budget);
  if (!budgetOutcome.valid) {
    return {
      valid: false,
      issues: budgetOutcome.issues,
    };
  }

  const pacingOutcome = evaluateAdsPacing(parsed.input.pacing);
  if (!pacingOutcome.valid) {
    return {
      valid: false,
      issues: pacingOutcome.issues,
    };
  }

  const budgetEligible = budgetOutcome.result.budgetEligible;
  const pacingEligible = pacingOutcome.result.pacingEligible;
  const deliveryEligible = budgetEligible && pacingEligible;

  let rejectionReason: AdsBudgetPacingRejectionReason | null = null;
  if (!budgetEligible) {
    rejectionReason = mapBudgetRejection(budgetOutcome.result.rejectionReason);
  } else if (!pacingEligible) {
    rejectionReason = mapPacingRejection(pacingOutcome.result.rejectionReason);
  }

  return {
    valid: true,
    result: freezeCombinedResult({
      contractVersion: "v1",
      candidateId: parsed.input.budget.candidateId,
      budgetEligible,
      pacingEligible,
      deliveryEligible,
      rejectionReason,
      diagnostics: Object.freeze({
        budget: budgetOutcome.result,
        pacing: pacingOutcome.result,
      }),
      metadata: freezeCombinedMetadata(),
      productionEnabled: false,
      deliveryEnabled: false,
      executionEnabled: false,
    }),
  };
}

/**
 * Pure shape validator for combined budget + pacing results.
 */
export function validateAdsBudgetPacingEvaluationResult(
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
    if (!COMBINED_RESULT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`${fieldPrefix} contains unknown field "${key}".`);
    }
  }

  if (input.contractVersion !== "v1") {
    issues.push(`${fieldPrefix}.contractVersion must be "v1".`);
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
  if (typeof input.pacingEligible !== "boolean") {
    issues.push(`${fieldPrefix}.pacingEligible must be a boolean.`);
  }
  if (typeof input.deliveryEligible !== "boolean") {
    issues.push(`${fieldPrefix}.deliveryEligible must be a boolean.`);
  }

  if (
    typeof input.budgetEligible === "boolean" &&
    typeof input.pacingEligible === "boolean" &&
    typeof input.deliveryEligible === "boolean" &&
    input.deliveryEligible !== (input.budgetEligible && input.pacingEligible)
  ) {
    issues.push(
      `${fieldPrefix}.deliveryEligible must equal budgetEligible && pacingEligible.`
    );
  }

  if (
    input.rejectionReason !== null &&
    !isAdsBudgetPacingRejectionReason(input.rejectionReason)
  ) {
    issues.push(`${fieldPrefix}.rejectionReason is not a valid rejection reason.`);
  }

  if (typeof input.deliveryEligible === "boolean") {
    if (input.deliveryEligible && input.rejectionReason !== null) {
      issues.push(
        `${fieldPrefix}.rejectionReason must be null when deliveryEligible is true.`
      );
    }
    if (!input.deliveryEligible && input.rejectionReason === null) {
      issues.push(
        `${fieldPrefix}.rejectionReason is required when deliveryEligible is false.`
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
      if (!COMBINED_DIAGNOSTICS_ALLOWED_FIELD_SET.has(key)) {
        issues.push(
          `${fieldPrefix}.diagnostics contains unknown field "${key}".`
        );
      }
    }
    const budgetValidation = validateAdsBudgetEvaluationResult(
      input.diagnostics.budget,
      `${fieldPrefix}.diagnostics.budget`
    );
    if (!budgetValidation.valid) {
      issues.push(...budgetValidation.issues);
    }
    const pacingValidation = validateAdsPacingEvaluationResult(
      input.diagnostics.pacing,
      `${fieldPrefix}.diagnostics.pacing`
    );
    if (!pacingValidation.valid) {
      issues.push(...pacingValidation.issues);
    }
  }

  if (!isRecord(input.metadata)) {
    issues.push(`${fieldPrefix}.metadata must be an object.`);
  } else {
    for (const key of Object.keys(input.metadata)) {
      if (!COMBINED_METADATA_ALLOWED_FIELD_SET.has(key)) {
        issues.push(`${fieldPrefix}.metadata contains unknown field "${key}".`);
      }
    }
    if (input.metadata.contractVersion !== "v1") {
      issues.push(`${fieldPrefix}.metadata.contractVersion must be "v1".`);
    }
    if (input.metadata.budgetContractVersion !== ADS_BUDGET_CONTRACT_VERSION) {
      issues.push(
        `${fieldPrefix}.metadata.budgetContractVersion must be "${ADS_BUDGET_CONTRACT_VERSION}".`
      );
    }
    if (input.metadata.pacingContractVersion !== ADS_PACING_CONTRACT_VERSION) {
      issues.push(
        `${fieldPrefix}.metadata.pacingContractVersion must be "${ADS_PACING_CONTRACT_VERSION}".`
      );
    }
  }

  return issues.length > 0
    ? { valid: false, issues: Object.freeze([...issues]) }
    : { valid: true };
}
