import type { ContractValidationResult } from "./creativeContracts";
import {
  ADS_DELIVERY_DEVICE_CLASSES,
  ADS_DELIVERY_MAX_ID_LENGTH,
  type AdsDeliveryDeviceClass,
} from "./deliveryContracts";
import {
  matchesCountryTargeting,
  matchesLanguageTargeting,
} from "./eligibilityRules";
import {
  isCreativeCompatible,
  validateCreativePlacementCompatibility,
} from "./creativePlacementCompatibility";
import {
  isAdsPlacementId,
  type AdsPlatformPlacementId,
} from "./placementRegistry";
import {
  ADS_CANONICAL_PLATFORM_IDS,
  isCanonicalPlatformId,
  type AdsCanonicalPlatformId,
} from "./taxonomy";

/**
 * Ads Candidate Selection Foundation V1 — typed selection contracts only.
 *
 * Filters an injected candidate inventory into eligible / rejected sets with
 * diagnostics. Never ranks, scores, auctions, paces, bills, delivers, renders,
 * or chooses a winner. Never reads the system clock, network, database, or
 * feature flags. productionEnabled is always false; selectedCandidate is
 * always null.
 *
 * Age gate V1 is boolean-only (`requiresAgeGate` + `viewerAgeGatePassed`).
 * Numeric minimum/maximum age targeting and date-of-birth are intentionally
 * out of scope for this foundation layer.
 */

export const ADS_CANDIDATE_SELECTION_CONTRACT_VERSION = "v1" as const;

/** Max candidates accepted in one selection inventory snapshot. */
export const ADS_CANDIDATE_SELECTION_MAX_CANDIDATES = 256;

/** Creative types supported by Candidate Selection Foundation V1. */
export const ADS_CANDIDATE_SELECTION_CREATIVE_TYPES = [
  "image",
  "video",
  "carousel",
] as const;

export type AdsCandidateSelectionCreativeType =
  (typeof ADS_CANDIDATE_SELECTION_CREATIVE_TYPES)[number];

/**
 * Coarse platform classes — canonical taxonomy values
 * (`ADS_CANONICAL_PLATFORM_IDS` in taxonomy.ts).
 */
export const ADS_CANDIDATE_SELECTION_PLATFORMS = ADS_CANONICAL_PLATFORM_IDS;

export type AdsCandidateSelectionPlatform = AdsCanonicalPlatformId;

/**
 * Inventory-level validation outcomes — not per-candidate filter reasons.
 * Emitted only via inventory/context parse failures (`valid: false` issues),
 * never as a first-match eligibility reason on an evaluated candidate.
 */
export const ADS_CANDIDATE_SELECTION_INVENTORY_OUTCOMES = [
  "invalid_contract",
  "duplicate_candidate",
] as const;

export type AdsCandidateSelectionInventoryOutcome =
  (typeof ADS_CANDIDATE_SELECTION_INVENTORY_OUTCOMES)[number];

/**
 * Stable per-candidate eligibility filter order (first match wins).
 * Must match `evaluateAdsCandidateSelectionFilters` exactly.
 */
export const ADS_CANDIDATE_SELECTION_FILTER_ORDER = [
  "campaign_inactive",
  "creative_inactive",
  "policy_blocked",
  "age_gate",
  "placement_incompatible",
  "unsupported_creative",
  "country_mismatch",
  "language_mismatch",
  "platform_mismatch",
  "device_mismatch",
] as const;

export type AdsCandidateSelectionRejectionReason =
  (typeof ADS_CANDIDATE_SELECTION_FILTER_ORDER)[number];

/**
 * Typed placement/creative compatibility failure categories.
 * No string-heuristic classification of human-readable messages.
 */
export const ADS_CANDIDATE_COMPATIBILITY_FAILURE_CATEGORIES = [
  "placement_mismatch",
  "unsupported_creative_type",
  "creative_not_allowed_for_placement",
] as const;

export type AdsCandidateCompatibilityFailureCategory =
  (typeof ADS_CANDIDATE_COMPATIBILITY_FAILURE_CATEGORIES)[number];

export type AdsCandidateCompatibilityOutcome =
  | Readonly<{ compatible: true }>
  | Readonly<{
      compatible: false;
      category: AdsCandidateCompatibilityFailureCategory;
      issues: readonly string[];
    }>;

/**
 * Top-level keys allowed on AdsSelectionCandidate.
 * Unknown fields fail closed.
 */
export const ADS_SELECTION_CANDIDATE_ALLOWED_FIELDS = [
  "candidateId",
  "creativeRef",
  "creativeType",
  "placementId",
  "campaignRef",
  "advertiserRef",
  "adSetRef",
  "adRef",
  "eligibility",
  "diagnostics",
] as const;

/**
 * Top-level keys allowed on AdsCandidateSelectionInventory.
 * Unknown fields fail closed.
 */
export const ADS_CANDIDATE_SELECTION_INVENTORY_ALLOWED_FIELDS = [
  "contractVersion",
  "sourceId",
  "revision",
  "candidates",
] as const;

/**
 * Eligibility state markers only — no live targeting evaluation or DB reads.
 * Empty allowlists mean unrestricted (explicit contract).
 *
 * Age: boolean gate only. Numeric min/max age targeting is out of scope for V1.
 */
export type AdsCandidateEligibilityState = Readonly<{
  campaignActive: boolean;
  creativeActive: boolean;
  policyAllowed: boolean;
  /** When true, context.viewerAgeGatePassed must be true. */
  requiresAgeGate: boolean;
  targetedCountryCodes: readonly string[];
  targetedLanguageCodes: readonly string[];
  targetedPlatforms: readonly AdsCandidateSelectionPlatform[];
  targetedDeviceClasses: readonly AdsDeliveryDeviceClass[];
}>;

/**
 * Optional per-candidate diagnostics bag (opaque notes / revision markers).
 * Never carries URLs, PII, or media.
 */
export type AdsCandidateSelectionDiagnosticsNote = Readonly<{
  noteRef: string;
  revision: number;
}>;

/**
 * Canonical selection candidate — identity + opaque refs + eligibility markers.
 */
export type AdsSelectionCandidate = Readonly<{
  candidateId: string;
  creativeRef: string;
  creativeType: AdsCandidateSelectionCreativeType;
  placementId: AdsPlatformPlacementId;
  /** Opaque campaign reference — never a DB row. */
  campaignRef: string;
  /** Opaque advertiser reference — never a DB row. */
  advertiserRef: string;
  /** Opaque ad-set reference — never a DB row; authoritative inventory field. */
  adSetRef: string;
  /** Opaque ad reference — never a DB row; authoritative inventory field. */
  adRef: string;
  eligibility: AdsCandidateEligibilityState;
  diagnostics?: AdsCandidateSelectionDiagnosticsNote;
}>;

/**
 * Injected inventory source — immutable snapshot, no database / network.
 */
export type AdsCandidateSelectionInventory = Readonly<{
  contractVersion: typeof ADS_CANDIDATE_SELECTION_CONTRACT_VERSION;
  /** Injected inventory origin marker (opaque). */
  sourceId: string;
  /** Monotonic inventory revision — positive integer. */
  revision: number;
  candidates: readonly AdsSelectionCandidate[];
}>;

/**
 * Placement descriptor for compatibility validation against candidates.
 */
export type AdsCandidateSelectionPlacementDescriptor = Readonly<{
  placementId: AdsPlatformPlacementId;
  /**
   * Optional accepted creative allowlist for the slot.
   * When omitted, placement registry + capability matrix decide.
   */
  acceptedCreativeTypes?: readonly AdsCandidateSelectionCreativeType[];
}>;

/**
 * Selection context — coarse, privacy-safe request signals only.
 * Timestamps / ids are caller-supplied (no Date.now()).
 */
export type AdsCandidateSelectionContext = Readonly<{
  placement: AdsCandidateSelectionPlacementDescriptor;
  countryCode: string;
  languageCode: string;
  platform: AdsCandidateSelectionPlatform;
  deviceClass: AdsDeliveryDeviceClass;
  /** Upstream age-gate assertion — never computed from DOB here. */
  viewerAgeGatePassed: boolean;
  /** Opaque request id for selection metadata (deterministic with inputs). */
  selectionRequestId: string;
  /** ISO-8601 evaluation timestamp supplied by caller. */
  evaluatedAt: string;
}>;

/** Eligible candidate reference — identity only. */
export type AdsCandidateSelectionEligibleReference = Readonly<{
  candidateId: string;
  campaignRef: string;
  advertiserRef: string;
  creativeRef: string;
  adSetRef: string;
  adRef: string;
}>;

/** Rejected candidate with stable rejection reason. */
export type AdsCandidateSelectionRejectedReference = Readonly<{
  candidateId: string;
  reason: AdsCandidateSelectionRejectionReason;
}>;

/**
 * Aggregate selection diagnostics — counts and filter order only.
 * Never includes ranking scores or a selected winner.
 */
export type AdsCandidateSelectionDiagnostics = Readonly<{
  evaluatedCount: number;
  eligibleCount: number;
  rejectedCount: number;
  rejectionCounts: Readonly<
    Partial<Record<AdsCandidateSelectionRejectionReason, number>>
  >;
  filterOrder: typeof ADS_CANDIDATE_SELECTION_FILTER_ORDER;
  inventorySourceId: string;
  inventoryRevision: number;
}>;

/** Selection metadata — no winner, production disabled. */
export type AdsCandidateSelectionMetadata = Readonly<{
  contractVersion: typeof ADS_CANDIDATE_SELECTION_CONTRACT_VERSION;
  selectionRequestId: string;
  evaluatedAt: string;
  placementId: AdsPlatformPlacementId;
  selectedCandidateId: null;
  productionEnabled: false;
}>;

/**
 * Selection result V1 — eligible / rejected sets + diagnostics.
 * selectedCandidate is always null (no ranking / winner selection).
 */
export type AdsCandidateSelectionResult = Readonly<{
  contractVersion: typeof ADS_CANDIDATE_SELECTION_CONTRACT_VERSION;
  eligibleCandidates: readonly AdsCandidateSelectionEligibleReference[];
  rejectedCandidates: readonly AdsCandidateSelectionRejectedReference[];
  diagnostics: AdsCandidateSelectionDiagnostics;
  selectionMetadata: AdsCandidateSelectionMetadata;
  selectedCandidate: null;
  productionEnabled: false;
}>;

export type AdsCandidateSelectionBuildOutcome =
  | Readonly<{ valid: true; result: AdsCandidateSelectionResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsCandidateSelectionInventoryBuildOutcome =
  | Readonly<{ valid: true; inventory: AdsCandidateSelectionInventory }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsCandidateSelectionParseOutcome<T> =
  | Readonly<{ valid: true; value: T }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const CREATIVE_TYPE_SET = new Set<string>(
  ADS_CANDIDATE_SELECTION_CREATIVE_TYPES
);
const DEVICE_SET = new Set<string>(ADS_DELIVERY_DEVICE_CLASSES);
const REJECTION_REASON_SET = new Set<string>(
  ADS_CANDIDATE_SELECTION_FILTER_ORDER
);
const CANDIDATE_ALLOWED = new Set<string>(ADS_SELECTION_CANDIDATE_ALLOWED_FIELDS);
const INVENTORY_ALLOWED = new Set<string>(
  ADS_CANDIDATE_SELECTION_INVENTORY_ALLOWED_FIELDS
);
const ELIGIBILITY_ALLOWED = new Set([
  "campaignActive",
  "creativeActive",
  "policyAllowed",
  "requiresAgeGate",
  "targetedCountryCodes",
  "targetedLanguageCodes",
  "targetedPlatforms",
  "targetedDeviceClasses",
]);
const DIAGNOSTICS_NOTE_ALLOWED = new Set(["noteRef", "revision"]);
const CONTEXT_ALLOWED = new Set([
  "placement",
  "countryCode",
  "languageCode",
  "platform",
  "deviceClass",
  "viewerAgeGatePassed",
  "selectionRequestId",
  "evaluatedAt",
]);
const PLACEMENT_DESCRIPTOR_ALLOWED = new Set([
  "placementId",
  "acceptedCreativeTypes",
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

export function isAdsCandidateSelectionCreativeType(
  value: string
): value is AdsCandidateSelectionCreativeType {
  return CREATIVE_TYPE_SET.has(value);
}

export function isAdsCandidateSelectionPlatform(
  value: string
): value is AdsCandidateSelectionPlatform {
  return isCanonicalPlatformId(value);
}

function isAdsDeliveryDeviceClass(
  value: string
): value is AdsDeliveryDeviceClass {
  return DEVICE_SET.has(value);
}

export function isAdsCandidateSelectionRejectionReason(
  value: unknown
): value is AdsCandidateSelectionRejectionReason {
  return typeof value === "string" && REJECTION_REASON_SET.has(value);
}

export function isAdsCandidateCompatibilityFailureCategory(
  value: unknown
): value is AdsCandidateCompatibilityFailureCategory {
  return (
    typeof value === "string" &&
    (ADS_CANDIDATE_COMPATIBILITY_FAILURE_CATEGORIES as readonly string[]).includes(
      value
    )
  );
}

function freezeEligibility(
  eligibility: AdsCandidateEligibilityState
): AdsCandidateEligibilityState {
  return Object.freeze({
    campaignActive: eligibility.campaignActive,
    creativeActive: eligibility.creativeActive,
    policyAllowed: eligibility.policyAllowed,
    requiresAgeGate: eligibility.requiresAgeGate,
    targetedCountryCodes: Object.freeze([
      ...eligibility.targetedCountryCodes,
    ]),
    targetedLanguageCodes: Object.freeze([
      ...eligibility.targetedLanguageCodes,
    ]),
    targetedPlatforms: Object.freeze([...eligibility.targetedPlatforms]),
    targetedDeviceClasses: Object.freeze([
      ...eligibility.targetedDeviceClasses,
    ]),
  });
}

function freezeCandidate(
  candidate: AdsSelectionCandidate
): AdsSelectionCandidate {
  const frozen: AdsSelectionCandidate = {
    candidateId: candidate.candidateId,
    creativeRef: candidate.creativeRef,
    creativeType: candidate.creativeType,
    placementId: candidate.placementId,
    campaignRef: candidate.campaignRef,
    advertiserRef: candidate.advertiserRef,
    adSetRef: candidate.adSetRef,
    adRef: candidate.adRef,
    eligibility: freezeEligibility(candidate.eligibility),
  };
  if (candidate.diagnostics) {
    return Object.freeze({
      ...frozen,
      diagnostics: Object.freeze({
        noteRef: candidate.diagnostics.noteRef,
        revision: candidate.diagnostics.revision,
      }),
    });
  }
  return Object.freeze(frozen);
}

function parseEligibilityState(
  value: unknown,
  prefix: string,
  issues: string[]
): AdsCandidateEligibilityState | null {
  if (!isRecord(value)) {
    issues.push(`${prefix}eligibility must be an object.`);
    return null;
  }

  const start = issues.length;
  rejectUnknownFields(value, ELIGIBILITY_ALLOWED, `${prefix}eligibility.`, issues);

  for (const key of [
    "campaignActive",
    "creativeActive",
    "policyAllowed",
    "requiresAgeGate",
  ] as const) {
    if (typeof value[key] !== "boolean") {
      issues.push(`${prefix}eligibility.${key} must be a boolean.`);
    }
  }

  const targetedCountryCodes: string[] = [];
  if (!Array.isArray(value.targetedCountryCodes)) {
    issues.push(`${prefix}eligibility.targetedCountryCodes must be an array.`);
  } else {
    for (let i = 0; i < value.targetedCountryCodes.length; i++) {
      const code = value.targetedCountryCodes[i];
      if (typeof code !== "string" || !/^[A-Za-z]{2}$/.test(code.trim())) {
        issues.push(
          `${prefix}eligibility.targetedCountryCodes[${i}] must be an ISO-like country code.`
        );
      } else {
        targetedCountryCodes.push(code.trim().toUpperCase());
      }
    }
  }

  const targetedLanguageCodes: string[] = [];
  if (!Array.isArray(value.targetedLanguageCodes)) {
    issues.push(`${prefix}eligibility.targetedLanguageCodes must be an array.`);
  } else {
    for (let i = 0; i < value.targetedLanguageCodes.length; i++) {
      const code = value.targetedLanguageCodes[i];
      if (
        typeof code !== "string" ||
        code.trim().length === 0 ||
        code.length > 16
      ) {
        issues.push(
          `${prefix}eligibility.targetedLanguageCodes[${i}] must be a non-empty language tag.`
        );
      } else {
        targetedLanguageCodes.push(code.trim());
      }
    }
  }

  const targetedPlatforms: AdsCandidateSelectionPlatform[] = [];
  if (!Array.isArray(value.targetedPlatforms)) {
    issues.push(`${prefix}eligibility.targetedPlatforms must be an array.`);
  } else {
    for (let i = 0; i < value.targetedPlatforms.length; i++) {
      const platform = value.targetedPlatforms[i];
      if (
        typeof platform !== "string" ||
        !isAdsCandidateSelectionPlatform(platform)
      ) {
        issues.push(
          `${prefix}eligibility.targetedPlatforms[${i}] is not a supported platform.`
        );
      } else {
        targetedPlatforms.push(platform);
      }
    }
  }

  const targetedDeviceClasses: AdsDeliveryDeviceClass[] = [];
  if (!Array.isArray(value.targetedDeviceClasses)) {
    issues.push(
      `${prefix}eligibility.targetedDeviceClasses must be an array.`
    );
  } else {
    for (let i = 0; i < value.targetedDeviceClasses.length; i++) {
      const device = value.targetedDeviceClasses[i];
      if (typeof device !== "string" || !isAdsDeliveryDeviceClass(device)) {
        issues.push(
          `${prefix}eligibility.targetedDeviceClasses[${i}] is not a supported device class.`
        );
      } else {
        targetedDeviceClasses.push(device);
      }
    }
  }

  if (
    issues.length > start ||
    typeof value.campaignActive !== "boolean" ||
    typeof value.creativeActive !== "boolean" ||
    typeof value.policyAllowed !== "boolean" ||
    typeof value.requiresAgeGate !== "boolean"
  ) {
    return null;
  }

  return freezeEligibility({
    campaignActive: value.campaignActive,
    creativeActive: value.creativeActive,
    policyAllowed: value.policyAllowed,
    requiresAgeGate: value.requiresAgeGate,
    targetedCountryCodes,
    targetedLanguageCodes,
    targetedPlatforms,
    targetedDeviceClasses,
  });
}

function parseDiagnosticsNote(
  value: unknown,
  prefix: string,
  issues: string[]
): AdsCandidateSelectionDiagnosticsNote | undefined | null {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    issues.push(`${prefix}diagnostics must be an object when provided.`);
    return null;
  }
  const start = issues.length;
  rejectUnknownFields(
    value,
    DIAGNOSTICS_NOTE_ALLOWED,
    `${prefix}diagnostics.`,
    issues
  );
  const noteRefOk = validateOpaqueId(
    value.noteRef,
    `${prefix}diagnostics.noteRef`,
    issues
  );
  if (!isPositiveInteger(value.revision)) {
    issues.push(`${prefix}diagnostics.revision must be a positive integer.`);
  }
  if (
    issues.length > start ||
    !noteRefOk ||
    !isNonEmptyString(value.noteRef) ||
    !isPositiveInteger(value.revision)
  ) {
    return null;
  }
  return Object.freeze({
    noteRef: value.noteRef,
    revision: value.revision,
  });
}

/**
 * Parses and freezes a selection candidate. Fail closed — no trust casts from
 * unvalidated input.
 */
export function parseAdsSelectionCandidate(
  input: unknown,
  index?: number
): AdsCandidateSelectionParseOutcome<AdsSelectionCandidate> {
  const prefix =
    typeof index === "number" ? `candidates[${index}].` : "candidate.";

  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([`${prefix.slice(0, -1)} must be an object.`]),
    };
  }

  const issues: string[] = [];
  rejectUnknownFields(input, CANDIDATE_ALLOWED, prefix, issues);

  const candidateIdOk = validateOpaqueId(
    input.candidateId,
    `${prefix}candidateId`,
    issues
  );
  const creativeRefOk = validateOpaqueId(
    input.creativeRef,
    `${prefix}creativeRef`,
    issues
  );
  const campaignRefOk = validateOpaqueId(
    input.campaignRef,
    `${prefix}campaignRef`,
    issues
  );
  const advertiserRefOk = validateOpaqueId(
    input.advertiserRef,
    `${prefix}advertiserRef`,
    issues
  );
  const adSetRefOk = validateOpaqueId(
    input.adSetRef,
    `${prefix}adSetRef`,
    issues
  );
  const adRefOk = validateOpaqueId(input.adRef, `${prefix}adRef`, issues);

  let creativeType: AdsCandidateSelectionCreativeType | null = null;
  if (
    typeof input.creativeType !== "string" ||
    !isAdsCandidateSelectionCreativeType(input.creativeType)
  ) {
    issues.push(
      `${prefix}creativeType must be one of: image, video, carousel.`
    );
  } else {
    creativeType = input.creativeType;
  }

  let placementId: AdsPlatformPlacementId | null = null;
  if (
    typeof input.placementId !== "string" ||
    !isAdsPlacementId(input.placementId)
  ) {
    issues.push(
      `${prefix}placementId is not a supported Ads Platform placement.`
    );
  } else {
    placementId = input.placementId;
  }

  const eligibility = parseEligibilityState(input.eligibility, prefix, issues);
  const diagnostics = parseDiagnosticsNote(input.diagnostics, prefix, issues);

  if (
    issues.length > 0 ||
    !candidateIdOk ||
    !creativeRefOk ||
    !campaignRefOk ||
    !advertiserRefOk ||
    !adSetRefOk ||
    !adRefOk ||
    !isNonEmptyString(input.candidateId) ||
    !isNonEmptyString(input.creativeRef) ||
    !isNonEmptyString(input.campaignRef) ||
    !isNonEmptyString(input.advertiserRef) ||
    !isNonEmptyString(input.adSetRef) ||
    !isNonEmptyString(input.adRef) ||
    creativeType === null ||
    placementId === null ||
    eligibility === null ||
    diagnostics === null
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    value: freezeCandidate({
      candidateId: input.candidateId,
      creativeRef: input.creativeRef,
      creativeType,
      placementId,
      campaignRef: input.campaignRef,
      advertiserRef: input.advertiserRef,
      adSetRef: input.adSetRef,
      adRef: input.adRef,
      eligibility,
      diagnostics,
    }),
  };
}

/**
 * Pure shape validator for a selection candidate. Fail closed.
 */
export function validateAdsSelectionCandidate(
  input: unknown,
  index?: number
): ContractValidationResult {
  const parsed = parseAdsSelectionCandidate(input, index);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

/**
 * Parses and freezes an injected selection inventory. Fail closed.
 * Duplicate candidateIds are inventory outcomes (not filter reasons).
 */
export function parseAdsCandidateSelectionInventory(
  input: unknown
): AdsCandidateSelectionParseOutcome<AdsCandidateSelectionInventory> {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Candidate selection inventory must be an object."]),
    };
  }

  const issues: string[] = [];
  rejectUnknownFields(input, INVENTORY_ALLOWED, "", issues);

  if (input.contractVersion !== ADS_CANDIDATE_SELECTION_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_CANDIDATE_SELECTION_CONTRACT_VERSION}".`
    );
  }

  const sourceIdOk = validateOpaqueId(input.sourceId, "sourceId", issues);
  if (!isPositiveInteger(input.revision)) {
    issues.push("revision must be a positive integer.");
  }

  const candidates: AdsSelectionCandidate[] = [];
  if (!Array.isArray(input.candidates)) {
    issues.push("candidates must be an array.");
  } else {
    if (input.candidates.length > ADS_CANDIDATE_SELECTION_MAX_CANDIDATES) {
      issues.push(
        `candidates exceeds max count of ${ADS_CANDIDATE_SELECTION_MAX_CANDIDATES}.`
      );
    }

    const seenIds = new Set<string>();
    input.candidates.forEach((raw, index) => {
      const parsed = parseAdsSelectionCandidate(raw, index);
      if (!parsed.valid) {
        issues.push(...parsed.issues);
        return;
      }
      if (seenIds.has(parsed.value.candidateId)) {
        issues.push(
          `inventory contains duplicate candidateId "${parsed.value.candidateId}".`
        );
        return;
      }
      seenIds.add(parsed.value.candidateId);
      candidates.push(parsed.value);
    });
  }

  if (
    issues.length > 0 ||
    !sourceIdOk ||
    !isNonEmptyString(input.sourceId) ||
    !isPositiveInteger(input.revision) ||
    input.contractVersion !== ADS_CANDIDATE_SELECTION_CONTRACT_VERSION
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    value: Object.freeze({
      contractVersion: ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
      sourceId: input.sourceId,
      revision: input.revision,
      candidates: Object.freeze(candidates),
    }),
  };
}

/**
 * Pure shape validator for injected selection inventory. Fail closed.
 * Rejects duplicate candidateIds.
 */
export function validateAdsCandidateSelectionInventory(
  input: unknown
): ContractValidationResult {
  const parsed = parseAdsCandidateSelectionInventory(input);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

/**
 * Deep-freezes a validated inventory for immutable, deterministic iteration.
 */
export function freezeAdsCandidateSelectionInventory(
  inventory: AdsCandidateSelectionInventory
): AdsCandidateSelectionInventory {
  return Object.freeze({
    contractVersion: inventory.contractVersion,
    sourceId: inventory.sourceId,
    revision: inventory.revision,
    candidates: Object.freeze(
      inventory.candidates.map((candidate) => freezeCandidate(candidate))
    ),
  });
}

/**
 * Builds an immutable injected inventory from unknown input. Fail closed.
 */
export function buildAdsCandidateSelectionInventory(
  input: unknown
): AdsCandidateSelectionInventoryBuildOutcome {
  const parsed = parseAdsCandidateSelectionInventory(input);
  if (!parsed.valid) {
    return {
      valid: false,
      issues: parsed.issues,
    };
  }
  return { valid: true, inventory: parsed.value };
}

/**
 * Empty injected inventory — valid contract shape, no candidates.
 */
export function createEmptyAdsCandidateSelectionInventory(
  options: Readonly<{
    sourceId?: string;
    revision?: number;
  }> = {}
): AdsCandidateSelectionInventory {
  return freezeAdsCandidateSelectionInventory({
    contractVersion: ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
    sourceId: options.sourceId ?? "inventory-empty",
    revision: options.revision ?? 1,
    candidates: Object.freeze([]),
  });
}

/**
 * Deterministic iteration over inventory candidates (injection order).
 */
export function iterateAdsCandidateSelectionInventory(
  inventory: AdsCandidateSelectionInventory
): readonly AdsSelectionCandidate[] {
  return inventory.candidates;
}

function parsePlacementDescriptor(
  value: unknown,
  issues: string[]
): AdsCandidateSelectionPlacementDescriptor | null {
  if (!isRecord(value)) {
    issues.push("placement must be an object.");
    return null;
  }

  const start = issues.length;
  rejectUnknownFields(value, PLACEMENT_DESCRIPTOR_ALLOWED, "placement.", issues);

  let placementId: AdsPlatformPlacementId | null = null;
  if (
    typeof value.placementId !== "string" ||
    !isAdsPlacementId(value.placementId)
  ) {
    issues.push(
      "placement.placementId is not a supported Ads Platform placement."
    );
  } else {
    placementId = value.placementId;
  }

  let acceptedCreativeTypes:
    | readonly AdsCandidateSelectionCreativeType[]
    | undefined;

  if (value.acceptedCreativeTypes !== undefined) {
    if (
      !Array.isArray(value.acceptedCreativeTypes) ||
      value.acceptedCreativeTypes.length === 0
    ) {
      issues.push(
        "placement.acceptedCreativeTypes must be a non-empty array when set."
      );
    } else {
      const accepted: AdsCandidateSelectionCreativeType[] = [];
      for (let i = 0; i < value.acceptedCreativeTypes.length; i++) {
        const type = value.acceptedCreativeTypes[i];
        if (
          typeof type !== "string" ||
          !isAdsCandidateSelectionCreativeType(type)
        ) {
          issues.push(
            `placement.acceptedCreativeTypes[${i}] must be image, video, or carousel.`
          );
        } else {
          accepted.push(type);
        }
      }
      if (accepted.length === value.acceptedCreativeTypes.length) {
        acceptedCreativeTypes = Object.freeze([...accepted]);
      }
    }
  }

  if (issues.length > start || placementId === null) {
    return null;
  }

  return Object.freeze({
    placementId,
    ...(acceptedCreativeTypes ? { acceptedCreativeTypes } : {}),
  });
}

/**
 * Parses and freezes selection context. Fail closed.
 */
export function parseAdsCandidateSelectionContext(
  input: unknown
): AdsCandidateSelectionParseOutcome<AdsCandidateSelectionContext> {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Candidate selection context must be an object."]),
    };
  }

  const issues: string[] = [];
  rejectUnknownFields(input, CONTEXT_ALLOWED, "", issues);

  const placement = parsePlacementDescriptor(input.placement, issues);

  let countryCode: string | null = null;
  if (
    typeof input.countryCode !== "string" ||
    !/^[A-Z]{2}$/.test(input.countryCode)
  ) {
    issues.push("countryCode must be an ISO 3166-1 alpha-2 code.");
  } else {
    countryCode = input.countryCode;
  }

  let languageCode: string | null = null;
  if (!isNonEmptyString(input.languageCode) || input.languageCode.length > 16) {
    issues.push("languageCode must be a non-empty language tag within limits.");
  } else {
    languageCode = input.languageCode;
  }

  let platform: AdsCandidateSelectionPlatform | null = null;
  if (
    typeof input.platform !== "string" ||
    !isAdsCandidateSelectionPlatform(input.platform)
  ) {
    issues.push("platform is not a supported selection platform.");
  } else {
    platform = input.platform;
  }

  let deviceClass: AdsDeliveryDeviceClass | null = null;
  if (
    typeof input.deviceClass !== "string" ||
    !isAdsDeliveryDeviceClass(input.deviceClass)
  ) {
    issues.push("deviceClass is not a supported device class.");
  } else {
    deviceClass = input.deviceClass;
  }

  if (typeof input.viewerAgeGatePassed !== "boolean") {
    issues.push("viewerAgeGatePassed must be a boolean.");
  }

  const selectionRequestIdOk = validateOpaqueId(
    input.selectionRequestId,
    "selectionRequestId",
    issues
  );

  let evaluatedAt: string | null = null;
  if (
    typeof input.evaluatedAt === "string" &&
    parseIsoTimestampMs(input.evaluatedAt) !== null
  ) {
    evaluatedAt = input.evaluatedAt;
  } else {
    issues.push("evaluatedAt must be a valid ISO-8601 timestamp.");
  }

  if (
    issues.length > 0 ||
    placement === null ||
    countryCode === null ||
    languageCode === null ||
    platform === null ||
    deviceClass === null ||
    typeof input.viewerAgeGatePassed !== "boolean" ||
    !selectionRequestIdOk ||
    !isNonEmptyString(input.selectionRequestId) ||
    evaluatedAt === null
  ) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  return {
    valid: true,
    value: Object.freeze({
      placement,
      countryCode,
      languageCode,
      platform,
      deviceClass,
      viewerAgeGatePassed: input.viewerAgeGatePassed,
      selectionRequestId: input.selectionRequestId,
      evaluatedAt,
    }),
  };
}

/**
 * Validates selection context. Fail closed on unknown fields / invalid shapes.
 */
export function validateAdsCandidateSelectionContext(
  input: unknown
): ContractValidationResult {
  const parsed = parseAdsCandidateSelectionContext(input);
  return parsed.valid
    ? { valid: true }
    : { valid: false, issues: parsed.issues };
}

/**
 * Typed placement + creative compatibility between candidate and descriptor.
 * Fail closed — uses registry/capability gate; never parses error strings.
 */
export function evaluateCandidatePlacementCompatibility(
  candidate: AdsSelectionCandidate,
  placement: AdsCandidateSelectionPlacementDescriptor
): AdsCandidateCompatibilityOutcome {
  if (candidate.placementId !== placement.placementId) {
    return Object.freeze({
      compatible: false,
      category: "placement_mismatch" as const,
      issues: Object.freeze([
        `candidate placement "${candidate.placementId}" is incompatible with descriptor placement "${placement.placementId}".`,
      ]),
    });
  }

  if (!isAdsCandidateSelectionCreativeType(candidate.creativeType)) {
    return Object.freeze({
      compatible: false,
      category: "unsupported_creative_type" as const,
      issues: Object.freeze([
        `creative type "${String(candidate.creativeType)}" is not supported by selection V1.`,
      ]),
    });
  }

  if (
    placement.acceptedCreativeTypes !== undefined &&
    !placement.acceptedCreativeTypes.includes(candidate.creativeType)
  ) {
    return Object.freeze({
      compatible: false,
      category: "creative_not_allowed_for_placement" as const,
      issues: Object.freeze([
        `creative type "${candidate.creativeType}" is not accepted by the placement descriptor.`,
      ]),
    });
  }

  const gate = validateCreativePlacementCompatibility({
    placement: placement.placementId,
    creativeType: candidate.creativeType,
  });
  if (!gate.compatible) {
    return Object.freeze({
      compatible: false,
      category: "creative_not_allowed_for_placement" as const,
      issues: Object.freeze([
        gate.reason ??
          `creative type "${candidate.creativeType}" is not allowed for placement "${placement.placementId}".`,
      ]),
    });
  }

  if (!isCreativeCompatible(placement.placementId, candidate.creativeType)) {
    return Object.freeze({
      compatible: false,
      category: "creative_not_allowed_for_placement" as const,
      issues: Object.freeze([
        `creative type "${candidate.creativeType}" is not allowed for placement "${placement.placementId}".`,
      ]),
    });
  }

  return Object.freeze({ compatible: true });
}

/**
 * ContractValidationResult adapter over typed compatibility evaluation.
 */
export function validateCandidatePlacementCompatibility(
  candidate: AdsSelectionCandidate,
  placement: AdsCandidateSelectionPlacementDescriptor
): ContractValidationResult {
  const outcome = evaluateCandidatePlacementCompatibility(candidate, placement);
  return outcome.compatible
    ? { valid: true }
    : { valid: false, issues: outcome.issues };
}

/**
 * Creative compatibility helper — image / video / carousel only.
 * Returns typed failure categories via evaluate when used from selection.
 */
export function validateCandidateCreativeCompatibility(
  placementId: AdsPlatformPlacementId,
  creativeType: string
): ContractValidationResult {
  if (!isAdsCandidateSelectionCreativeType(creativeType)) {
    return {
      valid: false,
      issues: Object.freeze([
        `unsupported creative type "${creativeType}" (selection V1 supports image, video, carousel).`,
      ]),
    };
  }

  if (!isCreativeCompatible(placementId, creativeType)) {
    return {
      valid: false,
      issues: Object.freeze([
        `creative type "${creativeType}" is incompatible with placement "${placementId}".`,
      ]),
    };
  }

  return { valid: true };
}

/**
 * Maps a typed compatibility failure category to a selection rejection reason.
 */
export function rejectionReasonForCompatibilityFailure(
  category: AdsCandidateCompatibilityFailureCategory
): AdsCandidateSelectionRejectionReason {
  if (category === "placement_mismatch") {
    return "placement_incompatible";
  }
  return "unsupported_creative";
}

function matchesPlatformTargeting(
  requestPlatform: AdsCandidateSelectionPlatform,
  targetedPlatforms: readonly AdsCandidateSelectionPlatform[]
): boolean {
  if (targetedPlatforms.length === 0) {
    return true;
  }
  return targetedPlatforms.includes(requestPlatform);
}

function matchesDeviceTargeting(
  requestDevice: AdsDeliveryDeviceClass,
  targetedDevices: readonly AdsDeliveryDeviceClass[]
): boolean {
  if (targetedDevices.length === 0) {
    return true;
  }
  return targetedDevices.includes(requestDevice);
}

/**
 * Evaluates a single candidate against context using the documented filter
 * order (`ADS_CANDIDATE_SELECTION_FILTER_ORDER`). Returns null when eligible;
 * otherwise the first rejection reason. Does not mutate inputs.
 */
export function evaluateAdsCandidateSelectionFilters(
  candidate: AdsSelectionCandidate,
  context: AdsCandidateSelectionContext
): AdsCandidateSelectionRejectionReason | null {
  // 1. campaign_inactive
  if (candidate.eligibility.campaignActive !== true) {
    return "campaign_inactive";
  }
  // 2. creative_inactive
  if (candidate.eligibility.creativeActive !== true) {
    return "creative_inactive";
  }
  // 3. policy_blocked
  if (candidate.eligibility.policyAllowed !== true) {
    return "policy_blocked";
  }
  // 4. age_gate (boolean only — no numeric age / DOB)
  if (
    candidate.eligibility.requiresAgeGate === true &&
    context.viewerAgeGatePassed !== true
  ) {
    return "age_gate";
  }

  // 5–6. placement then creative compatibility (typed categories)
  const compatibility = evaluateCandidatePlacementCompatibility(
    candidate,
    context.placement
  );
  if (!compatibility.compatible) {
    return rejectionReasonForCompatibilityFailure(compatibility.category);
  }

  // Defensive creative check after placement compatibility (same reason family).
  const creativeResult = validateCandidateCreativeCompatibility(
    context.placement.placementId,
    candidate.creativeType
  );
  if (!creativeResult.valid) {
    return "unsupported_creative";
  }

  // 7. country_mismatch (null matcher → fail closed as mismatch)
  const countryMatch = matchesCountryTargeting(
    context.countryCode,
    candidate.eligibility.targetedCountryCodes
  );
  if (countryMatch !== true) {
    return "country_mismatch";
  }

  // 8. language_mismatch
  const languageMatch = matchesLanguageTargeting(
    context.languageCode,
    candidate.eligibility.targetedLanguageCodes
  );
  if (languageMatch !== true) {
    return "language_mismatch";
  }

  // 9. platform_mismatch
  if (
    !matchesPlatformTargeting(
      context.platform,
      candidate.eligibility.targetedPlatforms
    )
  ) {
    return "platform_mismatch";
  }

  // 10. device_mismatch
  if (
    !matchesDeviceTargeting(
      context.deviceClass,
      candidate.eligibility.targetedDeviceClasses
    )
  ) {
    return "device_mismatch";
  }

  return null;
}

function freezeSelectionResult(
  result: AdsCandidateSelectionResult
): AdsCandidateSelectionResult {
  return Object.freeze({
    contractVersion: result.contractVersion,
    eligibleCandidates: Object.freeze(
      result.eligibleCandidates.map((entry) => Object.freeze({ ...entry }))
    ),
    rejectedCandidates: Object.freeze(
      result.rejectedCandidates.map((entry) => Object.freeze({ ...entry }))
    ),
    diagnostics: Object.freeze({
      ...result.diagnostics,
      rejectionCounts: Object.freeze({ ...result.diagnostics.rejectionCounts }),
      filterOrder: ADS_CANDIDATE_SELECTION_FILTER_ORDER,
    }),
    selectionMetadata: Object.freeze({ ...result.selectionMetadata }),
    selectedCandidate: null,
    productionEnabled: false as const,
  });
}

/**
 * Pure shape validator for selection results. Fail closed.
 */
export function validateAdsCandidateSelectionResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Candidate selection result must be an object."]),
    };
  }

  const issues: string[] = [];

  if (input.contractVersion !== ADS_CANDIDATE_SELECTION_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_CANDIDATE_SELECTION_CONTRACT_VERSION}".`
    );
  }
  if (input.selectedCandidate !== null) {
    issues.push("selectedCandidate must be null.");
  }
  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  if (!Array.isArray(input.eligibleCandidates)) {
    issues.push("eligibleCandidates must be an array.");
  }
  if (!Array.isArray(input.rejectedCandidates)) {
    issues.push("rejectedCandidates must be an array.");
  }

  if (!isRecord(input.diagnostics)) {
    issues.push("diagnostics must be an object.");
  } else {
    if (!isNonNegativeInteger(input.diagnostics.evaluatedCount)) {
      issues.push("diagnostics.evaluatedCount must be a non-negative integer.");
    }
    if (!isNonNegativeInteger(input.diagnostics.eligibleCount)) {
      issues.push("diagnostics.eligibleCount must be a non-negative integer.");
    }
    if (!isNonNegativeInteger(input.diagnostics.rejectedCount)) {
      issues.push("diagnostics.rejectedCount must be a non-negative integer.");
    }
  }

  if (!isRecord(input.selectionMetadata)) {
    issues.push("selectionMetadata must be an object.");
  } else {
    if (input.selectionMetadata.selectedCandidateId !== null) {
      issues.push("selectionMetadata.selectedCandidateId must be null.");
    }
    if (input.selectionMetadata.productionEnabled !== false) {
      issues.push("selectionMetadata.productionEnabled must be false.");
    }
  }

  const seen = new Set<string>();
  if (Array.isArray(input.eligibleCandidates)) {
    for (let i = 0; i < input.eligibleCandidates.length; i++) {
      const entry = input.eligibleCandidates[i];
      if (!isRecord(entry) || !isNonEmptyString(entry.candidateId)) {
        issues.push(
          `eligibleCandidates[${i}].candidateId is required and must be a non-empty string.`
        );
        continue;
      }
      if (seen.has(entry.candidateId)) {
        issues.push(
          `selection result contains duplicate candidateId "${entry.candidateId}".`
        );
      } else {
        seen.add(entry.candidateId);
      }
    }
  }
  if (Array.isArray(input.rejectedCandidates)) {
    for (let i = 0; i < input.rejectedCandidates.length; i++) {
      const entry = input.rejectedCandidates[i];
      if (!isRecord(entry) || !isNonEmptyString(entry.candidateId)) {
        issues.push(
          `rejectedCandidates[${i}].candidateId is required and must be a non-empty string.`
        );
        continue;
      }
      if (!isAdsCandidateSelectionRejectionReason(entry.reason)) {
        issues.push(
          `rejectedCandidates[${i}].reason is not a valid rejection reason.`
        );
      }
      if (seen.has(entry.candidateId)) {
        issues.push(
          `selection result contains duplicate candidateId "${entry.candidateId}".`
        );
      } else {
        seen.add(entry.candidateId);
      }
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Runs Candidate Selection Foundation V1 over an injected inventory.
 * Deterministic: identical inputs → identical outputs.
 * Never selects a winner. Never enables production delivery.
 * Does not mutate inventory or context inputs.
 */
export function runAdsCandidateSelection(
  inventoryInput: unknown,
  contextInput: unknown
): AdsCandidateSelectionBuildOutcome {
  const inventoryParsed = parseAdsCandidateSelectionInventory(inventoryInput);
  if (!inventoryParsed.valid) {
    return {
      valid: false,
      issues: inventoryParsed.issues,
    };
  }

  const contextParsed = parseAdsCandidateSelectionContext(contextInput);
  if (!contextParsed.valid) {
    return {
      valid: false,
      issues: contextParsed.issues,
    };
  }

  const inventory = inventoryParsed.value;
  const context = contextParsed.value;

  const eligibleCandidates: AdsCandidateSelectionEligibleReference[] = [];
  const rejectedCandidates: AdsCandidateSelectionRejectedReference[] = [];
  const rejectionCounts: Partial<
    Record<AdsCandidateSelectionRejectionReason, number>
  > = {};

  // Deterministic iteration: inventory injection order.
  for (const candidate of iterateAdsCandidateSelectionInventory(inventory)) {
    const reason = evaluateAdsCandidateSelectionFilters(candidate, context);
    if (reason === null) {
      eligibleCandidates.push(
        Object.freeze({
          candidateId: candidate.candidateId,
          campaignRef: candidate.campaignRef,
          advertiserRef: candidate.advertiserRef,
          creativeRef: candidate.creativeRef,
          adSetRef: candidate.adSetRef,
          adRef: candidate.adRef,
        })
      );
      continue;
    }

    rejectedCandidates.push(
      Object.freeze({
        candidateId: candidate.candidateId,
        reason,
      })
    );
    rejectionCounts[reason] = (rejectionCounts[reason] ?? 0) + 1;
  }

  const result = freezeSelectionResult({
    contractVersion: ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
    eligibleCandidates: Object.freeze(eligibleCandidates),
    rejectedCandidates: Object.freeze(rejectedCandidates),
    diagnostics: Object.freeze({
      evaluatedCount: inventory.candidates.length,
      eligibleCount: eligibleCandidates.length,
      rejectedCount: rejectedCandidates.length,
      rejectionCounts: Object.freeze({ ...rejectionCounts }),
      filterOrder: ADS_CANDIDATE_SELECTION_FILTER_ORDER,
      inventorySourceId: inventory.sourceId,
      inventoryRevision: inventory.revision,
    }),
    selectionMetadata: Object.freeze({
      contractVersion: ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
      selectionRequestId: context.selectionRequestId,
      evaluatedAt: context.evaluatedAt,
      placementId: context.placement.placementId,
      selectedCandidateId: null,
      productionEnabled: false as const,
    }),
    selectedCandidate: null,
    productionEnabled: false,
  });

  const validation = validateAdsCandidateSelectionResult(result);
  if (!validation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...validation.issues]),
    };
  }

  return { valid: true, result };
}

/**
 * Empty selection result — no candidates evaluated, no winner, production off.
 */
export function createEmptyAdsCandidateSelectionResult(
  options: Readonly<{
    selectionRequestId?: string;
    evaluatedAt?: string;
    placementId?: AdsPlatformPlacementId;
    inventorySourceId?: string;
    inventoryRevision?: number;
  }> = {}
): AdsCandidateSelectionResult {
  return freezeSelectionResult({
    contractVersion: ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
    eligibleCandidates: Object.freeze([]),
    rejectedCandidates: Object.freeze([]),
    diagnostics: Object.freeze({
      evaluatedCount: 0,
      eligibleCount: 0,
      rejectedCount: 0,
      rejectionCounts: Object.freeze({}),
      filterOrder: ADS_CANDIDATE_SELECTION_FILTER_ORDER,
      inventorySourceId: options.inventorySourceId ?? "inventory-empty",
      inventoryRevision: options.inventoryRevision ?? 1,
    }),
    selectionMetadata: Object.freeze({
      contractVersion: ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
      selectionRequestId: options.selectionRequestId ?? "selection-empty",
      evaluatedAt: options.evaluatedAt ?? "1970-01-01T00:00:00.000Z",
      placementId: options.placementId ?? "WATCH_FEED",
      selectedCandidateId: null,
      productionEnabled: false as const,
    }),
    selectedCandidate: null,
    productionEnabled: false,
  });
}
