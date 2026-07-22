import type { ContractValidationResult } from "./creativeContracts";
import {
  isAdsPlacementId,
  type AdsPlatformPlacementId,
} from "./placementRegistry";

/**
 * Ads Delivery Engine Contracts V1 — immutable request shapes only.
 *
 * This module defines the future delivery request interface that later
 * eligibility / selection implementations will consume. It never serves ads,
 * runs auctions, ranks candidates, paces spend, or enables production delivery.
 */

export const ADS_DELIVERY_ENGINE_CONTRACT_VERSION = "v1" as const;

/** Coarse device class — no fingerprints or hardware identifiers. */
export const ADS_DELIVERY_DEVICE_CLASSES = [
  "mobile",
  "tablet",
  "desktop",
  "tv",
  "unknown",
] as const;
export type AdsDeliveryDeviceClass =
  (typeof ADS_DELIVERY_DEVICE_CLASSES)[number];

/** Max length for opaque reference / id strings. */
export const ADS_DELIVERY_MAX_ID_LENGTH = 128;

/** Max candidates accepted on a single delivery request. */
export const ADS_DELIVERY_MAX_CANDIDATES = 64;

/** Max JSON-serialized UTF-8 byte length for an entire delivery request. */
export const ADS_DELIVERY_MAX_REQUEST_BYTES = 65_536;

/** Max top-level keys in featureFlags. */
export const ADS_DELIVERY_MAX_FEATURE_FLAG_KEYS = 32;

/** Max length for an experiment key / arm id. */
export const ADS_DELIVERY_MAX_EXPERIMENT_ID_LENGTH = 64;

/**
 * Opaque viewer handle only — never email, phone, legal name, or precise
 * location. Contract layer does not resolve or profile viewers.
 */
export type AdsDeliveryViewerContext = Readonly<{
  opaqueViewerId: string;
}>;

/**
 * Coarse geo only — ISO country (+ optional region). No GPS / lat-lng.
 */
export type AdsDeliveryGeoContext = Readonly<{
  /** ISO 3166-1 alpha-2. */
  countryCode: string;
  /** Optional coarse admin region code (e.g. subdivision). */
  regionCode?: string;
}>;

/**
 * Feature-flag snapshot for the request. Delivery remains disabled regardless
 * of flag values in V1 contract validation.
 */
export type AdsDeliveryFeatureFlags = Readonly<Record<string, boolean>>;

/**
 * Optional experiment assignment context — placeholder for future experiments.
 * Not evaluated here.
 */
export type AdsDeliveryExperimentContext = Readonly<{
  experimentKey: string;
  armId: string;
}>;

/**
 * Candidate ad metadata only — no ORM rows, DB objects, or product imports.
 */
export type AdsDeliveryCandidateAd = Readonly<{
  candidateId: string;
  campaignId: string;
  adSetId: string;
  adId: string;
  creativeId: string;
}>;

/**
 * Immutable Delivery Engine request contract V1.
 */
export type AdsDeliveryRequest = Readonly<{
  contractVersion: typeof ADS_DELIVERY_ENGINE_CONTRACT_VERSION;
  placementId: AdsPlatformPlacementId;
  candidates: readonly AdsDeliveryCandidateAd[];
  viewer: AdsDeliveryViewerContext;
  geo: AdsDeliveryGeoContext;
  /** BCP 47 / short language tag. */
  languageCode: string;
  deviceClass: AdsDeliveryDeviceClass;
  featureFlags: AdsDeliveryFeatureFlags;
  /** ISO-8601 timestamp for the request instant. */
  currentTimestamp: string;
  experiment?: AdsDeliveryExperimentContext;
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

function parseIsoTimestamp(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed);
}

function validateViewer(
  value: unknown,
  issues: string[]
): void {
  if (!isRecord(value)) {
    issues.push("viewer is required.");
    return;
  }
  validateIdField(
    value.opaqueViewerId,
    "viewer.opaqueViewerId",
    ADS_DELIVERY_MAX_ID_LENGTH,
    issues
  );
}

function validateGeo(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push("geo is required.");
    return;
  }
  if (
    typeof value.countryCode !== "string" ||
    !/^[A-Z]{2}$/.test(value.countryCode)
  ) {
    issues.push("geo.countryCode must be an ISO 3166-1 alpha-2 code.");
  }
  if (value.regionCode !== undefined) {
    if (
      !isNonEmptyString(value.regionCode) ||
      value.regionCode.length > ADS_DELIVERY_MAX_ID_LENGTH
    ) {
      issues.push(
        "geo.regionCode must be a non-empty string within length limits when set."
      );
    }
  }
}

function validateFeatureFlags(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push("featureFlags is required.");
    return;
  }
  const keys = Object.keys(value);
  if (keys.length > ADS_DELIVERY_MAX_FEATURE_FLAG_KEYS) {
    issues.push(
      `featureFlags exceeds max key count of ${ADS_DELIVERY_MAX_FEATURE_FLAG_KEYS}.`
    );
  }
  for (const key of keys) {
    if (typeof value[key] !== "boolean") {
      issues.push(`featureFlags.${key} must be a boolean.`);
    }
  }
}

function validateExperiment(
  value: unknown,
  issues: string[]
): void {
  if (value === undefined) {
    return;
  }
  if (!isRecord(value)) {
    issues.push("experiment must be an object when set.");
    return;
  }
  validateIdField(
    value.experimentKey,
    "experiment.experimentKey",
    ADS_DELIVERY_MAX_EXPERIMENT_ID_LENGTH,
    issues
  );
  validateIdField(
    value.armId,
    "experiment.armId",
    ADS_DELIVERY_MAX_EXPERIMENT_ID_LENGTH,
    issues
  );
}

function validateCandidate(
  value: unknown,
  index: number,
  issues: string[],
  seenIds: Set<string>
): void {
  const prefix = `candidates[${index}]`;
  if (!isRecord(value)) {
    issues.push(`${prefix} must be an object.`);
    return;
  }

  validateIdField(
    value.candidateId,
    `${prefix}.candidateId`,
    ADS_DELIVERY_MAX_ID_LENGTH,
    issues
  );
  validateIdField(
    value.campaignId,
    `${prefix}.campaignId`,
    ADS_DELIVERY_MAX_ID_LENGTH,
    issues
  );
  validateIdField(
    value.adSetId,
    `${prefix}.adSetId`,
    ADS_DELIVERY_MAX_ID_LENGTH,
    issues
  );
  validateIdField(
    value.adId,
    `${prefix}.adId`,
    ADS_DELIVERY_MAX_ID_LENGTH,
    issues
  );
  validateIdField(
    value.creativeId,
    `${prefix}.creativeId`,
    ADS_DELIVERY_MAX_ID_LENGTH,
    issues
  );

  if (isNonEmptyString(value.candidateId)) {
    if (seenIds.has(value.candidateId)) {
      issues.push(
        `candidates contain duplicate candidateId "${value.candidateId}".`
      );
    } else {
      seenIds.add(value.candidateId);
    }
  }
}

/**
 * Deterministic pure validator for Ads Delivery Requests V1.
 * Fail-closed shape validation only — no eligibility, ranking, or selection.
 */
export function validateDeliveryRequest(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: ["Delivery request must be an object."],
    };
  }

  const issues: string[] = [];

  try {
    const serialized = JSON.stringify(input);
    if (utf8ByteLength(serialized) > ADS_DELIVERY_MAX_REQUEST_BYTES) {
      issues.push(
        `Delivery request exceeds max serialized size of ${ADS_DELIVERY_MAX_REQUEST_BYTES} bytes.`
      );
    }
  } catch {
    issues.push("Delivery request is not JSON-serializable.");
  }

  if (input.contractVersion !== ADS_DELIVERY_ENGINE_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_DELIVERY_ENGINE_CONTRACT_VERSION}".`
    );
  }

  if (
    typeof input.placementId !== "string" ||
    !isAdsPlacementId(input.placementId)
  ) {
    issues.push("placementId is not a registered Ads Platform placement.");
  }

  if (!Array.isArray(input.candidates)) {
    issues.push("candidates must be an array.");
  } else if (input.candidates.length === 0) {
    issues.push("candidates must not be empty.");
  } else if (input.candidates.length > ADS_DELIVERY_MAX_CANDIDATES) {
    issues.push(
      `candidates exceeds max count of ${ADS_DELIVERY_MAX_CANDIDATES}.`
    );
  } else {
    const seenIds = new Set<string>();
    input.candidates.forEach((candidate, index) => {
      validateCandidate(candidate, index, issues, seenIds);
    });
  }

  validateViewer(input.viewer, issues);
  validateGeo(input.geo, issues);

  if (
    typeof input.languageCode !== "string" ||
    !/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/.test(input.languageCode) ||
    input.languageCode.length > 16
  ) {
    issues.push("languageCode must be a short language tag.");
  }

  if (
    typeof input.deviceClass !== "string" ||
    !(ADS_DELIVERY_DEVICE_CLASSES as readonly string[]).includes(
      input.deviceClass
    )
  ) {
    issues.push("deviceClass is invalid.");
  }

  validateFeatureFlags(input.featureFlags, issues);

  if (!parseIsoTimestamp(input.currentTimestamp)) {
    issues.push("currentTimestamp must be a valid ISO-8601 timestamp.");
  }

  validateExperiment(input.experiment, issues);

  return issues.length === 0 ? { valid: true } : { valid: false, issues };
}

/**
 * Freeze helper for tests / callers that want a deeply frozen request snapshot.
 * Does not mutate production delivery state.
 */
export function freezeDeliveryRequest<T extends AdsDeliveryRequest>(
  request: T
): Readonly<T> {
  const frozenCandidates = Object.freeze(
    request.candidates.map((candidate) => Object.freeze({ ...candidate }))
  );
  return Object.freeze({
    ...request,
    candidates: frozenCandidates,
    viewer: Object.freeze({ ...request.viewer }),
    geo: Object.freeze({ ...request.geo }),
    featureFlags: Object.freeze({ ...request.featureFlags }),
    experiment: request.experiment
      ? Object.freeze({ ...request.experiment })
      : undefined,
  });
}
