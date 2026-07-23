import type { ContractValidationResult } from "./creativeContracts";
import {
  validateAdsInternalDeliveryPilotResult,
  type AdsInternalDeliveryPilotResult,
} from "./internalDeliveryPilot";

/**
 * Ads Measurement Foundation V1 — internal package preparation only.
 *
 * Accepts ONLY a validated Internal Delivery Pilot Result plus an event type
 * (impression | qualified_view | click). Builds a deterministic internal
 * measurement package.
 *
 * This layer NEVER:
 * - stores or appends events
 * - sends / emits / reports / ingests events
 * - queries a database or imports Supabase
 * - uses the network
 * - enables ADS_DELIVERY_ENABLED, placement flags, or runtime measurement
 * - charges spend, attributes outcomes, tracks purchases, or ranks traffic
 * - imports product surfaces
 *
 * productionEnabled and measurementEnabled are always false.
 * measurementReady means the package was validated and prepared — not that
 * measurement is live.
 */

export const ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION = "v1" as const;

/**
 * Sole supported measurement event types in V1.
 * `qualified_view` is the viewability measurement event (taxonomy-aligned).
 */
export const ADS_MEASUREMENT_FOUNDATION_EVENT_TYPES = [
  "impression",
  "qualified_view",
  "click",
] as const;

export type AdsMeasurementFoundationEventType =
  (typeof ADS_MEASUREMENT_FOUNDATION_EVENT_TYPES)[number];

/**
 * Trust level assigned by this foundation. Always untrusted — no IVT /
 * signature verification runs here.
 */
export const ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL = "untrusted" as const;

export type AdsMeasurementFoundationTrustLevel =
  typeof ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL;

/**
 * Signature placeholder only. No cryptographic signing or verification.
 */
export const ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER =
  "unsigned" as const;

/**
 * Top-level keys allowed on the preparation input.
 * Unknown fields fail closed.
 */
export const ADS_MEASUREMENT_FOUNDATION_INPUT_ALLOWED_FIELDS = [
  "pilotResult",
  "eventType",
  "seenDedupeKeys",
] as const;

/**
 * Top-level keys allowed on AdsMeasurementFoundationPackage.
 * Unknown fields fail closed.
 */
export const ADS_MEASUREMENT_FOUNDATION_PACKAGE_ALLOWED_FIELDS = [
  "contractVersion",
  "measurementReady",
  "eventType",
  "dedupeKey",
  "trustLevel",
  "signaturePlaceholder",
  "productionEnabled",
  "measurementEnabled",
] as const;

/**
 * Canonical internal measurement package V1.
 * Prepared in-memory only — never stored, sent, or reported.
 */
export type AdsMeasurementFoundationPackage = Readonly<{
  contractVersion: typeof ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION;
  /** True when the package was validated and prepared. Not runtime enablement. */
  measurementReady: true;
  eventType: AdsMeasurementFoundationEventType;
  dedupeKey: string;
  trustLevel: AdsMeasurementFoundationTrustLevel;
  signaturePlaceholder: typeof ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER;
  productionEnabled: false;
  measurementEnabled: false;
}>;

/**
 * Preparation input — validated pilot result + event type only.
 * Optional seenDedupeKeys enables fail-closed in-memory duplicate rejection
 * without storage (caller supplies prior keys for the current evaluation).
 */
export type AdsMeasurementFoundationInput = Readonly<{
  pilotResult: AdsInternalDeliveryPilotResult;
  eventType: AdsMeasurementFoundationEventType;
  seenDedupeKeys?: readonly string[];
}>;

export type AdsMeasurementFoundationOutcome =
  | Readonly<{ valid: true; package: AdsMeasurementFoundationPackage }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsMeasurementFoundationOptions = Readonly<{
  /** Injected clock for pilot / descriptor validation. Defaults inside validators. */
  nowMs?: number;
}>;

const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_MEASUREMENT_FOUNDATION_INPUT_ALLOWED_FIELDS
);
const PACKAGE_ALLOWED_FIELD_SET = new Set<string>(
  ADS_MEASUREMENT_FOUNDATION_PACKAGE_ALLOWED_FIELDS
);
const EVENT_TYPE_SET = new Set<string>(ADS_MEASUREMENT_FOUNDATION_EVENT_TYPES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function freezePackage(
  pkg: AdsMeasurementFoundationPackage
): AdsMeasurementFoundationPackage {
  return Object.freeze({
    contractVersion: pkg.contractVersion,
    measurementReady: true as const,
    eventType: pkg.eventType,
    dedupeKey: pkg.dedupeKey,
    trustLevel: ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL,
    signaturePlaceholder: ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER,
    productionEnabled: false as const,
    measurementEnabled: false as const,
  });
}

/**
 * Deterministic dedupe key from event type + candidate + reporting handle.
 * Format is stable for V1 — never includes PII or wall-clock entropy.
 */
export function buildAdsMeasurementDedupeKey(params: {
  eventType: AdsMeasurementFoundationEventType;
  selectedCandidateId: string;
  reportingHandle: string;
}): string {
  return [
    ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
    params.eventType,
    params.selectedCandidateId,
    params.reportingHandle,
  ].join(":");
}

/**
 * Pure shape validator for Measurement Foundation Package V1.
 * Fail-closed — does not store, send, or enable measurement.
 */
export function validateAdsMeasurementFoundationPackage(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Measurement foundation package must be an object.",
      ]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!PACKAGE_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `Measurement foundation package contains unknown field "${key}".`
      );
    }
  }

  if (input.contractVersion !== ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION}".`
    );
  }

  if (input.measurementReady !== true) {
    issues.push("measurementReady must be true.");
  }

  if (
    typeof input.eventType !== "string" ||
    !EVENT_TYPE_SET.has(input.eventType)
  ) {
    issues.push(
      'eventType must be "impression", "qualified_view", or "click".'
    );
  }

  if (!isNonEmptyString(input.dedupeKey)) {
    issues.push("dedupeKey is required and must be a non-empty string.");
  }

  if (input.trustLevel !== ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL) {
    issues.push(
      `trustLevel must be "${ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL}".`
    );
  }

  if (
    input.signaturePlaceholder !==
    ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER
  ) {
    issues.push(
      `signaturePlaceholder must be "${ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER}".`
    );
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  if (input.measurementEnabled !== false) {
    issues.push("measurementEnabled must be false.");
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Validates and prepares an internal measurement package from a pilot result.
 * Fail-closed on malformed / inconsistent / duplicate inputs.
 * Never stores, sends, measures at runtime, or touches network/DB/storage.
 */
export function prepareAdsMeasurementFoundation(
  input: unknown,
  options: AdsMeasurementFoundationOptions = {}
): AdsMeasurementFoundationOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Measurement foundation input must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `Measurement foundation input contains unknown field "${key}".`
      );
    }
  }
  if (!("pilotResult" in input)) {
    issues.push("Measurement foundation input must include pilotResult.");
  }
  if (!("eventType" in input)) {
    issues.push("Measurement foundation input must include eventType.");
  }
  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  if (
    typeof input.eventType !== "string" ||
    !EVENT_TYPE_SET.has(input.eventType)
  ) {
    return {
      valid: false,
      issues: Object.freeze([
        'eventType must be "impression", "qualified_view", or "click".',
      ]),
    };
  }
  const eventType = input.eventType as AdsMeasurementFoundationEventType;

  let seenDedupeKeys: readonly string[] = [];
  if (input.seenDedupeKeys !== undefined) {
    if (
      !Array.isArray(input.seenDedupeKeys) ||
      !input.seenDedupeKeys.every((key) => typeof key === "string")
    ) {
      return {
        valid: false,
        issues: Object.freeze([
          "seenDedupeKeys must be an array of strings when provided.",
        ]),
      };
    }
    const seenSet = new Set<string>();
    for (const key of input.seenDedupeKeys) {
      if (seenSet.has(key)) {
        return {
          valid: false,
          issues: Object.freeze([
            `seenDedupeKeys contains duplicate dedupe key "${key}".`,
          ]),
        };
      }
      seenSet.add(key);
    }
    seenDedupeKeys = input.seenDedupeKeys;
  }

  const pilotValidation = validateAdsInternalDeliveryPilotResult(
    input.pilotResult,
    options.nowMs !== undefined ? { nowMs: options.nowMs } : {}
  );
  if (!pilotValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...pilotValidation.issues.map(
          (issue) => `Invalid pilot result: ${issue}`
        ),
      ]),
    };
  }

  const pilotResult = input.pilotResult as AdsInternalDeliveryPilotResult;

  // served=false is a hard invariant — any mismatch fails closed.
  if (pilotResult.served !== false) {
    return {
      valid: false,
      issues: Object.freeze([
        "served must be false (served=false mismatch).",
      ]),
    };
  }

  if (pilotResult.productionEnabled !== false) {
    return {
      valid: false,
      issues: Object.freeze(["productionEnabled must be false."]),
    };
  }

  if (pilotResult.deliveryEnabled !== false) {
    return {
      valid: false,
      issues: Object.freeze(["deliveryEnabled must be false."]),
    };
  }

  if (pilotResult.pilotSuccess !== true) {
    return {
      valid: false,
      issues: Object.freeze([
        "pilotSuccess must be true to prepare a measurement package.",
      ]),
    };
  }

  if (
    !isNonEmptyString(pilotResult.selectedCandidateId) ||
    pilotResult.renderDescriptor === null
  ) {
    return {
      valid: false,
      issues: Object.freeze([
        "selectedCandidateId and renderDescriptor are required when pilotSuccess is true.",
      ]),
    };
  }

  const reportingHandles = pilotResult.renderDescriptor.reportingHandles;
  // Viewability (qualified_view) binds to the impression handle — same rendered
  // unit; there is no separate product-facing viewability handle in V1.
  const reportingHandle =
    eventType === "click"
      ? reportingHandles.clickHandle
      : reportingHandles.impressionHandle;
  const reportingHandleField =
    eventType === "click"
      ? "reportingHandles.clickHandle"
      : "reportingHandles.impressionHandle";

  if (!isNonEmptyString(reportingHandle)) {
    return {
      valid: false,
      issues: Object.freeze([
        `${reportingHandleField} is required for ${eventType} events.`,
      ]),
    };
  }

  const dedupeKey = buildAdsMeasurementDedupeKey({
    eventType,
    selectedCandidateId: pilotResult.selectedCandidateId,
    reportingHandle,
  });

  if (seenDedupeKeys.includes(dedupeKey)) {
    return {
      valid: false,
      issues: Object.freeze([
        `duplicate dedupe key "${dedupeKey}".`,
      ]),
    };
  }

  const pkg = freezePackage({
    contractVersion: ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
    measurementReady: true,
    eventType,
    dedupeKey,
    trustLevel: ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL,
    signaturePlaceholder: ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER,
    productionEnabled: false,
    measurementEnabled: false,
  });

  const packageValidation = validateAdsMeasurementFoundationPackage(pkg);
  if (!packageValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...packageValidation.issues]),
    };
  }

  return { valid: true, package: pkg };
}
