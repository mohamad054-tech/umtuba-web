import type { ContractValidationResult } from "./creativeContracts";
import type { AdsPlatformPlacementId } from "./placementRegistry";
import {
  ADS_REPORTING_HANDLE_VERSION,
  validateAdsReportingHandleClientReference,
  type AdsReportingHandleClientReference,
} from "./reportingHandle";

/**
 * Ads Event Report Contracts V1 — product-facing measurement report shapes only.
 *
 * Privacy / safety invariants (contract layer; not ingestion):
 * - No raw precise location (no GPS / lat-lng / street-level coordinates).
 * - No direct contact information (email, phone, legal name).
 * - No sensitive targeting attributes (health, politics, religion, etc.).
 * - No arbitrary unbounded metadata.
 * - No teen profiling fields (age, school, guardian, minor cohort labels).
 * - Clients are never authoritative for advertiser / campaign / ad-set / ad /
 *   creative / placement / trust / billing identity — only an opaque
 *   reporting-handle reference is accepted.
 *
 * This module never accepts reports for production ingestion and never verifies
 * or issues cryptographic signatures. Reusable later by server-side ingest.
 */

export const ADS_EVENT_REPORT_CONTRACT_VERSION = "v1" as const;

export const ADS_EVENT_REPORT_EVENT_TYPES = ["impression", "click"] as const;
export type AdsEventReportEventType =
  (typeof ADS_EVENT_REPORT_EVENT_TYPES)[number];

/** Trust levels are placeholders for future IVT / ingest gates — not evaluated here. */
export const ADS_EVENT_TRUST_LEVELS = [
  "untrusted",
  "provisional",
  "trusted",
] as const;
export type AdsEventTrustLevel = (typeof ADS_EVENT_TRUST_LEVELS)[number];

/** Signature algorithms are placeholders — no crypto verification in V1. */
export const ADS_EVENT_SIGNATURE_ALGORITHMS = [
  "none",
  "hmac_sha256",
  "ed25519",
] as const;
export type AdsEventSignatureAlgorithm =
  (typeof ADS_EVENT_SIGNATURE_ALGORITHMS)[number];

/** Max length for opaque reference / id strings (UUID-scale + prefix headroom). */
export const ADS_EVENT_REPORT_MAX_ID_LENGTH = 128;

/** Dedupe keys may be slightly longer (hash + namespace). */
export const ADS_EVENT_REPORT_MAX_DEDUPE_KEY_LENGTH = 256;

/**
 * Allow occurredAt up to this many ms ahead of `now` (clock skew).
 * Documented allowance: 5 minutes.
 */
export const ADS_EVENT_REPORT_CLOCK_SKEW_MS = 5 * 60 * 1000;

/** Max JSON-serialized byte length for optional metadata (UTF-8). */
export const ADS_EVENT_REPORT_MAX_METADATA_BYTES = 2048;

/** Max top-level keys in optional metadata. */
export const ADS_EVENT_REPORT_MAX_METADATA_KEYS = 16;

/**
 * Client-authoritative entity / trust / billing fields — forbidden on V1 reports.
 * Identity must come from the opaque reporting handle, not the client.
 */
export const ADS_EVENT_REPORT_FORBIDDEN_CLIENT_AUTHORITY_FIELDS = [
  "adId",
  "campaignId",
  "adSetId",
  "creativeId",
  "placementId",
  "advertiserAccountId",
  "advertiserId",
  "accountId",
  "trustLevel",
  "billable",
  "countable",
  "billing",
] as const;

/**
 * Field names that must never appear on a V1 event report (fail-closed).
 * Covers contact info, precise location, fingerprints, and teen profiling.
 */
export const ADS_EVENT_REPORT_PROHIBITED_FIELDS = [
  "ip",
  "ipAddress",
  "rawIp",
  "email",
  "phone",
  "phoneNumber",
  "fullName",
  "legalName",
  "name",
  "gps",
  "latitude",
  "longitude",
  "lat",
  "lng",
  "preciseLocation",
  "deviceFingerprint",
  "fingerprint",
  "contacts",
  "age",
  "dateOfBirth",
  "school",
  "guardian",
  "minorCoh",
  "teenProfile",
  "religion",
  "politicalAffiliation",
  "healthCondition",
  "sexualOrientation",
  "racialEthnicity",
  ...ADS_EVENT_REPORT_FORBIDDEN_CLIENT_AUTHORITY_FIELDS,
] as const;

export type AdsEventTrustContext = Readonly<{
  /** Placeholder trust classification — not assigned by this contract layer. */
  trustLevel: AdsEventTrustLevel;
}>;

export type AdsEventSignatureContext = Readonly<{
  /** Placeholder algorithm — `"none"` is incomplete for production acceptance. */
  algorithm: AdsEventSignatureAlgorithm;
  keyId: string;
  signature: string;
  signedAt: string;
}>;

/**
 * Optional viewer reference must be an opaque, non-PII handle only
 * (e.g. hashed subject token). Never email, phone, or legal name.
 */
export type AdsEventViewerReference = Readonly<{
  opaqueViewerId: string;
}>;

export type AdsEventReportRequest = Readonly<{
  contractVersion: typeof ADS_EVENT_REPORT_CONTRACT_VERSION;
  eventType: AdsEventReportEventType;
  /**
   * Opaque server-issued reporting-handle reference.
   * Entity / placement / trust / billing identity is never client-authoritative.
   */
  reportingHandle: AdsReportingHandleClientReference;
  dedupeKey: string;
  /** ISO-8601 timestamp when the event occurred. */
  occurredAt: string;
  clientEventId: string;
  sessionId?: string;
  viewer?: AdsEventViewerReference;
  /** ISO 3166-1 alpha-2 when present. */
  countryCode?: string;
  /** BCP 47 / short language tag when present. */
  languageCode?: string;
  /**
   * Optional coarse non-PII bag. Size-bounded; must not carry prohibited fields
   * or sensitive attributes.
   */
  metadata?: Readonly<Record<string, string | number | boolean | null>>;
  trustContext: AdsEventTrustContext;
  signatureContext: AdsEventSignatureContext;
}>;

export type AdsEventReportAcknowledgement = Readonly<{
  contractVersion: typeof ADS_EVENT_REPORT_CONTRACT_VERSION;
  contractValid: boolean;
  /** Always false in V1 — no ingestion path is enabled. */
  acceptedForIngestion: false;
  /** Always false in V1 — production measurement ingest is disabled. */
  productionEnabled: false;
  validationErrors: readonly string[];
  eventType: AdsEventReportEventType | null;
  /**
   * Always null in V1 — placement is resolved from the opaque handle later,
   * never trusted from the client report.
   */
  placementId: AdsPlatformPlacementId | null;
  /** Echo of the opaque handle version when structurally present. */
  reportingHandleVersion: typeof ADS_REPORTING_HANDLE_VERSION | null;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function validateIdField(
  value: unknown,
  fieldName: string,
  maxLength: number,
  issues: string[]
): void {
  if (!isNonEmptyString(value)) {
    issues.push(`${fieldName} is required and must be a non-empty string.`);
    return;
  }
  if (value.length > maxLength) {
    issues.push(`${fieldName} exceeds max length of ${maxLength}.`);
  }
}

function parseOccurredAt(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed);
}

function hasProhibitedFields(
  value: Record<string, unknown>,
  issues: string[]
): void {
  for (const field of ADS_EVENT_REPORT_PROHIBITED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      issues.push(`Prohibited field "${field}" is not allowed on event reports.`);
    }
  }
}

function validateMetadata(
  value: unknown,
  issues: string[]
): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value)) {
    issues.push("metadata must be a plain object when set.");
    return;
  }

  hasProhibitedFields(value, issues);

  const keys = Object.keys(value);
  if (keys.length > ADS_EVENT_REPORT_MAX_METADATA_KEYS) {
    issues.push(
      `metadata exceeds max key count of ${ADS_EVENT_REPORT_MAX_METADATA_KEYS}.`
    );
  }

  for (const key of keys) {
    const entry = value[key];
    if (
      entry !== null &&
      typeof entry !== "string" &&
      typeof entry !== "number" &&
      typeof entry !== "boolean"
    ) {
      issues.push(`metadata.${key} must be a string, number, boolean, or null.`);
    }
  }

  try {
    const serialized = JSON.stringify(value);
    if (utf8ByteLength(serialized) > ADS_EVENT_REPORT_MAX_METADATA_BYTES) {
      issues.push(
        `metadata exceeds max serialized size of ${ADS_EVENT_REPORT_MAX_METADATA_BYTES} bytes.`
      );
    }
  } catch {
    issues.push("metadata is not JSON-serializable.");
  }
}

function validateTrustContext(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push("trustContext is required.");
    return;
  }
  if (
    typeof value.trustLevel !== "string" ||
    !(ADS_EVENT_TRUST_LEVELS as readonly string[]).includes(value.trustLevel)
  ) {
    issues.push("trustContext.trustLevel is invalid.");
  }
}

/**
 * Signature context is a contract placeholder only.
 * Incomplete shapes (missing fields, empty values, or algorithm `"none"`)
 * fail closed for production-acceptance eligibility.
 * This function does not verify cryptographic signatures.
 */
function validateSignatureContext(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push("signatureContext is required.");
    return;
  }

  if (
    typeof value.algorithm !== "string" ||
    !(ADS_EVENT_SIGNATURE_ALGORITHMS as readonly string[]).includes(
      value.algorithm
    )
  ) {
    issues.push("signatureContext.algorithm is invalid.");
  } else if (value.algorithm === "none") {
    issues.push(
      "signatureContext.algorithm \"none\" is incomplete for production acceptance."
    );
  }

  validateIdField(
    value.keyId,
    "signatureContext.keyId",
    ADS_EVENT_REPORT_MAX_ID_LENGTH,
    issues
  );
  validateIdField(
    value.signature,
    "signatureContext.signature",
    ADS_EVENT_REPORT_MAX_DEDUPE_KEY_LENGTH,
    issues
  );

  const signedAt = parseOccurredAt(value.signedAt);
  if (!signedAt) {
    issues.push("signatureContext.signedAt must be a valid ISO-8601 timestamp.");
  }
}

function validateOptionalCountryLanguage(
  value: Record<string, unknown>,
  issues: string[]
): void {
  if (value.countryCode !== undefined) {
    if (
      typeof value.countryCode !== "string" ||
      !/^[A-Z]{2}$/.test(value.countryCode)
    ) {
      issues.push("countryCode must be an ISO 3166-1 alpha-2 code when set.");
    }
  }
  if (value.languageCode !== undefined) {
    if (
      typeof value.languageCode !== "string" ||
      !/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/.test(value.languageCode) ||
      value.languageCode.length > 16
    ) {
      issues.push("languageCode must be a short language tag when set.");
    }
  }
}

export type ValidateEventReportRequestOptions = Readonly<{
  /** Injected clock for deterministic tests. Defaults to Date.now(). */
  nowMs?: number;
}>;

/**
 * Deterministic pure validator for Ads Event Report Requests V1.
 * Fail-closed: any unsupported / incomplete / unsafe input yields issues.
 * Does not ingest events, verify signatures, or enable production measurement.
 */
export function validateEventReportRequest(
  input: unknown,
  options: ValidateEventReportRequestOptions = {}
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: ["Event report request must be an object."],
    };
  }

  const issues: string[] = [];
  hasProhibitedFields(input, issues);

  if (input.contractVersion !== ADS_EVENT_REPORT_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_EVENT_REPORT_CONTRACT_VERSION}".`
    );
  }

  if (
    typeof input.eventType !== "string" ||
    !(ADS_EVENT_REPORT_EVENT_TYPES as readonly string[]).includes(input.eventType)
  ) {
    issues.push("eventType is not supported.");
  }

  const handleValidation = validateAdsReportingHandleClientReference(
    input.reportingHandle
  );
  if (!handleValidation.valid) {
    for (const issue of handleValidation.issues) {
      issues.push(`reportingHandle: ${issue}`);
    }
  }

  validateIdField(
    input.clientEventId,
    "clientEventId",
    ADS_EVENT_REPORT_MAX_ID_LENGTH,
    issues
  );
  validateIdField(
    input.dedupeKey,
    "dedupeKey",
    ADS_EVENT_REPORT_MAX_DEDUPE_KEY_LENGTH,
    issues
  );

  const occurredAt = parseOccurredAt(input.occurredAt);
  if (!occurredAt) {
    issues.push("occurredAt must be a valid ISO-8601 timestamp.");
  } else {
    const nowMs = options.nowMs ?? Date.now();
    if (occurredAt.getTime() > nowMs + ADS_EVENT_REPORT_CLOCK_SKEW_MS) {
      issues.push(
        `occurredAt is beyond the allowed clock-skew window of ${ADS_EVENT_REPORT_CLOCK_SKEW_MS}ms.`
      );
    }
  }

  if (input.sessionId !== undefined) {
    validateIdField(
      input.sessionId,
      "sessionId",
      ADS_EVENT_REPORT_MAX_ID_LENGTH,
      issues
    );
  }

  if (input.viewer !== undefined) {
    if (!isRecord(input.viewer)) {
      issues.push("viewer must be an object when set.");
    } else {
      hasProhibitedFields(input.viewer, issues);
      validateIdField(
        input.viewer.opaqueViewerId,
        "viewer.opaqueViewerId",
        ADS_EVENT_REPORT_MAX_ID_LENGTH,
        issues
      );
    }
  }

  validateOptionalCountryLanguage(input, issues);
  validateMetadata(input.metadata, issues);
  validateTrustContext(input.trustContext, issues);
  validateSignatureContext(input.signatureContext, issues);

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}

/**
 * Evaluates a report request into an acknowledgement.
 * Structurally valid requests are still never accepted for ingestion in V1.
 * Placement is never trusted from the client — always null until handle resolve.
 */
export function acknowledgeEventReportRequest(
  input: unknown,
  options: ValidateEventReportRequestOptions = {}
): AdsEventReportAcknowledgement {
  const validation = validateEventReportRequest(input, options);
  const record = isRecord(input) ? input : null;

  const eventType =
    record &&
    typeof record.eventType === "string" &&
    (ADS_EVENT_REPORT_EVENT_TYPES as readonly string[]).includes(
      record.eventType
    )
      ? (record.eventType as AdsEventReportEventType)
      : null;

  const reportingHandleVersion =
    record &&
    isRecord(record.reportingHandle) &&
    record.reportingHandle.version === ADS_REPORTING_HANDLE_VERSION
      ? ADS_REPORTING_HANDLE_VERSION
      : null;

  if (validation.valid) {
    return {
      contractVersion: ADS_EVENT_REPORT_CONTRACT_VERSION,
      contractValid: true,
      acceptedForIngestion: false,
      productionEnabled: false,
      validationErrors: [],
      eventType,
      placementId: null,
      reportingHandleVersion,
    };
  }

  return {
    contractVersion: ADS_EVENT_REPORT_CONTRACT_VERSION,
    contractValid: false,
    acceptedForIngestion: false,
    productionEnabled: false,
    validationErrors: validation.issues,
    eventType,
    placementId: null,
    reportingHandleVersion,
  };
}
