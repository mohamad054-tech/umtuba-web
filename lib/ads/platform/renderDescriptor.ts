import {
  ADS_PLATFORM_CREATIVE_TYPES,
  type AdsPlatformCreativeType,
  type ContractValidationResult,
} from "./creativeContracts";
import {
  isAdsPlacementId,
  isCreativeTypeSupportedByPlacement,
  type AdsPlatformPlacementId,
} from "./placementRegistry";
import {
  validateAdsReportingHandleOpaqueToken,
  type AdsReportingHandleOpaqueToken,
} from "./reportingHandle";

/**
 * Ads Render Descriptor Contracts V1 — product-facing serve metadata only.
 *
 * Future delivery execution returns this shape to product surfaces. This module
 * defines immutable contracts and fail-closed validators only. It never:
 * - resolves or signs URLs
 * - accesses storage
 * - loads media
 * - renders creatives
 * - enables production delivery
 *
 * productionEnabled is always false in V1.
 */

export const ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION = "v1" as const;

/** Max length for opaque reference / handle strings. */
export const ADS_RENDER_DESCRIPTOR_MAX_ID_LENGTH = 128;

/** Max age allowed in cacheHints.maxAgeSeconds (7 days). */
export const ADS_RENDER_DESCRIPTOR_MAX_CACHE_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Allow expiresAt up to this many ms behind `now` before rejecting as expired.
 * Documented clock-skew allowance: 5 seconds (fail closed on true expiry).
 */
export const ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS = 5_000;

/** Required disclosure labels products must be prepared to display. */
export const ADS_RENDER_DISCLOSURE_LABELS = ["Sponsored", "Ad"] as const;

export type AdsRenderDisclosureLabel =
  (typeof ADS_RENDER_DISCLOSURE_LABELS)[number];

/**
 * Top-level keys allowed on a V1 render descriptor.
 * Unknown fields fail closed.
 */
export const ADS_RENDER_DESCRIPTOR_ALLOWED_FIELDS = [
  "descriptorVersion",
  "placementId",
  "creativeReference",
  "creativeType",
  "mediaReference",
  "thumbnailReference",
  "clickDestinationReference",
  "disclosure",
  "reportingHandles",
  "trackingReferences",
  "cacheHints",
  "expiresAt",
  "productionEnabled",
] as const;

export type AdsRenderDescriptorAllowedField =
  (typeof ADS_RENDER_DESCRIPTOR_ALLOWED_FIELDS)[number];

/**
 * Field names that must never appear (URL / storage / PII signals).
 */
export const ADS_RENDER_DESCRIPTOR_PROHIBITED_FIELDS = [
  "url",
  "urls",
  "href",
  "src",
  "mediaUrl",
  "thumbnailUrl",
  "destinationUrl",
  "clickUrl",
  "signedUrl",
  "signedUrls",
  "signed_url",
  "publicUrl",
  "storagePath",
  "bucket",
  "objectKey",
  "ip",
  "email",
  "phone",
  "fingerprint",
] as const;

/** Disclosure metadata — labeling only; no copy rendering here. */
export type AdsRenderDisclosureMetadata = Readonly<{
  label: AdsRenderDisclosureLabel;
  /** Always true in V1 — products must display the disclosure. */
  mustDisplay: true;
}>;

/**
 * Reporting handles for future impression / click event binding.
 * Client-facing opaque reporting-handle tokens only — never URLs or entity ids.
 * Internal reporting-handle payloads are never product-visible here.
 */
export type AdsRenderReportingHandles = Readonly<{
  impressionHandle: AdsReportingHandleOpaqueToken;
  clickHandle: AdsReportingHandleOpaqueToken;
}>;

/**
 * Tracking references for future measurement correlation.
 * Opaque ids only — never product module imports.
 */
export type AdsRenderTrackingReferences = Readonly<{
  campaignId: string;
  adSetId: string;
  adId: string;
  creativeId: string;
}>;

/**
 * Cache hints for future product/CDN layers.
 * Never includes URLs or storage paths.
 */
export type AdsRenderCacheHints = Readonly<{
  cacheable: boolean;
  /** Required when cacheable; null when not cacheable. */
  maxAgeSeconds: number | null;
  /** Opaque cache key when cacheable; null when not cacheable. */
  cacheKey: string | null;
}>;

/**
 * Canonical Render Descriptor V1.
 * Metadata only — no media bytes, no signed URLs, no render instructions.
 */
export type AdsRenderDescriptor = Readonly<{
  descriptorVersion: typeof ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION;
  placementId: AdsPlatformPlacementId;
  /** Opaque creative package / revision reference. */
  creativeReference: string;
  creativeType: AdsPlatformCreativeType;
  /** Opaque media asset reference — never a URL. */
  mediaReference: string;
  /** Optional opaque thumbnail reference — never a URL. */
  thumbnailReference: string | null;
  /** Opaque click destination reference — never a URL. */
  clickDestinationReference: string;
  disclosure: AdsRenderDisclosureMetadata;
  reportingHandles: AdsRenderReportingHandles;
  trackingReferences: AdsRenderTrackingReferences;
  cacheHints: AdsRenderCacheHints;
  /** ISO-8601 expiration timestamp. */
  expiresAt: string;
  /** Always false in V1. */
  productionEnabled: false;
}>;

export type AdsRenderDescriptorValidationOptions = Readonly<{
  /** Injected clock for deterministic expiry checks. Defaults to Date.now(). */
  nowMs?: number;
}>;

export type AdsRenderDescriptorBuildOutcome =
  | Readonly<{ valid: true; descriptor: AdsRenderDescriptor }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const ALLOWED_FIELD_SET = new Set<string>(ADS_RENDER_DESCRIPTOR_ALLOWED_FIELDS);

const DISCLOSURE_ALLOWED_FIELDS = new Set(["label", "mustDisplay"]);
const REPORTING_ALLOWED_FIELDS = new Set([
  "impressionHandle",
  "clickHandle",
]);
const TRACKING_ALLOWED_FIELDS = new Set([
  "campaignId",
  "adSetId",
  "adId",
  "creativeId",
]);
const CACHE_HINTS_ALLOWED_FIELDS = new Set([
  "cacheable",
  "maxAgeSeconds",
  "cacheKey",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function parseIsoTimestampMs(value: unknown): number | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return parsed;
}

/**
 * Detects URL-like or scheme-bearing strings. References must stay opaque.
 */
export function looksLikeAdsRenderUrl(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (/^(https?:|\/\/|data:|blob:|javascript:|file:)/i.test(trimmed)) {
    return true;
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) {
    return true;
  }
  return false;
}

export function isAdsRenderDisclosureLabel(
  value: string
): value is AdsRenderDisclosureLabel {
  return (ADS_RENDER_DISCLOSURE_LABELS as readonly string[]).includes(value);
}

export function isAdsRenderDescriptorCreativeType(
  value: string
): value is AdsPlatformCreativeType {
  return (ADS_PLATFORM_CREATIVE_TYPES as readonly string[]).includes(value);
}

function rejectProhibitedFields(
  value: Record<string, unknown>,
  prefix: string,
  issues: string[]
): void {
  for (const field of ADS_RENDER_DESCRIPTOR_PROHIBITED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      issues.push(
        `${prefix}prohibited field "${field}" is not allowed on render descriptors.`
      );
    }
  }
}

function rejectUnknownFields(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  prefix: string,
  issues: string[]
): void {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      issues.push(`${prefix}unknown field "${key}" is not allowed.`);
    }
  }
}

function validateOpaqueReference(
  value: unknown,
  fieldName: string,
  issues: string[],
  options: { allowNull?: boolean } = {}
): void {
  if (options.allowNull && value === null) {
    return;
  }
  if (!isNonEmptyString(value)) {
    issues.push(`${fieldName} is required and must be a non-empty string.`);
    return;
  }
  if (value.length > ADS_RENDER_DESCRIPTOR_MAX_ID_LENGTH) {
    issues.push(
      `${fieldName} exceeds max length of ${ADS_RENDER_DESCRIPTOR_MAX_ID_LENGTH}.`
    );
  }
  if (looksLikeAdsRenderUrl(value)) {
    issues.push(`${fieldName} must be an opaque reference, not a URL.`);
  }
}

function validateDisclosure(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push("disclosure is required and must be an object.");
    return;
  }

  rejectProhibitedFields(value, "disclosure.", issues);
  rejectUnknownFields(value, DISCLOSURE_ALLOWED_FIELDS, "disclosure.", issues);

  if (
    typeof value.label !== "string" ||
    !isAdsRenderDisclosureLabel(value.label)
  ) {
    issues.push("disclosure.label is not a supported disclosure label.");
  }
  if (value.mustDisplay !== true) {
    issues.push("disclosure.mustDisplay must be true.");
  }
}

function validateReportingHandles(
  value: unknown,
  issues: string[],
  seenHandles: Map<string, string>
): void {
  if (!isRecord(value)) {
    issues.push("reportingHandles is required and must be an object.");
    return;
  }

  rejectProhibitedFields(value, "reportingHandles.", issues);
  rejectUnknownFields(
    value,
    REPORTING_ALLOWED_FIELDS,
    "reportingHandles.",
    issues
  );

  const impressionToken = validateAdsReportingHandleOpaqueToken(
    value.impressionHandle,
    "reportingHandles.impressionHandle"
  );
  if (!impressionToken.valid) {
    issues.push(...impressionToken.issues);
  }
  const clickToken = validateAdsReportingHandleOpaqueToken(
    value.clickHandle,
    "reportingHandles.clickHandle"
  );
  if (!clickToken.valid) {
    issues.push(...clickToken.issues);
  }

  if (
    isNonEmptyString(value.impressionHandle) &&
    impressionToken.valid
  ) {
    const existing = seenHandles.get(value.impressionHandle);
    if (existing) {
      issues.push(
        `duplicate handle "${value.impressionHandle}" shared by ${existing} and reportingHandles.impressionHandle.`
      );
    } else {
      seenHandles.set(
        value.impressionHandle,
        "reportingHandles.impressionHandle"
      );
    }
  }

  if (isNonEmptyString(value.clickHandle) && clickToken.valid) {
    const existing = seenHandles.get(value.clickHandle);
    if (existing) {
      issues.push(
        `duplicate handle "${value.clickHandle}" shared by ${existing} and reportingHandles.clickHandle.`
      );
    } else {
      seenHandles.set(value.clickHandle, "reportingHandles.clickHandle");
    }
  }
}

function validateTrackingReferences(
  value: unknown,
  issues: string[]
): void {
  if (!isRecord(value)) {
    issues.push("trackingReferences is required and must be an object.");
    return;
  }

  rejectProhibitedFields(value, "trackingReferences.", issues);
  rejectUnknownFields(
    value,
    TRACKING_ALLOWED_FIELDS,
    "trackingReferences.",
    issues
  );

  validateOpaqueReference(
    value.campaignId,
    "trackingReferences.campaignId",
    issues
  );
  validateOpaqueReference(value.adSetId, "trackingReferences.adSetId", issues);
  validateOpaqueReference(value.adId, "trackingReferences.adId", issues);
  validateOpaqueReference(
    value.creativeId,
    "trackingReferences.creativeId",
    issues
  );
}

function validateCacheHints(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push("cacheHints is required and must be an object.");
    return;
  }

  rejectProhibitedFields(value, "cacheHints.", issues);
  rejectUnknownFields(value, CACHE_HINTS_ALLOWED_FIELDS, "cacheHints.", issues);

  if (typeof value.cacheable !== "boolean") {
    issues.push("cacheHints.cacheable must be a boolean.");
    return;
  }

  if (value.cacheable) {
    if (!isNonNegativeInteger(value.maxAgeSeconds)) {
      issues.push(
        "cacheHints.maxAgeSeconds must be a non-negative integer when cacheable."
      );
    } else if (
      value.maxAgeSeconds > ADS_RENDER_DESCRIPTOR_MAX_CACHE_AGE_SECONDS
    ) {
      issues.push(
        `cacheHints.maxAgeSeconds exceeds max of ${ADS_RENDER_DESCRIPTOR_MAX_CACHE_AGE_SECONDS}.`
      );
    }
    validateOpaqueReference(value.cacheKey, "cacheHints.cacheKey", issues);
  } else {
    if (value.maxAgeSeconds !== null) {
      issues.push(
        "cacheHints.maxAgeSeconds must be null when cacheable is false."
      );
    }
    if (value.cacheKey !== null) {
      issues.push("cacheHints.cacheKey must be null when cacheable is false.");
    }
  }
}

/**
 * Pure shape validator for Render Descriptor Contracts V1.
 * Fail-closed — does not render, resolve media, or enable production.
 */
export function validateAdsRenderDescriptor(
  input: unknown,
  options: AdsRenderDescriptorValidationOptions = {}
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: ["Render descriptor must be an object."],
    };
  }

  const issues: string[] = [];
  rejectProhibitedFields(input, "", issues);
  rejectUnknownFields(input, ALLOWED_FIELD_SET, "", issues);

  if (input.descriptorVersion !== ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION) {
    issues.push(
      `descriptorVersion must be "${ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION}".`
    );
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  if (
    typeof input.placementId !== "string" ||
    !isAdsPlacementId(input.placementId)
  ) {
    issues.push("placementId is not a registered Ads Platform placement.");
  }

  if (
    typeof input.creativeType !== "string" ||
    !isAdsRenderDescriptorCreativeType(input.creativeType)
  ) {
    issues.push("creativeType is not a supported Ads Platform creative type.");
  } else if (
    typeof input.placementId === "string" &&
    isAdsPlacementId(input.placementId) &&
    !isCreativeTypeSupportedByPlacement(
      input.placementId,
      input.creativeType
    )
  ) {
    issues.push(
      `creativeType "${input.creativeType}" is not supported by placement "${input.placementId}".`
    );
  }

  validateOpaqueReference(input.creativeReference, "creativeReference", issues);
  validateOpaqueReference(input.mediaReference, "mediaReference", issues);
  validateOpaqueReference(
    input.thumbnailReference,
    "thumbnailReference",
    issues,
    { allowNull: true }
  );
  validateOpaqueReference(
    input.clickDestinationReference,
    "clickDestinationReference",
    issues
  );

  validateDisclosure(input.disclosure, issues);

  const seenHandles = new Map<string, string>();
  validateReportingHandles(input.reportingHandles, issues, seenHandles);
  validateTrackingReferences(input.trackingReferences, issues);
  validateCacheHints(input.cacheHints, issues);

  const expiresAtMs = parseIsoTimestampMs(input.expiresAt);
  if (expiresAtMs === null) {
    issues.push("expiresAt must be a valid ISO-8601 timestamp.");
  } else {
    const nowMs = options.nowMs ?? Date.now();
    if (expiresAtMs + ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS < nowMs) {
      issues.push("expiresAt is expired.");
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Deep-freezes a validated descriptor snapshot for immutable contract behavior.
 */
export function freezeAdsRenderDescriptor(
  descriptor: AdsRenderDescriptor
): AdsRenderDescriptor {
  return Object.freeze({
    descriptorVersion: descriptor.descriptorVersion,
    placementId: descriptor.placementId,
    creativeReference: descriptor.creativeReference,
    creativeType: descriptor.creativeType,
    mediaReference: descriptor.mediaReference,
    thumbnailReference: descriptor.thumbnailReference,
    clickDestinationReference: descriptor.clickDestinationReference,
    disclosure: Object.freeze({ ...descriptor.disclosure }),
    reportingHandles: Object.freeze({ ...descriptor.reportingHandles }),
    trackingReferences: Object.freeze({ ...descriptor.trackingReferences }),
    cacheHints: Object.freeze({ ...descriptor.cacheHints }),
    expiresAt: descriptor.expiresAt,
    productionEnabled: false as const,
  });
}

/**
 * Builds an immutable render descriptor from unknown input.
 * Forces productionEnabled to false. Never renders or resolves media.
 */
export function buildAdsRenderDescriptor(
  input: unknown,
  options: AdsRenderDescriptorValidationOptions = {}
): AdsRenderDescriptorBuildOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Render descriptor must be an object."]),
    };
  }

  const normalized: Record<string, unknown> = {
    ...input,
    productionEnabled: false,
  };

  const validation = validateAdsRenderDescriptor(normalized, options);
  if (!validation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...validation.issues]),
    };
  }

  const disclosure = normalized.disclosure as AdsRenderDisclosureMetadata;
  const reportingHandles =
    normalized.reportingHandles as AdsRenderReportingHandles;
  const trackingReferences =
    normalized.trackingReferences as AdsRenderTrackingReferences;
  const cacheHints = normalized.cacheHints as AdsRenderCacheHints;

  const descriptor = freezeAdsRenderDescriptor({
    descriptorVersion: ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
    placementId: normalized.placementId as AdsPlatformPlacementId,
    creativeReference: normalized.creativeReference as string,
    creativeType: normalized.creativeType as AdsPlatformCreativeType,
    mediaReference: normalized.mediaReference as string,
    thumbnailReference:
      (normalized.thumbnailReference as string | null | undefined) ?? null,
    clickDestinationReference: normalized.clickDestinationReference as string,
    disclosure: {
      label: disclosure.label,
      mustDisplay: true,
    },
    reportingHandles: {
      impressionHandle: reportingHandles.impressionHandle,
      clickHandle: reportingHandles.clickHandle,
    },
    trackingReferences: {
      campaignId: trackingReferences.campaignId,
      adSetId: trackingReferences.adSetId,
      adId: trackingReferences.adId,
      creativeId: trackingReferences.creativeId,
    },
    cacheHints: {
      cacheable: cacheHints.cacheable,
      maxAgeSeconds: cacheHints.maxAgeSeconds,
      cacheKey: cacheHints.cacheKey,
    },
    expiresAt: normalized.expiresAt as string,
    productionEnabled: false,
  });

  return { valid: true, descriptor };
}

/**
 * Lists required top-level fields for helper / documentation consumers.
 */
export function listAdsRenderDescriptorRequiredFields(): readonly AdsRenderDescriptorAllowedField[] {
  return Object.freeze([...ADS_RENDER_DESCRIPTOR_ALLOWED_FIELDS]);
}

/**
 * Lists supported disclosure labels.
 */
export function listAdsRenderDisclosureLabels(): readonly AdsRenderDisclosureLabel[] {
  return Object.freeze([...ADS_RENDER_DISCLOSURE_LABELS]);
}
