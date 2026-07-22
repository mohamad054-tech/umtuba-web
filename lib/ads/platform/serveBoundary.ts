import {
  findCandidate,
  validateCandidateInventory,
  type AdsCandidateInventory,
  type AdsCandidateMetadata,
} from "./candidateInventory";
import type { ContractValidationResult } from "./creativeContracts";
import { validateCreativePlacementCompatibility } from "./creativePlacementCompatibility";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import type { AdsDeliveryCandidateReference } from "./deliveryEligibilityContracts";
import {
  ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
  ADS_RENDER_DESCRIPTOR_PROHIBITED_FIELDS,
  buildAdsRenderDescriptor,
  isAdsRenderDisclosureLabel,
  looksLikeAdsRenderUrl,
  validateAdsRenderDescriptor,
  type AdsRenderCacheHints,
  type AdsRenderDescriptor,
  type AdsRenderDisclosureLabel,
  type AdsRenderTrackingReferences,
} from "./renderDescriptor";
import {
  getCanonicalCreativeType,
  getCanonicalPlacement,
} from "./taxonomyMapper";

/**
 * Ads Serve Boundary V1 — Render Descriptor emission only.
 *
 * Materializes an immutable AdsRenderDescriptor from:
 *   selectedCandidateId + selectable set + Candidate Inventory +
 *   explicit metadata-only render material
 *
 * This is NOT serving, rendering, or delivery. It never:
 * - resolves or signs URLs
 * - accesses storage or loads media
 * - generates reporting handles or fake references
 * - enables ADS_DELIVERY_ENABLED or placement flags
 * - ranks, auctions, paces, or bills
 * - ingests events
 * - imports Supabase or product modules
 * - consults wall-clock entropy (callers inject currentTimestamp)
 *
 * productionEnabled and deliveryEnabled are always false.
 */

export const ADS_SERVE_BOUNDARY_CONTRACT_VERSION = "v1" as const;

/**
 * Stable skip reasons when emission returns valid:true with a null descriptor.
 * Hard rejects (out-of-set, missing inventory, mismatches, invalid material)
 * return valid:false with issues instead.
 */
export const ADS_SERVE_BOUNDARY_REJECTION_REASONS = [
  "empty_selection",
  "missing_render_material",
] as const;

export type AdsServeBoundaryRejectionReason =
  (typeof ADS_SERVE_BOUNDARY_REJECTION_REASONS)[number];

/**
 * Top-level keys allowed on AdsServeBoundaryResult.
 * Unknown fields fail closed.
 */
export const ADS_SERVE_BOUNDARY_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "selectedCandidateId",
  "renderDescriptor",
  "rejectionReason",
  "productionEnabled",
  "deliveryEnabled",
] as const;

/**
 * Top-level keys allowed on the emission input.
 * Unknown fields fail closed.
 */
export const ADS_SERVE_BOUNDARY_INPUT_ALLOWED_FIELDS = [
  "selectedCandidateId",
  "selectableCandidates",
  "inventory",
  "renderMaterial",
  "currentTimestamp",
] as const;

/**
 * Top-level keys allowed on metadata-only render material.
 * Unknown fields fail closed.
 */
export const ADS_RENDER_MATERIAL_ALLOWED_FIELDS = [
  "candidateId",
  "creativeReference",
  "mediaReference",
  "thumbnailReference",
  "clickDestinationReference",
  "impressionHandle",
  "clickHandle",
  "trackingReferences",
  "disclosureLabel",
  "cacheHints",
  "expiresAt",
] as const;

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

/**
 * Explicit metadata-only render material for the selected candidate.
 * Opaque references only — never URLs, storage paths, media bytes, or PII.
 */
export type AdsRenderMaterial = Readonly<{
  candidateId: string;
  creativeReference: string;
  mediaReference: string;
  thumbnailReference: string | null;
  clickDestinationReference: string;
  impressionHandle: string;
  clickHandle: string;
  /** Optional — when omitted, inventory identity refs are used. */
  trackingReferences?: AdsRenderTrackingReferences;
  disclosureLabel: AdsRenderDisclosureLabel;
  cacheHints: AdsRenderCacheHints;
  /** ISO-8601 expiration timestamp (explicit input only). */
  expiresAt: string;
}>;

/**
 * Canonical Serve Boundary Result V1.
 * renderDescriptor is metadata only — never a served/rendered ad.
 */
export type AdsServeBoundaryResult = Readonly<{
  contractVersion: typeof ADS_SERVE_BOUNDARY_CONTRACT_VERSION;
  selectedCandidateId: string | null;
  renderDescriptor: AdsRenderDescriptor | null;
  /** Null when a descriptor was emitted; otherwise a stable skip/reject token. */
  rejectionReason: AdsServeBoundaryRejectionReason | null;
  productionEnabled: false;
  deliveryEnabled: false;
}>;

/**
 * Emission input — selection + selectable set + inventory + explicit material.
 * No URLs, storage paths, or product module imports.
 */
export type AdsServeBoundaryInput = Readonly<{
  selectedCandidateId: string | null;
  selectableCandidates: readonly AdsDeliveryCandidateReference[];
  inventory: AdsCandidateInventory;
  /** Explicit material for the selected candidate; null when none provided. */
  renderMaterial: AdsRenderMaterial | null;
  /** ISO-8601 timestamp used for deterministic expiry checks (caller-injected). */
  currentTimestamp: string;
}>;

export type AdsServeBoundaryEmissionOutcome =
  | Readonly<{ valid: true; result: AdsServeBoundaryResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_SERVE_BOUNDARY_RESULT_ALLOWED_FIELDS
);
const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_SERVE_BOUNDARY_INPUT_ALLOWED_FIELDS
);
const MATERIAL_ALLOWED_FIELD_SET = new Set<string>(
  ADS_RENDER_MATERIAL_ALLOWED_FIELDS
);
const REJECTION_REASON_SET = new Set<string>(
  ADS_SERVE_BOUNDARY_REJECTION_REASONS
);

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

function freezeServeBoundaryResult(
  result: AdsServeBoundaryResult
): AdsServeBoundaryResult {
  return Object.freeze({
    contractVersion: result.contractVersion,
    selectedCandidateId: result.selectedCandidateId,
    renderDescriptor: result.renderDescriptor,
    rejectionReason: result.rejectionReason,
    productionEnabled: false as const,
    deliveryEnabled: false as const,
  });
}

function nullResult(
  selectedCandidateId: string | null,
  rejectionReason: AdsServeBoundaryRejectionReason
): AdsServeBoundaryResult {
  return freezeServeBoundaryResult({
    contractVersion: ADS_SERVE_BOUNDARY_CONTRACT_VERSION,
    selectedCandidateId,
    renderDescriptor: null,
    rejectionReason,
    productionEnabled: false,
    deliveryEnabled: false,
  });
}

function rejectProhibitedFields(
  value: Record<string, unknown>,
  prefix: string,
  issues: string[]
): void {
  for (const field of ADS_RENDER_DESCRIPTOR_PROHIBITED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      issues.push(
        `${prefix}prohibited field "${field}" is not allowed on render material.`
      );
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
  if (value.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldName} exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  }
  if (looksLikeAdsRenderUrl(value)) {
    issues.push(`${fieldName} must be an opaque reference, not a URL.`);
  }
}

function validateCacheHintsShape(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push("cacheHints is required and must be an object.");
    return;
  }
  rejectProhibitedFields(value, "cacheHints.", issues);
  for (const key of Object.keys(value)) {
    if (!CACHE_HINTS_ALLOWED_FIELDS.has(key)) {
      issues.push(`cacheHints contains unknown field "${key}".`);
    }
  }
  if (typeof value.cacheable !== "boolean") {
    issues.push("cacheHints.cacheable must be a boolean.");
    return;
  }
  if (value.cacheable) {
    if (!isNonNegativeInteger(value.maxAgeSeconds)) {
      issues.push(
        "cacheHints.maxAgeSeconds must be a non-negative integer when cacheable."
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
 * Pure shape validator for metadata-only render material.
 * Fail-closed — does not emit, serve, or render.
 */
export function validateAdsRenderMaterial(
  input: unknown
): ContractValidationResult {
  if (input === null) {
    return { valid: true };
  }
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Render material must be an object or null."]),
    };
  }

  const issues: string[] = [];
  rejectProhibitedFields(input, "", issues);

  for (const key of Object.keys(input)) {
    if (!MATERIAL_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Render material contains unknown field "${key}".`);
    }
  }

  validateOpaqueReference(input.candidateId, "candidateId", issues);
  validateOpaqueReference(input.creativeReference, "creativeReference", issues);
  validateOpaqueReference(input.mediaReference, "mediaReference", issues);
  validateOpaqueReference(input.thumbnailReference, "thumbnailReference", issues, {
    allowNull: true,
  });
  validateOpaqueReference(
    input.clickDestinationReference,
    "clickDestinationReference",
    issues
  );
  validateOpaqueReference(input.impressionHandle, "impressionHandle", issues);
  validateOpaqueReference(input.clickHandle, "clickHandle", issues);

  if (
    isNonEmptyString(input.impressionHandle) &&
    isNonEmptyString(input.clickHandle) &&
    input.impressionHandle === input.clickHandle
  ) {
    issues.push("impressionHandle and clickHandle must be distinct.");
  }

  if (
    typeof input.disclosureLabel !== "string" ||
    !isAdsRenderDisclosureLabel(input.disclosureLabel)
  ) {
    issues.push("disclosureLabel is not a supported disclosure label.");
  }

  validateCacheHintsShape(input.cacheHints, issues);

  if (parseIsoTimestampMs(input.expiresAt) === null) {
    issues.push("expiresAt must be a valid ISO-8601 timestamp.");
  }

  if (input.trackingReferences !== undefined) {
    if (!isRecord(input.trackingReferences)) {
      issues.push("trackingReferences must be an object when provided.");
    } else {
      rejectProhibitedFields(
        input.trackingReferences,
        "trackingReferences.",
        issues
      );
      for (const key of Object.keys(input.trackingReferences)) {
        if (!TRACKING_ALLOWED_FIELDS.has(key)) {
          issues.push(`trackingReferences contains unknown field "${key}".`);
        }
      }
      validateOpaqueReference(
        input.trackingReferences.campaignId,
        "trackingReferences.campaignId",
        issues
      );
      validateOpaqueReference(
        input.trackingReferences.adSetId,
        "trackingReferences.adSetId",
        issues
      );
      validateOpaqueReference(
        input.trackingReferences.adId,
        "trackingReferences.adId",
        issues
      );
      validateOpaqueReference(
        input.trackingReferences.creativeId,
        "trackingReferences.creativeId",
        issues
      );
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Pure shape validator for Serve Boundary Result V1.
 * Fail-closed — does not emit, serve, or render.
 */
export function validateAdsServeBoundaryResult(
  input: unknown,
  options: { nowMs?: number } = {}
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Serve boundary result must be an object."]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!RESULT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Serve boundary result contains unknown field "${key}".`);
    }
  }

  if (input.contractVersion !== ADS_SERVE_BOUNDARY_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_SERVE_BOUNDARY_CONTRACT_VERSION}".`
    );
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  if (input.deliveryEnabled !== false) {
    issues.push("deliveryEnabled must be false.");
  }

  if (input.selectedCandidateId === null) {
    if (input.renderDescriptor !== null) {
      issues.push(
        "renderDescriptor must be null when selectedCandidateId is null."
      );
    }
    if (input.rejectionReason !== "empty_selection") {
      issues.push(
        'rejectionReason must be "empty_selection" when selectedCandidateId is null.'
      );
    }
  } else if (!isNonEmptyString(input.selectedCandidateId)) {
    issues.push("selectedCandidateId must be a non-empty string or null.");
  } else if (input.selectedCandidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `selectedCandidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  }

  if (input.renderDescriptor === null) {
    if (
      !isNonEmptyString(input.rejectionReason) ||
      !REJECTION_REASON_SET.has(input.rejectionReason)
    ) {
      issues.push(
        "rejectionReason is required when renderDescriptor is null."
      );
    }
  } else {
    if (input.rejectionReason !== null) {
      issues.push(
        "rejectionReason must be null when renderDescriptor is present."
      );
    }
    const descriptorValidation = validateAdsRenderDescriptor(
      input.renderDescriptor,
      { nowMs: options.nowMs }
    );
    if (!descriptorValidation.valid) {
      for (const issue of descriptorValidation.issues) {
        issues.push(`renderDescriptor: ${issue}`);
      }
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Empty serve-boundary result — no selection, no descriptor, delivery off.
 */
export function createEmptyAdsServeBoundaryResult(): AdsServeBoundaryResult {
  return nullResult(null, "empty_selection");
}

function validateSelectableCandidatesInput(
  value: unknown,
  issues: string[]
): readonly AdsDeliveryCandidateReference[] | null {
  if (!Array.isArray(value)) {
    issues.push("selectableCandidates must be an array.");
    return null;
  }

  const selectable: AdsDeliveryCandidateReference[] = [];
  const seen = new Set<string>();
  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      issues.push(`selectableCandidates[${index}] must be an object.`);
      return;
    }
    for (const key of Object.keys(entry)) {
      if (key !== "candidateId") {
        issues.push(
          `selectableCandidates[${index}] contains unknown field "${key}".`
        );
      }
    }
    if (!isNonEmptyString(entry.candidateId)) {
      issues.push(
        `selectableCandidates[${index}].candidateId is required and must be a non-empty string.`
      );
      return;
    }
    if (entry.candidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
      issues.push(
        `selectableCandidates[${index}].candidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
      );
    }
    if (seen.has(entry.candidateId)) {
      issues.push(
        `selectableCandidates contain duplicate candidateId "${entry.candidateId}".`
      );
    } else {
      seen.add(entry.candidateId);
      selectable.push(Object.freeze({ candidateId: entry.candidateId }));
    }
  });

  return Object.freeze(selectable);
}

function validateInventoryTaxonomy(
  candidate: AdsCandidateMetadata
): readonly string[] {
  const issues: string[] = [];
  try {
    getCanonicalPlacement(candidate.placement);
  } catch {
    issues.push(
      `Invalid taxonomy: unknown placement "${candidate.placement}".`
    );
  }
  try {
    getCanonicalCreativeType(candidate.creativeType);
  } catch {
    issues.push(
      `Invalid taxonomy: unknown creative type "${candidate.creativeType}".`
    );
  }
  return issues;
}

function resolveTrackingReferences(
  material: AdsRenderMaterial,
  candidate: AdsCandidateMetadata
): AdsRenderTrackingReferences {
  if (material.trackingReferences !== undefined) {
    return material.trackingReferences;
  }
  return Object.freeze({
    campaignId: candidate.campaignRef,
    adSetId: candidate.adSetRef,
    adId: candidate.adRef,
    creativeId: candidate.creativeRef,
  });
}

/**
 * Emit a validated Render Descriptor from selection + inventory + material.
 * Fail-closed on malformed input / out-of-set selection / missing inventory /
 * invalid material / invalid descriptor. Soft-null when selection empty or
 * material absent. Never serves, renders, generates handles, or enables delivery.
 */
export function emitAdsRenderDescriptor(
  input: unknown
): AdsServeBoundaryEmissionOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Serve boundary input must be an object."]),
    };
  }

  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Serve boundary input contains unknown field "${key}".`);
    }
  }
  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  if (input.selectedCandidateId === null) {
    // Empty selection allowed.
  } else if (!isNonEmptyString(input.selectedCandidateId)) {
    issues.push("selectedCandidateId must be a non-empty string or null.");
  } else if (input.selectedCandidateId.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `selectedCandidateId exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
  }

  const inventoryValidation = validateCandidateInventory(input.inventory);
  if (!inventoryValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...inventoryValidation.issues.map(
          (issue) => `Malformed inventory: ${issue}`
        ),
      ]),
    };
  }
  const inventory = input.inventory as AdsCandidateInventory;

  const selectableCandidates = validateSelectableCandidatesInput(
    input.selectableCandidates,
    issues
  );

  const nowMs = parseIsoTimestampMs(input.currentTimestamp);
  if (nowMs === null) {
    issues.push("currentTimestamp must be a valid ISO-8601 timestamp.");
  }

  if (!("renderMaterial" in input)) {
    issues.push("Serve boundary input must include renderMaterial.");
  } else {
    const materialValidation = validateAdsRenderMaterial(input.renderMaterial);
    if (!materialValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...materialValidation.issues.map(
            (issue) => `Invalid render material: ${issue}`
          ),
        ]),
      };
    }
  }

  if (issues.length > 0 || selectableCandidates === null || nowMs === null) {
    return {
      valid: false,
      issues: Object.freeze(
        issues.length > 0
          ? [...issues]
          : ["Serve boundary input is malformed."]
      ),
    };
  }

  const selectedCandidateId = input.selectedCandidateId as string | null;
  const renderMaterial = input.renderMaterial as AdsRenderMaterial | null;

  if (selectedCandidateId === null) {
    const result = nullResult(null, "empty_selection");
    const validation = validateAdsServeBoundaryResult(result, { nowMs });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  const selectableIds = selectableCandidates.map((entry) => entry.candidateId);
  if (!selectableIds.includes(selectedCandidateId)) {
    return {
      valid: false,
      issues: Object.freeze([
        `selectedCandidateId "${selectedCandidateId}" is outside the selectable set.`,
      ]),
    };
  }

  const candidate = findCandidate(inventory, selectedCandidateId);
  if (!candidate) {
    return {
      valid: false,
      issues: Object.freeze([
        `selectedCandidateId "${selectedCandidateId}" is missing from inventory.`,
      ]),
    };
  }

  if (renderMaterial === null) {
    const result = nullResult(selectedCandidateId, "missing_render_material");
    const validation = validateAdsServeBoundaryResult(result, { nowMs });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  if (renderMaterial.candidateId !== selectedCandidateId) {
    return {
      valid: false,
      issues: Object.freeze([
        `renderMaterial.candidateId "${renderMaterial.candidateId}" does not match selectedCandidateId "${selectedCandidateId}" (no fallback).`,
      ]),
    };
  }

  if (renderMaterial.creativeReference !== candidate.creativeRef) {
    return {
      valid: false,
      issues: Object.freeze([
        `renderMaterial.creativeReference "${renderMaterial.creativeReference}" does not match inventory creativeRef "${candidate.creativeRef}".`,
      ]),
    };
  }

  const taxonomyIssues = validateInventoryTaxonomy(candidate);
  if (taxonomyIssues.length > 0) {
    return {
      valid: false,
      issues: Object.freeze([...taxonomyIssues]),
    };
  }

  const compatibility = validateCreativePlacementCompatibility({
    placement: candidate.placement,
    creativeType: candidate.creativeType,
  });
  if (!compatibility.compatible) {
    return {
      valid: false,
      issues: Object.freeze([
        `Incompatible creative and placement: ${compatibility.reason ?? "incompatible"}`,
      ]),
    };
  }

  const trackingReferences = resolveTrackingReferences(
    renderMaterial,
    candidate
  );

  const draft: Record<string, unknown> = {
    descriptorVersion: ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
    placementId: candidate.placement,
    creativeReference: renderMaterial.creativeReference,
    creativeType: candidate.creativeType,
    mediaReference: renderMaterial.mediaReference,
    thumbnailReference: renderMaterial.thumbnailReference,
    clickDestinationReference: renderMaterial.clickDestinationReference,
    disclosure: {
      label: renderMaterial.disclosureLabel,
      mustDisplay: true,
    },
    reportingHandles: {
      impressionHandle: renderMaterial.impressionHandle,
      clickHandle: renderMaterial.clickHandle,
    },
    trackingReferences,
    cacheHints: renderMaterial.cacheHints,
    expiresAt: renderMaterial.expiresAt,
    productionEnabled: false,
  };

  const buildOutcome = buildAdsRenderDescriptor(draft, { nowMs });
  if (!buildOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...buildOutcome.issues.map(
          (issue) => `Invalid descriptor: ${issue}`
        ),
      ]),
    };
  }

  const result = freezeServeBoundaryResult({
    contractVersion: ADS_SERVE_BOUNDARY_CONTRACT_VERSION,
    selectedCandidateId,
    renderDescriptor: buildOutcome.descriptor,
    rejectionReason: null,
    productionEnabled: false,
    deliveryEnabled: false,
  });

  const validation = validateAdsServeBoundaryResult(result, { nowMs });
  if (!validation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...validation.issues]),
    };
  }

  return { valid: true, result };
}
