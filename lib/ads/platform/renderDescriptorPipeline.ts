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
  ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
  ADS_RENDER_DESCRIPTOR_MAX_ID_LENGTH,
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
  validateAdsReportingHandleOpaqueToken,
  type AdsReportingHandleOpaqueToken,
} from "./reportingHandle";

/**
 * Ads Render Descriptor Pipeline V1 — eligible candidate → typed descriptor.
 *
 * Fixed in-memory stages:
 *   Validate → Bind Placement → Bind Creative → Build Descriptor → Result
 *
 * Authority:
 * - Candidate / campaign / ad-set / ad / creative / placement identity comes
 *   only from the authoritative eligible candidate.
 * - Optional trackingReferences may only echo those identities; mismatch
 *   fail-closes. They never override.
 * - Placement capabilities come from the placement registry; creative binding
 *   cannot redefine them.
 *
 * Eligibility is enforced via explicit markers (campaign/creative active,
 * policy allowed, age-gate assertion). Arbitrary candidates are not trusted.
 *
 * This layer NEVER:
 * - delivers, serves, or renders creatives
 * - ranks, auctions, paces, or bills
 * - queries a database, imports Supabase, or uses the network
 * - consults wall-clock entropy (callers inject currentTimestamp)
 * - enables ADS_DELIVERY_ENABLED or placement flags
 *
 * productionEnabled and deliveryEnabled are always false.
 * renderAccepted means the pipeline produced a validated descriptor — not that
 * anything was rendered or served.
 */

export const ADS_RENDER_DESCRIPTOR_PIPELINE_CONTRACT_VERSION = "v1" as const;

/** Fixed pipeline stages in evaluation order. */
export const ADS_RENDER_DESCRIPTOR_PIPELINE_STAGES = [
  "validate",
  "bind_placement",
  "bind_creative",
  "build_descriptor",
  "result",
] as const;

export type AdsRenderDescriptorPipelineStage =
  (typeof ADS_RENDER_DESCRIPTOR_PIPELINE_STAGES)[number];

/**
 * Stable rejection reasons when the pipeline completes without a descriptor.
 * Hard malformed input returns valid:false with issues instead.
 */
export const ADS_RENDER_DESCRIPTOR_PIPELINE_REJECTION_REASONS = [
  "candidate_ineligible",
  "placement_mismatch",
  "creative_mismatch",
  "placement_incompatible",
  "unsupported_creative",
  "invalid_descriptor",
] as const;

export type AdsRenderDescriptorPipelineRejectionReason =
  (typeof ADS_RENDER_DESCRIPTOR_PIPELINE_REJECTION_REASONS)[number];

/**
 * Top-level keys allowed on the pipeline input.
 * Unknown fields fail closed.
 */
export const ADS_RENDER_DESCRIPTOR_PIPELINE_INPUT_ALLOWED_FIELDS = [
  "eligibleCandidate",
  "placementDescriptor",
  "creativeDescriptor",
  "impressionHandle",
  "clickHandle",
  "disclosureLabel",
  "cacheHints",
  "expiresAt",
  "currentTimestamp",
  "viewerAgeGatePassed",
  "trackingReferences",
] as const;

/**
 * Top-level keys allowed on AdsRenderEligibleCandidate.
 */
export const ADS_RENDER_ELIGIBLE_CANDIDATE_ALLOWED_FIELDS = [
  "candidateId",
  "campaignRef",
  "advertiserRef",
  "creativeRef",
  "placementId",
  "creativeType",
  "adSetRef",
  "adRef",
  "eligibility",
] as const;

/**
 * Eligibility marker keys aligned with Candidate Selection boolean gates.
 */
export const ADS_RENDER_CANDIDATE_ELIGIBILITY_ALLOWED_FIELDS = [
  "campaignActive",
  "creativeActive",
  "policyAllowed",
  "requiresAgeGate",
] as const;

/**
 * Top-level keys allowed on the placement descriptor binding.
 */
export const ADS_RENDER_PLACEMENT_DESCRIPTOR_ALLOWED_FIELDS = [
  "placementId",
  "acceptedCreativeTypes",
] as const;

/**
 * Top-level keys allowed on the creative descriptor binding.
 */
export const ADS_RENDER_CREATIVE_DESCRIPTOR_ALLOWED_FIELDS = [
  "creativeReference",
  "creativeType",
  "mediaReference",
  "thumbnailReference",
  "clickDestinationReference",
] as const;

/**
 * Top-level keys allowed on AdsRenderDescriptorPipelineResult.
 */
export const ADS_RENDER_DESCRIPTOR_PIPELINE_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "renderAccepted",
  "renderRejected",
  "renderDescriptor",
  "diagnostics",
  "pipelineStage",
  "productionEnabled",
  "deliveryEnabled",
] as const;

/**
 * Top-level keys allowed on render diagnostics.
 */
export const ADS_RENDER_DESCRIPTOR_PIPELINE_DIAGNOSTICS_ALLOWED_FIELDS = [
  "candidateId",
  "candidatePlacementId",
  "bindingPlacementId",
  "creativeType",
  "creativeReference",
  "bindingAccepted",
  "rejectionReason",
] as const;

/**
 * Boolean eligibility markers required before descriptor emission.
 * Mirrors Candidate Selection active/policy/age-gate gates (boolean only).
 */
export type AdsRenderCandidateEligibilityMarkers = Readonly<{
  campaignActive: boolean;
  creativeActive: boolean;
  policyAllowed: boolean;
  /** When true, input.viewerAgeGatePassed must be true. */
  requiresAgeGate: boolean;
}>;

/**
 * Authoritative candidate identity + eligibility markers for transformation.
 * Opaque refs only — never URLs, storage paths, or PII.
 */
export type AdsRenderEligibleCandidate = Readonly<{
  candidateId: string;
  campaignRef: string;
  advertiserRef: string;
  creativeRef: string;
  placementId: AdsPlatformPlacementId;
  creativeType: AdsPlatformCreativeType;
  adSetRef: string;
  adRef: string;
  eligibility: AdsRenderCandidateEligibilityMarkers;
}>;

/**
 * Placement descriptor binding for the eligible candidate's slot.
 */
export type AdsRenderPlacementDescriptor = Readonly<{
  placementId: AdsPlatformPlacementId;
  /**
   * Optional accepted creative allowlist for the slot.
   * When omitted, placement registry support decides.
   */
  acceptedCreativeTypes?: readonly AdsPlatformCreativeType[];
}>;

/**
 * Creative descriptor binding — opaque media / destination references only.
 * Cannot redefine placement capabilities or candidate identity.
 */
export type AdsRenderCreativeDescriptor = Readonly<{
  creativeReference: string;
  creativeType: AdsPlatformCreativeType;
  mediaReference: string;
  thumbnailReference: string | null;
  clickDestinationReference: string;
}>;

/**
 * Aggregate render diagnostics — binding outcomes only.
 * Never includes ranking scores, URLs, or media bytes.
 * Placement diagnostics keep candidate vs binding placements distinct.
 */
export type AdsRenderDescriptorPipelineDiagnostics = Readonly<{
  candidateId: string | null;
  /** Authoritative placement from the eligible candidate. */
  candidatePlacementId: AdsPlatformPlacementId | null;
  /** Placement from the supplied placement descriptor binding. */
  bindingPlacementId: AdsPlatformPlacementId | null;
  creativeType: AdsPlatformCreativeType | null;
  creativeReference: string | null;
  bindingAccepted: boolean;
  rejectionReason: AdsRenderDescriptorPipelineRejectionReason | null;
}>;

/**
 * Canonical Render Descriptor Pipeline Result V1.
 * Metadata emission only — never a served or rendered ad.
 */
export type AdsRenderDescriptorPipelineResult = Readonly<{
  contractVersion: typeof ADS_RENDER_DESCRIPTOR_PIPELINE_CONTRACT_VERSION;
  renderAccepted: boolean;
  renderRejected: boolean;
  renderDescriptor: AdsRenderDescriptor | null;
  diagnostics: AdsRenderDescriptorPipelineDiagnostics;
  pipelineStage: AdsRenderDescriptorPipelineStage;
  productionEnabled: false;
  deliveryEnabled: false;
}>;

/**
 * Pipeline input — eligible candidate + placement/creative bindings +
 * explicit opaque handles / cache / expiry. Caller injects currentTimestamp.
 *
 * trackingReferences is optional and non-authoritative: when present it must
 * exactly match candidate-derived identity or the input hard-fails.
 */
export type AdsRenderDescriptorPipelineInput = Readonly<{
  eligibleCandidate: AdsRenderEligibleCandidate;
  placementDescriptor: AdsRenderPlacementDescriptor;
  creativeDescriptor: AdsRenderCreativeDescriptor;
  impressionHandle: AdsReportingHandleOpaqueToken;
  clickHandle: AdsReportingHandleOpaqueToken;
  disclosureLabel: AdsRenderDisclosureLabel;
  cacheHints: AdsRenderCacheHints;
  /** ISO-8601 expiration timestamp for the emitted descriptor. */
  expiresAt: string;
  /** ISO-8601 timestamp used for deterministic expiry checks. */
  currentTimestamp: string;
  /** Upstream age-gate assertion for eligibility (never computed from DOB). */
  viewerAgeGatePassed: boolean;
  /**
   * Optional non-authoritative echo of tracking identity.
   * Must match candidate-derived refs when provided; never overrides.
   */
  trackingReferences?: AdsRenderTrackingReferences;
}>;

export type AdsRenderDescriptorPipelineOutcome =
  | Readonly<{ valid: true; result: AdsRenderDescriptorPipelineResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const STAGE_SET = new Set<string>(ADS_RENDER_DESCRIPTOR_PIPELINE_STAGES);
const REJECTION_REASON_SET = new Set<string>(
  ADS_RENDER_DESCRIPTOR_PIPELINE_REJECTION_REASONS
);
const CREATIVE_TYPE_SET = new Set<string>(ADS_PLATFORM_CREATIVE_TYPES);

const INPUT_ALLOWED = new Set<string>(
  ADS_RENDER_DESCRIPTOR_PIPELINE_INPUT_ALLOWED_FIELDS
);
const RESULT_ALLOWED = new Set<string>(
  ADS_RENDER_DESCRIPTOR_PIPELINE_RESULT_ALLOWED_FIELDS
);
const DIAGNOSTICS_ALLOWED = new Set<string>(
  ADS_RENDER_DESCRIPTOR_PIPELINE_DIAGNOSTICS_ALLOWED_FIELDS
);
const CANDIDATE_ALLOWED = new Set<string>(
  ADS_RENDER_ELIGIBLE_CANDIDATE_ALLOWED_FIELDS
);
const ELIGIBILITY_ALLOWED = new Set<string>(
  ADS_RENDER_CANDIDATE_ELIGIBILITY_ALLOWED_FIELDS
);
const PLACEMENT_ALLOWED = new Set<string>(
  ADS_RENDER_PLACEMENT_DESCRIPTOR_ALLOWED_FIELDS
);
const CREATIVE_ALLOWED = new Set<string>(
  ADS_RENDER_CREATIVE_DESCRIPTOR_ALLOWED_FIELDS
);
const CACHE_HINTS_ALLOWED = new Set([
  "cacheable",
  "maxAgeSeconds",
  "cacheKey",
]);
const TRACKING_ALLOWED = new Set([
  "campaignId",
  "adSetId",
  "adId",
  "creativeId",
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

function rejectProhibitedFields(
  value: Record<string, unknown>,
  prefix: string,
  issues: string[]
): void {
  for (const field of ADS_RENDER_DESCRIPTOR_PROHIBITED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      issues.push(
        `${prefix}prohibited field "${field}" is not allowed on render descriptor pipeline input.`
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
  if (value.length > ADS_RENDER_DESCRIPTOR_MAX_ID_LENGTH) {
    issues.push(
      `${fieldName} exceeds max length of ${ADS_RENDER_DESCRIPTOR_MAX_ID_LENGTH}.`
    );
  }
  if (looksLikeAdsRenderUrl(value)) {
    issues.push(`${fieldName} must be an opaque reference, not a URL.`);
  }
}

function freezeDiagnostics(
  diagnostics: AdsRenderDescriptorPipelineDiagnostics
): AdsRenderDescriptorPipelineDiagnostics {
  return Object.freeze({
    candidateId: diagnostics.candidateId,
    candidatePlacementId: diagnostics.candidatePlacementId,
    bindingPlacementId: diagnostics.bindingPlacementId,
    creativeType: diagnostics.creativeType,
    creativeReference: diagnostics.creativeReference,
    bindingAccepted: diagnostics.bindingAccepted,
    rejectionReason: diagnostics.rejectionReason,
  });
}

function freezePipelineResult(
  result: AdsRenderDescriptorPipelineResult
): AdsRenderDescriptorPipelineResult {
  return Object.freeze({
    contractVersion: ADS_RENDER_DESCRIPTOR_PIPELINE_CONTRACT_VERSION,
    renderAccepted: result.renderAccepted,
    renderRejected: result.renderRejected,
    renderDescriptor: result.renderDescriptor,
    diagnostics: freezeDiagnostics(result.diagnostics),
    pipelineStage: result.pipelineStage,
    productionEnabled: false as const,
    deliveryEnabled: false as const,
  });
}

function rejectedResult(
  pipelineStage: AdsRenderDescriptorPipelineStage,
  rejectionReason: AdsRenderDescriptorPipelineRejectionReason,
  diagnostics: Partial<AdsRenderDescriptorPipelineDiagnostics> = {}
): AdsRenderDescriptorPipelineResult {
  return freezePipelineResult({
    contractVersion: ADS_RENDER_DESCRIPTOR_PIPELINE_CONTRACT_VERSION,
    renderAccepted: false,
    renderRejected: true,
    renderDescriptor: null,
    diagnostics: freezeDiagnostics({
      candidateId: diagnostics.candidateId ?? null,
      candidatePlacementId: diagnostics.candidatePlacementId ?? null,
      bindingPlacementId: diagnostics.bindingPlacementId ?? null,
      creativeType: diagnostics.creativeType ?? null,
      creativeReference: diagnostics.creativeReference ?? null,
      bindingAccepted: false,
      rejectionReason,
    }),
    pipelineStage,
    productionEnabled: false,
    deliveryEnabled: false,
  });
}

function acceptedResult(
  descriptor: AdsRenderDescriptor,
  diagnostics: AdsRenderDescriptorPipelineDiagnostics
): AdsRenderDescriptorPipelineResult {
  return freezePipelineResult({
    contractVersion: ADS_RENDER_DESCRIPTOR_PIPELINE_CONTRACT_VERSION,
    renderAccepted: true,
    renderRejected: false,
    renderDescriptor: descriptor,
    diagnostics: freezeDiagnostics({
      ...diagnostics,
      bindingAccepted: true,
      rejectionReason: null,
    }),
    pipelineStage: "result",
    productionEnabled: false,
    deliveryEnabled: false,
  });
}

function isAdsPlatformCreativeType(
  value: string
): value is AdsPlatformCreativeType {
  return CREATIVE_TYPE_SET.has(value);
}

/**
 * Strict eligibility predicate for render emission.
 * Rejects inactive campaign/creative, policy-blocked, and failed age gates.
 * Returns null when eligible.
 */
export function evaluateAdsRenderCandidateEligibility(
  eligibility: AdsRenderCandidateEligibilityMarkers,
  viewerAgeGatePassed: boolean
): AdsRenderDescriptorPipelineRejectionReason | null {
  if (eligibility.campaignActive !== true) {
    return "candidate_ineligible";
  }
  if (eligibility.creativeActive !== true) {
    return "candidate_ineligible";
  }
  if (eligibility.policyAllowed !== true) {
    return "candidate_ineligible";
  }
  if (
    eligibility.requiresAgeGate === true &&
    viewerAgeGatePassed !== true
  ) {
    return "candidate_ineligible";
  }
  return null;
}

/**
 * Authoritative tracking identity derived only from the eligible candidate.
 * Never accepts caller overrides.
 */
export function deriveAdsRenderTrackingReferences(
  candidate: AdsRenderEligibleCandidate
): AdsRenderTrackingReferences {
  return Object.freeze({
    campaignId: candidate.campaignRef,
    adSetId: candidate.adSetRef,
    adId: candidate.adRef,
    creativeId: candidate.creativeRef,
  });
}

function validateCacheHintsInput(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push("cacheHints is required and must be an object.");
    return;
  }

  rejectProhibitedFields(value, "cacheHints.", issues);
  rejectUnknownFields(value, CACHE_HINTS_ALLOWED, "cacheHints.", issues);

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

function validateTrackingReferencesEcho(
  value: unknown,
  authoritative: AdsRenderTrackingReferences,
  issues: string[]
): void {
  if (!isRecord(value)) {
    issues.push("trackingReferences must be an object when provided.");
    return;
  }

  rejectProhibitedFields(value, "trackingReferences.", issues);
  rejectUnknownFields(value, TRACKING_ALLOWED, "trackingReferences.", issues);

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

  if (
    isNonEmptyString(value.campaignId) &&
    value.campaignId !== authoritative.campaignId
  ) {
    issues.push(
      "trackingReferences.campaignId must match eligibleCandidate.campaignRef (no override)."
    );
  }
  if (
    isNonEmptyString(value.adSetId) &&
    value.adSetId !== authoritative.adSetId
  ) {
    issues.push(
      "trackingReferences.adSetId must match eligibleCandidate.adSetRef (no override)."
    );
  }
  if (isNonEmptyString(value.adId) && value.adId !== authoritative.adId) {
    issues.push(
      "trackingReferences.adId must match eligibleCandidate.adRef (no override)."
    );
  }
  if (
    isNonEmptyString(value.creativeId) &&
    value.creativeId !== authoritative.creativeId
  ) {
    issues.push(
      "trackingReferences.creativeId must match eligibleCandidate.creativeRef (no override)."
    );
  }
}

function validateEligibilityMarkers(
  value: unknown,
  issues: string[]
): AdsRenderCandidateEligibilityMarkers | null {
  if (!isRecord(value)) {
    issues.push("eligibleCandidate.eligibility is required and must be an object.");
    return null;
  }

  rejectProhibitedFields(value, "eligibleCandidate.eligibility.", issues);
  rejectUnknownFields(
    value,
    ELIGIBILITY_ALLOWED,
    "eligibleCandidate.eligibility.",
    issues
  );

  for (const key of ADS_RENDER_CANDIDATE_ELIGIBILITY_ALLOWED_FIELDS) {
    if (typeof value[key] !== "boolean") {
      issues.push(
        `eligibleCandidate.eligibility.${key} must be a boolean.`
      );
    }
  }

  if (
    typeof value.campaignActive !== "boolean" ||
    typeof value.creativeActive !== "boolean" ||
    typeof value.policyAllowed !== "boolean" ||
    typeof value.requiresAgeGate !== "boolean"
  ) {
    return null;
  }

  return Object.freeze({
    campaignActive: value.campaignActive,
    creativeActive: value.creativeActive,
    policyAllowed: value.policyAllowed,
    requiresAgeGate: value.requiresAgeGate,
  });
}

function validateEligibleCandidateInput(
  value: unknown,
  issues: string[]
): AdsRenderEligibleCandidate | null {
  const startIssueCount = issues.length;

  if (!isRecord(value)) {
    issues.push("eligibleCandidate is required and must be an object.");
    return null;
  }

  rejectProhibitedFields(value, "eligibleCandidate.", issues);
  rejectUnknownFields(value, CANDIDATE_ALLOWED, "eligibleCandidate.", issues);

  validateOpaqueReference(
    value.candidateId,
    "eligibleCandidate.candidateId",
    issues
  );
  validateOpaqueReference(
    value.campaignRef,
    "eligibleCandidate.campaignRef",
    issues
  );
  validateOpaqueReference(
    value.advertiserRef,
    "eligibleCandidate.advertiserRef",
    issues
  );
  validateOpaqueReference(
    value.creativeRef,
    "eligibleCandidate.creativeRef",
    issues
  );
  validateOpaqueReference(value.adSetRef, "eligibleCandidate.adSetRef", issues);
  validateOpaqueReference(value.adRef, "eligibleCandidate.adRef", issues);

  if (
    typeof value.placementId !== "string" ||
    !isAdsPlacementId(value.placementId)
  ) {
    issues.push(
      "eligibleCandidate.placementId is not a registered Ads Platform placement."
    );
  }

  if (
    typeof value.creativeType !== "string" ||
    !isAdsPlatformCreativeType(value.creativeType)
  ) {
    issues.push(
      "eligibleCandidate.creativeType is not a supported Ads Platform creative type."
    );
  }

  const eligibility = validateEligibilityMarkers(value.eligibility, issues);

  if (issues.length > startIssueCount || eligibility === null) {
    return null;
  }

  return Object.freeze({
    candidateId: value.candidateId as string,
    campaignRef: value.campaignRef as string,
    advertiserRef: value.advertiserRef as string,
    creativeRef: value.creativeRef as string,
    placementId: value.placementId as AdsPlatformPlacementId,
    creativeType: value.creativeType as AdsPlatformCreativeType,
    adSetRef: value.adSetRef as string,
    adRef: value.adRef as string,
    eligibility,
  });
}

function validatePlacementDescriptorInput(
  value: unknown,
  issues: string[]
): AdsRenderPlacementDescriptor | null {
  const startIssueCount = issues.length;

  if (!isRecord(value)) {
    issues.push("placementDescriptor is required and must be an object.");
    return null;
  }

  rejectProhibitedFields(value, "placementDescriptor.", issues);
  rejectUnknownFields(
    value,
    PLACEMENT_ALLOWED,
    "placementDescriptor.",
    issues
  );

  if (
    typeof value.placementId !== "string" ||
    !isAdsPlacementId(value.placementId)
  ) {
    issues.push(
      "placementDescriptor.placementId is not a registered Ads Platform placement."
    );
  }

  let acceptedCreativeTypes: readonly AdsPlatformCreativeType[] | undefined;
  if ("acceptedCreativeTypes" in value) {
    if (!Array.isArray(value.acceptedCreativeTypes)) {
      issues.push(
        "placementDescriptor.acceptedCreativeTypes must be an array when provided."
      );
    } else {
      const types: AdsPlatformCreativeType[] = [];
      for (let i = 0; i < value.acceptedCreativeTypes.length; i++) {
        const entry = value.acceptedCreativeTypes[i];
        if (typeof entry !== "string" || !isAdsPlatformCreativeType(entry)) {
          issues.push(
            `placementDescriptor.acceptedCreativeTypes[${i}] is not a supported creative type.`
          );
          continue;
        }
        types.push(entry);
      }
      acceptedCreativeTypes = Object.freeze([...types]);
    }
  }

  if (issues.length > startIssueCount) {
    return null;
  }

  return Object.freeze({
    placementId: value.placementId as AdsPlatformPlacementId,
    ...(acceptedCreativeTypes !== undefined
      ? { acceptedCreativeTypes }
      : {}),
  });
}

function validateCreativeDescriptorInput(
  value: unknown,
  issues: string[]
): AdsRenderCreativeDescriptor | null {
  const startIssueCount = issues.length;

  if (!isRecord(value)) {
    issues.push("creativeDescriptor is required and must be an object.");
    return null;
  }

  rejectProhibitedFields(value, "creativeDescriptor.", issues);
  rejectUnknownFields(value, CREATIVE_ALLOWED, "creativeDescriptor.", issues);

  validateOpaqueReference(
    value.creativeReference,
    "creativeDescriptor.creativeReference",
    issues
  );
  validateOpaqueReference(
    value.mediaReference,
    "creativeDescriptor.mediaReference",
    issues
  );
  validateOpaqueReference(
    value.thumbnailReference,
    "creativeDescriptor.thumbnailReference",
    issues,
    { allowNull: true }
  );
  validateOpaqueReference(
    value.clickDestinationReference,
    "creativeDescriptor.clickDestinationReference",
    issues
  );

  if (
    typeof value.creativeType !== "string" ||
    !isAdsPlatformCreativeType(value.creativeType)
  ) {
    issues.push(
      "creativeDescriptor.creativeType is not a supported Ads Platform creative type."
    );
  }

  if (issues.length > startIssueCount) {
    return null;
  }

  return Object.freeze({
    creativeReference: value.creativeReference as string,
    creativeType: value.creativeType as AdsPlatformCreativeType,
    mediaReference: value.mediaReference as string,
    thumbnailReference: (value.thumbnailReference as string | null) ?? null,
    clickDestinationReference: value.clickDestinationReference as string,
  });
}

/**
 * Pure shape validator for Render Descriptor Pipeline Result V1.
 * Fail-closed — does not render or deliver ads.
 */
export function validateAdsRenderDescriptorPipelineResult(
  input: unknown,
  options: { nowMs?: number } = {}
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Render descriptor pipeline result must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  rejectUnknownFields(input, RESULT_ALLOWED, "", issues);

  if (
    input.contractVersion !== ADS_RENDER_DESCRIPTOR_PIPELINE_CONTRACT_VERSION
  ) {
    issues.push(
      `contractVersion must be "${ADS_RENDER_DESCRIPTOR_PIPELINE_CONTRACT_VERSION}".`
    );
  }

  if (typeof input.renderAccepted !== "boolean") {
    issues.push("renderAccepted must be a boolean.");
  }
  if (typeof input.renderRejected !== "boolean") {
    issues.push("renderRejected must be a boolean.");
  }
  if (
    typeof input.renderAccepted === "boolean" &&
    typeof input.renderRejected === "boolean" &&
    input.renderAccepted === input.renderRejected
  ) {
    issues.push("renderAccepted and renderRejected must be opposites.");
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }
  if (input.deliveryEnabled !== false) {
    issues.push("deliveryEnabled must be false.");
  }

  if (
    typeof input.pipelineStage !== "string" ||
    !STAGE_SET.has(input.pipelineStage)
  ) {
    issues.push(
      `pipelineStage must be one of: ${ADS_RENDER_DESCRIPTOR_PIPELINE_STAGES.join(", ")}.`
    );
  }

  if (!isRecord(input.diagnostics)) {
    issues.push("diagnostics is required and must be an object.");
  } else {
    rejectUnknownFields(
      input.diagnostics,
      DIAGNOSTICS_ALLOWED,
      "diagnostics.",
      issues
    );
    if (
      input.diagnostics.candidateId !== null &&
      !isNonEmptyString(input.diagnostics.candidateId)
    ) {
      issues.push("diagnostics.candidateId must be a non-empty string or null.");
    }
    if (
      input.diagnostics.candidatePlacementId !== null &&
      (typeof input.diagnostics.candidatePlacementId !== "string" ||
        !isAdsPlacementId(input.diagnostics.candidatePlacementId))
    ) {
      issues.push(
        "diagnostics.candidatePlacementId must be a registered placement or null."
      );
    }
    if (
      input.diagnostics.bindingPlacementId !== null &&
      (typeof input.diagnostics.bindingPlacementId !== "string" ||
        !isAdsPlacementId(input.diagnostics.bindingPlacementId))
    ) {
      issues.push(
        "diagnostics.bindingPlacementId must be a registered placement or null."
      );
    }
    if (
      input.diagnostics.creativeType !== null &&
      (typeof input.diagnostics.creativeType !== "string" ||
        !isAdsPlatformCreativeType(input.diagnostics.creativeType))
    ) {
      issues.push(
        "diagnostics.creativeType must be a supported creative type or null."
      );
    }
    if (
      input.diagnostics.creativeReference !== null &&
      !isNonEmptyString(input.diagnostics.creativeReference)
    ) {
      issues.push(
        "diagnostics.creativeReference must be a non-empty string or null."
      );
    }
    if (typeof input.diagnostics.bindingAccepted !== "boolean") {
      issues.push("diagnostics.bindingAccepted must be a boolean.");
    }
    if (
      input.diagnostics.rejectionReason !== null &&
      (typeof input.diagnostics.rejectionReason !== "string" ||
        !REJECTION_REASON_SET.has(input.diagnostics.rejectionReason))
    ) {
      issues.push(
        "diagnostics.rejectionReason must be a known rejection reason or null."
      );
    }
  }

  if (input.renderAccepted === true) {
    if (input.pipelineStage !== "result") {
      issues.push('pipelineStage must be "result" when renderAccepted is true.');
    }
    if (input.renderDescriptor === null || input.renderDescriptor === undefined) {
      issues.push("renderDescriptor is required when renderAccepted is true.");
    } else {
      const descriptorValidation = validateAdsRenderDescriptor(
        input.renderDescriptor,
        { nowMs: options.nowMs }
      );
      if (!descriptorValidation.valid) {
        issues.push(
          ...descriptorValidation.issues.map(
            (issue) => `renderDescriptor: ${issue}`
          )
        );
      }
    }
    if (isRecord(input.diagnostics)) {
      if (input.diagnostics.bindingAccepted !== true) {
        issues.push(
          "diagnostics.bindingAccepted must be true when renderAccepted is true."
        );
      }
      if (input.diagnostics.rejectionReason !== null) {
        issues.push(
          "diagnostics.rejectionReason must be null when renderAccepted is true."
        );
      }
    }
  }

  if (input.renderRejected === true) {
    if (input.renderDescriptor !== null) {
      issues.push("renderDescriptor must be null when renderRejected is true.");
    }
    if (input.pipelineStage === "result") {
      issues.push(
        'pipelineStage must not be "result" when renderRejected is true.'
      );
    }
    if (isRecord(input.diagnostics)) {
      if (input.diagnostics.bindingAccepted !== false) {
        issues.push(
          "diagnostics.bindingAccepted must be false when renderRejected is true."
        );
      }
      if (
        typeof input.diagnostics.rejectionReason !== "string" ||
        !REJECTION_REASON_SET.has(input.diagnostics.rejectionReason)
      ) {
        issues.push(
          "diagnostics.rejectionReason is required when renderRejected is true."
        );
      }
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Runs the Render Descriptor Pipeline on an eligible candidate + bindings.
 * Stages: Validate → Bind Placement → Bind Creative → Build Descriptor → Result.
 * Deterministic: identical inputs → identical outputs. Never renders or delivers.
 * Does not mutate input objects.
 */
export function runAdsRenderDescriptorPipeline(
  input: unknown
): AdsRenderDescriptorPipelineOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Render descriptor pipeline input must be an object.",
      ]),
    };
  }

  const parseIssues: string[] = [];
  rejectProhibitedFields(input, "", parseIssues);
  rejectUnknownFields(input, INPUT_ALLOWED, "", parseIssues);

  const candidate = validateEligibleCandidateInput(
    input.eligibleCandidate,
    parseIssues
  );
  const placementDescriptor = validatePlacementDescriptorInput(
    input.placementDescriptor,
    parseIssues
  );
  const creativeDescriptor = validateCreativeDescriptorInput(
    input.creativeDescriptor,
    parseIssues
  );

  validateOpaqueReference(
    input.impressionHandle,
    "impressionHandle",
    parseIssues
  );
  validateOpaqueReference(input.clickHandle, "clickHandle", parseIssues);

  const impressionToken = validateAdsReportingHandleOpaqueToken(
    input.impressionHandle,
    "impressionHandle"
  );
  if (!impressionToken.valid) {
    parseIssues.push(...impressionToken.issues);
  }
  const clickToken = validateAdsReportingHandleOpaqueToken(
    input.clickHandle,
    "clickHandle"
  );
  if (!clickToken.valid) {
    parseIssues.push(...clickToken.issues);
  }

  if (
    typeof input.disclosureLabel !== "string" ||
    !isAdsRenderDisclosureLabel(input.disclosureLabel)
  ) {
    parseIssues.push("disclosureLabel is not a supported disclosure label.");
  }

  validateCacheHintsInput(input.cacheHints, parseIssues);
  validateOpaqueReference(input.expiresAt, "expiresAt", parseIssues);
  if (parseIsoTimestampMs(input.expiresAt) === null) {
    parseIssues.push("expiresAt must be a valid ISO-8601 timestamp.");
  }

  const nowMs = parseIsoTimestampMs(input.currentTimestamp);
  if (nowMs === null) {
    parseIssues.push("currentTimestamp must be a valid ISO-8601 timestamp.");
  }

  if (typeof input.viewerAgeGatePassed !== "boolean") {
    parseIssues.push("viewerAgeGatePassed must be a boolean.");
  }

  const authoritativeTracking =
    candidate !== null ? deriveAdsRenderTrackingReferences(candidate) : null;

  if ("trackingReferences" in input && input.trackingReferences !== undefined) {
    if (authoritativeTracking === null) {
      parseIssues.push(
        "trackingReferences cannot be validated without a valid eligibleCandidate."
      );
    } else {
      validateTrackingReferencesEcho(
        input.trackingReferences,
        authoritativeTracking,
        parseIssues
      );
    }
  }

  if (
    isNonEmptyString(input.impressionHandle) &&
    isNonEmptyString(input.clickHandle) &&
    input.impressionHandle === input.clickHandle
  ) {
    parseIssues.push(
      "impressionHandle and clickHandle must be distinct opaque tokens."
    );
  }

  if (
    parseIssues.length > 0 ||
    candidate === null ||
    placementDescriptor === null ||
    creativeDescriptor === null ||
    nowMs === null ||
    typeof input.viewerAgeGatePassed !== "boolean"
  ) {
    return {
      valid: false,
      issues: Object.freeze(
        parseIssues.length > 0
          ? [...parseIssues]
          : ["Render descriptor pipeline input is malformed."]
      ),
    };
  }

  const typedInput = input as AdsRenderDescriptorPipelineInput;
  const trackingReferences = deriveAdsRenderTrackingReferences(candidate);

  const baseDiagnostics = {
    candidateId: candidate.candidateId,
    candidatePlacementId: candidate.placementId,
    bindingPlacementId: placementDescriptor.placementId,
    creativeType: candidate.creativeType,
    creativeReference: candidate.creativeRef,
  } as const;

  // --- Validate (eligibility) ---
  const eligibilityRejection = evaluateAdsRenderCandidateEligibility(
    candidate.eligibility,
    typedInput.viewerAgeGatePassed
  );
  if (eligibilityRejection !== null) {
    const result = rejectedResult(
      "validate",
      eligibilityRejection,
      baseDiagnostics
    );
    const validation = validateAdsRenderDescriptorPipelineResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  // --- Bind Placement ---
  if (placementDescriptor.placementId !== candidate.placementId) {
    const result = rejectedResult("bind_placement", "placement_mismatch", {
      ...baseDiagnostics,
      candidatePlacementId: candidate.placementId,
      bindingPlacementId: placementDescriptor.placementId,
    });
    const validation = validateAdsRenderDescriptorPipelineResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  if (
    placementDescriptor.acceptedCreativeTypes !== undefined &&
    !placementDescriptor.acceptedCreativeTypes.includes(candidate.creativeType)
  ) {
    const result = rejectedResult("bind_placement", "unsupported_creative", {
      ...baseDiagnostics,
    });
    const validation = validateAdsRenderDescriptorPipelineResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  if (
    !isCreativeTypeSupportedByPlacement(
      candidate.placementId,
      candidate.creativeType
    )
  ) {
    const result = rejectedResult(
      "bind_placement",
      "placement_incompatible",
      baseDiagnostics
    );
    const validation = validateAdsRenderDescriptorPipelineResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  // --- Bind Creative ---
  if (creativeDescriptor.creativeReference !== candidate.creativeRef) {
    const result = rejectedResult("bind_creative", "creative_mismatch", {
      ...baseDiagnostics,
      creativeReference: creativeDescriptor.creativeReference,
    });
    const validation = validateAdsRenderDescriptorPipelineResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  if (creativeDescriptor.creativeType !== candidate.creativeType) {
    const result = rejectedResult("bind_creative", "creative_mismatch", {
      ...baseDiagnostics,
      creativeType: creativeDescriptor.creativeType,
    });
    const validation = validateAdsRenderDescriptorPipelineResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  // --- Build Descriptor ---
  // Identity fields always from authoritative candidate / matched creative binding.
  const draft: Record<string, unknown> = {
    descriptorVersion: ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
    placementId: candidate.placementId,
    creativeReference: candidate.creativeRef,
    creativeType: candidate.creativeType,
    mediaReference: creativeDescriptor.mediaReference,
    thumbnailReference: creativeDescriptor.thumbnailReference,
    clickDestinationReference: creativeDescriptor.clickDestinationReference,
    disclosure: {
      label: typedInput.disclosureLabel,
      mustDisplay: true,
    },
    reportingHandles: {
      impressionHandle: typedInput.impressionHandle,
      clickHandle: typedInput.clickHandle,
    },
    trackingReferences,
    cacheHints: typedInput.cacheHints,
    expiresAt: typedInput.expiresAt,
    productionEnabled: false,
  };

  const buildOutcome = buildAdsRenderDescriptor(draft, { nowMs });
  if (!buildOutcome.valid) {
    const result = rejectedResult(
      "build_descriptor",
      "invalid_descriptor",
      baseDiagnostics
    );
    const validation = validateAdsRenderDescriptorPipelineResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...buildOutcome.issues.map(
            (issue) => `Invalid descriptor: ${issue}`
          ),
          ...validation.issues,
        ]),
      };
    }
    return { valid: true, result };
  }

  // --- Result ---
  const result = acceptedResult(
    buildOutcome.descriptor,
    freezeDiagnostics({
      candidateId: candidate.candidateId,
      candidatePlacementId: candidate.placementId,
      bindingPlacementId: placementDescriptor.placementId,
      creativeType: candidate.creativeType,
      creativeReference: candidate.creativeRef,
      bindingAccepted: true,
      rejectionReason: null,
    })
  );

  const validation = validateAdsRenderDescriptorPipelineResult(result, {
    nowMs,
  });
  if (!validation.valid) {
    return { valid: false, issues: Object.freeze([...validation.issues]) };
  }

  return { valid: true, result };
}

/**
 * Lists fixed pipeline stages for helper / documentation consumers.
 */
export function listAdsRenderDescriptorPipelineStages(): readonly AdsRenderDescriptorPipelineStage[] {
  return Object.freeze([...ADS_RENDER_DESCRIPTOR_PIPELINE_STAGES]);
}

/**
 * Lists stable pipeline rejection reasons.
 */
export function listAdsRenderDescriptorPipelineRejectionReasons(): readonly AdsRenderDescriptorPipelineRejectionReason[] {
  return Object.freeze([...ADS_RENDER_DESCRIPTOR_PIPELINE_REJECTION_REASONS]);
}
