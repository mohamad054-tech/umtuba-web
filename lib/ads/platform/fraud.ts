import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import {
  ADS_INVALID_TRAFFIC_CLASSIFICATIONS,
  ADS_INVALID_TRAFFIC_CONTRACT_VERSION,
  ADS_INVALID_TRAFFIC_ELIGIBLE_TRUST_LEVEL,
  ADS_INVALID_TRAFFIC_EVENT_TYPES,
  ADS_INVALID_TRAFFIC_REJECTION_REASONS,
  ADS_INVALID_TRAFFIC_SIGNAL_KINDS,
  ADS_INVALID_TRAFFIC_TRUST_LEVELS,
  classifyAdsInvalidTraffic,
  evaluateAdsInvalidTraffic,
  parseAdsInvalidTrafficSnapshot,
  type AdsInvalidTrafficClassification,
  type AdsInvalidTrafficDiagnostics,
  type AdsInvalidTrafficEventType,
  type AdsInvalidTrafficRejectionReason,
  type AdsInvalidTrafficSnapshot,
  type AdsInvalidTrafficTrustLevel,
  validateAdsInvalidTrafficEvaluationResult,
} from "./invalidTraffic";

/**
 * Ads Fraud Foundation V1 — pure, deterministic, fail-closed.
 *
 * Evaluates fraud eligibility from an explicit invalid-traffic signal snapshot
 * only. This is NOT AI fraud detection, live bot detection, IP reputation,
 * device/browser fingerprinting, rate limiting, storage, persistence, or
 * production enforcement / blocking.
 *
 * Outputs are immutable diagnostics for foundation readiness. Never mutates
 * billing, auction, delivery, or product state. Never consults wall-clock /
 * network / database / Redis / AI / ML / product modules.
 *
 * productionEnabled, deliveryEnabled, and executionEnabled are always false.
 */

export const ADS_FRAUD_CONTRACT_VERSION = "v1" as const;

/** Only trusted traffic may be fraud-eligible in V1. */
export const ADS_FRAUD_ELIGIBLE_TRUST_LEVEL =
  ADS_INVALID_TRAFFIC_ELIGIBLE_TRUST_LEVEL;

/** Fraud trust levels — shared with Invalid Traffic Foundation V1. */
export const ADS_FRAUD_TRUST_LEVELS = ADS_INVALID_TRAFFIC_TRUST_LEVELS;

export type AdsFraudTrustLevel = AdsInvalidTrafficTrustLevel;

/** Fraud event types — shared with Invalid Traffic Foundation V1. */
export const ADS_FRAUD_EVENT_TYPES = ADS_INVALID_TRAFFIC_EVENT_TYPES;

export type AdsFraudEventType = AdsInvalidTrafficEventType;

/**
 * Fraud classifications — shared vocabulary with Invalid Traffic Foundation V1.
 */
export const ADS_FRAUD_CLASSIFICATIONS = ADS_INVALID_TRAFFIC_CLASSIFICATIONS;

export type AdsFraudClassification = AdsInvalidTrafficClassification;

/**
 * Hard-gate fraud rejection reasons.
 * Order is the exact first-match evaluation order (delegates to IVT resolve).
 * Do not reorder without updating invalidTraffic.ts and tests.
 */
export const ADS_FRAUD_REJECTION_REASONS = ADS_INVALID_TRAFFIC_REJECTION_REASONS;

export type AdsFraudRejectionReason = AdsInvalidTrafficRejectionReason;

/**
 * Top-level keys allowed on AdsFraudEvaluationInput.
 * Unknown fields fail closed — including fraudEligible / fraudClassification.
 */
export const ADS_FRAUD_INPUT_ALLOWED_FIELDS = [
  "invalidTrafficSnapshot",
] as const;

/**
 * Top-level keys allowed on AdsFraudDiagnostics.
 * Unknown fields fail closed.
 */
export const ADS_FRAUD_DIAGNOSTICS_ALLOWED_FIELDS = [
  "eventType",
  "trustLevel",
  "trustEligible",
  "reportingHandleValid",
  "duplicateEvent",
  "impossibleSequence",
  "suspiciousImpression",
  "suspiciousClick",
  "activeSignalCount",
  "invalidTrafficEligible",
  "invalidTrafficClassification",
] as const;

/**
 * Top-level keys allowed on AdsFraudMetadata.
 * Unknown fields fail closed.
 */
export const ADS_FRAUD_METADATA_ALLOWED_FIELDS = [
  "contractVersion",
  "invalidTrafficContractVersion",
  "eligibleTrustLevel",
  "supportedTrustLevels",
  "supportedEventTypes",
  "supportedSignalKinds",
  "supportedClassifications",
  "rejectionReasons",
] as const;

/**
 * Top-level keys allowed on AdsFraudEvaluationResult.
 * Unknown fields fail closed.
 */
export const ADS_FRAUD_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "eventId",
  "candidateId",
  "campaignId",
  "eventType",
  "fraudEligible",
  "fraudClassification",
  "rejectionReason",
  "diagnostics",
  "metadata",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

/**
 * Fraud evaluation input — wraps an explicit IVT signal snapshot.
 * No event history, storage, or live-traffic heuristics.
 */
export type AdsFraudEvaluationInput = Readonly<{
  invalidTrafficSnapshot: AdsInvalidTrafficSnapshot;
}>;

export type AdsFraudDiagnostics = Readonly<{
  eventType: AdsFraudEventType;
  trustLevel: AdsFraudTrustLevel;
  trustEligible: boolean;
  reportingHandleValid: boolean;
  duplicateEvent: boolean;
  impossibleSequence: boolean;
  suspiciousImpression: boolean;
  suspiciousClick: boolean;
  activeSignalCount: number;
  invalidTrafficEligible: boolean;
  invalidTrafficClassification: AdsFraudClassification;
}>;

export type AdsFraudMetadata = Readonly<{
  contractVersion: typeof ADS_FRAUD_CONTRACT_VERSION;
  invalidTrafficContractVersion: typeof ADS_INVALID_TRAFFIC_CONTRACT_VERSION;
  eligibleTrustLevel: typeof ADS_FRAUD_ELIGIBLE_TRUST_LEVEL;
  supportedTrustLevels: typeof ADS_FRAUD_TRUST_LEVELS;
  supportedEventTypes: typeof ADS_FRAUD_EVENT_TYPES;
  supportedSignalKinds: typeof ADS_INVALID_TRAFFIC_SIGNAL_KINDS;
  supportedClassifications: typeof ADS_FRAUD_CLASSIFICATIONS;
  rejectionReasons: typeof ADS_FRAUD_REJECTION_REASONS;
}>;

/**
 * Canonical Fraud Evaluation Result V1.
 * Immutable; never enables production / delivery / execution.
 *
 * fraudEligible means the event passes the deterministic fraud / IVT gate
 * (clean + trusted) — not that the event is classified as fraudulent.
 */
export type AdsFraudEvaluationResult = Readonly<{
  contractVersion: typeof ADS_FRAUD_CONTRACT_VERSION;
  eventId: string;
  candidateId: string;
  campaignId: string;
  eventType: AdsFraudEventType;
  fraudEligible: boolean;
  fraudClassification: AdsFraudClassification;
  rejectionReason: AdsFraudRejectionReason | null;
  diagnostics: AdsFraudDiagnostics;
  metadata: AdsFraudMetadata;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

export type AdsFraudEvaluationOutcome =
  | Readonly<{ valid: true; result: AdsFraudEvaluationResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsFraudInputParseResult =
  | Readonly<{ valid: true; input: AdsFraudEvaluationInput }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const INPUT_ALLOWED_FIELD_SET = new Set<string>(ADS_FRAUD_INPUT_ALLOWED_FIELDS);
const DIAGNOSTICS_ALLOWED_FIELD_SET = new Set<string>(
  ADS_FRAUD_DIAGNOSTICS_ALLOWED_FIELDS
);
const METADATA_ALLOWED_FIELD_SET = new Set<string>(
  ADS_FRAUD_METADATA_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(ADS_FRAUD_RESULT_ALLOWED_FIELDS);
const TRUST_LEVEL_SET = new Set<string>(ADS_FRAUD_TRUST_LEVELS);
const EVENT_TYPE_SET = new Set<string>(ADS_FRAUD_EVENT_TYPES);
const CLASSIFICATION_SET = new Set<string>(ADS_FRAUD_CLASSIFICATIONS);
const REJECTION_REASON_SET = new Set<string>(ADS_FRAUD_REJECTION_REASONS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isAdsFraudTrustLevel(value: unknown): value is AdsFraudTrustLevel {
  return typeof value === "string" && TRUST_LEVEL_SET.has(value);
}

function isAdsFraudEventType(value: unknown): value is AdsFraudEventType {
  return typeof value === "string" && EVENT_TYPE_SET.has(value);
}

function isAdsFraudClassification(
  value: unknown
): value is AdsFraudClassification {
  return typeof value === "string" && CLASSIFICATION_SET.has(value);
}

function isAdsFraudRejectionReason(
  value: unknown
): value is AdsFraudRejectionReason {
  return typeof value === "string" && REJECTION_REASON_SET.has(value);
}

function freezeDiagnostics(
  diagnostics: AdsFraudDiagnostics
): AdsFraudDiagnostics {
  return Object.freeze({
    eventType: diagnostics.eventType,
    trustLevel: diagnostics.trustLevel,
    trustEligible: diagnostics.trustEligible,
    reportingHandleValid: diagnostics.reportingHandleValid,
    duplicateEvent: diagnostics.duplicateEvent,
    impossibleSequence: diagnostics.impossibleSequence,
    suspiciousImpression: diagnostics.suspiciousImpression,
    suspiciousClick: diagnostics.suspiciousClick,
    activeSignalCount: diagnostics.activeSignalCount,
    invalidTrafficEligible: diagnostics.invalidTrafficEligible,
    invalidTrafficClassification: diagnostics.invalidTrafficClassification,
  });
}

function freezeMetadata(): AdsFraudMetadata {
  return Object.freeze({
    contractVersion: ADS_FRAUD_CONTRACT_VERSION,
    invalidTrafficContractVersion: ADS_INVALID_TRAFFIC_CONTRACT_VERSION,
    eligibleTrustLevel: ADS_FRAUD_ELIGIBLE_TRUST_LEVEL,
    supportedTrustLevels: ADS_FRAUD_TRUST_LEVELS,
    supportedEventTypes: ADS_FRAUD_EVENT_TYPES,
    supportedSignalKinds: ADS_INVALID_TRAFFIC_SIGNAL_KINDS,
    supportedClassifications: ADS_FRAUD_CLASSIFICATIONS,
    rejectionReasons: ADS_FRAUD_REJECTION_REASONS,
  });
}

function freezeResult(result: AdsFraudEvaluationResult): AdsFraudEvaluationResult {
  return Object.freeze({
    contractVersion: ADS_FRAUD_CONTRACT_VERSION,
    eventId: result.eventId,
    candidateId: result.candidateId,
    campaignId: result.campaignId,
    eventType: result.eventType,
    fraudEligible: result.fraudEligible,
    fraudClassification: result.fraudClassification,
    rejectionReason: result.rejectionReason,
    diagnostics: freezeDiagnostics(result.diagnostics),
    metadata: freezeMetadata(),
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

function buildFraudDiagnostics(
  ivtDiagnostics: AdsInvalidTrafficDiagnostics,
  invalidTrafficEligible: boolean
): AdsFraudDiagnostics {
  return {
    eventType: ivtDiagnostics.eventType,
    trustLevel: ivtDiagnostics.trustLevel,
    trustEligible: ivtDiagnostics.trustEligible,
    reportingHandleValid: ivtDiagnostics.reportingHandleValid,
    duplicateEvent: ivtDiagnostics.duplicateEvent,
    impossibleSequence: ivtDiagnostics.impossibleSequence,
    suspiciousImpression: ivtDiagnostics.suspiciousImpression,
    suspiciousClick: ivtDiagnostics.suspiciousClick,
    activeSignalCount: ivtDiagnostics.activeSignalCount,
    invalidTrafficEligible,
    invalidTrafficClassification: ivtDiagnostics.classification,
  };
}

/**
 * Parse and narrow fraud evaluation input.
 * Fail-closed — constructs a fresh immutable input on success.
 *
 * Accepts either:
 * - `{ invalidTrafficSnapshot: <snapshot> }`
 * - a bare IVT snapshot (convenience; same fields as AdsInvalidTrafficSnapshot)
 */
export function parseAdsFraudEvaluationInput(
  input: unknown,
  fieldPrefix = "input"
): AdsFraudInputParseResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([`${fieldPrefix} must be an object.`]),
    };
  }

  const hasWrapperKey = Object.prototype.hasOwnProperty.call(
    input,
    "invalidTrafficSnapshot"
  );

  if (hasWrapperKey) {
    const issues: string[] = [];
    for (const key of Object.keys(input)) {
      if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
        issues.push(`${fieldPrefix} contains unknown field "${key}".`);
      }
    }

    const snapshotParsed = parseAdsInvalidTrafficSnapshot(
      input.invalidTrafficSnapshot,
      `${fieldPrefix}.invalidTrafficSnapshot`
    );
    if (!snapshotParsed.valid) {
      issues.push(...snapshotParsed.issues);
    }

    if (issues.length > 0 || !snapshotParsed.valid) {
      return { valid: false, issues: Object.freeze([...issues]) };
    }

    return {
      valid: true,
      input: Object.freeze({
        invalidTrafficSnapshot: snapshotParsed.snapshot,
      }),
    };
  }

  // Bare snapshot convenience path — reuse IVT parser field messages.
  const bareParsed = parseAdsInvalidTrafficSnapshot(input, fieldPrefix);
  if (!bareParsed.valid) {
    return { valid: false, issues: bareParsed.issues };
  }

  return {
    valid: true,
    input: Object.freeze({
      invalidTrafficSnapshot: bareParsed.snapshot,
    }),
  };
}

/**
 * Pure shape validator for fraud evaluation input.
 */
export function validateAdsFraudEvaluationInput(
  input: unknown,
  fieldPrefix = "input"
): ContractValidationResult {
  const parsed = parseAdsFraudEvaluationInput(input, fieldPrefix);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

/**
 * Evaluate fraud eligibility from an explicit IVT signal snapshot.
 * Same input always yields an identical immutable result.
 *
 * Outputs fraudEligible, fraudClassification, rejectionReason, diagnostics,
 * and metadata. Never blocks production traffic or mutates billing / auction.
 */
export function evaluateAdsFraud(input: unknown): AdsFraudEvaluationOutcome {
  const parsed = parseAdsFraudEvaluationInput(input);
  if (!parsed.valid) {
    return { valid: false, issues: parsed.issues };
  }

  const ivtOutcome = evaluateAdsInvalidTraffic(
    parsed.input.invalidTrafficSnapshot
  );
  if (!ivtOutcome.valid) {
    return { valid: false, issues: ivtOutcome.issues };
  }

  // Defensive: IVT result shape must remain foundation-valid.
  const ivtValidation = validateAdsInvalidTrafficEvaluationResult(
    ivtOutcome.result
  );
  if (!ivtValidation.valid) {
    return { valid: false, issues: ivtValidation.issues };
  }

  const ivt = ivtOutcome.result;
  const fraudEligible = ivt.invalidTrafficEligible;
  const fraudClassification = ivt.classification;
  const rejectionReason = ivt.rejectionReason;

  return {
    valid: true,
    result: freezeResult({
      contractVersion: ADS_FRAUD_CONTRACT_VERSION,
      eventId: ivt.eventId,
      candidateId: ivt.candidateId,
      campaignId: ivt.campaignId,
      eventType: ivt.eventType,
      fraudEligible,
      fraudClassification,
      rejectionReason,
      diagnostics: buildFraudDiagnostics(ivt.diagnostics, fraudEligible),
      metadata: freezeMetadata(),
      productionEnabled: false,
      deliveryEnabled: false,
      executionEnabled: false,
    }),
  };
}

/**
 * Pure shape validator for fraud evaluation results.
 * Fail-closed — does not re-evaluate.
 */
export function validateAdsFraudEvaluationResult(
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

  if (input.contractVersion !== ADS_FRAUD_CONTRACT_VERSION) {
    issues.push(
      `${fieldPrefix}.contractVersion must be "${ADS_FRAUD_CONTRACT_VERSION}".`
    );
  }

  if (!isNonEmptyString(input.eventId)) {
    issues.push(
      `${fieldPrefix}.eventId is required and must be a non-empty string.`
    );
  } else if (input.eventId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldPrefix}.eventId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
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

  if (!isAdsFraudEventType(input.eventType)) {
    issues.push(`${fieldPrefix}.eventType must be a supported fraud event type.`);
  }

  if (typeof input.fraudEligible !== "boolean") {
    issues.push(`${fieldPrefix}.fraudEligible must be a boolean.`);
  }

  if (!isAdsFraudClassification(input.fraudClassification)) {
    issues.push(
      `${fieldPrefix}.fraudClassification is not a valid fraud classification.`
    );
  }

  if (
    input.rejectionReason !== null &&
    !isAdsFraudRejectionReason(input.rejectionReason)
  ) {
    issues.push(
      `${fieldPrefix}.rejectionReason is not a valid rejection reason.`
    );
  }

  if (typeof input.fraudEligible === "boolean") {
    if (input.fraudEligible) {
      if (input.rejectionReason !== null) {
        issues.push(
          `${fieldPrefix}.rejectionReason must be null when fraudEligible is true.`
        );
      }
      if (input.fraudClassification !== "clean") {
        issues.push(
          `${fieldPrefix}.fraudClassification must be "clean" when fraudEligible is true.`
        );
      }
    } else if (input.rejectionReason === null) {
      issues.push(
        `${fieldPrefix}.rejectionReason is required when fraudEligible is false.`
      );
    }
  }

  // Enforce exact rejectionReason ↔ fraudClassification pairing (canonical map).
  if (
    (input.rejectionReason === null ||
      isAdsFraudRejectionReason(input.rejectionReason)) &&
    isAdsFraudClassification(input.fraudClassification)
  ) {
    const expectedClassification = classifyAdsInvalidTraffic(
      input.rejectionReason === null ? null : input.rejectionReason
    );
    if (input.fraudClassification !== expectedClassification) {
      issues.push(
        `${fieldPrefix}.fraudClassification must be "${expectedClassification}" for rejectionReason ${
          input.rejectionReason === null
            ? "null"
            : `"${input.rejectionReason}"`
        }.`
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
    if (!isAdsFraudEventType(diagnostics.eventType)) {
      issues.push(
        `${fieldPrefix}.diagnostics.eventType must be a supported event type.`
      );
    }
    if (!isAdsFraudTrustLevel(diagnostics.trustLevel)) {
      issues.push(
        `${fieldPrefix}.diagnostics.trustLevel is not a valid trust level.`
      );
    }
    if (typeof diagnostics.trustEligible !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.trustEligible must be a boolean.`
      );
    }
    if (typeof diagnostics.reportingHandleValid !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.reportingHandleValid must be a boolean.`
      );
    }
    if (typeof diagnostics.duplicateEvent !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.duplicateEvent must be a boolean.`
      );
    }
    if (typeof diagnostics.impossibleSequence !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.impossibleSequence must be a boolean.`
      );
    }
    if (typeof diagnostics.suspiciousImpression !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.suspiciousImpression must be a boolean.`
      );
    }
    if (typeof diagnostics.suspiciousClick !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.suspiciousClick must be a boolean.`
      );
    }
    if (
      typeof diagnostics.activeSignalCount !== "number" ||
      !Number.isInteger(diagnostics.activeSignalCount) ||
      diagnostics.activeSignalCount < 0 ||
      diagnostics.activeSignalCount > ADS_INVALID_TRAFFIC_SIGNAL_KINDS.length
    ) {
      issues.push(
        `${fieldPrefix}.diagnostics.activeSignalCount must be an integer in [0, ${ADS_INVALID_TRAFFIC_SIGNAL_KINDS.length}].`
      );
    }
    if (typeof diagnostics.invalidTrafficEligible !== "boolean") {
      issues.push(
        `${fieldPrefix}.diagnostics.invalidTrafficEligible must be a boolean.`
      );
    }
    if (!isAdsFraudClassification(diagnostics.invalidTrafficClassification)) {
      issues.push(
        `${fieldPrefix}.diagnostics.invalidTrafficClassification is not a valid classification.`
      );
    }
  }

  if (!isRecord(input.metadata)) {
    issues.push(`${fieldPrefix}.metadata must be an object.`);
  } else {
    for (const key of Object.keys(input.metadata)) {
      if (!METADATA_ALLOWED_FIELD_SET.has(key)) {
        issues.push(
          `${fieldPrefix}.metadata contains unknown field "${key}".`
        );
      }
    }
    if (input.metadata.contractVersion !== ADS_FRAUD_CONTRACT_VERSION) {
      issues.push(
        `${fieldPrefix}.metadata.contractVersion must be "${ADS_FRAUD_CONTRACT_VERSION}".`
      );
    }
    if (
      input.metadata.invalidTrafficContractVersion !==
      ADS_INVALID_TRAFFIC_CONTRACT_VERSION
    ) {
      issues.push(
        `${fieldPrefix}.metadata.invalidTrafficContractVersion must be "${ADS_INVALID_TRAFFIC_CONTRACT_VERSION}".`
      );
    }
    if (input.metadata.eligibleTrustLevel !== ADS_FRAUD_ELIGIBLE_TRUST_LEVEL) {
      issues.push(
        `${fieldPrefix}.metadata.eligibleTrustLevel must be "${ADS_FRAUD_ELIGIBLE_TRUST_LEVEL}".`
      );
    }
    if (input.metadata.supportedTrustLevels !== ADS_FRAUD_TRUST_LEVELS) {
      issues.push(
        `${fieldPrefix}.metadata.supportedTrustLevels must be the canonical trust-level tuple.`
      );
    }
    if (input.metadata.supportedEventTypes !== ADS_FRAUD_EVENT_TYPES) {
      issues.push(
        `${fieldPrefix}.metadata.supportedEventTypes must be the canonical event-type tuple.`
      );
    }
    if (
      input.metadata.supportedSignalKinds !== ADS_INVALID_TRAFFIC_SIGNAL_KINDS
    ) {
      issues.push(
        `${fieldPrefix}.metadata.supportedSignalKinds must be the canonical signal-kind tuple.`
      );
    }
    if (
      input.metadata.supportedClassifications !== ADS_FRAUD_CLASSIFICATIONS
    ) {
      issues.push(
        `${fieldPrefix}.metadata.supportedClassifications must be the canonical classification tuple.`
      );
    }
    if (input.metadata.rejectionReasons !== ADS_FRAUD_REJECTION_REASONS) {
      issues.push(
        `${fieldPrefix}.metadata.rejectionReasons must be the canonical rejection-reason tuple.`
      );
    }
  }

  return issues.length > 0
    ? { valid: false, issues: Object.freeze([...issues]) }
    : { valid: true };
}
