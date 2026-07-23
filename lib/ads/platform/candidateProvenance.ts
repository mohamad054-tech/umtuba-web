import { createHash } from "node:crypto";
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
 * Ads Candidate Provenance Foundation V1 — structured identity continuity.
 *
 * Authoritative identity is the structured field set, not `bindingToken`.
 * `bindingToken` / `provenanceFingerprint` are bounded deterministic digests
 * of binding+placement identity (compatibility + logs). They are never
 * caller-authoritative and never grant delivery/billing authority.
 *
 * productionEnabled is always false.
 */

export const ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION = "v1" as const;

/** Prefix for bounded compatibility digests (always ≪ ADS_DELIVERY_MAX_ID_LENGTH). */
export const ADS_PROVENANCE_FINGERPRINT_PREFIX = "ap1:" as const;

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
  "domainPlacement",
  "adSetRef",
  "adRef",
  "selectionRequestId",
  "inventorySourceId",
  "inventoryRevision",
  "moderationSnapshotRef",
  "provenanceFingerprint",
  "bindingToken",
  "bindingTokenAuthoritative",
  "productionEnabled",
] as const;

/**
 * Binding+placement identity used for the deterministic fingerprint.
 * Excludes request-scoped correlation (selectionRequestId / inventory markers).
 */
export type AdsCandidateProvenanceFingerprintParts = Readonly<{
  advertiserRef: string;
  campaignRef: string;
  adSetRef: string;
  creativeRef: string;
  adRef: string;
  domainPlacement: string;
  placementId: AdsPlatformPlacementId;
  candidateId: string;
}>;

/**
 * Bridge-carried structured provenance identity (not WeakSet-issued).
 * Validated at inventory construction; stack issuance happens in the adapter.
 */
export type AdsBridgeCandidateProvenanceV1 = Readonly<{
  contractVersion: typeof ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION;
  advertiserAccountId: string;
  campaignId: string;
  adSetId: string;
  creativeId: string;
  /** Deliverable binding / ad id. */
  adId: string;
  domainPlacement: string;
  placementId: AdsPlatformPlacementId;
  candidateId: string;
  inventorySource: string;
  moderationSnapshotRef: string;
  provenanceFingerprint: string;
  productionEnabled: false;
  bindingTokenAuthoritative: false;
}>;

/**
 * Immutable provenance snapshot — authoritative selection identity.
 * Structured fields are the contract. bindingToken is a non-authoritative
 * compatibility digest derived from provenanceFingerprint.
 */
export type AdsCandidateProvenanceBinding = Readonly<{
  contractVersion: typeof ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION;
  candidateId: string;
  /** Campaign id (opaque ref). */
  campaignRef: string;
  /** Advertiser account id (opaque ref). */
  advertiserRef: string;
  /** Creative id (opaque ref). */
  creativeRef: string;
  /** Canonical platform placement. */
  placementId: AdsPlatformPlacementId;
  /** Domain placement wire form (e.g. watch_feed). */
  domainPlacement: string;
  adSetRef: string;
  /** Deliverable binding / ad id. */
  adRef: string;
  selectionRequestId: string;
  inventorySourceId: string;
  inventoryRevision: number;
  moderationSnapshotRef: string;
  /** Deterministic bounded digest of binding+placement identity. */
  provenanceFingerprint: string;
  /**
   * Compatibility reference — same value as provenanceFingerprint.
   * Non-authoritative; never pipe-joins UUID identity fields.
   */
  bindingToken: string;
  bindingTokenAuthoritative: false;
  productionEnabled: false;
}>;

export type AdsCandidateProvenanceBuildOutcome =
  | Readonly<{ valid: true; provenance: AdsCandidateProvenanceBinding }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsBridgeProvenanceBuildOutcome =
  | Readonly<{ valid: true; provenance: AdsBridgeCandidateProvenanceV1 }>
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

const BRIDGE_ALLOWED = new Set([
  "contractVersion",
  "advertiserAccountId",
  "campaignId",
  "adSetId",
  "creativeId",
  "adId",
  "domainPlacement",
  "placementId",
  "candidateId",
  "inventorySource",
  "moderationSnapshotRef",
  "provenanceFingerprint",
  "productionEnabled",
  "bindingTokenAuthoritative",
]);

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
 * Canonical material for the binding+placement fingerprint.
 * Stable across selectionRequestId / inventory source overrides.
 */
export function buildAdsCandidateProvenanceFingerprintMaterial(
  parts: AdsCandidateProvenanceFingerprintParts
): string {
  return [
    ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION,
    parts.advertiserRef.trim(),
    parts.campaignRef.trim(),
    parts.adSetRef.trim(),
    parts.creativeRef.trim(),
    parts.adRef.trim(),
    parts.domainPlacement.trim(),
    parts.placementId,
    parts.candidateId.trim(),
  ].join("\0");
}

/**
 * Deterministic bounded provenance fingerprint (server-side, no network).
 * Format: `ap1:` + sha256 hex (68 chars) — never pipe-joins raw UUIDs.
 */
export function buildAdsCandidateProvenanceFingerprint(
  parts: AdsCandidateProvenanceFingerprintParts
): string {
  const digest = createHash("sha256")
    .update(buildAdsCandidateProvenanceFingerprintMaterial(parts), "utf8")
    .digest("hex");
  return `${ADS_PROVENANCE_FINGERPRINT_PREFIX}${digest}`;
}

/**
 * Compatibility bindingToken — non-authoritative digest alias.
 * Retained for contracts that still expect `bindingToken`.
 */
export function buildAdsCandidateProvenanceBindingToken(
  parts: AdsCandidateProvenanceFingerprintParts
): string {
  return buildAdsCandidateProvenanceFingerprint(parts);
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
    domainPlacement: provenance.domainPlacement,
    adSetRef: provenance.adSetRef,
    adRef: provenance.adRef,
    selectionRequestId: provenance.selectionRequestId,
    inventorySourceId: provenance.inventorySourceId,
    inventoryRevision: provenance.inventoryRevision,
    moderationSnapshotRef: provenance.moderationSnapshotRef,
    provenanceFingerprint: provenance.provenanceFingerprint,
    bindingToken: provenance.bindingToken,
    bindingTokenAuthoritative: false as const,
    productionEnabled: false as const,
  });
}

function freezeBridgeProvenance(
  provenance: AdsBridgeCandidateProvenanceV1
): AdsBridgeCandidateProvenanceV1 {
  return Object.freeze({
    contractVersion: ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION,
    advertiserAccountId: provenance.advertiserAccountId,
    campaignId: provenance.campaignId,
    adSetId: provenance.adSetId,
    creativeId: provenance.creativeId,
    adId: provenance.adId,
    domainPlacement: provenance.domainPlacement,
    placementId: provenance.placementId,
    candidateId: provenance.candidateId,
    inventorySource: provenance.inventorySource,
    moderationSnapshotRef: provenance.moderationSnapshotRef,
    provenanceFingerprint: provenance.provenanceFingerprint,
    productionEnabled: false as const,
    bindingTokenAuthoritative: false as const,
  });
}

/**
 * Build bridge-carried structured provenance for an eligible inventory candidate.
 * Fail closed on missing/malformed IDs or placement/candidate disagreement.
 */
export function buildAdsBridgeCandidateProvenance(input: Readonly<{
  advertiserAccountId: string;
  campaignId: string;
  adSetId: string;
  creativeId: string;
  adId: string;
  domainPlacement: string;
  placementId: AdsPlatformPlacementId;
  candidateId: string;
  inventorySource: string;
  moderationSnapshotRef: string;
}>): AdsBridgeProvenanceBuildOutcome {
  const issues: string[] = [];

  validateOpaqueId(input.advertiserAccountId, "advertiserAccountId", issues);
  validateOpaqueId(input.campaignId, "campaignId", issues);
  validateOpaqueId(input.adSetId, "adSetId", issues);
  validateOpaqueId(input.creativeId, "creativeId", issues);
  validateOpaqueId(input.adId, "adId", issues);
  validateOpaqueId(input.domainPlacement, "domainPlacement", issues);
  validateOpaqueId(input.candidateId, "candidateId", issues);
  validateOpaqueId(input.inventorySource, "inventorySource", issues);
  validateOpaqueId(
    input.moderationSnapshotRef,
    "moderationSnapshotRef",
    issues
  );

  if (!isAdsPlacementId(input.placementId)) {
    issues.push("placementId is not a registered Ads Platform placement.");
  }

  const expectedCandidateId = `${input.adId}:${input.placementId}`;
  if (
    isNonEmptyString(input.candidateId) &&
    input.candidateId !== expectedCandidateId
  ) {
    issues.push(
      "candidateId must equal `${adId}:${placementId}` for bridge provenance."
    );
  }

  if (issues.length > 0 || !isAdsPlacementId(input.placementId)) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  const fingerprint = buildAdsCandidateProvenanceFingerprint({
    advertiserRef: input.advertiserAccountId,
    campaignRef: input.campaignId,
    adSetRef: input.adSetId,
    creativeRef: input.creativeId,
    adRef: input.adId,
    domainPlacement: input.domainPlacement,
    placementId: input.placementId,
    candidateId: input.candidateId,
  });

  return {
    valid: true,
    provenance: freezeBridgeProvenance({
      contractVersion: ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION,
      advertiserAccountId: input.advertiserAccountId.trim(),
      campaignId: input.campaignId.trim(),
      adSetId: input.adSetId.trim(),
      creativeId: input.creativeId.trim(),
      adId: input.adId.trim(),
      domainPlacement: input.domainPlacement.trim(),
      placementId: input.placementId,
      candidateId: input.candidateId.trim(),
      inventorySource: input.inventorySource.trim(),
      moderationSnapshotRef: input.moderationSnapshotRef.trim(),
      provenanceFingerprint: fingerprint,
      productionEnabled: false,
      bindingTokenAuthoritative: false,
    }),
  };
}

/**
 * Pure shape validator for bridge provenance identity. Fail closed.
 */
export function validateAdsBridgeCandidateProvenance(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Bridge candidate provenance must be an object."]),
    };
  }
  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!BRIDGE_ALLOWED.has(key)) {
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
  if (input.bindingTokenAuthoritative !== false) {
    issues.push("bindingTokenAuthoritative must be false.");
  }
  validateOpaqueId(input.advertiserAccountId, "advertiserAccountId", issues);
  validateOpaqueId(input.campaignId, "campaignId", issues);
  validateOpaqueId(input.adSetId, "adSetId", issues);
  validateOpaqueId(input.creativeId, "creativeId", issues);
  validateOpaqueId(input.adId, "adId", issues);
  validateOpaqueId(input.domainPlacement, "domainPlacement", issues);
  validateOpaqueId(input.candidateId, "candidateId", issues);
  validateOpaqueId(input.inventorySource, "inventorySource", issues);
  validateOpaqueId(
    input.moderationSnapshotRef,
    "moderationSnapshotRef",
    issues
  );
  validateOpaqueId(
    input.provenanceFingerprint,
    "provenanceFingerprint",
    issues
  );
  if (
    typeof input.placementId !== "string" ||
    !isAdsPlacementId(input.placementId)
  ) {
    issues.push("placementId is not a registered Ads Platform placement.");
  }

  if (
    issues.length === 0 &&
    isNonEmptyString(input.advertiserAccountId) &&
    isNonEmptyString(input.campaignId) &&
    isNonEmptyString(input.adSetId) &&
    isNonEmptyString(input.creativeId) &&
    isNonEmptyString(input.adId) &&
    isNonEmptyString(input.domainPlacement) &&
    isNonEmptyString(input.candidateId) &&
    typeof input.placementId === "string" &&
    isAdsPlacementId(input.placementId)
  ) {
    const expected = buildAdsCandidateProvenanceFingerprint({
      advertiserRef: input.advertiserAccountId,
      campaignRef: input.campaignId,
      adSetRef: input.adSetId,
      creativeRef: input.creativeId,
      adRef: input.adId,
      domainPlacement: input.domainPlacement,
      placementId: input.placementId,
      candidateId: input.candidateId,
    });
    if (input.provenanceFingerprint !== expected) {
      issues.push(
        "provenanceFingerprint does not match bridge identity fields."
      );
    }
    if (input.candidateId !== `${input.adId}:${input.placementId}`) {
      issues.push(
        "candidateId must equal `${adId}:${placementId}` for bridge provenance."
      );
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Assert bridge provenance identity matches selection candidate refs/placement.
 */
export function assertBridgeProvenanceMatchesCandidate(
  provenance: AdsBridgeCandidateProvenanceV1,
  candidate: Readonly<{
    candidateId: string;
    campaignRef: string;
    advertiserRef: string;
    creativeRef: string;
    adSetRef: string;
    adRef: string;
    placementId: AdsPlatformPlacementId;
  }>
): ContractValidationResult {
  const issues: string[] = [];
  if (provenance.candidateId !== candidate.candidateId) {
    issues.push("bridge provenance candidateId mismatch.");
  }
  if (provenance.campaignId !== candidate.campaignRef) {
    issues.push("bridge provenance campaignId mismatch.");
  }
  if (provenance.advertiserAccountId !== candidate.advertiserRef) {
    issues.push("bridge provenance advertiserAccountId mismatch.");
  }
  if (provenance.creativeId !== candidate.creativeRef) {
    issues.push("bridge provenance creativeId mismatch.");
  }
  if (provenance.adSetId !== candidate.adSetRef) {
    issues.push("bridge provenance adSetId mismatch.");
  }
  if (provenance.adId !== candidate.adRef) {
    issues.push("bridge provenance adId mismatch.");
  }
  if (provenance.placementId !== candidate.placementId) {
    issues.push("bridge provenance placementId mismatch.");
  }
  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Builds an immutable issued provenance binding. Fail closed.
 */
export function buildAdsCandidateProvenanceBinding(input: Readonly<{
  candidateId: string;
  campaignRef: string;
  advertiserRef: string;
  creativeRef: string;
  placementId: AdsPlatformPlacementId;
  domainPlacement: string;
  adSetRef: string;
  adRef: string;
  selectionRequestId: string;
  inventorySourceId: string;
  inventoryRevision: number;
  moderationSnapshotRef: string;
}>): AdsCandidateProvenanceBuildOutcome {
  const issues: string[] = [];

  validateOpaqueId(input.candidateId, "candidateId", issues);
  validateOpaqueId(input.campaignRef, "campaignRef", issues);
  validateOpaqueId(input.advertiserRef, "advertiserRef", issues);
  validateOpaqueId(input.creativeRef, "creativeRef", issues);
  validateOpaqueId(input.domainPlacement, "domainPlacement", issues);
  validateOpaqueId(input.adSetRef, "adSetRef", issues);
  validateOpaqueId(input.adRef, "adRef", issues);
  validateOpaqueId(input.selectionRequestId, "selectionRequestId", issues);
  validateOpaqueId(input.inventorySourceId, "inventorySourceId", issues);
  validateOpaqueId(
    input.moderationSnapshotRef,
    "moderationSnapshotRef",
    issues
  );

  if (!isAdsPlacementId(input.placementId)) {
    issues.push("placementId is not a registered Ads Platform placement.");
  }
  if (!isPositiveInteger(input.inventoryRevision)) {
    issues.push("inventoryRevision must be a positive integer.");
  }

  if (issues.length > 0 || !isAdsPlacementId(input.placementId)) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  const fingerprintParts: AdsCandidateProvenanceFingerprintParts = {
    advertiserRef: input.advertiserRef,
    campaignRef: input.campaignRef,
    adSetRef: input.adSetRef,
    creativeRef: input.creativeRef,
    adRef: input.adRef,
    domainPlacement: input.domainPlacement,
    placementId: input.placementId,
    candidateId: input.candidateId,
  };
  const provenanceFingerprint =
    buildAdsCandidateProvenanceFingerprint(fingerprintParts);
  // Compatibility alias — never authoritative.
  const bindingToken = provenanceFingerprint;

  const provenance = freezeProvenance({
    contractVersion: ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION,
    candidateId: input.candidateId.trim(),
    campaignRef: input.campaignRef.trim(),
    advertiserRef: input.advertiserRef.trim(),
    creativeRef: input.creativeRef.trim(),
    placementId: input.placementId,
    domainPlacement: input.domainPlacement.trim(),
    adSetRef: input.adSetRef.trim(),
    adRef: input.adRef.trim(),
    selectionRequestId: input.selectionRequestId.trim(),
    inventorySourceId: input.inventorySourceId.trim(),
    inventoryRevision: input.inventoryRevision,
    moderationSnapshotRef: input.moderationSnapshotRef.trim(),
    provenanceFingerprint,
    bindingToken,
    bindingTokenAuthoritative: false,
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
  if (input.bindingTokenAuthoritative !== false) {
    issues.push("bindingTokenAuthoritative must be false.");
  }

  validateOpaqueId(input.candidateId, "candidateId", issues);
  validateOpaqueId(input.campaignRef, "campaignRef", issues);
  validateOpaqueId(input.advertiserRef, "advertiserRef", issues);
  validateOpaqueId(input.creativeRef, "creativeRef", issues);
  validateOpaqueId(input.domainPlacement, "domainPlacement", issues);
  validateOpaqueId(input.adSetRef, "adSetRef", issues);
  validateOpaqueId(input.adRef, "adRef", issues);
  validateOpaqueId(input.selectionRequestId, "selectionRequestId", issues);
  validateOpaqueId(input.inventorySourceId, "inventorySourceId", issues);
  validateOpaqueId(
    input.moderationSnapshotRef,
    "moderationSnapshotRef",
    issues
  );
  validateOpaqueId(
    input.provenanceFingerprint,
    "provenanceFingerprint",
    issues
  );
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
    isNonEmptyString(input.domainPlacement) &&
    isNonEmptyString(input.adSetRef) &&
    isNonEmptyString(input.adRef) &&
    isNonEmptyString(input.provenanceFingerprint) &&
    isNonEmptyString(input.bindingToken) &&
    typeof input.placementId === "string" &&
    isAdsPlacementId(input.placementId)
  ) {
    const expected = buildAdsCandidateProvenanceFingerprint({
      advertiserRef: input.advertiserRef,
      campaignRef: input.campaignRef,
      adSetRef: input.adSetRef,
      creativeRef: input.creativeRef,
      adRef: input.adRef,
      domainPlacement: input.domainPlacement,
      placementId: input.placementId,
      candidateId: input.candidateId,
    });
    if (input.provenanceFingerprint !== expected) {
      issues.push(
        "provenanceFingerprint does not match provenance identity fields."
      );
    }
    if (input.bindingToken !== expected) {
      issues.push(
        "bindingToken must equal provenanceFingerprint (compatibility digest)."
      );
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
