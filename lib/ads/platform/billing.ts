import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import {
  ADS_CHARGE_CALCULATION_RESULT_ALLOWED_FIELDS,
  ADS_CHARGING_CONTRACT_VERSION,
  ADS_CHARGING_MAX_MINOR,
  ADS_CHARGING_MAX_QUANTITY,
  ADS_CHARGING_PRICING_MODELS,
  ADS_CHARGING_SUPPORTED_CURRENCIES,
  calculateAdsCharge,
  expectedPricingModelForEventType,
  isAdsChargingCurrency,
  parseAdsBillableEvent,
  validateAdsChargeCalculationResult,
  type AdsBillableEvent,
  type AdsChargeableEventType,
  type AdsChargeCalculationResult,
  type AdsChargingCurrency,
  type AdsChargingPricingModel,
  type AdsBillingEventTrustLevel,
} from "./charging";

/**
 * Ads Billing Foundation V1 — pure, deterministic, fail-closed.
 *
 * Evaluates billing eligibility and attaches a charge calculation result from
 * explicit billable-event + server pricing snapshots only. This is NOT payment
 * processing, PSP integration, accounting persistence, statements, tax
 * computation, balance-store updates, spend mutation, or production charging.
 *
 * Never mutates balances, posts journals, randomizes, or consults wall-clock /
 * network / database / AI / ML / product modules.
 *
 * Monetary values (unitPriceMinor, currency, quantity) are never taken from
 * client billable event payloads — only from the server-authoritative pricing
 * snapshot.
 *
 * Rejected paths always set chargeResult to null and never expose a positive
 * calculated charge, even diagnostically.
 *
 * productionEnabled, deliveryEnabled, and executionEnabled are always false.
 */

export const ADS_BILLING_CONTRACT_VERSION = "v1" as const;

/** Only trusted events may become billing-eligible in V1. */
export const ADS_BILLING_BILLABLE_TRUST_LEVEL = "trusted" as const;

/**
 * Hard-gate billing rejection reasons.
 * Order is the exact first-match evaluation order in resolveRejectionReason.
 * Do not reorder without updating that function and its tests.
 */
export const ADS_BILLING_REJECTION_REASONS = [
  "trust_not_billable",
  "pricing_model_mismatch",
  "charge_amount_zero",
] as const;

export type AdsBillingRejectionReason =
  (typeof ADS_BILLING_REJECTION_REASONS)[number];

/**
 * Top-level keys allowed on AdsBillingPricingSnapshot.
 * Unknown fields fail closed.
 */
export const ADS_BILLING_PRICING_SNAPSHOT_ALLOWED_FIELDS = [
  "pricingModel",
  "unitPriceMinor",
  "currency",
  "quantity",
] as const;

/**
 * Top-level keys allowed on AdsBillingInput.
 * Unknown fields fail closed — including billingEligible / chargeResult.
 */
export const ADS_BILLING_INPUT_ALLOWED_FIELDS = [
  "billableEvent",
  "pricing",
] as const;

/**
 * Top-level keys allowed on AdsBillingDiagnostics.
 * Unknown fields fail closed.
 */
export const ADS_BILLING_DIAGNOSTICS_ALLOWED_FIELDS = [
  "eventType",
  "trustLevel",
  "trustBillable",
  "pricingModel",
  "expectedPricingModel",
  "pricingModelMatched",
  "unitPriceMinor",
  "currency",
  "quantity",
  "chargeMinor",
  "chargeCalculated",
] as const;

/**
 * Top-level keys allowed on AdsBillingMetadata.
 * Unknown fields fail closed.
 */
export const ADS_BILLING_METADATA_ALLOWED_FIELDS = [
  "contractVersion",
  "chargingContractVersion",
  "billableTrustLevel",
  "supportedPricingModels",
  "supportedCurrencies",
  "maxChargeMinor",
  "maxQuantity",
] as const;

/**
 * Top-level keys allowed on AdsBillingEvaluationResult.
 * Unknown fields fail closed.
 */
export const ADS_BILLING_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "eventId",
  "candidateId",
  "campaignId",
  "eventType",
  "billingEligible",
  "rejectionReason",
  "chargeResult",
  "diagnostics",
  "metadata",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

/**
 * Server-authoritative pricing snapshot for one charge evaluation.
 * Never accept client-authoritative monetary / currency / quantity values on
 * the billable event.
 */
export type AdsBillingPricingSnapshot = Readonly<{
  pricingModel: AdsChargingPricingModel;
  /** Finite safe integer in (0, ADS_CHARGING_MAX_MINOR]. */
  unitPriceMinor: number;
  currency: AdsChargingCurrency;
  /**
   * Non-negative safe integer in [0, ADS_CHARGING_MAX_QUANTITY].
   * 0 is valid and yields charge_amount_zero after calculation.
   */
  quantity: number;
}>;

export type AdsBillingInput = Readonly<{
  billableEvent: AdsBillableEvent;
  pricing: AdsBillingPricingSnapshot;
}>;

export type AdsBillingDiagnostics = Readonly<{
  eventType: AdsChargeableEventType;
  trustLevel: AdsBillingEventTrustLevel;
  trustBillable: boolean;
  pricingModel: AdsChargingPricingModel;
  expectedPricingModel: AdsChargingPricingModel;
  pricingModelMatched: boolean;
  unitPriceMinor: number;
  currency: AdsChargingCurrency;
  quantity: number;
  /** Null when charge was not calculated or path rejected before calc. */
  chargeMinor: number | null;
  chargeCalculated: boolean;
}>;

export type AdsBillingMetadata = Readonly<{
  contractVersion: typeof ADS_BILLING_CONTRACT_VERSION;
  chargingContractVersion: typeof ADS_CHARGING_CONTRACT_VERSION;
  billableTrustLevel: typeof ADS_BILLING_BILLABLE_TRUST_LEVEL;
  supportedPricingModels: typeof ADS_CHARGING_PRICING_MODELS;
  supportedCurrencies: typeof ADS_CHARGING_SUPPORTED_CURRENCIES;
  maxChargeMinor: typeof ADS_CHARGING_MAX_MINOR;
  maxQuantity: typeof ADS_CHARGING_MAX_QUANTITY;
}>;

/**
 * Canonical Billing Evaluation Result V1.
 * Immutable; never enables production / delivery / execution.
 * Never posts money, mutates balance stores, or writes accounting rows.
 *
 * On any rejection, chargeResult is always null.
 */
export type AdsBillingEvaluationResult = Readonly<{
  contractVersion: typeof ADS_BILLING_CONTRACT_VERSION;
  eventId: string;
  candidateId: string;
  campaignId: string;
  eventType: AdsChargeableEventType;
  billingEligible: boolean;
  rejectionReason: AdsBillingRejectionReason | null;
  chargeResult: AdsChargeCalculationResult | null;
  diagnostics: AdsBillingDiagnostics;
  metadata: AdsBillingMetadata;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

export type AdsBillingEvaluationOutcome =
  | Readonly<{ valid: true; result: AdsBillingEvaluationResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsBillingInputParseResult =
  | Readonly<{ valid: true; input: AdsBillingInput }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsBillingPricingSnapshotParseResult =
  | Readonly<{ valid: true; pricing: AdsBillingPricingSnapshot }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const REJECTION_REASON_SET = new Set<string>(ADS_BILLING_REJECTION_REASONS);
const PRICING_MODEL_SET = new Set<string>(ADS_CHARGING_PRICING_MODELS);
const PRICING_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BILLING_PRICING_SNAPSHOT_ALLOWED_FIELDS
);
const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BILLING_INPUT_ALLOWED_FIELDS
);
const DIAGNOSTICS_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BILLING_DIAGNOSTICS_ALLOWED_FIELDS
);
const METADATA_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BILLING_METADATA_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BILLING_RESULT_ALLOWED_FIELDS
);
const CHARGE_RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_CHARGE_CALCULATION_RESULT_ALLOWED_FIELDS
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafePositiveMinor(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0 &&
    value <= ADS_CHARGING_MAX_MINOR
  );
}

function isSafeNonNegativeQuantity(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= ADS_CHARGING_MAX_QUANTITY
  );
}

function isAdsChargingPricingModel(
  value: unknown
): value is AdsChargingPricingModel {
  return typeof value === "string" && PRICING_MODEL_SET.has(value);
}

function isAdsBillingRejectionReason(
  value: unknown
): value is AdsBillingRejectionReason {
  return typeof value === "string" && REJECTION_REASON_SET.has(value);
}

function freezePricing(
  pricing: AdsBillingPricingSnapshot
): AdsBillingPricingSnapshot {
  return Object.freeze({
    pricingModel: pricing.pricingModel,
    unitPriceMinor: pricing.unitPriceMinor,
    currency: pricing.currency,
    quantity: pricing.quantity,
  });
}

function freezeDiagnostics(
  diagnostics: AdsBillingDiagnostics
): AdsBillingDiagnostics {
  return Object.freeze({
    eventType: diagnostics.eventType,
    trustLevel: diagnostics.trustLevel,
    trustBillable: diagnostics.trustBillable,
    pricingModel: diagnostics.pricingModel,
    expectedPricingModel: diagnostics.expectedPricingModel,
    pricingModelMatched: diagnostics.pricingModelMatched,
    unitPriceMinor: diagnostics.unitPriceMinor,
    currency: diagnostics.currency,
    quantity: diagnostics.quantity,
    chargeMinor: diagnostics.chargeMinor,
    chargeCalculated: diagnostics.chargeCalculated,
  });
}

function freezeMetadata(): AdsBillingMetadata {
  return Object.freeze({
    contractVersion: ADS_BILLING_CONTRACT_VERSION,
    chargingContractVersion: ADS_CHARGING_CONTRACT_VERSION,
    billableTrustLevel: ADS_BILLING_BILLABLE_TRUST_LEVEL,
    supportedPricingModels: ADS_CHARGING_PRICING_MODELS,
    supportedCurrencies: ADS_CHARGING_SUPPORTED_CURRENCIES,
    maxChargeMinor: ADS_CHARGING_MAX_MINOR,
    maxQuantity: ADS_CHARGING_MAX_QUANTITY,
  });
}

function freezeChargeResult(
  result: AdsChargeCalculationResult
): AdsChargeCalculationResult {
  return Object.freeze({
    contractVersion: ADS_CHARGING_CONTRACT_VERSION,
    eventType: result.eventType,
    pricingModel: result.pricingModel,
    unitPriceMinor: result.unitPriceMinor,
    currency: result.currency,
    quantity: result.quantity,
    chargeMinor: result.chargeMinor,
    calculationRule: result.calculationRule,
  });
}

function freezeResult(
  result: AdsBillingEvaluationResult
): AdsBillingEvaluationResult {
  return Object.freeze({
    contractVersion: ADS_BILLING_CONTRACT_VERSION,
    eventId: result.eventId,
    candidateId: result.candidateId,
    campaignId: result.campaignId,
    eventType: result.eventType,
    billingEligible: result.billingEligible,
    rejectionReason: result.rejectionReason,
    chargeResult:
      result.chargeResult === null
        ? null
        : freezeChargeResult(result.chargeResult),
    diagnostics: freezeDiagnostics(result.diagnostics),
    metadata: freezeMetadata(),
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

/**
 * Parse and narrow a server-authoritative pricing snapshot.
 */
export function parseAdsBillingPricingSnapshot(
  input: unknown,
  fieldPrefix = "pricing"
): AdsBillingPricingSnapshotParseResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([`${fieldPrefix} must be an object.`]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!PRICING_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`${fieldPrefix} contains unknown field "${key}".`);
    }
  }

  let pricingModel: AdsChargingPricingModel | null = null;
  if (!isAdsChargingPricingModel(input.pricingModel)) {
    issues.push(
      `${fieldPrefix}.pricingModel must be a supported pricing model.`
    );
  } else {
    pricingModel = input.pricingModel;
  }

  if (!isSafePositiveMinor(input.unitPriceMinor)) {
    issues.push(
      `${fieldPrefix}.unitPriceMinor must be a positive safe integer <= ${ADS_CHARGING_MAX_MINOR}.`
    );
  }

  let currency: AdsChargingCurrency | null = null;
  if (!isAdsChargingCurrency(input.currency)) {
    issues.push(
      `${fieldPrefix}.currency must be a canonical uppercase supported currency code.`
    );
  } else {
    currency = input.currency;
  }

  if (!isSafeNonNegativeQuantity(input.quantity)) {
    issues.push(
      `${fieldPrefix}.quantity must be a non-negative safe integer <= ${ADS_CHARGING_MAX_QUANTITY}.`
    );
  }

  if (
    issues.length > 0 ||
    pricingModel === null ||
    currency === null ||
    !isSafePositiveMinor(input.unitPriceMinor) ||
    !isSafeNonNegativeQuantity(input.quantity)
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    pricing: freezePricing({
      pricingModel,
      unitPriceMinor: input.unitPriceMinor,
      currency,
      quantity: input.quantity,
    }),
  };
}

/**
 * Parse and narrow billing evaluation input.
 * Fail-closed — constructs a fresh immutable input on success.
 */
export function parseAdsBillingInput(
  input: unknown,
  fieldPrefix = "input"
): AdsBillingInputParseResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([`${fieldPrefix} must be an object.`]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`${fieldPrefix} contains unknown field "${key}".`);
    }
  }

  const billableParsed = parseAdsBillableEvent(
    input.billableEvent,
    `${fieldPrefix}.billableEvent`
  );
  if (!billableParsed.valid) {
    issues.push(...billableParsed.issues);
  }

  const pricingParsed = parseAdsBillingPricingSnapshot(
    input.pricing,
    `${fieldPrefix}.pricing`
  );
  if (!pricingParsed.valid) {
    issues.push(...pricingParsed.issues);
  }

  if (issues.length > 0 || !billableParsed.valid || !pricingParsed.valid) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    input: Object.freeze({
      billableEvent: billableParsed.event,
      pricing: pricingParsed.pricing,
    }),
  };
}

/**
 * Pure shape validator for billing input.
 */
export function validateAdsBillingInput(
  input: unknown,
  fieldPrefix = "input"
): ContractValidationResult {
  const parsed = parseAdsBillingInput(input, fieldPrefix);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

function resolveRejectionReason(args: {
  trustBillable: boolean;
  pricingModelMatched: boolean;
  chargeMinor: number | null;
}): AdsBillingRejectionReason | null {
  if (!args.trustBillable) {
    return "trust_not_billable";
  }
  if (!args.pricingModelMatched) {
    return "pricing_model_mismatch";
  }
  if (args.chargeMinor === null || args.chargeMinor <= 0) {
    return "charge_amount_zero";
  }
  return null;
}

/**
 * Evaluate billing eligibility from billable event + server pricing.
 * Same input always yields an identical immutable result.
 *
 * Outputs billingEligible, chargeResult, diagnostics, and metadata.
 * Rejected paths always return chargeResult: null (never a positive charge).
 * Never moves money or persists accounting state.
 */
export function evaluateAdsBilling(
  input: unknown
): AdsBillingEvaluationOutcome {
  const parsed = parseAdsBillingInput(input);
  if (!parsed.valid) {
    return { valid: false, issues: parsed.issues };
  }

  const { billableEvent, pricing } = parsed.input;
  const expectedPricingModel = expectedPricingModelForEventType(
    billableEvent.eventType
  );
  const trustBillable =
    billableEvent.trustLevel === ADS_BILLING_BILLABLE_TRUST_LEVEL;
  const pricingModelMatched = pricing.pricingModel === expectedPricingModel;

  let chargeResult: AdsChargeCalculationResult | null = null;
  let chargeMinor: number | null = null;
  let chargeCalculated = false;

  // Calculate only when trust + pricing model already pass.
  // Rejected paths never retain a positive chargeResult.
  if (trustBillable && pricingModelMatched) {
    const chargeOutcome = calculateAdsCharge({
      eventType: billableEvent.eventType,
      pricingModel: pricing.pricingModel,
      unitPriceMinor: pricing.unitPriceMinor,
      currency: pricing.currency,
      quantity: pricing.quantity,
    });
    if (!chargeOutcome.valid) {
      return { valid: false, issues: chargeOutcome.issues };
    }
    chargeCalculated = true;
    chargeMinor = chargeOutcome.result.chargeMinor;
    // Attach chargeResult only when the charge is positive and eligible.
    if (chargeMinor > 0) {
      chargeResult = chargeOutcome.result;
    }
  }

  const rejectionReason = resolveRejectionReason({
    trustBillable,
    pricingModelMatched,
    chargeMinor,
  });
  const billingEligible = rejectionReason === null;

  if (!billingEligible) {
    chargeResult = null;
    // Never expose a positive diagnostic charge on rejected paths.
    if (chargeMinor !== null && chargeMinor > 0) {
      chargeMinor = null;
    }
  }

  return {
    valid: true,
    result: freezeResult({
      contractVersion: ADS_BILLING_CONTRACT_VERSION,
      eventId: billableEvent.eventId,
      candidateId: billableEvent.candidateId,
      campaignId: billableEvent.campaignId,
      eventType: billableEvent.eventType,
      billingEligible,
      rejectionReason,
      chargeResult,
      diagnostics: {
        eventType: billableEvent.eventType,
        trustLevel: billableEvent.trustLevel,
        trustBillable,
        pricingModel: pricing.pricingModel,
        expectedPricingModel,
        pricingModelMatched,
        unitPriceMinor: pricing.unitPriceMinor,
        currency: pricing.currency,
        quantity: pricing.quantity,
        chargeMinor,
        chargeCalculated,
      },
      metadata: freezeMetadata(),
      productionEnabled: false,
      deliveryEnabled: false,
      executionEnabled: false,
    }),
  };
}

/**
 * Pure shape validator for billing evaluation results.
 * Fail-closed — does not re-evaluate.
 */
export function validateAdsBillingEvaluationResult(
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

  if (input.contractVersion !== ADS_BILLING_CONTRACT_VERSION) {
    issues.push(
      `${fieldPrefix}.contractVersion must be "${ADS_BILLING_CONTRACT_VERSION}".`
    );
  }

  for (const idField of ["eventId", "candidateId", "campaignId"] as const) {
    if (!isNonEmptyString(input[idField])) {
      issues.push(
        `${fieldPrefix}.${idField} is required and must be a non-empty string.`
      );
    } else if (input[idField].length > ADS_DELIVERY_MAX_ID_LENGTH) {
      issues.push(
        `${fieldPrefix}.${idField} exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
      );
    }
  }

  if (input.eventType !== "impression" && input.eventType !== "click") {
    issues.push(
      `${fieldPrefix}.eventType must be "impression" or "click".`
    );
  }

  if (typeof input.billingEligible !== "boolean") {
    issues.push(`${fieldPrefix}.billingEligible must be a boolean.`);
  }

  if (
    input.rejectionReason !== null &&
    !isAdsBillingRejectionReason(input.rejectionReason)
  ) {
    issues.push(
      `${fieldPrefix}.rejectionReason is not a valid rejection reason.`
    );
  }

  if (typeof input.billingEligible === "boolean") {
    if (input.billingEligible && input.rejectionReason !== null) {
      issues.push(
        `${fieldPrefix}.rejectionReason must be null when billingEligible is true.`
      );
    }
    if (!input.billingEligible && input.rejectionReason === null) {
      issues.push(
        `${fieldPrefix}.rejectionReason is required when billingEligible is false.`
      );
    }
    if (input.billingEligible && input.chargeResult === null) {
      issues.push(
        `${fieldPrefix}.chargeResult is required when billingEligible is true.`
      );
    }
    if (!input.billingEligible && input.chargeResult !== null) {
      issues.push(
        `${fieldPrefix}.chargeResult must be null when billingEligible is false.`
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

  if (input.chargeResult !== null) {
    if (!isRecord(input.chargeResult)) {
      issues.push(`${fieldPrefix}.chargeResult must be an object or null.`);
    } else {
      for (const key of Object.keys(input.chargeResult)) {
        if (!CHARGE_RESULT_ALLOWED_FIELD_SET.has(key)) {
          issues.push(
            `${fieldPrefix}.chargeResult contains unknown field "${key}".`
          );
        }
      }
      const chargeValidation = validateAdsChargeCalculationResult(
        input.chargeResult,
        `${fieldPrefix}.chargeResult`
      );
      if (!chargeValidation.valid) {
        issues.push(...chargeValidation.issues);
      } else if (
        typeof input.chargeResult.chargeMinor === "number" &&
        input.chargeResult.chargeMinor <= 0
      ) {
        issues.push(
          `${fieldPrefix}.chargeResult.chargeMinor must be positive when present.`
        );
      }
    }
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
      diagnostics.eventType !== "impression" &&
      diagnostics.eventType !== "click"
    ) {
      issues.push(
        `${fieldPrefix}.diagnostics.eventType must be "impression" or "click".`
      );
    }
    if (typeof diagnostics.trustBillable !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.trustBillable must be a boolean.`
      );
    }
    if (!isAdsChargingPricingModel(diagnostics.pricingModel)) {
      issues.push(
        `${fieldPrefix}.diagnostics.pricingModel must be a supported pricing model.`
      );
    }
    if (!isAdsChargingPricingModel(diagnostics.expectedPricingModel)) {
      issues.push(
        `${fieldPrefix}.diagnostics.expectedPricingModel must be a supported pricing model.`
      );
    }
    if (typeof diagnostics.pricingModelMatched !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.pricingModelMatched must be a boolean.`
      );
    }
    if (!isSafePositiveMinor(diagnostics.unitPriceMinor)) {
      issues.push(
        `${fieldPrefix}.diagnostics.unitPriceMinor must be a positive safe integer <= ${ADS_CHARGING_MAX_MINOR}.`
      );
    }
    if (!isAdsChargingCurrency(diagnostics.currency)) {
      issues.push(
        `${fieldPrefix}.diagnostics.currency must be a canonical uppercase supported currency code.`
      );
    }
    if (!isSafeNonNegativeQuantity(diagnostics.quantity)) {
      issues.push(
        `${fieldPrefix}.diagnostics.quantity must be a non-negative safe integer <= ${ADS_CHARGING_MAX_QUANTITY}.`
      );
    }
    if (
      diagnostics.chargeMinor !== null &&
      (typeof diagnostics.chargeMinor !== "number" ||
        !Number.isSafeInteger(diagnostics.chargeMinor) ||
        diagnostics.chargeMinor < 0 ||
        diagnostics.chargeMinor > ADS_CHARGING_MAX_MINOR)
    ) {
      issues.push(
        `${fieldPrefix}.diagnostics.chargeMinor must be null or a non-negative safe integer <= ${ADS_CHARGING_MAX_MINOR}.`
      );
    }
    if (
      input.billingEligible === false &&
      typeof diagnostics.chargeMinor === "number" &&
      diagnostics.chargeMinor > 0
    ) {
      issues.push(
        `${fieldPrefix}.diagnostics.chargeMinor must not be positive when billingEligible is false.`
      );
    }
    if (typeof diagnostics.chargeCalculated !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.chargeCalculated must be a boolean.`
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
    if (input.metadata.contractVersion !== ADS_BILLING_CONTRACT_VERSION) {
      issues.push(
        `${fieldPrefix}.metadata.contractVersion must be "${ADS_BILLING_CONTRACT_VERSION}".`
      );
    }
    if (
      input.metadata.chargingContractVersion !== ADS_CHARGING_CONTRACT_VERSION
    ) {
      issues.push(
        `${fieldPrefix}.metadata.chargingContractVersion must be "${ADS_CHARGING_CONTRACT_VERSION}".`
      );
    }
    if (
      input.metadata.billableTrustLevel !== ADS_BILLING_BILLABLE_TRUST_LEVEL
    ) {
      issues.push(
        `${fieldPrefix}.metadata.billableTrustLevel must be "${ADS_BILLING_BILLABLE_TRUST_LEVEL}".`
      );
    }
    if (input.metadata.maxChargeMinor !== ADS_CHARGING_MAX_MINOR) {
      issues.push(
        `${fieldPrefix}.metadata.maxChargeMinor must be ${ADS_CHARGING_MAX_MINOR}.`
      );
    }
    if (input.metadata.maxQuantity !== ADS_CHARGING_MAX_QUANTITY) {
      issues.push(
        `${fieldPrefix}.metadata.maxQuantity must be ${ADS_CHARGING_MAX_QUANTITY}.`
      );
    }
    if (input.metadata.supportedPricingModels !== ADS_CHARGING_PRICING_MODELS) {
      issues.push(
        `${fieldPrefix}.metadata.supportedPricingModels must match ADS_CHARGING_PRICING_MODELS.`
      );
    }
    if (
      input.metadata.supportedCurrencies !== ADS_CHARGING_SUPPORTED_CURRENCIES
    ) {
      issues.push(
        `${fieldPrefix}.metadata.supportedCurrencies must match ADS_CHARGING_SUPPORTED_CURRENCIES.`
      );
    }
  }

  return issues.length > 0
    ? { valid: false, issues: Object.freeze([...issues]) }
    : { valid: true };
}
