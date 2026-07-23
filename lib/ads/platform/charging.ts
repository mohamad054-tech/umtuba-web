import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";

/**
 * Ads Charging Foundation V1 — pure, deterministic, fail-closed.
 *
 * Defines chargeable-event contracts and charge calculation only. This is NOT
 * payment processing, accounting persistence, balance mutation, tax computation,
 * or production charging. Never mutates spend/balances, randomizes, or consults
 * wall-clock / network / database / AI / ML / product modules.
 *
 * Monetary inputs (unitPriceMinor, currency, quantity) are server-authoritative
 * only. Client-supplied charge / bid / spend / currency / quantity amounts are
 * rejected via allowlists on billable events.
 *
 * Quantity V1 rule: non-negative safe integer including 0.
 * quantity === 0 is a valid contract input and yields chargeMinor === 0
 * (billing then fail-closes as charge_amount_zero).
 *
 * CPM floor-to-zero: when floor(unitPriceMinor * quantity / 1000) === 0
 * (e.g. unitPriceMinor < 1000 with quantity === 1), the zero charge is
 * intentional fail-closed behavior — not silent undercharge to production.
 *
 * productionEnabled, deliveryEnabled, and executionEnabled are always false
 * on related billing outputs (see billing.ts).
 */

export const ADS_CHARGING_CONTRACT_VERSION = "v1" as const;

/** Soft upper bound for pricing / charge amounts (minor units). */
export const ADS_CHARGING_MAX_MINOR = 1_000_000_000_000;

/** Soft upper bound for event quantity / count. */
export const ADS_CHARGING_MAX_QUANTITY = 1_000_000_000;

/**
 * V1 supported currencies — canonical uppercase ISO-4217-style codes only.
 * No implicit conversion between currencies.
 */
export const ADS_CHARGING_SUPPORTED_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "ZAR",
  "NGN",
  "KES",
  "GHS",
] as const;

export type AdsChargingCurrency =
  (typeof ADS_CHARGING_SUPPORTED_CURRENCIES)[number];

/**
 * Sole chargeable event types in V1.
 * Conversion / view / custom events are intentionally out of scope.
 */
export const ADS_CHARGEABLE_EVENT_TYPES = ["impression", "click"] as const;

export type AdsChargeableEventType =
  (typeof ADS_CHARGEABLE_EVENT_TYPES)[number];

/**
 * Sole pricing models in V1.
 * CPM maps to impression; CPC maps to click.
 */
export const ADS_CHARGING_PRICING_MODELS = ["cpm", "cpc"] as const;

export type AdsChargingPricingModel =
  (typeof ADS_CHARGING_PRICING_MODELS)[number];

/**
 * Deterministic calculation rules (documentation + result identity).
 * Do not rename without a contract version bump.
 */
export const ADS_CHARGING_CALCULATION_RULES = [
  "cpm_quantity_floor_v1",
  "cpc_quantity_v1",
] as const;

export type AdsChargingCalculationRule =
  (typeof ADS_CHARGING_CALCULATION_RULES)[number];

/**
 * Top-level keys allowed on AdsBillableImpression.
 * Unknown fields fail closed — including monetary / currency / quantity.
 */
export const ADS_BILLABLE_IMPRESSION_ALLOWED_FIELDS = [
  "eventId",
  "candidateId",
  "campaignId",
  "eventType",
  "trustLevel",
] as const;

/**
 * Top-level keys allowed on AdsBillableClick.
 * Unknown fields fail closed — including monetary / currency / quantity.
 */
export const ADS_BILLABLE_CLICK_ALLOWED_FIELDS = [
  "eventId",
  "candidateId",
  "campaignId",
  "eventType",
  "trustLevel",
] as const;

/**
 * Top-level keys allowed on AdsChargeCalculationInput.
 * Unknown fields fail closed.
 */
export const ADS_CHARGE_CALCULATION_INPUT_ALLOWED_FIELDS = [
  "eventType",
  "pricingModel",
  "unitPriceMinor",
  "currency",
  "quantity",
] as const;

/**
 * Top-level keys allowed on AdsChargeCalculationResult.
 * Unknown fields fail closed.
 */
export const ADS_CHARGE_CALCULATION_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "eventType",
  "pricingModel",
  "unitPriceMinor",
  "currency",
  "quantity",
  "chargeMinor",
  "calculationRule",
] as const;

/**
 * Trust levels accepted on billable event contracts.
 * Only `trusted` can become billing-eligible (see billing.ts).
 */
export const ADS_BILLING_EVENT_TRUST_LEVELS = [
  "trusted",
  "unverified",
  "suspicious",
  "rejected",
  "untrusted",
  "provisional",
] as const;

export type AdsBillingEventTrustLevel =
  (typeof ADS_BILLING_EVENT_TRUST_LEVELS)[number];

/**
 * Billable impression identity contract.
 * No monetary / currency / quantity fields — never client-authoritative.
 */
export type AdsBillableImpression = Readonly<{
  eventId: string;
  candidateId: string;
  campaignId: string;
  eventType: "impression";
  trustLevel: AdsBillingEventTrustLevel;
}>;

/**
 * Billable click identity contract.
 * No monetary / currency / quantity fields — never client-authoritative.
 */
export type AdsBillableClick = Readonly<{
  eventId: string;
  candidateId: string;
  campaignId: string;
  eventType: "click";
  trustLevel: AdsBillingEventTrustLevel;
}>;

export type AdsBillableEvent = AdsBillableImpression | AdsBillableClick;

/**
 * Server-authoritative charge calculation input.
 * unitPriceMinor, currency, and quantity are never taken from the client
 * billable event payload.
 */
export type AdsChargeCalculationInput = Readonly<{
  eventType: AdsChargeableEventType;
  pricingModel: AdsChargingPricingModel;
  /** Finite safe integer in (0, ADS_CHARGING_MAX_MINOR]. */
  unitPriceMinor: number;
  /** Canonical uppercase currency from ADS_CHARGING_SUPPORTED_CURRENCIES. */
  currency: AdsChargingCurrency;
  /**
   * Non-negative safe integer in [0, ADS_CHARGING_MAX_QUANTITY].
   * 0 is valid and yields chargeMinor 0.
   */
  quantity: number;
}>;

/**
 * Immutable charge calculation result (planning / diagnostics only).
 * Does not post, settle, or mutate balances.
 * `currency` is preserved unchanged from the authoritative input.
 */
export type AdsChargeCalculationResult = Readonly<{
  contractVersion: typeof ADS_CHARGING_CONTRACT_VERSION;
  eventType: AdsChargeableEventType;
  pricingModel: AdsChargingPricingModel;
  unitPriceMinor: number;
  currency: AdsChargingCurrency;
  quantity: number;
  /** Finite safe integer in [0, ADS_CHARGING_MAX_MINOR]. */
  chargeMinor: number;
  calculationRule: AdsChargingCalculationRule;
}>;

export type AdsChargeCalculationOutcome =
  | Readonly<{ valid: true; result: AdsChargeCalculationResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsChargeCalculationInputParseResult =
  | Readonly<{ valid: true; input: AdsChargeCalculationInput }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsBillableEventParseResult =
  | Readonly<{ valid: true; event: AdsBillableEvent }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const CHARGEABLE_EVENT_TYPE_SET = new Set<string>(ADS_CHARGEABLE_EVENT_TYPES);
const PRICING_MODEL_SET = new Set<string>(ADS_CHARGING_PRICING_MODELS);
const CALCULATION_RULE_SET = new Set<string>(ADS_CHARGING_CALCULATION_RULES);
const TRUST_LEVEL_SET = new Set<string>(ADS_BILLING_EVENT_TRUST_LEVELS);
const CURRENCY_SET = new Set<string>(ADS_CHARGING_SUPPORTED_CURRENCIES);
const IMPRESSION_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BILLABLE_IMPRESSION_ALLOWED_FIELDS
);
const CLICK_ALLOWED_FIELD_SET = new Set<string>(
  ADS_BILLABLE_CLICK_ALLOWED_FIELDS
);
const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_CHARGE_CALCULATION_INPUT_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_CHARGE_CALCULATION_RESULT_ALLOWED_FIELDS
);

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

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

function isSafeNonNegativeMinor(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    value <= ADS_CHARGING_MAX_MINOR
  );
}

function isAdsChargeableEventType(
  value: unknown
): value is AdsChargeableEventType {
  return typeof value === "string" && CHARGEABLE_EVENT_TYPE_SET.has(value);
}

function isAdsChargingPricingModel(
  value: unknown
): value is AdsChargingPricingModel {
  return typeof value === "string" && PRICING_MODEL_SET.has(value);
}

function isAdsChargingCalculationRule(
  value: unknown
): value is AdsChargingCalculationRule {
  return typeof value === "string" && CALCULATION_RULE_SET.has(value);
}

function isAdsBillingEventTrustLevel(
  value: unknown
): value is AdsBillingEventTrustLevel {
  return typeof value === "string" && TRUST_LEVEL_SET.has(value);
}

/**
 * Canonical currency: exact uppercase allowlist match only.
 * Lowercase / mixed-case / empty / unknown fail closed.
 */
export function isAdsChargingCurrency(
  value: unknown
): value is AdsChargingCurrency {
  return typeof value === "string" && CURRENCY_SET.has(value);
}

function parseRequiredId(
  value: unknown,
  fieldPath: string,
  issues: string[]
): string | null {
  if (!isNonEmptyString(value)) {
    issues.push(`${fieldPath} is required and must be a non-empty string.`);
    return null;
  }
  if (value.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldPath} exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
    return null;
  }
  return value;
}

function freezeBillableImpression(
  event: AdsBillableImpression
): AdsBillableImpression {
  return Object.freeze({
    eventId: event.eventId,
    candidateId: event.candidateId,
    campaignId: event.campaignId,
    eventType: "impression" as const,
    trustLevel: event.trustLevel,
  });
}

function freezeBillableClick(event: AdsBillableClick): AdsBillableClick {
  return Object.freeze({
    eventId: event.eventId,
    candidateId: event.candidateId,
    campaignId: event.campaignId,
    eventType: "click" as const,
    trustLevel: event.trustLevel,
  });
}

function freezeChargeInput(
  input: AdsChargeCalculationInput
): AdsChargeCalculationInput {
  return Object.freeze({
    eventType: input.eventType,
    pricingModel: input.pricingModel,
    unitPriceMinor: input.unitPriceMinor,
    currency: input.currency,
    quantity: input.quantity,
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

/**
 * Expected pricing model for a chargeable event type.
 * Deterministic — impression↔cpm, click↔cpc.
 */
export function expectedPricingModelForEventType(
  eventType: AdsChargeableEventType
): AdsChargingPricingModel {
  return eventType === "impression" ? "cpm" : "cpc";
}

/**
 * Overflow-safe product of two non-negative safe integers.
 * Rejects when product exceeds Number.MAX_SAFE_INTEGER.
 */
export function safeMultiplyMinor(
  left: number,
  right: number
): Readonly<{ ok: true; product: number } | { ok: false; reason: string }> {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right)) {
    return { ok: false, reason: "operands must be safe integers." };
  }
  if (left < 0 || right < 0) {
    return { ok: false, reason: "operands must be non-negative." };
  }
  const product = BigInt(left) * BigInt(right);
  if (product > MAX_SAFE) {
    return {
      ok: false,
      reason: "multiplication exceeds Number.MAX_SAFE_INTEGER.",
    };
  }
  return { ok: true, product: Number(product) };
}

/**
 * Pure CPM/CPC charge math with quantity.
 *
 * CPM: floor(unitPriceMinor * quantity / 1000)
 * CPC: unitPriceMinor * quantity
 *
 * Rejects unsafe integer overflow instead of wrapping or rounding.
 */
export function computeChargeMinor(
  pricingModel: AdsChargingPricingModel,
  unitPriceMinor: number,
  quantity: number
): Readonly<
  | {
      ok: true;
      chargeMinor: number;
      calculationRule: AdsChargingCalculationRule;
    }
  | { ok: false; reason: string }
> {
  const product = safeMultiplyMinor(unitPriceMinor, quantity);
  if (!product.ok) {
    return { ok: false, reason: product.reason };
  }

  if (pricingModel === "cpm") {
    const chargeMinor = Math.floor(product.product / 1000);
    if (!Number.isSafeInteger(chargeMinor) || chargeMinor < 0) {
      return { ok: false, reason: "CPM charge is not a safe non-negative integer." };
    }
    if (chargeMinor > ADS_CHARGING_MAX_MINOR) {
      return { ok: false, reason: "CPM charge exceeds max minor units." };
    }
    return {
      ok: true,
      chargeMinor,
      calculationRule: "cpm_quantity_floor_v1",
    };
  }

  if (product.product > ADS_CHARGING_MAX_MINOR) {
    return { ok: false, reason: "CPC charge exceeds max minor units." };
  }
  return {
    ok: true,
    chargeMinor: product.product,
    calculationRule: "cpc_quantity_v1",
  };
}

/**
 * Parse and narrow a billable impression or click event.
 * Fail-closed — rejects monetary / currency / quantity / unknown fields.
 */
export function parseAdsBillableEvent(
  input: unknown,
  fieldPrefix = "billableEvent"
): AdsBillableEventParseResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([`${fieldPrefix} must be an object.`]),
    };
  }

  const issues: string[] = [];
  const eventType = input.eventType;

  if (eventType !== "impression" && eventType !== "click") {
    issues.push(
      `${fieldPrefix}.eventType must be "impression" or "click".`
    );
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  const allowed =
    eventType === "impression"
      ? IMPRESSION_ALLOWED_FIELD_SET
      : CLICK_ALLOWED_FIELD_SET;

  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      issues.push(`${fieldPrefix} contains unknown field "${key}".`);
    }
  }

  const eventId = parseRequiredId(input.eventId, `${fieldPrefix}.eventId`, issues);
  const candidateId = parseRequiredId(
    input.candidateId,
    `${fieldPrefix}.candidateId`,
    issues
  );
  const campaignId = parseRequiredId(
    input.campaignId,
    `${fieldPrefix}.campaignId`,
    issues
  );

  let trustLevel: AdsBillingEventTrustLevel | null = null;
  if (!isAdsBillingEventTrustLevel(input.trustLevel)) {
    issues.push(`${fieldPrefix}.trustLevel is not a valid trust level.`);
  } else {
    trustLevel = input.trustLevel;
  }

  if (
    issues.length > 0 ||
    eventId === null ||
    candidateId === null ||
    campaignId === null ||
    trustLevel === null
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  if (eventType === "impression") {
    return {
      valid: true,
      event: freezeBillableImpression({
        eventId,
        candidateId,
        campaignId,
        eventType: "impression",
        trustLevel,
      }),
    };
  }

  return {
    valid: true,
    event: freezeBillableClick({
      eventId,
      candidateId,
      campaignId,
      eventType: "click",
      trustLevel,
    }),
  };
}

/**
 * Pure shape validator for billable events.
 * Fail-closed — does not evaluate billing eligibility.
 */
export function validateAdsBillableEvent(
  input: unknown,
  fieldPrefix = "billableEvent"
): ContractValidationResult {
  const parsed = parseAdsBillableEvent(input, fieldPrefix);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

/**
 * Parse and narrow charge calculation input.
 * Fail-closed — constructs a fresh immutable input on success.
 */
export function parseAdsChargeCalculationInput(
  input: unknown,
  fieldPrefix = "chargeInput"
): AdsChargeCalculationInputParseResult {
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

  let eventType: AdsChargeableEventType | null = null;
  if (!isAdsChargeableEventType(input.eventType)) {
    issues.push(
      `${fieldPrefix}.eventType must be a supported chargeable event type.`
    );
  } else {
    eventType = input.eventType;
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
    eventType !== null &&
    pricingModel !== null &&
    pricingModel !== expectedPricingModelForEventType(eventType)
  ) {
    issues.push(
      `${fieldPrefix}.pricingModel must be "${expectedPricingModelForEventType(eventType)}" for eventType "${eventType}".`
    );
  }

  if (
    issues.length > 0 ||
    eventType === null ||
    pricingModel === null ||
    currency === null ||
    !isSafePositiveMinor(input.unitPriceMinor) ||
    !isSafeNonNegativeQuantity(input.quantity)
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    input: freezeChargeInput({
      eventType,
      pricingModel,
      unitPriceMinor: input.unitPriceMinor,
      currency,
      quantity: input.quantity,
    }),
  };
}

/**
 * Pure shape validator for charge calculation input.
 */
export function validateAdsChargeCalculationInput(
  input: unknown,
  fieldPrefix = "chargeInput"
): ContractValidationResult {
  const parsed = parseAdsChargeCalculationInput(input, fieldPrefix);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

/**
 * Calculate an immutable charge result from server-authoritative pricing.
 * Same input always yields an identical result. Never posts or mutates money.
 */
export function calculateAdsCharge(
  input: unknown
): AdsChargeCalculationOutcome {
  const parsed = parseAdsChargeCalculationInput(input);
  if (!parsed.valid) {
    return { valid: false, issues: parsed.issues };
  }

  const { eventType, pricingModel, unitPriceMinor, currency, quantity } =
    parsed.input;
  const computed = computeChargeMinor(pricingModel, unitPriceMinor, quantity);
  if (!computed.ok) {
    return {
      valid: false,
      issues: Object.freeze([`charge calculation failed: ${computed.reason}`]),
    };
  }

  if (!isSafeNonNegativeMinor(computed.chargeMinor)) {
    return {
      valid: false,
      issues: Object.freeze([
        "chargeMinor must be a non-negative safe integer within max minor units.",
      ]),
    };
  }

  return {
    valid: true,
    result: freezeChargeResult({
      contractVersion: ADS_CHARGING_CONTRACT_VERSION,
      eventType,
      pricingModel,
      unitPriceMinor,
      currency,
      quantity,
      chargeMinor: computed.chargeMinor,
      calculationRule: computed.calculationRule,
    }),
  };
}

/**
 * Pure shape validator for charge calculation results.
 * Fail-closed — does not re-calculate.
 */
export function validateAdsChargeCalculationResult(
  input: unknown,
  fieldPrefix = "chargeResult"
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

  if (input.contractVersion !== ADS_CHARGING_CONTRACT_VERSION) {
    issues.push(
      `${fieldPrefix}.contractVersion must be "${ADS_CHARGING_CONTRACT_VERSION}".`
    );
  }

  if (!isAdsChargeableEventType(input.eventType)) {
    issues.push(
      `${fieldPrefix}.eventType must be a supported chargeable event type.`
    );
  }

  if (!isAdsChargingPricingModel(input.pricingModel)) {
    issues.push(
      `${fieldPrefix}.pricingModel must be a supported pricing model.`
    );
  }

  if (!isSafePositiveMinor(input.unitPriceMinor)) {
    issues.push(
      `${fieldPrefix}.unitPriceMinor must be a positive safe integer <= ${ADS_CHARGING_MAX_MINOR}.`
    );
  }

  if (!isAdsChargingCurrency(input.currency)) {
    issues.push(
      `${fieldPrefix}.currency must be a canonical uppercase supported currency code.`
    );
  }

  if (!isSafeNonNegativeQuantity(input.quantity)) {
    issues.push(
      `${fieldPrefix}.quantity must be a non-negative safe integer <= ${ADS_CHARGING_MAX_QUANTITY}.`
    );
  }

  if (!isSafeNonNegativeMinor(input.chargeMinor)) {
    issues.push(
      `${fieldPrefix}.chargeMinor must be a non-negative safe integer <= ${ADS_CHARGING_MAX_MINOR}.`
    );
  }

  if (!isAdsChargingCalculationRule(input.calculationRule)) {
    issues.push(
      `${fieldPrefix}.calculationRule is not a valid calculation rule.`
    );
  }

  if (
    isAdsChargeableEventType(input.eventType) &&
    isAdsChargingPricingModel(input.pricingModel) &&
    input.pricingModel !== expectedPricingModelForEventType(input.eventType)
  ) {
    issues.push(`${fieldPrefix}.pricingModel must match eventType.`);
  }

  if (
    isAdsChargingPricingModel(input.pricingModel) &&
    isSafePositiveMinor(input.unitPriceMinor) &&
    isSafeNonNegativeQuantity(input.quantity) &&
    isSafeNonNegativeMinor(input.chargeMinor) &&
    isAdsChargingCalculationRule(input.calculationRule)
  ) {
    const expected = computeChargeMinor(
      input.pricingModel,
      input.unitPriceMinor,
      input.quantity
    );
    if (!expected.ok) {
      issues.push(
        `${fieldPrefix}.chargeMinor cannot be validated: ${expected.reason}`
      );
    } else {
      if (input.chargeMinor !== expected.chargeMinor) {
        issues.push(
          `${fieldPrefix}.chargeMinor does not match deterministic calculation.`
        );
      }
      if (input.calculationRule !== expected.calculationRule) {
        issues.push(
          `${fieldPrefix}.calculationRule does not match pricing model.`
        );
      }
    }
  }

  return issues.length > 0
    ? { valid: false, issues: Object.freeze([...issues]) }
    : { valid: true };
}
