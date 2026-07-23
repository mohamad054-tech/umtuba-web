import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";

/**
 * Ads Invalid Traffic Foundation V1 — pure, deterministic, fail-closed.
 *
 * Defines invalid-traffic (IVT) signal contracts, trust levels, classifications,
 * and deterministic classification from an explicit caller-provided snapshot.
 * This is NOT live bot detection, AI/ML fraud scoring, IP reputation, device /
 * browser fingerprinting, rate limiting, storage, persistence, or production
 * enforcement.
 *
 * Signal flags are explicit inputs. This module never consults event history,
 * wall-clock, network, database, Redis, AI/ML, or product modules.
 *
 * productionEnabled, deliveryEnabled, and executionEnabled are always false.
 */

export const ADS_INVALID_TRAFFIC_CONTRACT_VERSION = "v1" as const;

/** Only trusted traffic may pass the IVT / fraud gate in V1. */
export const ADS_INVALID_TRAFFIC_ELIGIBLE_TRUST_LEVEL = "trusted" as const;

/**
 * Trust levels accepted on IVT / fraud signal snapshots.
 * Aligned with billing event trust vocabulary for future IVT gating.
 */
export const ADS_INVALID_TRAFFIC_TRUST_LEVELS = [
  "trusted",
  "unverified",
  "suspicious",
  "rejected",
  "untrusted",
  "provisional",
] as const;

export type AdsInvalidTrafficTrustLevel =
  (typeof ADS_INVALID_TRAFFIC_TRUST_LEVELS)[number];

/** Sole event types evaluated by IVT / fraud foundation V1. */
export const ADS_INVALID_TRAFFIC_EVENT_TYPES = [
  "impression",
  "click",
] as const;

export type AdsInvalidTrafficEventType =
  (typeof ADS_INVALID_TRAFFIC_EVENT_TYPES)[number];

/**
 * Explicit IVT signal kinds supported as contracts in V1.
 * Detectors that produce these flags are out of scope.
 */
export const ADS_INVALID_TRAFFIC_SIGNAL_KINDS = [
  "suspicious_impression",
  "suspicious_click",
  "duplicate_event",
  "impossible_sequence",
  "invalid_reporting_handle",
] as const;

export type AdsInvalidTrafficSignalKind =
  (typeof ADS_INVALID_TRAFFIC_SIGNAL_KINDS)[number];

/**
 * Deterministic IVT / fraud classifications.
 * Order is documentation-stable; evaluation uses rejection-reason order.
 */
export const ADS_INVALID_TRAFFIC_CLASSIFICATIONS = [
  "clean",
  "invalid_reporting_handle",
  "duplicate_event",
  "impossible_sequence",
  "suspicious_impression",
  "suspicious_click",
  "trust_rejected",
] as const;

export type AdsInvalidTrafficClassification =
  (typeof ADS_INVALID_TRAFFIC_CLASSIFICATIONS)[number];

/**
 * Hard-gate IVT rejection reasons.
 * Order is the exact first-match evaluation order in
 * resolveAdsInvalidTrafficRejectionReason.
 * Do not reorder without updating that function and its tests.
 */
export const ADS_INVALID_TRAFFIC_REJECTION_REASONS = [
  "invalid_reporting_handle",
  "duplicate_event",
  "impossible_sequence",
  "suspicious_impression",
  "suspicious_click",
  "trust_not_eligible",
] as const;

export type AdsInvalidTrafficRejectionReason =
  (typeof ADS_INVALID_TRAFFIC_REJECTION_REASONS)[number];

/**
 * Top-level keys allowed on AdsInvalidTrafficSnapshot.
 * Unknown fields fail closed — including fraudEligible / classification.
 */
export const ADS_INVALID_TRAFFIC_SNAPSHOT_ALLOWED_FIELDS = [
  "eventId",
  "candidateId",
  "campaignId",
  "eventType",
  "trustLevel",
  "reportingHandleValid",
  "duplicateEvent",
  "impossibleSequence",
  "suspiciousImpression",
  "suspiciousClick",
] as const;

/**
 * Top-level keys allowed on AdsInvalidTrafficDiagnostics.
 * Unknown fields fail closed.
 */
export const ADS_INVALID_TRAFFIC_DIAGNOSTICS_ALLOWED_FIELDS = [
  "eventType",
  "trustLevel",
  "trustEligible",
  "reportingHandleValid",
  "duplicateEvent",
  "impossibleSequence",
  "suspiciousImpression",
  "suspiciousClick",
  "activeSignalCount",
  "classification",
] as const;

/**
 * Top-level keys allowed on AdsInvalidTrafficMetadata.
 * Unknown fields fail closed.
 */
export const ADS_INVALID_TRAFFIC_METADATA_ALLOWED_FIELDS = [
  "contractVersion",
  "eligibleTrustLevel",
  "supportedTrustLevels",
  "supportedEventTypes",
  "supportedSignalKinds",
  "supportedClassifications",
  "rejectionReasons",
] as const;

/**
 * Top-level keys allowed on AdsInvalidTrafficEvaluationResult.
 * Unknown fields fail closed.
 */
export const ADS_INVALID_TRAFFIC_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "eventId",
  "candidateId",
  "campaignId",
  "eventType",
  "invalidTrafficEligible",
  "classification",
  "rejectionReason",
  "diagnostics",
  "metadata",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

/**
 * Explicit IVT signal snapshot for one event.
 *
 * All signal flags are caller-provided booleans. This module does not detect
 * bots, duplicates, or sequences from live traffic or stored history.
 *
 * Event-type consistency (fail-closed at parse):
 * - impression → suspiciousClick must be false
 * - click → suspiciousImpression must be false
 */
export type AdsInvalidTrafficSnapshot = Readonly<{
  eventId: string;
  candidateId: string;
  campaignId: string;
  eventType: AdsInvalidTrafficEventType;
  trustLevel: AdsInvalidTrafficTrustLevel;
  /** false means invalid reporting handle signal is active. */
  reportingHandleValid: boolean;
  duplicateEvent: boolean;
  impossibleSequence: boolean;
  suspiciousImpression: boolean;
  suspiciousClick: boolean;
}>;

export type AdsInvalidTrafficDiagnostics = Readonly<{
  eventType: AdsInvalidTrafficEventType;
  trustLevel: AdsInvalidTrafficTrustLevel;
  trustEligible: boolean;
  reportingHandleValid: boolean;
  duplicateEvent: boolean;
  impossibleSequence: boolean;
  suspiciousImpression: boolean;
  suspiciousClick: boolean;
  /** Count of active IVT signal flags (excludes trust gate). */
  activeSignalCount: number;
  classification: AdsInvalidTrafficClassification;
}>;

export type AdsInvalidTrafficMetadata = Readonly<{
  contractVersion: typeof ADS_INVALID_TRAFFIC_CONTRACT_VERSION;
  eligibleTrustLevel: typeof ADS_INVALID_TRAFFIC_ELIGIBLE_TRUST_LEVEL;
  supportedTrustLevels: typeof ADS_INVALID_TRAFFIC_TRUST_LEVELS;
  supportedEventTypes: typeof ADS_INVALID_TRAFFIC_EVENT_TYPES;
  supportedSignalKinds: typeof ADS_INVALID_TRAFFIC_SIGNAL_KINDS;
  supportedClassifications: typeof ADS_INVALID_TRAFFIC_CLASSIFICATIONS;
  rejectionReasons: typeof ADS_INVALID_TRAFFIC_REJECTION_REASONS;
}>;

/**
 * Canonical Invalid Traffic Evaluation Result V1.
 * Immutable; never enables production / delivery / execution.
 */
export type AdsInvalidTrafficEvaluationResult = Readonly<{
  contractVersion: typeof ADS_INVALID_TRAFFIC_CONTRACT_VERSION;
  eventId: string;
  candidateId: string;
  campaignId: string;
  eventType: AdsInvalidTrafficEventType;
  /** true only when traffic passes the deterministic IVT gate. */
  invalidTrafficEligible: boolean;
  classification: AdsInvalidTrafficClassification;
  rejectionReason: AdsInvalidTrafficRejectionReason | null;
  diagnostics: AdsInvalidTrafficDiagnostics;
  metadata: AdsInvalidTrafficMetadata;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

export type AdsInvalidTrafficEvaluationOutcome =
  | Readonly<{ valid: true; result: AdsInvalidTrafficEvaluationResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsInvalidTrafficSnapshotParseResult =
  | Readonly<{ valid: true; snapshot: AdsInvalidTrafficSnapshot }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const SNAPSHOT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_INVALID_TRAFFIC_SNAPSHOT_ALLOWED_FIELDS
);
const DIAGNOSTICS_ALLOWED_FIELD_SET = new Set<string>(
  ADS_INVALID_TRAFFIC_DIAGNOSTICS_ALLOWED_FIELDS
);
const METADATA_ALLOWED_FIELD_SET = new Set<string>(
  ADS_INVALID_TRAFFIC_METADATA_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_INVALID_TRAFFIC_RESULT_ALLOWED_FIELDS
);
const TRUST_LEVEL_SET = new Set<string>(ADS_INVALID_TRAFFIC_TRUST_LEVELS);
const EVENT_TYPE_SET = new Set<string>(ADS_INVALID_TRAFFIC_EVENT_TYPES);
const CLASSIFICATION_SET = new Set<string>(
  ADS_INVALID_TRAFFIC_CLASSIFICATIONS
);
const REJECTION_REASON_SET = new Set<string>(
  ADS_INVALID_TRAFFIC_REJECTION_REASONS
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isAdsInvalidTrafficTrustLevel(
  value: unknown
): value is AdsInvalidTrafficTrustLevel {
  return typeof value === "string" && TRUST_LEVEL_SET.has(value);
}

function isAdsInvalidTrafficEventType(
  value: unknown
): value is AdsInvalidTrafficEventType {
  return typeof value === "string" && EVENT_TYPE_SET.has(value);
}

function isAdsInvalidTrafficClassification(
  value: unknown
): value is AdsInvalidTrafficClassification {
  return typeof value === "string" && CLASSIFICATION_SET.has(value);
}

function isAdsInvalidTrafficRejectionReason(
  value: unknown
): value is AdsInvalidTrafficRejectionReason {
  return typeof value === "string" && REJECTION_REASON_SET.has(value);
}

function freezeSnapshot(
  snapshot: AdsInvalidTrafficSnapshot
): AdsInvalidTrafficSnapshot {
  return Object.freeze({
    eventId: snapshot.eventId,
    candidateId: snapshot.candidateId,
    campaignId: snapshot.campaignId,
    eventType: snapshot.eventType,
    trustLevel: snapshot.trustLevel,
    reportingHandleValid: snapshot.reportingHandleValid,
    duplicateEvent: snapshot.duplicateEvent,
    impossibleSequence: snapshot.impossibleSequence,
    suspiciousImpression: snapshot.suspiciousImpression,
    suspiciousClick: snapshot.suspiciousClick,
  });
}

function freezeDiagnostics(
  diagnostics: AdsInvalidTrafficDiagnostics
): AdsInvalidTrafficDiagnostics {
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
    classification: diagnostics.classification,
  });
}

function freezeMetadata(): AdsInvalidTrafficMetadata {
  return Object.freeze({
    contractVersion: ADS_INVALID_TRAFFIC_CONTRACT_VERSION,
    eligibleTrustLevel: ADS_INVALID_TRAFFIC_ELIGIBLE_TRUST_LEVEL,
    supportedTrustLevels: ADS_INVALID_TRAFFIC_TRUST_LEVELS,
    supportedEventTypes: ADS_INVALID_TRAFFIC_EVENT_TYPES,
    supportedSignalKinds: ADS_INVALID_TRAFFIC_SIGNAL_KINDS,
    supportedClassifications: ADS_INVALID_TRAFFIC_CLASSIFICATIONS,
    rejectionReasons: ADS_INVALID_TRAFFIC_REJECTION_REASONS,
  });
}

function freezeResult(
  result: AdsInvalidTrafficEvaluationResult
): AdsInvalidTrafficEvaluationResult {
  return Object.freeze({
    contractVersion: ADS_INVALID_TRAFFIC_CONTRACT_VERSION,
    eventId: result.eventId,
    candidateId: result.candidateId,
    campaignId: result.campaignId,
    eventType: result.eventType,
    invalidTrafficEligible: result.invalidTrafficEligible,
    classification: result.classification,
    rejectionReason: result.rejectionReason,
    diagnostics: freezeDiagnostics(result.diagnostics),
    metadata: freezeMetadata(),
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

function countActiveSignals(snapshot: AdsInvalidTrafficSnapshot): number {
  let count = 0;
  if (!snapshot.reportingHandleValid) count += 1;
  if (snapshot.duplicateEvent) count += 1;
  if (snapshot.impossibleSequence) count += 1;
  if (snapshot.suspiciousImpression) count += 1;
  if (snapshot.suspiciousClick) count += 1;
  return count;
}

/**
 * Resolve the first-match IVT rejection reason from an explicit snapshot.
 * Order matches ADS_INVALID_TRAFFIC_REJECTION_REASONS exactly.
 */
export function resolveAdsInvalidTrafficRejectionReason(
  snapshot: AdsInvalidTrafficSnapshot
): AdsInvalidTrafficRejectionReason | null {
  if (!snapshot.reportingHandleValid) {
    return "invalid_reporting_handle";
  }
  if (snapshot.duplicateEvent) {
    return "duplicate_event";
  }
  if (snapshot.impossibleSequence) {
    return "impossible_sequence";
  }
  if (snapshot.suspiciousImpression) {
    return "suspicious_impression";
  }
  if (snapshot.suspiciousClick) {
    return "suspicious_click";
  }
  if (snapshot.trustLevel !== ADS_INVALID_TRAFFIC_ELIGIBLE_TRUST_LEVEL) {
    return "trust_not_eligible";
  }
  return null;
}

/**
 * Map a rejection reason to a stable classification.
 * null rejection → clean.
 */
export function classifyAdsInvalidTraffic(
  rejectionReason: AdsInvalidTrafficRejectionReason | null
): AdsInvalidTrafficClassification {
  if (rejectionReason === null) {
    return "clean";
  }
  if (rejectionReason === "trust_not_eligible") {
    return "trust_rejected";
  }
  return rejectionReason;
}

/**
 * Parse and narrow an IVT signal snapshot.
 * Fail-closed — constructs a fresh immutable snapshot on success.
 */
export function parseAdsInvalidTrafficSnapshot(
  input: unknown,
  fieldPrefix = "snapshot"
): AdsInvalidTrafficSnapshotParseResult {
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

  let eventId: string | null = null;
  if (!isNonEmptyString(input.eventId)) {
    issues.push(
      `${fieldPrefix}.eventId is required and must be a non-empty string.`
    );
  } else if (input.eventId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldPrefix}.eventId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  } else {
    eventId = input.eventId;
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

  let eventType: AdsInvalidTrafficEventType | null = null;
  if (!isAdsInvalidTrafficEventType(input.eventType)) {
    issues.push(
      `${fieldPrefix}.eventType must be a supported invalid-traffic event type.`
    );
  } else {
    eventType = input.eventType;
  }

  let trustLevel: AdsInvalidTrafficTrustLevel | null = null;
  if (!isAdsInvalidTrafficTrustLevel(input.trustLevel)) {
    issues.push(`${fieldPrefix}.trustLevel is not a valid trust level.`);
  } else {
    trustLevel = input.trustLevel;
  }

  if (!isBoolean(input.reportingHandleValid)) {
    issues.push(`${fieldPrefix}.reportingHandleValid must be a boolean.`);
  }
  if (!isBoolean(input.duplicateEvent)) {
    issues.push(`${fieldPrefix}.duplicateEvent must be a boolean.`);
  }
  if (!isBoolean(input.impossibleSequence)) {
    issues.push(`${fieldPrefix}.impossibleSequence must be a boolean.`);
  }
  if (!isBoolean(input.suspiciousImpression)) {
    issues.push(`${fieldPrefix}.suspiciousImpression must be a boolean.`);
  }
  if (!isBoolean(input.suspiciousClick)) {
    issues.push(`${fieldPrefix}.suspiciousClick must be a boolean.`);
  }

  if (
    eventType === "impression" &&
    isBoolean(input.suspiciousClick) &&
    input.suspiciousClick
  ) {
    issues.push(
      `${fieldPrefix}.suspiciousClick must be false when eventType is "impression".`
    );
  }
  if (
    eventType === "click" &&
    isBoolean(input.suspiciousImpression) &&
    input.suspiciousImpression
  ) {
    issues.push(
      `${fieldPrefix}.suspiciousImpression must be false when eventType is "click".`
    );
  }

  if (
    issues.length > 0 ||
    eventId === null ||
    candidateId === null ||
    campaignId === null ||
    eventType === null ||
    trustLevel === null ||
    !isBoolean(input.reportingHandleValid) ||
    !isBoolean(input.duplicateEvent) ||
    !isBoolean(input.impossibleSequence) ||
    !isBoolean(input.suspiciousImpression) ||
    !isBoolean(input.suspiciousClick)
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    snapshot: freezeSnapshot({
      eventId,
      candidateId,
      campaignId,
      eventType,
      trustLevel,
      reportingHandleValid: input.reportingHandleValid,
      duplicateEvent: input.duplicateEvent,
      impossibleSequence: input.impossibleSequence,
      suspiciousImpression: input.suspiciousImpression,
      suspiciousClick: input.suspiciousClick,
    }),
  };
}

/**
 * Pure shape validator for IVT snapshots.
 * Fail-closed — does not evaluate eligibility.
 */
export function validateAdsInvalidTrafficSnapshot(
  input: unknown,
  fieldPrefix = "snapshot"
): ContractValidationResult {
  const parsed = parseAdsInvalidTrafficSnapshot(input, fieldPrefix);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

/**
 * Evaluate invalid-traffic eligibility from an explicit signal snapshot.
 * Same input always yields an identical immutable result.
 */
export function evaluateAdsInvalidTraffic(
  input: unknown
): AdsInvalidTrafficEvaluationOutcome {
  const parsed = parseAdsInvalidTrafficSnapshot(input);
  if (!parsed.valid) {
    return { valid: false, issues: parsed.issues };
  }

  const { snapshot } = parsed;
  const rejectionReason = resolveAdsInvalidTrafficRejectionReason(snapshot);
  const classification = classifyAdsInvalidTraffic(rejectionReason);
  const invalidTrafficEligible = rejectionReason === null;
  const trustEligible =
    snapshot.trustLevel === ADS_INVALID_TRAFFIC_ELIGIBLE_TRUST_LEVEL;

  return {
    valid: true,
    result: freezeResult({
      contractVersion: ADS_INVALID_TRAFFIC_CONTRACT_VERSION,
      eventId: snapshot.eventId,
      candidateId: snapshot.candidateId,
      campaignId: snapshot.campaignId,
      eventType: snapshot.eventType,
      invalidTrafficEligible,
      classification,
      rejectionReason,
      diagnostics: {
        eventType: snapshot.eventType,
        trustLevel: snapshot.trustLevel,
        trustEligible,
        reportingHandleValid: snapshot.reportingHandleValid,
        duplicateEvent: snapshot.duplicateEvent,
        impossibleSequence: snapshot.impossibleSequence,
        suspiciousImpression: snapshot.suspiciousImpression,
        suspiciousClick: snapshot.suspiciousClick,
        activeSignalCount: countActiveSignals(snapshot),
        classification,
      },
      metadata: freezeMetadata(),
      productionEnabled: false,
      deliveryEnabled: false,
      executionEnabled: false,
    }),
  };
}

/**
 * Pure shape validator for IVT evaluation results.
 * Fail-closed — does not re-evaluate.
 */
export function validateAdsInvalidTrafficEvaluationResult(
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

  if (input.contractVersion !== ADS_INVALID_TRAFFIC_CONTRACT_VERSION) {
    issues.push(
      `${fieldPrefix}.contractVersion must be "${ADS_INVALID_TRAFFIC_CONTRACT_VERSION}".`
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

  if (!isAdsInvalidTrafficEventType(input.eventType)) {
    issues.push(
      `${fieldPrefix}.eventType must be a supported invalid-traffic event type.`
    );
  }

  if (typeof input.invalidTrafficEligible !== "boolean") {
    issues.push(`${fieldPrefix}.invalidTrafficEligible must be a boolean.`);
  }

  if (!isAdsInvalidTrafficClassification(input.classification)) {
    issues.push(
      `${fieldPrefix}.classification is not a valid invalid-traffic classification.`
    );
  }

  if (
    input.rejectionReason !== null &&
    !isAdsInvalidTrafficRejectionReason(input.rejectionReason)
  ) {
    issues.push(
      `${fieldPrefix}.rejectionReason is not a valid rejection reason.`
    );
  }

  if (typeof input.invalidTrafficEligible === "boolean") {
    if (input.invalidTrafficEligible) {
      if (input.rejectionReason !== null) {
        issues.push(
          `${fieldPrefix}.rejectionReason must be null when invalidTrafficEligible is true.`
        );
      }
      if (input.classification !== "clean") {
        issues.push(
          `${fieldPrefix}.classification must be "clean" when invalidTrafficEligible is true.`
        );
      }
    } else if (input.rejectionReason === null) {
      issues.push(
        `${fieldPrefix}.rejectionReason is required when invalidTrafficEligible is false.`
      );
    }
  }

  // Enforce exact rejectionReason ↔ classification pairing (canonical map).
  if (
    (input.rejectionReason === null ||
      isAdsInvalidTrafficRejectionReason(input.rejectionReason)) &&
    isAdsInvalidTrafficClassification(input.classification)
  ) {
    const expectedClassification = classifyAdsInvalidTraffic(
      input.rejectionReason === null ? null : input.rejectionReason
    );
    if (input.classification !== expectedClassification) {
      issues.push(
        `${fieldPrefix}.classification must be "${expectedClassification}" for rejectionReason ${
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
    if (!isAdsInvalidTrafficEventType(diagnostics.eventType)) {
      issues.push(
        `${fieldPrefix}.diagnostics.eventType must be a supported event type.`
      );
    }
    if (!isAdsInvalidTrafficTrustLevel(diagnostics.trustLevel)) {
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
    if (!isAdsInvalidTrafficClassification(diagnostics.classification)) {
      issues.push(
        `${fieldPrefix}.diagnostics.classification is not a valid classification.`
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
    if (
      input.metadata.contractVersion !== ADS_INVALID_TRAFFIC_CONTRACT_VERSION
    ) {
      issues.push(
        `${fieldPrefix}.metadata.contractVersion must be "${ADS_INVALID_TRAFFIC_CONTRACT_VERSION}".`
      );
    }
    if (
      input.metadata.eligibleTrustLevel !==
      ADS_INVALID_TRAFFIC_ELIGIBLE_TRUST_LEVEL
    ) {
      issues.push(
        `${fieldPrefix}.metadata.eligibleTrustLevel must be "${ADS_INVALID_TRAFFIC_ELIGIBLE_TRUST_LEVEL}".`
      );
    }
    if (
      input.metadata.supportedTrustLevels !== ADS_INVALID_TRAFFIC_TRUST_LEVELS
    ) {
      issues.push(
        `${fieldPrefix}.metadata.supportedTrustLevels must be the canonical trust-level tuple.`
      );
    }
    if (
      input.metadata.supportedEventTypes !== ADS_INVALID_TRAFFIC_EVENT_TYPES
    ) {
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
      input.metadata.supportedClassifications !==
      ADS_INVALID_TRAFFIC_CLASSIFICATIONS
    ) {
      issues.push(
        `${fieldPrefix}.metadata.supportedClassifications must be the canonical classification tuple.`
      );
    }
    if (
      input.metadata.rejectionReasons !== ADS_INVALID_TRAFFIC_REJECTION_REASONS
    ) {
      issues.push(
        `${fieldPrefix}.metadata.rejectionReasons must be the canonical rejection-reason tuple.`
      );
    }
  }

  return issues.length > 0
    ? { valid: false, issues: Object.freeze([...issues]) }
    : { valid: true };
}
