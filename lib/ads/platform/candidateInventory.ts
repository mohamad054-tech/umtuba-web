import {
  ADS_PLATFORM_CREATIVE_TYPES,
  type AdsPlatformCreativeType,
  type ContractValidationResult,
} from "./creativeContracts";
import {
  isAdsPlacementId,
  type AdsPlatformPlacementId,
} from "./placementRegistry";

/**
 * Ads Candidate Inventory Foundation V1 — canonical inventory contracts only.
 *
 * Represents the immutable candidate inventory shape a future execution engine
 * will receive. Metadata references only. This module never:
 * - loads inventory from a database
 * - imports Supabase or product modules
 * - ranks, auctions, paces, bills, or delivers ads
 * - enables ADS_DELIVERY_ENABLED or placement flags
 */

export const ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION = "v1" as const;

/** Inventory contract version identifier. */
export type InventoryVersion =
  typeof ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION;

/** Max length for opaque inventory / candidate / reference ids. */
export const ADS_CANDIDATE_INVENTORY_MAX_ID_LENGTH = 128;

/** Max candidates allowed in a single inventory snapshot. */
export const ADS_CANDIDATE_INVENTORY_MAX_CANDIDATES = 256;

/**
 * Opaque inventory origin marker — never a storage path or product import.
 */
export const ADS_CANDIDATE_INVENTORY_SOURCES = [
  "catalog",
  "manual",
  "import",
  "synthetic",
  "unknown",
] as const;

export type AdsCandidateInventorySource =
  (typeof ADS_CANDIDATE_INVENTORY_SOURCES)[number];

/**
 * Top-level keys allowed on AdsCandidateInventory.
 * Unknown fields fail closed.
 */
export const ADS_CANDIDATE_INVENTORY_ALLOWED_FIELDS = [
  "contractVersion",
  "inventoryId",
  "revision",
  "generatedAt",
  "candidates",
] as const;

/**
 * Top-level keys allowed on AdsCandidateMetadata.
 * Unknown fields fail closed.
 */
export const ADS_CANDIDATE_METADATA_ALLOWED_FIELDS = [
  "candidateId",
  "campaignRef",
  "adSetRef",
  "adRef",
  "creativeRef",
  "placement",
  "creativeType",
  "eligibilitySnapshot",
  "inventorySource",
  "revision",
  "timestamps",
] as const;

const ELIGIBILITY_SNAPSHOT_ALLOWED_FIELDS = new Set([
  "snapshotRef",
  "revision",
]);

const TIMESTAMPS_ALLOWED_FIELDS = new Set(["createdAt", "updatedAt"]);

/**
 * Field names that must never appear (URL / storage / budget / PII / media).
 */
export const ADS_CANDIDATE_INVENTORY_PROHIBITED_FIELDS = [
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
  "media",
  "budget",
  "budgets",
  "spend",
  "tracking",
  "trackingUrl",
  "pixel",
  "email",
  "phone",
  "ip",
  "fingerprint",
  "userId",
  "viewerId",
  "row",
  "rows",
  "dbRow",
] as const;

/**
 * Identity references for a candidate — opaque handles only.
 * Never DB rows, URLs, or product entities.
 */
export type AdsCandidateReference = Readonly<{
  candidateId: string;
  campaignRef: string;
  adSetRef: string;
  adRef: string;
  creativeRef: string;
}>;

/**
 * Eligibility snapshot as metadata references only.
 * Does not evaluate eligibility or encode live campaign state.
 */
export type AdsCandidateEligibilitySnapshot = Readonly<{
  snapshotRef: string;
  /** Monotonic snapshot revision — positive integer. */
  revision: number;
}>;

/** Candidate lifecycle timestamps (ISO-8601). */
export type AdsCandidateTimestamps = Readonly<{
  createdAt: string;
  updatedAt: string;
}>;

/**
 * Canonical candidate metadata for inventory.
 * References only — no media, budgets, tracking, or user data.
 */
export type AdsCandidateMetadata = Readonly<{
  candidateId: string;
  campaignRef: string;
  adSetRef: string;
  adRef: string;
  creativeRef: string;
  placement: AdsPlatformPlacementId;
  creativeType: AdsPlatformCreativeType;
  eligibilitySnapshot: AdsCandidateEligibilitySnapshot;
  inventorySource: AdsCandidateInventorySource;
  /** Monotonic candidate revision — positive integer. */
  revision: number;
  timestamps: AdsCandidateTimestamps;
}>;

/**
 * Immutable candidate inventory snapshot for a future execution engine.
 */
export type AdsCandidateInventory = Readonly<{
  contractVersion: InventoryVersion;
  inventoryId: string;
  /** Monotonic inventory revision — positive integer. */
  revision: number;
  /** ISO-8601 generation timestamp. */
  generatedAt: string;
  candidates: readonly AdsCandidateMetadata[];
}>;

/**
 * Aggregate counts only — no ranking or business decisions.
 */
export type InventorySummary = Readonly<{
  contractVersion: InventoryVersion;
  inventoryId: string;
  revision: number;
  candidateCount: number;
  placementCounts: Readonly<
    Partial<Record<AdsPlatformPlacementId, number>>
  >;
  creativeTypeCounts: Readonly<
    Partial<Record<AdsPlatformCreativeType, number>>
  >;
  inventorySourceCounts: Readonly<
    Partial<Record<AdsCandidateInventorySource, number>>
  >;
}>;

export type AdsCandidateInventoryBuildOutcome =
  | Readonly<{ valid: true; inventory: AdsCandidateInventory }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const INVENTORY_ALLOWED_FIELD_SET = new Set<string>(
  ADS_CANDIDATE_INVENTORY_ALLOWED_FIELDS
);
const METADATA_ALLOWED_FIELD_SET = new Set<string>(
  ADS_CANDIDATE_METADATA_ALLOWED_FIELDS
);
const INVENTORY_SOURCE_SET = new Set<string>(ADS_CANDIDATE_INVENTORY_SOURCES);
const CREATIVE_TYPE_SET = new Set<string>(ADS_PLATFORM_CREATIVE_TYPES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
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
export function looksLikeAdsInventoryUrl(value: string): boolean {
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

export function isAdsCandidateInventorySource(
  value: string
): value is AdsCandidateInventorySource {
  return INVENTORY_SOURCE_SET.has(value);
}

export function isAdsCandidateInventoryCreativeType(
  value: string
): value is AdsPlatformCreativeType {
  return CREATIVE_TYPE_SET.has(value);
}

function rejectProhibitedFields(
  value: Record<string, unknown>,
  prefix: string,
  issues: string[]
): void {
  for (const field of ADS_CANDIDATE_INVENTORY_PROHIBITED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      issues.push(
        `${prefix}prohibited field "${field}" is not allowed on candidate inventory.`
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
  issues: string[]
): void {
  if (!isNonEmptyString(value)) {
    issues.push(`${fieldName} is required and must be a non-empty string.`);
    return;
  }
  if (value.length > ADS_CANDIDATE_INVENTORY_MAX_ID_LENGTH) {
    issues.push(
      `${fieldName} exceeds max length of ${ADS_CANDIDATE_INVENTORY_MAX_ID_LENGTH}.`
    );
  }
  if (looksLikeAdsInventoryUrl(value)) {
    issues.push(`${fieldName} must be an opaque reference, not a URL.`);
  }
}

function validateRevision(
  value: unknown,
  fieldName: string,
  issues: string[]
): void {
  if (!isPositiveInteger(value)) {
    issues.push(`${fieldName} must be a positive integer.`);
  }
}

function validateEligibilitySnapshot(
  value: unknown,
  prefix: string,
  issues: string[]
): void {
  if (!isRecord(value)) {
    issues.push(`${prefix}eligibilitySnapshot must be an object.`);
    return;
  }

  rejectProhibitedFields(value, `${prefix}eligibilitySnapshot.`, issues);
  rejectUnknownFields(
    value,
    ELIGIBILITY_SNAPSHOT_ALLOWED_FIELDS,
    `${prefix}eligibilitySnapshot.`,
    issues
  );
  validateOpaqueReference(
    value.snapshotRef,
    `${prefix}eligibilitySnapshot.snapshotRef`,
    issues
  );
  validateRevision(
    value.revision,
    `${prefix}eligibilitySnapshot.revision`,
    issues
  );
}

function validateTimestamps(
  value: unknown,
  prefix: string,
  issues: string[]
): void {
  if (!isRecord(value)) {
    issues.push(`${prefix}timestamps must be an object.`);
    return;
  }

  rejectProhibitedFields(value, `${prefix}timestamps.`, issues);
  rejectUnknownFields(
    value,
    TIMESTAMPS_ALLOWED_FIELDS,
    `${prefix}timestamps.`,
    issues
  );

  const createdAtMs = parseIsoTimestampMs(value.createdAt);
  if (createdAtMs === null) {
    issues.push(`${prefix}timestamps.createdAt must be a valid ISO-8601 timestamp.`);
  }

  const updatedAtMs = parseIsoTimestampMs(value.updatedAt);
  if (updatedAtMs === null) {
    issues.push(`${prefix}timestamps.updatedAt must be a valid ISO-8601 timestamp.`);
  }

  if (
    createdAtMs !== null &&
    updatedAtMs !== null &&
    updatedAtMs < createdAtMs
  ) {
    issues.push(
      `${prefix}timestamps.updatedAt must be greater than or equal to timestamps.createdAt.`
    );
  }
}

function referenceKey(candidate: {
  campaignRef: string;
  adSetRef: string;
  adRef: string;
  creativeRef: string;
}): string {
  return [
    candidate.campaignRef,
    candidate.adSetRef,
    candidate.adRef,
    candidate.creativeRef,
  ].join("\u0000");
}

function validateCandidateMetadata(
  value: unknown,
  index: number,
  issues: string[],
  seenCandidateIds: Set<string>,
  seenReferenceKeys: Set<string>
): void {
  const prefix = `candidates[${index}].`;

  if (!isRecord(value)) {
    issues.push(`candidates[${index}] must be an object.`);
    return;
  }

  rejectProhibitedFields(value, prefix, issues);
  rejectUnknownFields(value, METADATA_ALLOWED_FIELD_SET, prefix, issues);

  validateOpaqueReference(value.candidateId, `${prefix}candidateId`, issues);
  validateOpaqueReference(value.campaignRef, `${prefix}campaignRef`, issues);
  validateOpaqueReference(value.adSetRef, `${prefix}adSetRef`, issues);
  validateOpaqueReference(value.adRef, `${prefix}adRef`, issues);
  validateOpaqueReference(value.creativeRef, `${prefix}creativeRef`, issues);

  if (
    typeof value.placement !== "string" ||
    !isAdsPlacementId(value.placement)
  ) {
    issues.push(`${prefix}placement is not a supported Ads Platform placement.`);
  }

  if (
    typeof value.creativeType !== "string" ||
    !isAdsCandidateInventoryCreativeType(value.creativeType)
  ) {
    issues.push(
      `${prefix}creativeType is not a supported Ads Platform creative type.`
    );
  }

  if (
    typeof value.inventorySource !== "string" ||
    !isAdsCandidateInventorySource(value.inventorySource)
  ) {
    issues.push(`${prefix}inventorySource is not a supported inventory source.`);
  }

  validateRevision(value.revision, `${prefix}revision`, issues);
  validateEligibilitySnapshot(value.eligibilitySnapshot, prefix, issues);
  validateTimestamps(value.timestamps, prefix, issues);

  if (isNonEmptyString(value.candidateId)) {
    if (seenCandidateIds.has(value.candidateId)) {
      issues.push(
        `inventory contains duplicate candidateId "${value.candidateId}".`
      );
    } else {
      seenCandidateIds.add(value.candidateId);
    }
  }

  if (
    isNonEmptyString(value.campaignRef) &&
    isNonEmptyString(value.adSetRef) &&
    isNonEmptyString(value.adRef) &&
    isNonEmptyString(value.creativeRef) &&
    !looksLikeAdsInventoryUrl(value.campaignRef) &&
    !looksLikeAdsInventoryUrl(value.adSetRef) &&
    !looksLikeAdsInventoryUrl(value.adRef) &&
    !looksLikeAdsInventoryUrl(value.creativeRef)
  ) {
    const key = referenceKey({
      campaignRef: value.campaignRef,
      adSetRef: value.adSetRef,
      adRef: value.adRef,
      creativeRef: value.creativeRef,
    });
    if (seenReferenceKeys.has(key)) {
      issues.push(
        `inventory contains duplicate candidate references (campaignRef/adSetRef/adRef/creativeRef) at candidates[${index}].`
      );
    } else {
      seenReferenceKeys.add(key);
    }
  }
}

/**
 * Pure shape validator for Candidate Inventory Foundation V1.
 * Fail-closed — does not load inventory, query databases, or deliver ads.
 */
export function validateCandidateInventory(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Candidate inventory must be an object."]),
    };
  }

  const issues: string[] = [];
  rejectProhibitedFields(input, "", issues);
  rejectUnknownFields(input, INVENTORY_ALLOWED_FIELD_SET, "", issues);

  if (input.contractVersion !== ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION}".`
    );
  }

  validateOpaqueReference(input.inventoryId, "inventoryId", issues);
  validateRevision(input.revision, "revision", issues);

  const generatedAtMs = parseIsoTimestampMs(input.generatedAt);
  if (generatedAtMs === null) {
    issues.push("generatedAt must be a valid ISO-8601 timestamp.");
  }

  if (!Array.isArray(input.candidates)) {
    issues.push("candidates must be an array.");
  } else {
    if (input.candidates.length > ADS_CANDIDATE_INVENTORY_MAX_CANDIDATES) {
      issues.push(
        `candidates exceeds max count of ${ADS_CANDIDATE_INVENTORY_MAX_CANDIDATES}.`
      );
    }

    const seenCandidateIds = new Set<string>();
    const seenReferenceKeys = new Set<string>();
    input.candidates.forEach((candidate, index) => {
      validateCandidateMetadata(
        candidate,
        index,
        issues,
        seenCandidateIds,
        seenReferenceKeys
      );
    });
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

function freezeCandidateMetadata(
  candidate: AdsCandidateMetadata
): AdsCandidateMetadata {
  return Object.freeze({
    candidateId: candidate.candidateId,
    campaignRef: candidate.campaignRef,
    adSetRef: candidate.adSetRef,
    adRef: candidate.adRef,
    creativeRef: candidate.creativeRef,
    placement: candidate.placement,
    creativeType: candidate.creativeType,
    eligibilitySnapshot: Object.freeze({
      snapshotRef: candidate.eligibilitySnapshot.snapshotRef,
      revision: candidate.eligibilitySnapshot.revision,
    }),
    inventorySource: candidate.inventorySource,
    revision: candidate.revision,
    timestamps: Object.freeze({
      createdAt: candidate.timestamps.createdAt,
      updatedAt: candidate.timestamps.updatedAt,
    }),
  });
}

/**
 * Deep-freezes a validated inventory snapshot for immutable contract behavior.
 */
export function freezeCandidateInventory(
  inventory: AdsCandidateInventory
): AdsCandidateInventory {
  return Object.freeze({
    contractVersion: inventory.contractVersion,
    inventoryId: inventory.inventoryId,
    revision: inventory.revision,
    generatedAt: inventory.generatedAt,
    candidates: Object.freeze(
      inventory.candidates.map((candidate) => freezeCandidateMetadata(candidate))
    ),
  });
}

/**
 * Builds an immutable candidate inventory from unknown input.
 * Fail-closed on invalid shapes. Never loads inventory or enables delivery.
 */
export function buildCandidateInventory(
  input: unknown
): AdsCandidateInventoryBuildOutcome {
  const validation = validateCandidateInventory(input);
  if (!validation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...validation.issues]),
    };
  }

  if (!isRecord(input) || !Array.isArray(input.candidates)) {
    return {
      valid: false,
      issues: Object.freeze(["Candidate inventory must be an object."]),
    };
  }

  const candidates = input.candidates.map((raw) => {
    const candidate = raw as AdsCandidateMetadata;
    return freezeCandidateMetadata({
      candidateId: candidate.candidateId,
      campaignRef: candidate.campaignRef,
      adSetRef: candidate.adSetRef,
      adRef: candidate.adRef,
      creativeRef: candidate.creativeRef,
      placement: candidate.placement,
      creativeType: candidate.creativeType,
      eligibilitySnapshot: {
        snapshotRef: candidate.eligibilitySnapshot.snapshotRef,
        revision: candidate.eligibilitySnapshot.revision,
      },
      inventorySource: candidate.inventorySource,
      revision: candidate.revision,
      timestamps: {
        createdAt: candidate.timestamps.createdAt,
        updatedAt: candidate.timestamps.updatedAt,
      },
    });
  });

  const inventory = freezeCandidateInventory({
    contractVersion: ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
    inventoryId: input.inventoryId as string,
    revision: input.revision as number,
    generatedAt: input.generatedAt as string,
    candidates,
  });

  return { valid: true, inventory };
}

/**
 * Empty inventory snapshot — valid contract shape, no candidates.
 * Does not query databases or enable delivery.
 */
export function createEmptyInventory(
  options: Readonly<{
    inventoryId?: string;
    revision?: number;
    generatedAt?: string;
  }> = {}
): AdsCandidateInventory {
  return freezeCandidateInventory({
    contractVersion: ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
    inventoryId: options.inventoryId ?? "inventory-empty",
    revision: options.revision ?? 1,
    generatedAt: options.generatedAt ?? "1970-01-01T00:00:00.000Z",
    candidates: Object.freeze([]),
  });
}

/**
 * Returns candidates in inventory order. No filtering or ranking.
 */
export function listCandidates(
  inventory: AdsCandidateInventory
): readonly AdsCandidateMetadata[] {
  return inventory.candidates;
}

/**
 * Finds a candidate by id. Returns undefined when absent. No ranking.
 */
export function findCandidate(
  inventory: AdsCandidateInventory,
  candidateId: string
): AdsCandidateMetadata | undefined {
  return inventory.candidates.find(
    (candidate) => candidate.candidateId === candidateId
  );
}

/**
 * True when a candidateId exists in the inventory. No business logic.
 */
export function candidateExists(
  inventory: AdsCandidateInventory,
  candidateId: string
): boolean {
  return inventory.candidates.some(
    (candidate) => candidate.candidateId === candidateId
  );
}

/**
 * Aggregate count summary only — no ranking, scoring, or selection.
 */
export function inventorySummary(
  inventory: AdsCandidateInventory
): InventorySummary {
  const placementCounts: Partial<Record<AdsPlatformPlacementId, number>> = {};
  const creativeTypeCounts: Partial<
    Record<AdsPlatformCreativeType, number>
  > = {};
  const inventorySourceCounts: Partial<
    Record<AdsCandidateInventorySource, number>
  > = {};

  for (const candidate of inventory.candidates) {
    placementCounts[candidate.placement] =
      (placementCounts[candidate.placement] ?? 0) + 1;
    creativeTypeCounts[candidate.creativeType] =
      (creativeTypeCounts[candidate.creativeType] ?? 0) + 1;
    inventorySourceCounts[candidate.inventorySource] =
      (inventorySourceCounts[candidate.inventorySource] ?? 0) + 1;
  }

  return Object.freeze({
    contractVersion: inventory.contractVersion,
    inventoryId: inventory.inventoryId,
    revision: inventory.revision,
    candidateCount: inventory.candidates.length,
    placementCounts: Object.freeze({ ...placementCounts }),
    creativeTypeCounts: Object.freeze({ ...creativeTypeCounts }),
    inventorySourceCounts: Object.freeze({ ...inventorySourceCounts }),
  });
}

/**
 * Extracts the identity reference subset from candidate metadata.
 */
export function toCandidateReference(
  candidate: AdsCandidateMetadata
): AdsCandidateReference {
  return Object.freeze({
    candidateId: candidate.candidateId,
    campaignRef: candidate.campaignRef,
    adSetRef: candidate.adSetRef,
    adRef: candidate.adRef,
    creativeRef: candidate.creativeRef,
  });
}
