import type { ContractValidationResult } from "./creativeContracts";
import {
  ADS_REPORTING_HANDLE_VERSION,
  buildAdsReportingHandleClientReference,
  validateAdsReportingHandleClientReference,
  validateAdsReportingHandleForReporting,
  validateAdsReportingHandleOpaqueToken,
  validateAdsReportingHandlePayload,
  type AdsReportingHandleBindings,
  type AdsReportingHandleClientReference,
  type AdsReportingHandleEventPermission,
  type AdsReportingHandleOpaqueToken,
  type AdsReportingHandlePayload,
} from "./reportingHandle";

/**
 * Ads Reporting Handle Resolution V1 — internal opaque-token resolution only.
 *
 * Resolves a client-facing opaque reporting-handle reference against an
 * injected in-memory registry of server-issued payloads. Callers supply the
 * registry for the current evaluation — this module NEVER:
 * - queries a database or imports Supabase
 * - uses the network
 * - decrypts, signs, generates, or stores handles
 * - enables production delivery or measurement ingest
 * - attributes, bills, or ranks traffic
 *
 * productionEnabled and resolutionEnabled are always false.
 * handleResolved means the token mapped to a reportable payload for the
 * requested event type — not that measurement is live.
 */

export const ADS_REPORTING_HANDLE_RESOLUTION_CONTRACT_VERSION = "v1" as const;

/** Fixed resolution stages in evaluation order. */
export const ADS_REPORTING_HANDLE_RESOLUTION_STAGES = [
  "validate_reference",
  "lookup",
  "validate_payload",
  "authorize_event",
  "result",
] as const;

export type AdsReportingHandleResolutionStage =
  (typeof ADS_REPORTING_HANDLE_RESOLUTION_STAGES)[number];

/**
 * Top-level keys allowed on a registry entry.
 * Unknown fields fail closed.
 */
export const ADS_REPORTING_HANDLE_RESOLUTION_ENTRY_ALLOWED_FIELDS = [
  "token",
  "payload",
] as const;

/**
 * Top-level keys allowed on the resolution input.
 * Unknown fields fail closed.
 */
export const ADS_REPORTING_HANDLE_RESOLUTION_INPUT_ALLOWED_FIELDS = [
  "reportingHandle",
  "eventType",
  "currentTimestamp",
  "registry",
] as const;

/**
 * Top-level keys allowed on AdsReportingHandleResolutionResult.
 * Unknown fields fail closed.
 */
export const ADS_REPORTING_HANDLE_RESOLUTION_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "handleResolved",
  "handleRejected",
  "resolutionStage",
  "token",
  "payload",
  "bindings",
  "eventType",
  "productionEnabled",
  "resolutionEnabled",
] as const;

/**
 * One opaque token → internal payload binding for in-memory resolution.
 * Callers assemble this registry; nothing is persisted here.
 */
export type AdsReportingHandleResolutionEntry = Readonly<{
  token: AdsReportingHandleOpaqueToken;
  payload: AdsReportingHandlePayload;
}>;

/**
 * Resolution input — opaque client reference + event type + injected registry.
 */
export type AdsReportingHandleResolutionInput = Readonly<{
  reportingHandle: AdsReportingHandleClientReference | AdsReportingHandleOpaqueToken;
  eventType: AdsReportingHandleEventPermission;
  /** Explicit ISO-8601 current time — never read from the system clock. */
  currentTimestamp: string;
  registry: readonly AdsReportingHandleResolutionEntry[];
}>;

/**
 * Canonical Reporting Handle Resolution Result V1.
 * In-memory only — never stored, sent, or used for production ingest.
 */
export type AdsReportingHandleResolutionResult = Readonly<{
  contractVersion: typeof ADS_REPORTING_HANDLE_RESOLUTION_CONTRACT_VERSION;
  handleResolved: boolean;
  handleRejected: boolean;
  resolutionStage: AdsReportingHandleResolutionStage;
  token: string | null;
  payload: AdsReportingHandlePayload | null;
  bindings: AdsReportingHandleBindings | null;
  eventType: AdsReportingHandleEventPermission | null;
  productionEnabled: false;
  resolutionEnabled: false;
}>;

export type AdsReportingHandleResolutionOutcome =
  | Readonly<{ valid: true; result: AdsReportingHandleResolutionResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_REPORTING_HANDLE_RESOLUTION_INPUT_ALLOWED_FIELDS
);
const ENTRY_ALLOWED_FIELD_SET = new Set<string>(
  ADS_REPORTING_HANDLE_RESOLUTION_ENTRY_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_REPORTING_HANDLE_RESOLUTION_RESULT_ALLOWED_FIELDS
);
const STAGE_SET = new Set<string>(ADS_REPORTING_HANDLE_RESOLUTION_STAGES);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function freezeResolutionResult(
  result: AdsReportingHandleResolutionResult
): AdsReportingHandleResolutionResult {
  return Object.freeze({
    contractVersion: ADS_REPORTING_HANDLE_RESOLUTION_CONTRACT_VERSION,
    handleResolved: result.handleResolved,
    handleRejected: result.handleRejected,
    resolutionStage: result.resolutionStage,
    token: result.token,
    payload: result.payload,
    bindings: result.bindings === null ? null : Object.freeze({ ...result.bindings }),
    eventType: result.eventType,
    productionEnabled: false as const,
    resolutionEnabled: false as const,
  });
}

function rejectedResult(
  resolutionStage: AdsReportingHandleResolutionStage,
  extras: Partial<
    Pick<AdsReportingHandleResolutionResult, "token" | "eventType">
  > = {}
): AdsReportingHandleResolutionResult {
  return freezeResolutionResult({
    contractVersion: ADS_REPORTING_HANDLE_RESOLUTION_CONTRACT_VERSION,
    handleResolved: false,
    handleRejected: true,
    resolutionStage,
    token: extras.token ?? null,
    payload: null,
    bindings: null,
    eventType: extras.eventType ?? null,
    productionEnabled: false,
    resolutionEnabled: false,
  });
}

function acceptedResult(params: {
  token: string;
  payload: AdsReportingHandlePayload;
  eventType: AdsReportingHandleEventPermission;
}): AdsReportingHandleResolutionResult {
  return freezeResolutionResult({
    contractVersion: ADS_REPORTING_HANDLE_RESOLUTION_CONTRACT_VERSION,
    handleResolved: true,
    handleRejected: false,
    resolutionStage: "result",
    token: params.token,
    payload: params.payload,
    bindings: params.payload.bindings,
    eventType: params.eventType,
    productionEnabled: false,
    resolutionEnabled: false,
  });
}

/**
 * Pure shape validator for Reporting Handle Resolution Result V1.
 * Fail-closed — does not resolve, store, or enable measurement.
 */
export function validateAdsReportingHandleResolutionResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Reporting handle resolution result must be an object.",
      ]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!RESULT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `Reporting handle resolution result contains unknown field "${key}".`
      );
    }
  }

  if (
    input.contractVersion !== ADS_REPORTING_HANDLE_RESOLUTION_CONTRACT_VERSION
  ) {
    issues.push(
      `contractVersion must be "${ADS_REPORTING_HANDLE_RESOLUTION_CONTRACT_VERSION}".`
    );
  }

  if (typeof input.handleResolved !== "boolean") {
    issues.push("handleResolved must be a boolean.");
  }
  if (typeof input.handleRejected !== "boolean") {
    issues.push("handleRejected must be a boolean.");
  }
  if (
    typeof input.handleResolved === "boolean" &&
    typeof input.handleRejected === "boolean" &&
    input.handleResolved === input.handleRejected
  ) {
    issues.push(
      "handleResolved and handleRejected must be mutually exclusive."
    );
  }

  if (
    typeof input.resolutionStage !== "string" ||
    !STAGE_SET.has(input.resolutionStage)
  ) {
    issues.push(
      `resolutionStage must be one of: ${ADS_REPORTING_HANDLE_RESOLUTION_STAGES.join(", ")}.`
    );
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }
  if (input.resolutionEnabled !== false) {
    issues.push("resolutionEnabled must be false.");
  }

  if (input.handleResolved === true) {
    if (input.resolutionStage !== "result") {
      issues.push(
        'resolutionStage must be "result" when handleResolved is true.'
      );
    }
    if (!isNonEmptyString(input.token)) {
      issues.push("token is required when handleResolved is true.");
    }
    if (input.payload === null || input.payload === undefined) {
      issues.push("payload is required when handleResolved is true.");
    } else {
      const payloadValidation = validateAdsReportingHandlePayload(input.payload);
      if (!payloadValidation.valid) {
        for (const issue of payloadValidation.issues) {
          issues.push(`payload: ${issue}`);
        }
      }
    }
    if (input.bindings === null || input.bindings === undefined) {
      issues.push("bindings is required when handleResolved is true.");
    }
    if (!isNonEmptyString(input.eventType)) {
      issues.push("eventType is required when handleResolved is true.");
    }
  } else if (input.handleRejected === true) {
    if (input.payload !== null) {
      issues.push("payload must be null when handleRejected is true.");
    }
    if (input.bindings !== null) {
      issues.push("bindings must be null when handleRejected is true.");
    }
    if (input.resolutionStage === "result") {
      issues.push(
        'resolutionStage must not be "result" when handleRejected is true.'
      );
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

function validateRegistryEntry(
  entry: unknown,
  index: number,
  seenTokens: Set<string>
): readonly string[] {
  if (!isRecord(entry)) {
    return Object.freeze([
      `registry[${index}] must be an object.`,
    ]);
  }

  const issues: string[] = [];
  for (const key of Object.keys(entry)) {
    if (!ENTRY_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `registry[${index}] contains unknown field "${key}".`
      );
    }
  }

  const tokenValidation = validateAdsReportingHandleOpaqueToken(
    entry.token,
    `registry[${index}].token`
  );
  if (!tokenValidation.valid) {
    issues.push(...tokenValidation.issues);
  } else if (seenTokens.has(entry.token as string)) {
    issues.push(
      `registry contains duplicate token "${entry.token as string}".`
    );
  } else {
    seenTokens.add(entry.token as string);
  }

  const payloadValidation = validateAdsReportingHandlePayload(entry.payload);
  if (!payloadValidation.valid) {
    for (const issue of payloadValidation.issues) {
      issues.push(`registry[${index}].payload: ${issue}`);
    }
  }

  return Object.freeze([...issues]);
}

function normalizeReportingHandleReference(
  reportingHandle: unknown
):
  | Readonly<{ valid: true; token: string; clientReference: AdsReportingHandleClientReference }>
  | Readonly<{ valid: false; issues: readonly string[] }> {
  if (typeof reportingHandle === "string") {
    const tokenValidation = validateAdsReportingHandleOpaqueToken(
      reportingHandle,
      "reportingHandle"
    );
    if (!tokenValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([...tokenValidation.issues]),
      };
    }
    const built = buildAdsReportingHandleClientReference({
      version: ADS_REPORTING_HANDLE_VERSION,
      token: reportingHandle,
    });
    if (!built.valid) {
      return {
        valid: false,
        issues: Object.freeze([...built.issues]),
      };
    }
    return {
      valid: true,
      token: reportingHandle,
      clientReference: built.clientReference,
    };
  }

  const clientValidation =
    validateAdsReportingHandleClientReference(reportingHandle);
  if (!clientValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...clientValidation.issues]),
    };
  }

  const clientReference = reportingHandle as AdsReportingHandleClientReference;
  return {
    valid: true,
    token: clientReference.token,
    clientReference,
  };
}

/**
 * Resolves an opaque reporting-handle reference against an injected registry.
 * Stages: validate_reference → lookup → validate_payload → authorize_event → result.
 * Fail-closed on unknown tokens, invalid payloads, and non-reportable handles.
 * Never stores, transmits, decrypts, or enables production resolution.
 */
export function resolveAdsReportingHandle(
  input: unknown
): AdsReportingHandleResolutionOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Reporting handle resolution input must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `Reporting handle resolution input contains unknown field "${key}".`
      );
    }
  }
  for (const required of [
    "reportingHandle",
    "eventType",
    "currentTimestamp",
    "registry",
  ] as const) {
    if (!(required in input)) {
      issues.push(
        `Reporting handle resolution input must include ${required}.`
      );
    }
  }
  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  if (!isNonEmptyString(input.currentTimestamp)) {
    return {
      valid: false,
      issues: Object.freeze([
        "currentTimestamp must be a valid non-empty ISO-8601 timestamp string.",
      ]),
    };
  }

  if (!Array.isArray(input.registry)) {
    return {
      valid: false,
      issues: Object.freeze(["registry must be an array."]),
    };
  }

  const seenTokens = new Set<string>();
  const registryIssues: string[] = [];
  input.registry.forEach((entry, index) => {
    registryIssues.push(...validateRegistryEntry(entry, index, seenTokens));
  });
  if (registryIssues.length > 0) {
    return { valid: false, issues: Object.freeze([...registryIssues]) };
  }

  // --- validate_reference ---
  const reference = normalizeReportingHandleReference(input.reportingHandle);
  if (!reference.valid) {
    const result = rejectedResult("validate_reference");
    const resultValidation = validateAdsReportingHandleResolutionResult(result);
    if (!resultValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...reference.issues,
          ...resultValidation.issues,
        ]),
      };
    }
    return { valid: true, result };
  }

  if (
    typeof input.eventType !== "string" ||
    (input.eventType !== "impression" &&
      input.eventType !== "qualified_view" &&
      input.eventType !== "click")
  ) {
    return {
      valid: false,
      issues: Object.freeze([
        'eventType must be "impression", "qualified_view", or "click".',
      ]),
    };
  }
  const eventType = input.eventType as AdsReportingHandleEventPermission;

  // --- lookup ---
  const match = (
    input.registry as readonly AdsReportingHandleResolutionEntry[]
  ).find((entry) => entry.token === reference.token);
  if (!match) {
    const result = rejectedResult("lookup", {
      token: reference.token,
      eventType,
    });
    const resultValidation = validateAdsReportingHandleResolutionResult(result);
    if (!resultValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([...resultValidation.issues]),
      };
    }
    return { valid: true, result };
  }

  // --- validate_payload ---
  const payloadValidation = validateAdsReportingHandlePayload(match.payload);
  if (!payloadValidation.valid) {
    const result = rejectedResult("validate_payload", {
      token: reference.token,
      eventType,
    });
    const resultValidation = validateAdsReportingHandleResolutionResult(result);
    if (!resultValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...payloadValidation.issues,
          ...resultValidation.issues,
        ]),
      };
    }
    return { valid: true, result };
  }

  // --- authorize_event ---
  const reportable = validateAdsReportingHandleForReporting(match.payload, {
    currentTimestamp: input.currentTimestamp,
    eventType,
  });
  if (!reportable.valid) {
    const result = rejectedResult("authorize_event", {
      token: reference.token,
      eventType,
    });
    const resultValidation = validateAdsReportingHandleResolutionResult(result);
    if (!resultValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...reportable.issues,
          ...resultValidation.issues,
        ]),
      };
    }
    return { valid: true, result };
  }

  // Boundary: opaque token must not echo binding entity ids.
  const boundaryToken = reference.token;
  const leaked = [
    match.payload.bindings.candidateRef,
    match.payload.bindings.campaignRef,
    match.payload.bindings.adSetRef,
    match.payload.bindings.creativeRef,
    match.payload.bindings.placementId,
  ].some((value) => boundaryToken.includes(value));
  if (leaked) {
    const result = rejectedResult("authorize_event", {
      token: reference.token,
      eventType,
    });
    const resultValidation = validateAdsReportingHandleResolutionResult(result);
    if (!resultValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          "opaque client token must not expose bound entity ids.",
          ...resultValidation.issues,
        ]),
      };
    }
    return { valid: true, result };
  }

  // --- result ---
  const result = acceptedResult({
    token: reference.token,
    payload: match.payload,
    eventType,
  });
  const resultValidation = validateAdsReportingHandleResolutionResult(result);
  if (!resultValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...resultValidation.issues]),
    };
  }

  return { valid: true, result };
}
