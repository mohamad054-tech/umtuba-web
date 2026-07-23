import type { ContractValidationResult } from "./creativeContracts";
import {
  assertProvenanceMatchesDeliveryResult,
  isAdsIssuedProvenanceBinding,
  validateAdsCandidateProvenanceBinding,
  type AdsCandidateProvenanceBinding,
} from "./candidateProvenance";
import {
  validateAdsInternalDeliveryInternalResult,
  type AdsInternalDeliveryInternalResult,
} from "./internalDeliveryPilot";
import {
  validateAdsInternalDeliveryPilotResult,
  type AdsInternalDeliveryPilotResult,
} from "./internalDeliveryPilotFoundation";

/**
 * Ads Measurement Foundation V1 — internal package preparation only.
 *
 * Preferred (canonical) path:
 *   Internal Delivery Pilot V1 (`AdsInternalDeliveryInternalResult`)
 *   + issued provenance
 *   → prepareAdsMeasurementFromDeliveryV1
 *
 * Compatibility path (legacy foundation pilot) is exported only via
 * `adsPlatformCompatibility` — not as a peer of the canonical stack entry
 * and not flat-exported from the platform barrel.
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
 * Top-level keys allowed on the preferred V1 delivery preparation input.
 * Unknown fields fail closed.
 */
export const ADS_MEASUREMENT_DELIVERY_V1_INPUT_ALLOWED_FIELDS = [
  "deliveryResult",
  "eventType",
  "provenance",
  "seenDedupeKeys",
] as const;

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
 * Preferred preparation input — Internal Delivery Pilot V1 result +
 * issued provenance + event type.
 */
export type AdsMeasurementDeliveryV1Input = Readonly<{
  deliveryResult: AdsInternalDeliveryInternalResult;
  eventType: AdsMeasurementFoundationEventType;
  provenance: AdsCandidateProvenanceBinding;
  seenDedupeKeys?: readonly string[];
}>;

/**
 * Compatibility preparation input — legacy foundation pilot result + event type.
 * Prefer AdsMeasurementDeliveryV1Input / prepareAdsMeasurementFromDeliveryV1.
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
const DELIVERY_V1_INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_MEASUREMENT_DELIVERY_V1_INPUT_ALLOWED_FIELDS
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
 * Shared package emission from candidate + reporting handle.
 */
function emitMeasurementPackage(params: {
  eventType: AdsMeasurementFoundationEventType;
  selectedCandidateId: string;
  reportingHandle: string;
  seenDedupeKeys: readonly string[];
}): AdsMeasurementFoundationOutcome {
  const dedupeKey = buildAdsMeasurementDedupeKey({
    eventType: params.eventType,
    selectedCandidateId: params.selectedCandidateId,
    reportingHandle: params.reportingHandle,
  });

  if (params.seenDedupeKeys.includes(dedupeKey)) {
    return {
      valid: false,
      issues: Object.freeze([`duplicate dedupe key "${dedupeKey}".`]),
    };
  }

  const pkg = freezePackage({
    contractVersion: ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
    measurementReady: true,
    eventType: params.eventType,
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

function parseSeenDedupeKeys(
  value: unknown
):
  | Readonly<{ valid: true; keys: readonly string[] }>
  | Readonly<{ valid: false; issues: readonly string[] }> {
  if (value === undefined) {
    return { valid: true, keys: Object.freeze([]) };
  }
  if (!Array.isArray(value) || !value.every((key) => typeof key === "string")) {
    return {
      valid: false,
      issues: Object.freeze([
        "seenDedupeKeys must be an array of strings when provided.",
      ]),
    };
  }
  const seenSet = new Set<string>();
  for (const key of value) {
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
  return { valid: true, keys: value };
}

/**
 * Preferred Measurement V1 entry — consumes Internal Delivery Pilot V1 result.
 * Fail-closed. Never stores, sends, or enables measurement.
 */
export function prepareAdsMeasurementFromDeliveryV1(
  input: unknown,
  options: AdsMeasurementFoundationOptions = {}
): AdsMeasurementFoundationOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Measurement delivery V1 input must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!DELIVERY_V1_INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `Measurement delivery V1 input contains unknown field "${key}".`
      );
    }
  }
  if (!("deliveryResult" in input)) {
    issues.push("Measurement delivery V1 input must include deliveryResult.");
  }
  if (!("eventType" in input)) {
    issues.push("Measurement delivery V1 input must include eventType.");
  }
  if (!("provenance" in input)) {
    issues.push("Measurement delivery V1 input must include provenance.");
  }
  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  if (!isAdsIssuedProvenanceBinding(input.provenance)) {
    return {
      valid: false,
      issues: Object.freeze([
        "provenance must be an issued binding from buildAdsCandidateProvenanceBinding (caller reconstruction is not allowed).",
      ]),
    };
  }
  const provenanceCheck = validateAdsCandidateProvenanceBinding(
    input.provenance
  );
  if (!provenanceCheck.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...provenanceCheck.issues.map((issue) => `provenance: ${issue}`),
      ]),
    };
  }
  const provenance = input.provenance;

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

  const seenParsed = parseSeenDedupeKeys(input.seenDedupeKeys);
  if (!seenParsed.valid) {
    return { valid: false, issues: seenParsed.issues };
  }

  // Structural pin: when delivery was accepted, validate descriptor expiry
  // against descriptor.expiresAt so callers can re-check with their clock
  // separately if needed (mirrors pilot soft-reject pattern).
  let structuralNowMs = options.nowMs;
  if (
    isRecord(input.deliveryResult) &&
    input.deliveryResult.deliveryAccepted === true &&
    isRecord(input.deliveryResult.renderDescriptor) &&
    typeof input.deliveryResult.renderDescriptor.expiresAt === "string"
  ) {
    const expiresMs = Date.parse(input.deliveryResult.renderDescriptor.expiresAt);
    if (!Number.isNaN(expiresMs)) {
      structuralNowMs = expiresMs;
    }
  }

  const deliveryValidation = validateAdsInternalDeliveryInternalResult(
    input.deliveryResult,
    structuralNowMs !== undefined ? { nowMs: structuralNowMs } : {}
  );
  if (!deliveryValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...deliveryValidation.issues.map(
          (issue) => `Invalid delivery result: ${issue}`
        ),
      ]),
    };
  }

  const deliveryResult =
    input.deliveryResult as AdsInternalDeliveryInternalResult;

  if (deliveryResult.productionEnabled !== false) {
    return {
      valid: false,
      issues: Object.freeze(["productionEnabled must be false."]),
    };
  }
  if (deliveryResult.deliveryEnabled !== false) {
    return {
      valid: false,
      issues: Object.freeze(["deliveryEnabled must be false."]),
    };
  }
  if (deliveryResult.executionEnabled !== false) {
    return {
      valid: false,
      issues: Object.freeze(["executionEnabled must be false."]),
    };
  }

  if (deliveryResult.deliveryAccepted !== true) {
    return {
      valid: false,
      issues: Object.freeze([
        "deliveryAccepted must be true to prepare a measurement package.",
      ]),
    };
  }

  if (
    !isNonEmptyString(deliveryResult.candidateId) ||
    deliveryResult.renderDescriptor === null
  ) {
    return {
      valid: false,
      issues: Object.freeze([
        "candidateId and renderDescriptor are required when deliveryAccepted is true.",
      ]),
    };
  }

  const provenanceDelivery = assertProvenanceMatchesDeliveryResult(
    provenance,
    deliveryResult
  );
  if (!provenanceDelivery.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...provenanceDelivery.issues.map(
          (issue) => `provenance continuity: ${issue}`
        ),
      ]),
    };
  }

  // Explicit identity continuity: candidate / campaign / ad set / ad /
  // creative / placement / bindingToken (token checked via issued+validate).
  const descriptor = deliveryResult.renderDescriptor;
  if (provenance.bindingToken.trim().length === 0) {
    return {
      valid: false,
      issues: Object.freeze([
        "provenance.bindingToken is required for measurement continuity.",
      ]),
    };
  }
  if (provenance.candidateId !== deliveryResult.candidateId) {
    return {
      valid: false,
      issues: Object.freeze([
        "provenance.candidateId mismatch against deliveryResult.candidateId.",
      ]),
    };
  }
  if (provenance.placementId !== descriptor.placementId) {
    return {
      valid: false,
      issues: Object.freeze([
        "provenance.placementId mismatch against delivery descriptor.",
      ]),
    };
  }
  if (provenance.creativeRef !== descriptor.creativeReference) {
    return {
      valid: false,
      issues: Object.freeze([
        "provenance.creativeRef mismatch against delivery descriptor.",
      ]),
    };
  }
  if (provenance.campaignRef !== descriptor.trackingReferences.campaignId) {
    return {
      valid: false,
      issues: Object.freeze([
        "provenance.campaignRef mismatch against delivery trackingReferences.",
      ]),
    };
  }
  if (provenance.adSetRef !== descriptor.trackingReferences.adSetId) {
    return {
      valid: false,
      issues: Object.freeze([
        "provenance.adSetRef mismatch against delivery trackingReferences.",
      ]),
    };
  }
  if (provenance.adRef !== descriptor.trackingReferences.adId) {
    return {
      valid: false,
      issues: Object.freeze([
        "provenance.adRef mismatch against delivery trackingReferences.",
      ]),
    };
  }
  if (provenance.creativeRef !== descriptor.trackingReferences.creativeId) {
    return {
      valid: false,
      issues: Object.freeze([
        "provenance.creativeRef mismatch against delivery trackingReferences.creativeId.",
      ]),
    };
  }

  const reportingHandles = descriptor.reportingHandles;
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

  return emitMeasurementPackage({
    eventType,
    selectedCandidateId: deliveryResult.candidateId,
    reportingHandle,
    seenDedupeKeys: seenParsed.keys,
  });
}

/**
 * Compatibility path — prepares a package from a legacy foundation pilot result.
 * Quarantined: import only via adsPlatformCompatibility (not the platform barrel).
 * Prefer prepareAdsMeasurementFromDeliveryV1 for the canonical V1 stack.
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

  const seenParsed = parseSeenDedupeKeys(input.seenDedupeKeys);
  if (!seenParsed.valid) {
    return { valid: false, issues: seenParsed.issues };
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

  return emitMeasurementPackage({
    eventType,
    selectedCandidateId: pilotResult.selectedCandidateId,
    reportingHandle,
    seenDedupeKeys: seenParsed.keys,
  });
}
