import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import {
  isAdsPlacementId,
  type AdsPlatformPlacementId,
} from "./placementRegistry";
import type { AdsRenderDescriptor } from "./renderDescriptor";
import type { AdsRenderEligibleCandidate } from "./renderDescriptorPipeline";

/**
 * Structural identity carriers for provenance checks.
 * Avoid importing execution/delivery modules (circular dependency).
 */
export type AdsProvenanceCandidateCarrier = Readonly<{
  candidateId: string | null;
  renderDescriptor: AdsRenderDescriptor | null;
}>;

/**
 * Ads Candidate Provenance Binding V1 — identity continuity across the stack.
 *
 * Binds the candidate chosen from Candidate Selection to the same identity
 * consumed by Render Descriptor → Execution → Internal Delivery.
 *
 * Deterministic, opaque refs only. Never includes URLs, PII, media, network,
 * database, billing, ranking, or wall-clock entropy.
 *
 * productionEnabled is always false.
 */

export const ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION = "v1" as const;

/**
 * Top-level keys allowed on AdsCandidateProvenanceBinding.
 * Unknown fields fail closed.
 */
export const ADS_CANDIDATE_PROVENANCE_ALLOWED_FIELDS = [
  "contractVersion",
  "candidateId",
  "campaignRef",
  "advertiserRef",
  "creativeRef",
  "placementId",
  "adSetRef",
  "adRef",
  "selectionRequestId",
  "inventorySourceId",
  "inventoryRevision",
  "bindingToken",
  "productionEnabled",
] as const;

/**
 * Immutable provenance snapshot — authoritative selection identity.
 * bindingToken is a deterministic join of identity fields (not a signature).
 */
export type AdsCandidateProvenanceBinding = Readonly<{
  contractVersion: typeof ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION;
  candidateId: string;
  campaignRef: string;
  advertiserRef: string;
  creativeRef: string;
  placementId: AdsPlatformPlacementId;
  adSetRef: string;
  adRef: string;
  selectionRequestId: string;
  inventorySourceId: string;
  inventoryRevision: number;
  /** Deterministic opaque token — not cryptographic. */
  bindingToken: string;
  productionEnabled: false;
}>;

export type AdsCandidateProvenanceBuildOutcome =
  | Readonly<{ valid: true; provenance: AdsCandidateProvenanceBinding }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

/**
 * Issued-provenance registry — only objects produced by
 * buildAdsCandidateProvenanceBinding are accepted by Execution / Measurement.
 * Caller-reconstructed plain objects fail closed (WeakSet identity).
 */
const ISSUED_PROVENANCE_BINDINGS = new WeakSet<object>();

/**
 * True when provenance was produced by buildAdsCandidateProvenanceBinding.
 * Spread / reconstructed objects are not accepted.
 */
export function isAdsIssuedProvenanceBinding(
  value: unknown
): value is AdsCandidateProvenanceBinding {
  return (
    typeof value === "object" &&
    value !== null &&
    ISSUED_PROVENANCE_BINDINGS.has(value)
  );
}

const ALLOWED = new Set<string>(ADS_CANDIDATE_PROVENANCE_ALLOWED_FIELDS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function looksLikeUrl(value: string): boolean {
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

function validateOpaqueId(
  value: unknown,
  fieldName: string,
  issues: string[]
): value is string {
  if (!isNonEmptyString(value)) {
    issues.push(`${fieldName} is required and must be a non-empty string.`);
    return false;
  }
  if (value.length > ADS_DELIVERY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldName} exceeds max length of ${ADS_DELIVERY_MAX_ID_LENGTH}.`
    );
    return false;
  }
  if (looksLikeUrl(value)) {
    issues.push(`${fieldName} must be an opaque reference, not a URL.`);
    return false;
  }
  return true;
}

/**
 * Deterministic binding token from provenance identity fields.
 * Format is stable for V1 — never includes wall-clock entropy.
 */
export function buildAdsCandidateProvenanceBindingToken(
  parts: Readonly<{
    candidateId: string;
    campaignRef: string;
    advertiserRef: string;
    creativeRef: string;
    placementId: AdsPlatformPlacementId;
    adSetRef: string;
    adRef: string;
    selectionRequestId: string;
    inventorySourceId: string;
    inventoryRevision: number;
  }>
): string {
  return [
    ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION,
    parts.candidateId,
    parts.campaignRef,
    parts.advertiserRef,
    parts.creativeRef,
    parts.placementId,
    parts.adSetRef,
    parts.adRef,
    parts.selectionRequestId,
    parts.inventorySourceId,
    String(parts.inventoryRevision),
  ].join("|");
}

function freezeProvenance(
  provenance: AdsCandidateProvenanceBinding
): AdsCandidateProvenanceBinding {
  return Object.freeze({
    contractVersion: ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION,
    candidateId: provenance.candidateId,
    campaignRef: provenance.campaignRef,
    advertiserRef: provenance.advertiserRef,
    creativeRef: provenance.creativeRef,
    placementId: provenance.placementId,
    adSetRef: provenance.adSetRef,
    adRef: provenance.adRef,
    selectionRequestId: provenance.selectionRequestId,
    inventorySourceId: provenance.inventorySourceId,
    inventoryRevision: provenance.inventoryRevision,
    bindingToken: provenance.bindingToken,
    productionEnabled: false as const,
  });
}

/**
 * Builds an immutable provenance binding. Fail closed.
 */
export function buildAdsCandidateProvenanceBinding(input: Readonly<{
  candidateId: string;
  campaignRef: string;
  advertiserRef: string;
  creativeRef: string;
  placementId: AdsPlatformPlacementId;
  adSetRef: string;
  adRef: string;
  selectionRequestId: string;
  inventorySourceId: string;
  inventoryRevision: number;
}>): AdsCandidateProvenanceBuildOutcome {
  const issues: string[] = [];

  validateOpaqueId(input.candidateId, "candidateId", issues);
  validateOpaqueId(input.campaignRef, "campaignRef", issues);
  validateOpaqueId(input.advertiserRef, "advertiserRef", issues);
  validateOpaqueId(input.creativeRef, "creativeRef", issues);
  validateOpaqueId(input.adSetRef, "adSetRef", issues);
  validateOpaqueId(input.adRef, "adRef", issues);
  validateOpaqueId(input.selectionRequestId, "selectionRequestId", issues);
  validateOpaqueId(input.inventorySourceId, "inventorySourceId", issues);

  if (!isAdsPlacementId(input.placementId)) {
    issues.push("placementId is not a registered Ads Platform placement.");
  }
  if (!isPositiveInteger(input.inventoryRevision)) {
    issues.push("inventoryRevision must be a positive integer.");
  }

  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  const bindingToken = buildAdsCandidateProvenanceBindingToken({
    candidateId: input.candidateId,
    campaignRef: input.campaignRef,
    advertiserRef: input.advertiserRef,
    creativeRef: input.creativeRef,
    placementId: input.placementId,
    adSetRef: input.adSetRef,
    adRef: input.adRef,
    selectionRequestId: input.selectionRequestId,
    inventorySourceId: input.inventorySourceId,
    inventoryRevision: input.inventoryRevision,
  });

  const provenance = freezeProvenance({
    contractVersion: ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION,
    candidateId: input.candidateId,
    campaignRef: input.campaignRef,
    advertiserRef: input.advertiserRef,
    creativeRef: input.creativeRef,
    placementId: input.placementId,
    adSetRef: input.adSetRef,
    adRef: input.adRef,
    selectionRequestId: input.selectionRequestId,
    inventorySourceId: input.inventorySourceId,
    inventoryRevision: input.inventoryRevision,
    bindingToken,
    productionEnabled: false,
  });
  ISSUED_PROVENANCE_BINDINGS.add(provenance);

  return {
    valid: true,
    provenance,
  };
}

/**
 * Pure shape validator for provenance bindings. Fail closed.
 */
export function validateAdsCandidateProvenanceBinding(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Candidate provenance binding must be an object."]),
    };
  }

  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!ALLOWED.has(key)) {
      issues.push(`unknown field "${key}" is not allowed.`);
    }
  }

  if (input.contractVersion !== ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION}".`
    );
  }
  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  validateOpaqueId(input.candidateId, "candidateId", issues);
  validateOpaqueId(input.campaignRef, "campaignRef", issues);
  validateOpaqueId(input.advertiserRef, "advertiserRef", issues);
  validateOpaqueId(input.creativeRef, "creativeRef", issues);
  validateOpaqueId(input.adSetRef, "adSetRef", issues);
  validateOpaqueId(input.adRef, "adRef", issues);
  validateOpaqueId(input.selectionRequestId, "selectionRequestId", issues);
  validateOpaqueId(input.inventorySourceId, "inventorySourceId", issues);
  validateOpaqueId(input.bindingToken, "bindingToken", issues);

  if (
    typeof input.placementId !== "string" ||
    !isAdsPlacementId(input.placementId)
  ) {
    issues.push("placementId is not a registered Ads Platform placement.");
  }
  if (!isPositiveInteger(input.inventoryRevision)) {
    issues.push("inventoryRevision must be a positive integer.");
  }

  if (
    issues.length === 0 &&
    isNonEmptyString(input.candidateId) &&
    isNonEmptyString(input.campaignRef) &&
    isNonEmptyString(input.advertiserRef) &&
    isNonEmptyString(input.creativeRef) &&
    isNonEmptyString(input.adSetRef) &&
    isNonEmptyString(input.adRef) &&
    isNonEmptyString(input.selectionRequestId) &&
    isNonEmptyString(input.inventorySourceId) &&
    isNonEmptyString(input.bindingToken) &&
    typeof input.placementId === "string" &&
    isAdsPlacementId(input.placementId) &&
    isPositiveInteger(input.inventoryRevision)
  ) {
    const expected = buildAdsCandidateProvenanceBindingToken({
      candidateId: input.candidateId,
      campaignRef: input.campaignRef,
      advertiserRef: input.advertiserRef,
      creativeRef: input.creativeRef,
      placementId: input.placementId,
      adSetRef: input.adSetRef,
      adRef: input.adRef,
      selectionRequestId: input.selectionRequestId,
      inventorySourceId: input.inventorySourceId,
      inventoryRevision: input.inventoryRevision,
    });
    if (input.bindingToken !== expected) {
      issues.push("bindingToken does not match provenance identity fields.");
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Asserts provenance matches a render-eligible candidate (no client rebuild).
 */
export function assertProvenanceMatchesRenderEligible(
  provenance: AdsCandidateProvenanceBinding,
  eligible: AdsRenderEligibleCandidate
): ContractValidationResult {
  const issues: string[] = [];
  if (provenance.candidateId !== eligible.candidateId) {
    issues.push("provenance.candidateId mismatch against eligibleCandidate.");
  }
  if (provenance.campaignRef !== eligible.campaignRef) {
    issues.push("provenance.campaignRef mismatch against eligibleCandidate.");
  }
  if (provenance.advertiserRef !== eligible.advertiserRef) {
    issues.push("provenance.advertiserRef mismatch against eligibleCandidate.");
  }
  if (provenance.creativeRef !== eligible.creativeRef) {
    issues.push("provenance.creativeRef mismatch against eligibleCandidate.");
  }
  if (provenance.placementId !== eligible.placementId) {
    issues.push("provenance.placementId mismatch against eligibleCandidate.");
  }
  if (provenance.adSetRef !== eligible.adSetRef) {
    issues.push("provenance.adSetRef mismatch against eligibleCandidate.");
  }
  if (provenance.adRef !== eligible.adRef) {
    issues.push("provenance.adRef mismatch against eligibleCandidate.");
  }
  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Asserts provenance matches a render descriptor's identity fields.
 */
export function assertProvenanceMatchesRenderDescriptor(
  provenance: AdsCandidateProvenanceBinding,
  descriptor: AdsRenderDescriptor
): ContractValidationResult {
  const issues: string[] = [];
  if (provenance.placementId !== descriptor.placementId) {
    issues.push("provenance.placementId mismatch against renderDescriptor.");
  }
  if (provenance.creativeRef !== descriptor.creativeReference) {
    issues.push(
      "provenance.creativeRef mismatch against renderDescriptor.creativeReference."
    );
  }
  if (provenance.campaignRef !== descriptor.trackingReferences.campaignId) {
    issues.push(
      "provenance.campaignRef mismatch against trackingReferences.campaignId."
    );
  }
  if (provenance.adSetRef !== descriptor.trackingReferences.adSetId) {
    issues.push(
      "provenance.adSetRef mismatch against trackingReferences.adSetId."
    );
  }
  if (provenance.adRef !== descriptor.trackingReferences.adId) {
    issues.push("provenance.adRef mismatch against trackingReferences.adId.");
  }
  if (provenance.creativeRef !== descriptor.trackingReferences.creativeId) {
    issues.push(
      "provenance.creativeRef mismatch against trackingReferences.creativeId."
    );
  }
  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Asserts provenance matches an accepted execution or delivery carrier.
 * Label distinguishes diagnostic wording (executionResult vs deliveryResult).
 */
export function assertProvenanceMatchesCandidateCarrier(
  provenance: AdsCandidateProvenanceBinding,
  carrier: AdsProvenanceCandidateCarrier,
  label: "executionResult" | "deliveryResult" = "executionResult"
): ContractValidationResult {
  const issues: string[] = [];
  if (carrier.candidateId !== provenance.candidateId) {
    issues.push(`provenance.candidateId mismatch against ${label}.`);
  }
  if (carrier.renderDescriptor === null) {
    issues.push(
      `${label}.renderDescriptor is required for provenance binding.`
    );
    return { valid: false, issues: Object.freeze([...issues]) };
  }
  const descriptorCheck = assertProvenanceMatchesRenderDescriptor(
    provenance,
    carrier.renderDescriptor
  );
  if (!descriptorCheck.valid) {
    issues.push(...descriptorCheck.issues);
  }
  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/** Convenience alias — execution internal result carrier. */
export function assertProvenanceMatchesExecutionResult(
  provenance: AdsCandidateProvenanceBinding,
  execution: AdsProvenanceCandidateCarrier
): ContractValidationResult {
  return assertProvenanceMatchesCandidateCarrier(
    provenance,
    execution,
    "executionResult"
  );
}

/** Convenience alias — internal delivery V1 result carrier. */
export function assertProvenanceMatchesDeliveryResult(
  provenance: AdsCandidateProvenanceBinding,
  delivery: AdsProvenanceCandidateCarrier
): ContractValidationResult {
  return assertProvenanceMatchesCandidateCarrier(
    provenance,
    delivery,
    "deliveryResult"
  );
}
