import type {
  AdsPlatformCreativeType,
  ContractValidationResult,
} from "./creativeContracts";
import {
  validateAdsExecutionInternalResult,
  type AdsExecutionInternalResult,
} from "./executionLayer";
import {
  isAdsPlacementId,
  isCreativeTypeSupportedByPlacement,
  type AdsPlatformPlacementId,
} from "./placementRegistry";
import {
  ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS,
  ADS_RENDER_DESCRIPTOR_PROHIBITED_FIELDS,
  freezeAdsRenderDescriptor,
  validateAdsRenderDescriptor,
  type AdsRenderDescriptor,
} from "./renderDescriptor";

/**
 * Ads Internal Delivery Pilot V1 — validated execution result → internal result.
 *
 * Pipeline position:
 *   Candidate Selection
 *   → Render Descriptor Pipeline
 *   → Execution Layer
 *   → Internal Delivery Pilot
 *
 * Responsibilities:
 * - accept a validated AdsExecutionInternalResult
 * - perform internal delivery validation
 * - emit a typed internal delivery result + diagnostics
 * - fail closed on malformed / inconsistent input
 * - freeze immutable outputs
 *
 * This is an internal orchestration layer ONLY. It NEVER:
 * - renders creatives or serves advertisements
 * - delivers to product surfaces (production delivery)
 * - ranks, auctions, paces, bills, or takes payments
 * - queries a database, imports Supabase, or uses the network
 * - consults wall-clock entropy (callers inject currentTimestamp)
 * - enables feature flags or analytics ingestion
 * - trusts client-authoritative identity overrides
 *
 * Kill switches are always false:
 *   productionEnabled = false
 *   deliveryEnabled = false
 *   executionEnabled = false
 *
 * deliveryAccepted means the internal pilot completed with a validated
 * execution snapshot — never that production delivery or rendering ran.
 */

export const ADS_INTERNAL_DELIVERY_PILOT_V1_CONTRACT_VERSION = "v1" as const;

/** Fixed pipeline stages in evaluation order. */
export const ADS_INTERNAL_DELIVERY_PILOT_V1_STAGES = [
  "validate",
  "validate_delivery",
  "deliver",
  "result",
] as const;

export type AdsInternalDeliveryPilotV1Stage =
  (typeof ADS_INTERNAL_DELIVERY_PILOT_V1_STAGES)[number];

/**
 * Stable rejection reasons when the pilot completes without accepting delivery.
 * Hard malformed input returns valid:false with issues instead.
 */
export const ADS_INTERNAL_DELIVERY_PILOT_V1_REJECTION_REASONS = [
  "execution_not_accepted",
  "invalid_descriptor",
  "descriptor_expired",
  "placement_incompatible",
  "identity_incomplete",
] as const;

export type AdsInternalDeliveryPilotV1RejectionReason =
  (typeof ADS_INTERNAL_DELIVERY_PILOT_V1_REJECTION_REASONS)[number];

/**
 * Top-level keys allowed on Internal Delivery Pilot V1 input.
 * Unknown fields fail closed.
 */
export const ADS_INTERNAL_DELIVERY_PILOT_V1_INPUT_ALLOWED_FIELDS = [
  "executionResult",
  "currentTimestamp",
] as const;

/**
 * Top-level keys allowed on AdsInternalDeliveryInternalResult.
 * Unknown fields fail closed.
 */
export const ADS_INTERNAL_DELIVERY_PILOT_V1_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "deliveryAccepted",
  "deliveryRejected",
  "candidateId",
  "renderDescriptor",
  "diagnostics",
  "pipelineStage",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

/**
 * Top-level keys allowed on delivery diagnostics.
 */
export const ADS_INTERNAL_DELIVERY_PILOT_V1_DIAGNOSTICS_ALLOWED_FIELDS = [
  "candidateId",
  "placementId",
  "creativeReference",
  "creativeType",
  "deliveryAccepted",
  "rejectionReason",
] as const;

/**
 * Aggregate delivery diagnostics — binding / gate outcomes only.
 * Never includes ranking scores, URLs, media bytes, or PII.
 */
export type AdsInternalDeliveryPilotV1Diagnostics = Readonly<{
  candidateId: string | null;
  placementId: AdsPlatformPlacementId | null;
  creativeReference: string | null;
  creativeType: AdsPlatformCreativeType | null;
  deliveryAccepted: boolean;
  rejectionReason: AdsInternalDeliveryPilotV1RejectionReason | null;
}>;

/**
 * Canonical Internal Delivery Result V1.
 * Metadata / orchestration snapshot only — never a served or rendered ad.
 */
export type AdsInternalDeliveryInternalResult = Readonly<{
  contractVersion: typeof ADS_INTERNAL_DELIVERY_PILOT_V1_CONTRACT_VERSION;
  deliveryAccepted: boolean;
  deliveryRejected: boolean;
  candidateId: string | null;
  renderDescriptor: AdsRenderDescriptor | null;
  diagnostics: AdsInternalDeliveryPilotV1Diagnostics;
  pipelineStage: AdsInternalDeliveryPilotV1Stage;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

/**
 * Internal Delivery Pilot V1 input — validated execution internal result.
 * Caller injects currentTimestamp for deterministic expiry checks.
 *
 * Identity authority:
 * - candidateId comes from the execution result (opaque selection binding).
 * - Creative / placement / tracking identity comes only from renderDescriptor.
 * - No client-supplied identity override fields are accepted.
 */
export type AdsInternalDeliveryPilotV1Input = Readonly<{
  executionResult: AdsExecutionInternalResult;
  /** ISO-8601 timestamp used for deterministic expiry checks. */
  currentTimestamp: string;
}>;

export type AdsInternalDeliveryPilotV1Outcome =
  | Readonly<{ valid: true; result: AdsInternalDeliveryInternalResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const STAGE_SET = new Set<string>(ADS_INTERNAL_DELIVERY_PILOT_V1_STAGES);
const REJECTION_REASON_SET = new Set<string>(
  ADS_INTERNAL_DELIVERY_PILOT_V1_REJECTION_REASONS
);
const INPUT_ALLOWED = new Set<string>(
  ADS_INTERNAL_DELIVERY_PILOT_V1_INPUT_ALLOWED_FIELDS
);
const RESULT_ALLOWED = new Set<string>(
  ADS_INTERNAL_DELIVERY_PILOT_V1_RESULT_ALLOWED_FIELDS
);
const DIAGNOSTICS_ALLOWED = new Set<string>(
  ADS_INTERNAL_DELIVERY_PILOT_V1_DIAGNOSTICS_ALLOWED_FIELDS
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
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
        `${prefix}prohibited field "${field}" is not allowed on internal delivery pilot input.`
      );
    }
  }
}

function freezeDiagnostics(
  diagnostics: AdsInternalDeliveryPilotV1Diagnostics
): AdsInternalDeliveryPilotV1Diagnostics {
  return Object.freeze({
    candidateId: diagnostics.candidateId,
    placementId: diagnostics.placementId,
    creativeReference: diagnostics.creativeReference,
    creativeType: diagnostics.creativeType,
    deliveryAccepted: diagnostics.deliveryAccepted,
    rejectionReason: diagnostics.rejectionReason,
  });
}

function freezeInternalResult(
  result: AdsInternalDeliveryInternalResult
): AdsInternalDeliveryInternalResult {
  return Object.freeze({
    contractVersion: ADS_INTERNAL_DELIVERY_PILOT_V1_CONTRACT_VERSION,
    deliveryAccepted: result.deliveryAccepted,
    deliveryRejected: result.deliveryRejected,
    candidateId: result.candidateId,
    renderDescriptor: result.renderDescriptor,
    diagnostics: freezeDiagnostics(result.diagnostics),
    pipelineStage: result.pipelineStage,
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
  });
}

function rejectedResult(
  pipelineStage: AdsInternalDeliveryPilotV1Stage,
  rejectionReason: AdsInternalDeliveryPilotV1RejectionReason,
  diagnostics: Partial<AdsInternalDeliveryPilotV1Diagnostics> = {}
): AdsInternalDeliveryInternalResult {
  return freezeInternalResult({
    contractVersion: ADS_INTERNAL_DELIVERY_PILOT_V1_CONTRACT_VERSION,
    deliveryAccepted: false,
    deliveryRejected: true,
    candidateId: diagnostics.candidateId ?? null,
    renderDescriptor: null,
    diagnostics: freezeDiagnostics({
      candidateId: diagnostics.candidateId ?? null,
      placementId: diagnostics.placementId ?? null,
      creativeReference: diagnostics.creativeReference ?? null,
      creativeType: diagnostics.creativeType ?? null,
      deliveryAccepted: false,
      rejectionReason,
    }),
    pipelineStage,
    productionEnabled: false,
    deliveryEnabled: false,
    executionEnabled: false,
  });
}

function acceptedResult(
  candidateId: string,
  descriptor: AdsRenderDescriptor
): AdsInternalDeliveryInternalResult {
  const frozenDescriptor = freezeAdsRenderDescriptor(descriptor);
  return freezeInternalResult({
    contractVersion: ADS_INTERNAL_DELIVERY_PILOT_V1_CONTRACT_VERSION,
    deliveryAccepted: true,
    deliveryRejected: false,
    candidateId,
    renderDescriptor: frozenDescriptor,
    diagnostics: freezeDiagnostics({
      candidateId,
      placementId: frozenDescriptor.placementId,
      creativeReference: frozenDescriptor.creativeReference,
      creativeType: frozenDescriptor.creativeType,
      deliveryAccepted: true,
      rejectionReason: null,
    }),
    pipelineStage: "result",
    productionEnabled: false,
    deliveryEnabled: false,
    executionEnabled: false,
  });
}

/**
 * Pure shape validator for Internal Delivery Pilot V1 internal results.
 * Fail-closed — does not deliver, render, or serve ads.
 */
export function validateAdsInternalDeliveryInternalResult(
  input: unknown,
  options: { nowMs?: number } = {}
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Internal delivery internal result must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  rejectUnknownFields(input, RESULT_ALLOWED, "", issues);

  if (input.contractVersion !== ADS_INTERNAL_DELIVERY_PILOT_V1_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_INTERNAL_DELIVERY_PILOT_V1_CONTRACT_VERSION}".`
    );
  }

  if (typeof input.deliveryAccepted !== "boolean") {
    issues.push("deliveryAccepted must be a boolean.");
  }
  if (typeof input.deliveryRejected !== "boolean") {
    issues.push("deliveryRejected must be a boolean.");
  }
  if (
    typeof input.deliveryAccepted === "boolean" &&
    typeof input.deliveryRejected === "boolean" &&
    input.deliveryAccepted === input.deliveryRejected
  ) {
    issues.push("deliveryAccepted and deliveryRejected must be opposites.");
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }
  if (input.deliveryEnabled !== false) {
    issues.push("deliveryEnabled must be false.");
  }
  if (input.executionEnabled !== false) {
    issues.push("executionEnabled must be false.");
  }

  if (
    typeof input.pipelineStage !== "string" ||
    !STAGE_SET.has(input.pipelineStage)
  ) {
    issues.push(
      `pipelineStage must be one of: ${ADS_INTERNAL_DELIVERY_PILOT_V1_STAGES.join(", ")}.`
    );
  }

  if (input.candidateId !== null && !isNonEmptyString(input.candidateId)) {
    issues.push("candidateId must be a non-empty string or null.");
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
      issues.push(
        "diagnostics.candidateId must be a non-empty string or null."
      );
    }
    if (
      input.diagnostics.placementId !== null &&
      (typeof input.diagnostics.placementId !== "string" ||
        !isAdsPlacementId(input.diagnostics.placementId))
    ) {
      issues.push(
        "diagnostics.placementId must be a registered placement or null."
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
    if (
      input.diagnostics.creativeType !== null &&
      typeof input.diagnostics.creativeType !== "string"
    ) {
      issues.push("diagnostics.creativeType must be a string or null.");
    }
    if (typeof input.diagnostics.deliveryAccepted !== "boolean") {
      issues.push("diagnostics.deliveryAccepted must be a boolean.");
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

  if (input.deliveryAccepted === true) {
    if (input.pipelineStage !== "result") {
      issues.push(
        'pipelineStage must be "result" when deliveryAccepted is true.'
      );
    }
    if (!isNonEmptyString(input.candidateId)) {
      issues.push("candidateId is required when deliveryAccepted is true.");
    }
    if (input.renderDescriptor === null || input.renderDescriptor === undefined) {
      issues.push(
        "renderDescriptor is required when deliveryAccepted is true."
      );
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
      if (input.diagnostics.deliveryAccepted !== true) {
        issues.push(
          "diagnostics.deliveryAccepted must be true when deliveryAccepted is true."
        );
      }
      if (input.diagnostics.rejectionReason !== null) {
        issues.push(
          "diagnostics.rejectionReason must be null when deliveryAccepted is true."
        );
      }
      if (
        isNonEmptyString(input.candidateId) &&
        input.diagnostics.candidateId !== input.candidateId
      ) {
        issues.push(
          "diagnostics.candidateId must match candidateId when deliveryAccepted is true."
        );
      }
    }
  }

  if (input.deliveryRejected === true) {
    if (input.renderDescriptor !== null) {
      issues.push(
        "renderDescriptor must be null when deliveryRejected is true."
      );
    }
    if (input.pipelineStage === "result") {
      issues.push(
        'pipelineStage must not be "result" when deliveryRejected is true.'
      );
    }
    if (isRecord(input.diagnostics)) {
      if (input.diagnostics.deliveryAccepted !== false) {
        issues.push(
          "diagnostics.deliveryAccepted must be false when deliveryRejected is true."
        );
      }
      if (
        typeof input.diagnostics.rejectionReason !== "string" ||
        !REJECTION_REASON_SET.has(input.diagnostics.rejectionReason)
      ) {
        issues.push(
          "diagnostics.rejectionReason is required when deliveryRejected is true."
        );
      }
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Runs Internal Delivery Pilot V1 on a validated execution internal result.
 * Stages: Validate → Validate Delivery → Deliver → Result.
 * Deterministic: identical inputs → identical outputs.
 * Never mutates inputs. Never renders or delivers to production.
 */
export function runInternalDeliveryPilotV1(
  input: unknown
): AdsInternalDeliveryPilotV1Outcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Internal delivery pilot input must be an object.",
      ]),
    };
  }

  const parseIssues: string[] = [];
  rejectProhibitedFields(input, "", parseIssues);
  rejectUnknownFields(input, INPUT_ALLOWED, "", parseIssues);

  const nowMs = parseIsoTimestampMs(input.currentTimestamp);
  if (nowMs === null) {
    parseIssues.push("currentTimestamp must be a valid ISO-8601 timestamp.");
  }

  if (!("executionResult" in input)) {
    parseIssues.push("executionResult is required.");
  }

  if (parseIssues.length > 0 || nowMs === null) {
    return {
      valid: false,
      issues: Object.freeze(
        parseIssues.length > 0
          ? [...parseIssues]
          : ["Internal delivery pilot input is malformed."]
      ),
    };
  }

  // --- Validate (execution internal result contract) ---
  // Structural check only: when execution was already accepted, pin the
  // validator clock to descriptor.expiresAt so expiry is evaluated later in
  // validate_delivery against the injected currentTimestamp (not hard-failed).
  let structuralNowMs = nowMs;
  if (
    isRecord(input.executionResult) &&
    input.executionResult.executionAccepted === true &&
    isRecord(input.executionResult.renderDescriptor)
  ) {
    const acceptedExpiresAtMs = parseIsoTimestampMs(
      input.executionResult.renderDescriptor.expiresAt
    );
    if (acceptedExpiresAtMs !== null) {
      structuralNowMs = acceptedExpiresAtMs;
    }
  }

  const executionValidation = validateAdsExecutionInternalResult(
    input.executionResult,
    { nowMs: structuralNowMs }
  );
  if (!executionValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...executionValidation.issues.map(
          (issue) => `Inconsistent execution result: ${issue}`
        ),
      ]),
    };
  }

  const executionResult = input.executionResult as AdsExecutionInternalResult;

  if (executionResult.productionEnabled !== false) {
    return {
      valid: false,
      issues: Object.freeze(["productionEnabled must be false."]),
    };
  }
  if (executionResult.deliveryEnabled !== false) {
    return {
      valid: false,
      issues: Object.freeze(["deliveryEnabled must be false."]),
    };
  }
  if (executionResult.executionEnabled !== false) {
    return {
      valid: false,
      issues: Object.freeze(["executionEnabled must be false."]),
    };
  }

  const baseDiagnosticsFromExecution = {
    candidateId: executionResult.candidateId,
    placementId: executionResult.diagnostics.placementId,
    creativeReference: executionResult.diagnostics.creativeReference,
    creativeType: executionResult.diagnostics.creativeType,
  } as const;

  // Soft-reject when upstream execution was not accepted.
  if (executionResult.executionAccepted !== true) {
    const result = rejectedResult(
      "validate",
      "execution_not_accepted",
      baseDiagnosticsFromExecution
    );
    const validation = validateAdsInternalDeliveryInternalResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  if (
    !isNonEmptyString(executionResult.candidateId) ||
    executionResult.renderDescriptor === null
  ) {
    return {
      valid: false,
      issues: Object.freeze([
        "executionAccepted results must include candidateId and renderDescriptor.",
      ]),
    };
  }

  const candidateId = executionResult.candidateId;
  const descriptor = executionResult.renderDescriptor;

  // --- Validate Delivery (re-assert descriptor gates) ---
  const descriptorValidation = validateAdsRenderDescriptor(descriptor, {
    nowMs,
  });
  if (!descriptorValidation.valid) {
    const expired = descriptorValidation.issues.some((issue) =>
      issue.includes("expired")
    );
    const placementIncompatible = descriptorValidation.issues.some((issue) =>
      /not supported by placement/i.test(issue)
    );
    const identityIncomplete = descriptorValidation.issues.some((issue) =>
      /trackingReferences\./i.test(issue)
    );

    let rejectionReason: AdsInternalDeliveryPilotV1RejectionReason =
      "invalid_descriptor";
    let pipelineStage: AdsInternalDeliveryPilotV1Stage = "validate_delivery";
    if (expired) {
      rejectionReason = "descriptor_expired";
    } else if (placementIncompatible) {
      rejectionReason = "placement_incompatible";
    } else if (identityIncomplete) {
      rejectionReason = "identity_incomplete";
    }

    const result = rejectedResult(pipelineStage, rejectionReason, {
      candidateId,
      placementId: isAdsPlacementId(descriptor.placementId)
        ? descriptor.placementId
        : null,
      creativeReference: isNonEmptyString(descriptor.creativeReference)
        ? descriptor.creativeReference
        : null,
      creativeType:
        typeof descriptor.creativeType === "string"
          ? (descriptor.creativeType as AdsPlatformCreativeType)
          : null,
    });
    const validation = validateAdsInternalDeliveryInternalResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...descriptorValidation.issues.map(
            (issue) => `Invalid descriptor: ${issue}`
          ),
          ...validation.issues,
        ]),
      };
    }
    return { valid: true, result };
  }

  const baseDiagnostics = {
    candidateId,
    placementId: descriptor.placementId,
    creativeReference: descriptor.creativeReference,
    creativeType: descriptor.creativeType,
  } as const;

  if (descriptor.productionEnabled !== false) {
    const result = rejectedResult("validate_delivery", "invalid_descriptor", {
      ...baseDiagnostics,
    });
    const validation = validateAdsInternalDeliveryInternalResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  if (
    !isNonEmptyString(descriptor.trackingReferences.campaignId) ||
    !isNonEmptyString(descriptor.trackingReferences.adSetId) ||
    !isNonEmptyString(descriptor.trackingReferences.adId) ||
    !isNonEmptyString(descriptor.trackingReferences.creativeId)
  ) {
    const result = rejectedResult("validate_delivery", "identity_incomplete", {
      ...baseDiagnostics,
    });
    const validation = validateAdsInternalDeliveryInternalResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  if (
    !isCreativeTypeSupportedByPlacement(
      descriptor.placementId,
      descriptor.creativeType
    )
  ) {
    const result = rejectedResult(
      "validate_delivery",
      "placement_incompatible",
      baseDiagnostics
    );
    const validation = validateAdsInternalDeliveryInternalResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  const expiresAtMs = parseIsoTimestampMs(descriptor.expiresAt);
  if (
    expiresAtMs === null ||
    expiresAtMs + ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS < nowMs
  ) {
    const result = rejectedResult("validate_delivery", "descriptor_expired", {
      ...baseDiagnostics,
    });
    const validation = validateAdsInternalDeliveryInternalResult(result, {
      nowMs,
    });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  // --- Deliver (deterministic internal snapshot; deliveryEnabled stays false) ---
  // No side effects: freeze the accepted internal result only.
  const result = acceptedResult(candidateId, descriptor);

  // --- Result ---
  const validation = validateAdsInternalDeliveryInternalResult(result, {
    nowMs,
  });
  if (!validation.valid) {
    return { valid: false, issues: Object.freeze([...validation.issues]) };
  }

  return { valid: true, result };
}

/**
 * Lists fixed Internal Delivery Pilot V1 stages.
 */
export function listAdsInternalDeliveryPilotV1Stages(): readonly AdsInternalDeliveryPilotV1Stage[] {
  return Object.freeze([...ADS_INTERNAL_DELIVERY_PILOT_V1_STAGES]);
}

/**
 * Lists stable Internal Delivery Pilot V1 rejection reasons.
 */
export function listAdsInternalDeliveryPilotV1RejectionReasons(): readonly AdsInternalDeliveryPilotV1RejectionReason[] {
  return Object.freeze([...ADS_INTERNAL_DELIVERY_PILOT_V1_REJECTION_REASONS]);
}

// ---------------------------------------------------------------------------
// Foundation orchestrator (inventory execution result → pilotSuccess result).
// Kept for existing measurement consumers.
// Prefer runInternalDeliveryPilotV1 for the Candidate Selection → Render
// Descriptor Pipeline → Execution Layer → Internal Delivery Pilot path.
// ---------------------------------------------------------------------------
export * from "./internalDeliveryPilotFoundation";
