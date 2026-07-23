import type { ContractValidationResult } from "./creativeContracts";
import {
  isAdsPlacementId,
  type AdsPlatformPlacementId,
} from "./placementRegistry";

/**
 * Ads Reporting Handle Architecture V1 — contracts and pure validators only.
 *
 * A reporting handle is an opaque, server-issued reference that future products
 * may send back when reporting an impression or click. Clients must never be
 * authoritative for advertiser / campaign / ad-set / ad / creative / placement /
 * trust / billing fields.
 *
 * This module never:
 * - generates, signs, encrypts, or stores handles
 * - queries a database or imports Supabase
 * - uses the network or wall-clock entropy (callers inject currentTimestamp)
 * - ingests events, bills, attributes, or enables production delivery
 *
 * productionEnabled is always false in V1.
 */

export const ADS_REPORTING_HANDLE_VERSION = "v1" as const;

/**
 * Sole supported event permissions in V1 — no conversions.
 * `qualified_view` covers the viewability measurement path.
 */
export const ADS_REPORTING_HANDLE_EVENT_PERMISSIONS = [
  "impression",
  "qualified_view",
  "click",
] as const;

export type AdsReportingHandleEventPermission =
  (typeof ADS_REPORTING_HANDLE_EVENT_PERMISSIONS)[number];

/**
 * Explicit lifecycle states for a server-issued reporting handle.
 * Only issued/active are reportable in V1.
 */
export const ADS_REPORTING_HANDLE_LIFECYCLE_STATES = [
  "issued",
  "active",
  "expired",
  "revoked",
  "rotated",
] as const;

export type AdsReportingHandleLifecycleState =
  (typeof ADS_REPORTING_HANDLE_LIFECYCLE_STATES)[number];

/** Lifecycle states that may be accepted for reporting (still subject to expiry). */
export const ADS_REPORTING_HANDLE_REPORTABLE_LIFECYCLE_STATES = [
  "issued",
  "active",
] as const;

export type AdsReportingHandleReportableLifecycleState =
  (typeof ADS_REPORTING_HANDLE_REPORTABLE_LIFECYCLE_STATES)[number];

/** Max length for opaque ids / tokens / references. */
export const ADS_REPORTING_HANDLE_MAX_ID_LENGTH = 128;

/**
 * Conservative maximum handle lifetime (issuedAt → expiresAt).
 * Documented: 1 hour.
 */
export const ADS_REPORTING_HANDLE_MAX_LIFETIME_MS = 60 * 60 * 1000;

/**
 * Allowed clock skew when comparing expiresAt / issuedAt against currentTimestamp.
 * Documented: 5 minutes.
 */
export const ADS_REPORTING_HANDLE_CLOCK_SKEW_MS = 5 * 60 * 1000;

/**
 * Rotation overlap placeholder for a future rotation service.
 * Not applied as live rotation logic in V1 — rotated handles are not reportable.
 * Documented: 5 minutes.
 */
export const ADS_REPORTING_HANDLE_ROTATION_OVERLAP_MS = 5 * 60 * 1000;

/**
 * Top-level keys allowed on the internal reporting-handle payload.
 * Unknown fields fail closed.
 */
export const ADS_REPORTING_HANDLE_PAYLOAD_ALLOWED_FIELDS = [
  "version",
  "handleId",
  "eventPermissions",
  "bindings",
  "lifecycleState",
  "issuedAt",
  "expiresAt",
  "keyId",
  "nonce",
  "productionEnabled",
] as const;

/**
 * Keys allowed on internal binding references.
 * Exactly one placement + candidate + campaign + ad set + creative.
 */
export const ADS_REPORTING_HANDLE_BINDINGS_ALLOWED_FIELDS = [
  "placementId",
  "candidateRef",
  "campaignRef",
  "adSetRef",
  "creativeRef",
] as const;

/**
 * Keys allowed on the client-facing opaque reference envelope.
 * Never includes entity binding ids.
 */
export const ADS_REPORTING_HANDLE_CLIENT_REFERENCE_ALLOWED_FIELDS = [
  "version",
  "token",
] as const;

/**
 * Field names that must never appear on handle payloads / client references.
 */
export const ADS_REPORTING_HANDLE_PROHIBITED_FIELDS = [
  "url",
  "urls",
  "href",
  "src",
  "mediaUrl",
  "clickUrl",
  "signedUrl",
  "signed_url",
  "advertiserAccountId",
  "advertiserId",
  "accountId",
  "campaignId",
  "adSetId",
  "adId",
  "creativeId",
  "trustLevel",
  "billable",
  "countable",
  "billing",
  "ip",
  "email",
  "phone",
  "fingerprint",
  "metadata",
] as const;

/**
 * Internal binding references — server-side only.
 * Exactly one of each; no cross-campaign / cross-placement reuse by contract.
 */
export type AdsReportingHandleBindings = Readonly<{
  placementId: AdsPlatformPlacementId;
  /** Candidate / ad reference bound to this handle. */
  candidateRef: string;
  campaignRef: string;
  adSetRef: string;
  creativeRef: string;
}>;

/**
 * Internal server-issued reporting-handle payload.
 * Safe metadata + binding references only — never raw DB rows.
 */
export type AdsReportingHandlePayload = Readonly<{
  version: typeof ADS_REPORTING_HANDLE_VERSION;
  /** Opaque handle id (server-side). */
  handleId: string;
  eventPermissions: readonly AdsReportingHandleEventPermission[];
  bindings: AdsReportingHandleBindings;
  lifecycleState: AdsReportingHandleLifecycleState;
  /** ISO-8601 issuance timestamp. */
  issuedAt: string;
  /** ISO-8601 expiry timestamp. */
  expiresAt: string;
  /** Key-id placeholder for a future signing service — not verified here. */
  keyId: string;
  /** Nonce placeholder for a future issuance service — not consumed here. */
  nonce: string;
  /** Always false in V1. */
  productionEnabled: false;
}>;

/**
 * Client-facing opaque token/reference envelope.
 * Must not reveal campaign / ad / entity ids directly.
 * Serialization / encryption are intentionally not implemented in V1.
 */
export type AdsReportingHandleClientReference = Readonly<{
  version: typeof ADS_REPORTING_HANDLE_VERSION;
  /** Opaque token string — never an entity id dump or URL. */
  token: string;
}>;

/**
 * Bare opaque token string carried by render descriptors / event reports.
 * Distinct from the internal payload; never embeds entity ids by contract.
 */
export type AdsReportingHandleOpaqueToken = string;

export type AdsReportingHandleValidationOptions = Readonly<{
  /**
   * Explicit ISO-8601 (or epoch-ms-compatible via Date.parse) current time.
   * Required for time-dependent checks. Validators never read the system clock.
   */
  currentTimestamp: string;
}>;

export type AdsReportingHandleReportValidationOptions =
  AdsReportingHandleValidationOptions &
    Readonly<{
      eventType: AdsReportingHandleEventPermission;
    }>;

export type AdsReportingHandleBuildOutcome =
  | Readonly<{ valid: true; payload: AdsReportingHandlePayload }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

export type AdsReportingHandleClientBuildOutcome =
  | Readonly<{
      valid: true;
      clientReference: AdsReportingHandleClientReference;
    }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const PAYLOAD_ALLOWED_FIELD_SET = new Set<string>(
  ADS_REPORTING_HANDLE_PAYLOAD_ALLOWED_FIELDS
);
const BINDINGS_ALLOWED_FIELD_SET = new Set<string>(
  ADS_REPORTING_HANDLE_BINDINGS_ALLOWED_FIELDS
);
const CLIENT_REFERENCE_ALLOWED_FIELD_SET = new Set<string>(
  ADS_REPORTING_HANDLE_CLIENT_REFERENCE_ALLOWED_FIELDS
);
const EVENT_PERMISSION_SET = new Set<string>(
  ADS_REPORTING_HANDLE_EVENT_PERMISSIONS
);
const LIFECYCLE_STATE_SET = new Set<string>(
  ADS_REPORTING_HANDLE_LIFECYCLE_STATES
);
const REPORTABLE_LIFECYCLE_SET = new Set<string>(
  ADS_REPORTING_HANDLE_REPORTABLE_LIFECYCLE_STATES
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Detects URL-like or scheme-bearing strings. Handle references must stay opaque.
 */
export function looksLikeAdsReportingHandleUrl(value: string): boolean {
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

function rejectProhibitedFields(
  value: Record<string, unknown>,
  prefix: string,
  issues: string[]
): void {
  for (const field of ADS_REPORTING_HANDLE_PROHIBITED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(value, field)) {
      issues.push(
        `${prefix}prohibited field "${field}" is not allowed on reporting handles.`
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

function validateOpaqueId(
  value: unknown,
  fieldName: string,
  issues: string[]
): void {
  if (!isNonEmptyString(value)) {
    issues.push(`${fieldName} is required and must be a non-empty string.`);
    return;
  }
  if (value.length > ADS_REPORTING_HANDLE_MAX_ID_LENGTH) {
    issues.push(
      `${fieldName} exceeds max length of ${ADS_REPORTING_HANDLE_MAX_ID_LENGTH}.`
    );
  }
  if (looksLikeAdsReportingHandleUrl(value)) {
    issues.push(`${fieldName} must be an opaque reference, not a URL.`);
  }
}

/**
 * Detects client tokens that embed entity-like identifiers or unsafe metadata.
 * Fail-closed — opaque tokens must not look like entity dumps.
 */
export function adsReportingHandleTokenLeaksEntityIds(token: string): boolean {
  const trimmed = token.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (
    /("campaignId"|"adSetId"|"adId"|"creativeId"|"advertiserAccountId"|"placementId"|campaignRef|adSetRef|candidateRef|creativeRef)/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (
    /(^|[^\w])(campaign|ad[_-]?set|advertiser|creative|placement)[_-]?id\s*[:=]/i.test(
      trimmed
    )
  ) {
    return true;
  }
  if (trimmed.includes("{") || trimmed.includes("}")) {
    return true;
  }
  return false;
}

export function isAdsReportingHandleEventPermission(
  value: string
): value is AdsReportingHandleEventPermission {
  return EVENT_PERMISSION_SET.has(value);
}

export function isAdsReportingHandleLifecycleState(
  value: string
): value is AdsReportingHandleLifecycleState {
  return LIFECYCLE_STATE_SET.has(value);
}

export function isAdsReportingHandleLifecycleReportable(
  state: AdsReportingHandleLifecycleState
): state is AdsReportingHandleReportableLifecycleState {
  return REPORTABLE_LIFECYCLE_SET.has(state);
}

/**
 * Pure opaque-token shape validator for client-facing handle strings.
 * Does not decrypt, resolve, or store.
 */
export function validateAdsReportingHandleOpaqueToken(
  value: unknown,
  fieldName = "token"
): ContractValidationResult {
  const issues: string[] = [];
  validateOpaqueId(value, fieldName, issues);
  if (isNonEmptyString(value) && adsReportingHandleTokenLeaksEntityIds(value)) {
    issues.push(
      `${fieldName} must not expose campaign/ad/entity ids or unsafe metadata.`
    );
  }
  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

function validateBindings(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push("bindings is required and must be an object.");
    return;
  }

  rejectProhibitedFields(value, "bindings.", issues);
  rejectUnknownFields(value, BINDINGS_ALLOWED_FIELD_SET, "bindings.", issues);

  if (
    typeof value.placementId !== "string" ||
    !isAdsPlacementId(value.placementId)
  ) {
    issues.push("bindings.placementId is not a registered Ads Platform placement.");
  }

  validateOpaqueId(value.candidateRef, "bindings.candidateRef", issues);
  validateOpaqueId(value.campaignRef, "bindings.campaignRef", issues);
  validateOpaqueId(value.adSetRef, "bindings.adSetRef", issues);
  validateOpaqueId(value.creativeRef, "bindings.creativeRef", issues);

  if (
    isNonEmptyString(value.candidateRef) &&
    isNonEmptyString(value.campaignRef) &&
    isNonEmptyString(value.adSetRef) &&
    isNonEmptyString(value.creativeRef)
  ) {
    const refs = [
      value.candidateRef,
      value.campaignRef,
      value.adSetRef,
      value.creativeRef,
    ];
    if (new Set(refs).size !== refs.length) {
      issues.push(
        "bindings must bind distinct candidate, campaign, ad-set, and creative references."
      );
    }
  }
}

function validateEventPermissions(value: unknown, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push("eventPermissions must be a non-empty array.");
    return;
  }
  if (value.length === 0) {
    issues.push("eventPermissions must include at least one permission.");
    return;
  }

  const seen = new Set<string>();
  value.forEach((entry, index) => {
    if (typeof entry !== "string") {
      issues.push(`eventPermissions[${index}] must be a string.`);
      return;
    }
    if (!isAdsReportingHandleEventPermission(entry)) {
      issues.push(
        `eventPermissions[${index}] "${entry}" is not a supported event type.`
      );
      return;
    }
    if (seen.has(entry)) {
      issues.push(
        `eventPermissions contains duplicate permission "${entry}".`
      );
    } else {
      seen.add(entry);
    }
  });
}

function validateLifetimeWindow(
  issuedAtMs: number | null,
  expiresAtMs: number | null,
  issues: string[]
): void {
  if (issuedAtMs === null) {
    issues.push("issuedAt must be a valid ISO-8601 timestamp.");
  }
  if (expiresAtMs === null) {
    issues.push("expiresAt must be a valid ISO-8601 timestamp.");
  }
  if (issuedAtMs === null || expiresAtMs === null) {
    return;
  }
  if (expiresAtMs <= issuedAtMs) {
    issues.push("expiresAt must be after issuedAt.");
  } else if (expiresAtMs - issuedAtMs > ADS_REPORTING_HANDLE_MAX_LIFETIME_MS) {
    issues.push(
      `handle lifetime exceeds max of ${ADS_REPORTING_HANDLE_MAX_LIFETIME_MS}ms.`
    );
  }
}

/**
 * Deep-freezes a validated internal payload for immutable contract behavior.
 */
export function freezeAdsReportingHandlePayload(
  payload: AdsReportingHandlePayload
): AdsReportingHandlePayload {
  return Object.freeze({
    version: ADS_REPORTING_HANDLE_VERSION,
    handleId: payload.handleId,
    eventPermissions: Object.freeze([...payload.eventPermissions]),
    bindings: Object.freeze({ ...payload.bindings }),
    lifecycleState: payload.lifecycleState,
    issuedAt: payload.issuedAt,
    expiresAt: payload.expiresAt,
    keyId: payload.keyId,
    nonce: payload.nonce,
    productionEnabled: false as const,
  });
}

/**
 * Deep-freezes a client-facing opaque reference envelope.
 */
export function freezeAdsReportingHandleClientReference(
  clientReference: AdsReportingHandleClientReference
): AdsReportingHandleClientReference {
  return Object.freeze({
    version: ADS_REPORTING_HANDLE_VERSION,
    token: clientReference.token,
  });
}

/**
 * Pure shape validator for the client-facing opaque reference envelope.
 * Fail-closed — does not decrypt, resolve, or store.
 */
export function validateAdsReportingHandleClientReference(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Reporting handle client reference must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  rejectProhibitedFields(input, "", issues);
  rejectUnknownFields(
    input,
    CLIENT_REFERENCE_ALLOWED_FIELD_SET,
    "",
    issues
  );

  if (input.version !== ADS_REPORTING_HANDLE_VERSION) {
    issues.push(
      `version must be "${ADS_REPORTING_HANDLE_VERSION}".`
    );
  }

  const tokenValidation = validateAdsReportingHandleOpaqueToken(
    input.token,
    "token"
  );
  if (!tokenValidation.valid) {
    issues.push(...tokenValidation.issues);
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Ensures a client token does not echo internal binding entity references.
 * Boundary check only — no serialization or encryption.
 */
export function validateAdsReportingHandleClientTokenBoundary(
  token: unknown,
  bindings: AdsReportingHandleBindings
): ContractValidationResult {
  const tokenValidation = validateAdsReportingHandleOpaqueToken(token, "token");
  if (!tokenValidation.valid) {
    return tokenValidation;
  }

  const tokenValue = token as string;
  const leakedValues = [
    bindings.candidateRef,
    bindings.campaignRef,
    bindings.adSetRef,
    bindings.creativeRef,
    bindings.placementId,
  ].filter((value) => tokenValue.includes(value));

  if (leakedValues.length > 0) {
    return {
      valid: false,
      issues: Object.freeze([
        "opaque client token must not expose bound entity ids.",
      ]),
    };
  }

  return { valid: true };
}

/**
 * Pure shape validator for internal Reporting Handle Payload V1.
 * Fail-closed — does not generate, sign, store, or enable production.
 * Time-ordering / lifetime checks do not require currentTimestamp.
 */
export function validateAdsReportingHandlePayload(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Reporting handle payload must be an object."]),
    };
  }

  const issues: string[] = [];
  rejectProhibitedFields(input, "", issues);
  rejectUnknownFields(input, PAYLOAD_ALLOWED_FIELD_SET, "", issues);

  if (input.version !== ADS_REPORTING_HANDLE_VERSION) {
    issues.push(`version must be "${ADS_REPORTING_HANDLE_VERSION}".`);
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }

  validateOpaqueId(input.handleId, "handleId", issues);
  validateEventPermissions(input.eventPermissions, issues);
  validateBindings(input.bindings, issues);

  if (
    typeof input.lifecycleState !== "string" ||
    !isAdsReportingHandleLifecycleState(input.lifecycleState)
  ) {
    issues.push("lifecycleState is not a valid reporting-handle lifecycle state.");
  }

  const issuedAtMs = parseIsoTimestampMs(input.issuedAt);
  const expiresAtMs = parseIsoTimestampMs(input.expiresAt);
  validateLifetimeWindow(issuedAtMs, expiresAtMs, issues);

  validateOpaqueId(input.keyId, "keyId", issues);
  validateOpaqueId(input.nonce, "nonce", issues);

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Validates whether a structurally valid handle may be used for reporting.
 * Requires explicit currentTimestamp — never reads the system clock.
 * Fail-closed on expired / revoked / rotated / permission-mismatched handles.
 */
export function validateAdsReportingHandleForReporting(
  input: unknown,
  options: AdsReportingHandleReportValidationOptions
): ContractValidationResult {
  const shape = validateAdsReportingHandlePayload(input);
  if (!shape.valid) {
    return shape;
  }

  const issues: string[] = [];
  const payload = input as AdsReportingHandlePayload;

  if (!isAdsReportingHandleEventPermission(options.eventType)) {
    issues.push(`eventType "${options.eventType}" is not supported.`);
  } else if (!payload.eventPermissions.includes(options.eventType)) {
    issues.push(
      `handle does not permit event type "${options.eventType}".`
    );
  }

  if (!isAdsReportingHandleLifecycleReportable(payload.lifecycleState)) {
    issues.push(
      `lifecycleState "${payload.lifecycleState}" is not reportable.`
    );
  }

  const currentMs = parseIsoTimestampMs(options.currentTimestamp);
  if (currentMs === null) {
    issues.push("currentTimestamp must be a valid ISO-8601 timestamp.");
  } else {
    const issuedAtMs = parseIsoTimestampMs(payload.issuedAt);
    const expiresAtMs = parseIsoTimestampMs(payload.expiresAt);
    if (issuedAtMs !== null && currentMs + ADS_REPORTING_HANDLE_CLOCK_SKEW_MS < issuedAtMs) {
      issues.push(
        "currentTimestamp is before issuedAt beyond the allowed clock-skew window."
      );
    }
    if (
      expiresAtMs !== null &&
      expiresAtMs + ADS_REPORTING_HANDLE_CLOCK_SKEW_MS < currentMs
    ) {
      issues.push("reporting handle is expired.");
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Builds an immutable internal payload from unknown input.
 * Forces productionEnabled to false. Never generates ids or signs.
 */
export function buildAdsReportingHandlePayload(
  input: unknown
): AdsReportingHandleBuildOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Reporting handle payload must be an object."]),
    };
  }

  const normalized: Record<string, unknown> = {
    ...input,
    productionEnabled: false,
  };

  const validation = validateAdsReportingHandlePayload(normalized);
  if (!validation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...validation.issues]),
    };
  }

  const bindings = normalized.bindings as AdsReportingHandleBindings;
  const eventPermissions =
    normalized.eventPermissions as AdsReportingHandleEventPermission[];

  const payload = freezeAdsReportingHandlePayload({
    version: ADS_REPORTING_HANDLE_VERSION,
    handleId: normalized.handleId as string,
    eventPermissions,
    bindings: {
      placementId: bindings.placementId,
      candidateRef: bindings.candidateRef,
      campaignRef: bindings.campaignRef,
      adSetRef: bindings.adSetRef,
      creativeRef: bindings.creativeRef,
    },
    lifecycleState: normalized.lifecycleState as AdsReportingHandleLifecycleState,
    issuedAt: normalized.issuedAt as string,
    expiresAt: normalized.expiresAt as string,
    keyId: normalized.keyId as string,
    nonce: normalized.nonce as string,
    productionEnabled: false,
  });

  return { valid: true, payload };
}

/**
 * Builds an immutable client-facing opaque reference.
 * Optionally checks that the token does not leak provided bindings.
 * Never serializes or encrypts an internal payload.
 */
export function buildAdsReportingHandleClientReference(
  input: unknown,
  bindings?: AdsReportingHandleBindings
): AdsReportingHandleClientBuildOutcome {
  const validation = validateAdsReportingHandleClientReference(input);
  if (!validation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...validation.issues]),
    };
  }

  const record = input as AdsReportingHandleClientReference;
  if (bindings) {
    const boundary = validateAdsReportingHandleClientTokenBoundary(
      record.token,
      bindings
    );
    if (!boundary.valid) {
      return {
        valid: false,
        issues: Object.freeze([...boundary.issues]),
      };
    }
  }

  return {
    valid: true,
    clientReference: freezeAdsReportingHandleClientReference({
      version: ADS_REPORTING_HANDLE_VERSION,
      token: record.token,
    }),
  };
}

/**
 * Lists reportable lifecycle states for helper / documentation consumers.
 */
export function listAdsReportingHandleReportableLifecycleStates(): readonly AdsReportingHandleReportableLifecycleState[] {
  return Object.freeze([...ADS_REPORTING_HANDLE_REPORTABLE_LIFECYCLE_STATES]);
}

/**
 * Lists supported event permissions.
 */
export function listAdsReportingHandleEventPermissions(): readonly AdsReportingHandleEventPermission[] {
  return Object.freeze([...ADS_REPORTING_HANDLE_EVENT_PERMISSIONS]);
}
