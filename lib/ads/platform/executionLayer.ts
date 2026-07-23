import type {
  AdsPlatformCreativeType,
  ContractValidationResult,
} from "./creativeContracts";
import {
  isAdsPlacementId,
  isCreativeTypeSupportedByPlacement,
  type AdsPlatformPlacementId,
} from "./placementRegistry";
import {
  ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS,
  ADS_RENDER_DESCRIPTOR_MAX_ID_LENGTH,
  ADS_RENDER_DESCRIPTOR_PROHIBITED_FIELDS,
  freezeAdsRenderDescriptor,
  validateAdsRenderDescriptor,
  type AdsRenderDescriptor,
} from "./renderDescriptor";

/**
 * Ads Execution Layer V1 — validated render descriptor → internal result.
 *
 * Pipeline position:
 *   Candidate Selection
 *   → Render Descriptor Pipeline
 *   → Execution Layer
 *   → Internal Result
 *
 * Responsibilities:
 * - accept a validated render descriptor
 * - perform execution validation
 * - execute a deterministic internal pipeline
 * - emit a typed internal execution result + diagnostics
 * - fail closed on malformed / inconsistent input
 * - freeze immutable outputs
 *
 * This is an internal orchestration layer ONLY. It NEVER:
 * - renders creatives or serves advertisements
 * - delivers to product surfaces
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
 * executionAccepted means the internal pipeline completed with a validated
 * descriptor snapshot — never that production execution or delivery ran.
 */

export const ADS_EXECUTION_LAYER_V1_CONTRACT_VERSION = "v1" as const;

/** Fixed pipeline stages in evaluation order. */
export const ADS_EXECUTION_LAYER_V1_STAGES = [
  "validate",
  "validate_execution",
  "execute",
  "result",
] as const;

export type AdsExecutionLayerV1Stage =
  (typeof ADS_EXECUTION_LAYER_V1_STAGES)[number];

/**
 * Stable rejection reasons when the layer completes without accepting execution.
 * Hard malformed input returns valid:false with issues instead.
 */
export const ADS_EXECUTION_LAYER_V1_REJECTION_REASONS = [
  "invalid_descriptor",
  "descriptor_expired",
  "placement_incompatible",
  "identity_incomplete",
] as const;

export type AdsExecutionLayerV1RejectionReason =
  (typeof ADS_EXECUTION_LAYER_V1_REJECTION_REASONS)[number];

/**
 * Top-level keys allowed on Execution Layer V1 input.
 * Unknown fields fail closed.
 */
export const ADS_EXECUTION_LAYER_V1_INPUT_ALLOWED_FIELDS = [
  "candidateId",
  "renderDescriptor",
  "currentTimestamp",
] as const;

/**
 * Top-level keys allowed on AdsExecutionInternalResult.
 * Unknown fields fail closed.
 */
export const ADS_EXECUTION_LAYER_V1_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "executionAccepted",
  "executionRejected",
  "candidateId",
  "renderDescriptor",
  "diagnostics",
  "pipelineStage",
  "productionEnabled",
  "deliveryEnabled",
  "executionEnabled",
] as const;

/**
 * Top-level keys allowed on execution diagnostics.
 */
export const ADS_EXECUTION_LAYER_V1_DIAGNOSTICS_ALLOWED_FIELDS = [
  "candidateId",
  "placementId",
  "creativeReference",
  "creativeType",
  "executionAccepted",
  "rejectionReason",
] as const;

/**
 * Aggregate execution diagnostics — binding / gate outcomes only.
 * Never includes ranking scores, URLs, media bytes, or PII.
 */
export type AdsExecutionLayerV1Diagnostics = Readonly<{
  candidateId: string | null;
  placementId: AdsPlatformPlacementId | null;
  creativeReference: string | null;
  creativeType: AdsPlatformCreativeType | null;
  executionAccepted: boolean;
  rejectionReason: AdsExecutionLayerV1RejectionReason | null;
}>;

/**
 * Canonical Internal Execution Result V1.
 * Metadata / orchestration snapshot only — never a served or rendered ad.
 */
export type AdsExecutionInternalResult = Readonly<{
  contractVersion: typeof ADS_EXECUTION_LAYER_V1_CONTRACT_VERSION;
  executionAccepted: boolean;
  executionRejected: boolean;
  candidateId: string | null;
  renderDescriptor: AdsRenderDescriptor | null;
  diagnostics: AdsExecutionLayerV1Diagnostics;
  pipelineStage: AdsExecutionLayerV1Stage;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
}>;

/**
 * Execution Layer V1 input — selected candidate binding + validated descriptor.
 * Caller injects currentTimestamp for deterministic expiry checks.
 *
 * Identity authority:
 * - candidateId is the upstream selection binding (Candidate Selection).
 * - Creative / placement / tracking identity comes only from renderDescriptor.
 * - No client-supplied identity override fields are accepted.
 */
export type AdsExecutionLayerV1Input = Readonly<{
  candidateId: string;
  renderDescriptor: AdsRenderDescriptor;
  /** ISO-8601 timestamp used for deterministic expiry checks. */
  currentTimestamp: string;
}>;

export type AdsExecutionLayerV1Outcome =
  | Readonly<{ valid: true; result: AdsExecutionInternalResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const STAGE_SET = new Set<string>(ADS_EXECUTION_LAYER_V1_STAGES);
const REJECTION_REASON_SET = new Set<string>(
  ADS_EXECUTION_LAYER_V1_REJECTION_REASONS
);
const INPUT_ALLOWED = new Set<string>(
  ADS_EXECUTION_LAYER_V1_INPUT_ALLOWED_FIELDS
);
const RESULT_ALLOWED = new Set<string>(
  ADS_EXECUTION_LAYER_V1_RESULT_ALLOWED_FIELDS
);
const DIAGNOSTICS_ALLOWED = new Set<string>(
  ADS_EXECUTION_LAYER_V1_DIAGNOSTICS_ALLOWED_FIELDS
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
        `${prefix}prohibited field "${field}" is not allowed on execution layer input.`
      );
    }
  }
}

function freezeDiagnostics(
  diagnostics: AdsExecutionLayerV1Diagnostics
): AdsExecutionLayerV1Diagnostics {
  return Object.freeze({
    candidateId: diagnostics.candidateId,
    placementId: diagnostics.placementId,
    creativeReference: diagnostics.creativeReference,
    creativeType: diagnostics.creativeType,
    executionAccepted: diagnostics.executionAccepted,
    rejectionReason: diagnostics.rejectionReason,
  });
}

function freezeInternalResult(
  result: AdsExecutionInternalResult
): AdsExecutionInternalResult {
  return Object.freeze({
    contractVersion: ADS_EXECUTION_LAYER_V1_CONTRACT_VERSION,
    executionAccepted: result.executionAccepted,
    executionRejected: result.executionRejected,
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
  pipelineStage: AdsExecutionLayerV1Stage,
  rejectionReason: AdsExecutionLayerV1RejectionReason,
  diagnostics: Partial<AdsExecutionLayerV1Diagnostics> = {}
): AdsExecutionInternalResult {
  return freezeInternalResult({
    contractVersion: ADS_EXECUTION_LAYER_V1_CONTRACT_VERSION,
    executionAccepted: false,
    executionRejected: true,
    candidateId: diagnostics.candidateId ?? null,
    renderDescriptor: null,
    diagnostics: freezeDiagnostics({
      candidateId: diagnostics.candidateId ?? null,
      placementId: diagnostics.placementId ?? null,
      creativeReference: diagnostics.creativeReference ?? null,
      creativeType: diagnostics.creativeType ?? null,
      executionAccepted: false,
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
): AdsExecutionInternalResult {
  const frozenDescriptor = freezeAdsRenderDescriptor(descriptor);
  return freezeInternalResult({
    contractVersion: ADS_EXECUTION_LAYER_V1_CONTRACT_VERSION,
    executionAccepted: true,
    executionRejected: false,
    candidateId,
    renderDescriptor: frozenDescriptor,
    diagnostics: freezeDiagnostics({
      candidateId,
      placementId: frozenDescriptor.placementId,
      creativeReference: frozenDescriptor.creativeReference,
      creativeType: frozenDescriptor.creativeType,
      executionAccepted: true,
      rejectionReason: null,
    }),
    pipelineStage: "result",
    productionEnabled: false,
    deliveryEnabled: false,
    executionEnabled: false,
  });
}

/**
 * Pure shape validator for Execution Layer V1 internal results.
 * Fail-closed — does not execute, render, or deliver ads.
 */
export function validateAdsExecutionInternalResult(
  input: unknown,
  options: { nowMs?: number } = {}
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Execution internal result must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  rejectUnknownFields(input, RESULT_ALLOWED, "", issues);

  if (input.contractVersion !== ADS_EXECUTION_LAYER_V1_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_EXECUTION_LAYER_V1_CONTRACT_VERSION}".`
    );
  }

  if (typeof input.executionAccepted !== "boolean") {
    issues.push("executionAccepted must be a boolean.");
  }
  if (typeof input.executionRejected !== "boolean") {
    issues.push("executionRejected must be a boolean.");
  }
  if (
    typeof input.executionAccepted === "boolean" &&
    typeof input.executionRejected === "boolean" &&
    input.executionAccepted === input.executionRejected
  ) {
    issues.push("executionAccepted and executionRejected must be opposites.");
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
      `pipelineStage must be one of: ${ADS_EXECUTION_LAYER_V1_STAGES.join(", ")}.`
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
      issues.push(
        "diagnostics.creativeType must be a string or null."
      );
    }
    if (typeof input.diagnostics.executionAccepted !== "boolean") {
      issues.push("diagnostics.executionAccepted must be a boolean.");
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

  if (input.executionAccepted === true) {
    if (input.pipelineStage !== "result") {
      issues.push(
        'pipelineStage must be "result" when executionAccepted is true.'
      );
    }
    if (!isNonEmptyString(input.candidateId)) {
      issues.push("candidateId is required when executionAccepted is true.");
    }
    if (input.renderDescriptor === null || input.renderDescriptor === undefined) {
      issues.push(
        "renderDescriptor is required when executionAccepted is true."
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
      if (input.diagnostics.executionAccepted !== true) {
        issues.push(
          "diagnostics.executionAccepted must be true when executionAccepted is true."
        );
      }
      if (input.diagnostics.rejectionReason !== null) {
        issues.push(
          "diagnostics.rejectionReason must be null when executionAccepted is true."
        );
      }
      if (
        isNonEmptyString(input.candidateId) &&
        input.diagnostics.candidateId !== input.candidateId
      ) {
        issues.push(
          "diagnostics.candidateId must match candidateId when executionAccepted is true."
        );
      }
    }
  }

  if (input.executionRejected === true) {
    if (input.renderDescriptor !== null) {
      issues.push(
        "renderDescriptor must be null when executionRejected is true."
      );
    }
    if (input.pipelineStage === "result") {
      issues.push(
        'pipelineStage must not be "result" when executionRejected is true.'
      );
    }
    if (isRecord(input.diagnostics)) {
      if (input.diagnostics.executionAccepted !== false) {
        issues.push(
          "diagnostics.executionAccepted must be false when executionRejected is true."
        );
      }
      if (
        typeof input.diagnostics.rejectionReason !== "string" ||
        !REJECTION_REASON_SET.has(input.diagnostics.rejectionReason)
      ) {
        issues.push(
          "diagnostics.rejectionReason is required when executionRejected is true."
        );
      }
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Runs Execution Layer V1 on a selected candidate + validated render descriptor.
 * Stages: Validate → Validate Execution → Execute → Result.
 * Deterministic: identical inputs → identical outputs.
 * Never mutates inputs. Never renders or delivers.
 */
export function runAdsExecutionLayerV1(
  input: unknown
): AdsExecutionLayerV1Outcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Execution layer input must be an object."]),
    };
  }

  const parseIssues: string[] = [];
  rejectProhibitedFields(input, "", parseIssues);
  rejectUnknownFields(input, INPUT_ALLOWED, "", parseIssues);

  if (!isNonEmptyString(input.candidateId)) {
    parseIssues.push("candidateId is required and must be a non-empty string.");
  } else if (input.candidateId.length > ADS_RENDER_DESCRIPTOR_MAX_ID_LENGTH) {
    parseIssues.push(
      `candidateId exceeds max length of ${ADS_RENDER_DESCRIPTOR_MAX_ID_LENGTH}.`
    );
  }

  const nowMs = parseIsoTimestampMs(input.currentTimestamp);
  if (nowMs === null) {
    parseIssues.push("currentTimestamp must be a valid ISO-8601 timestamp.");
  }

  if (parseIssues.length > 0 || nowMs === null || !isNonEmptyString(input.candidateId)) {
    return {
      valid: false,
      issues: Object.freeze(
        parseIssues.length > 0
          ? [...parseIssues]
          : ["Execution layer input is malformed."]
      ),
    };
  }

  const candidateId = input.candidateId;

  // --- Validate (descriptor contract) ---
  const descriptorValidation = validateAdsRenderDescriptor(
    input.renderDescriptor,
    { nowMs }
  );
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

    let rejectionReason: AdsExecutionLayerV1RejectionReason = "invalid_descriptor";
    let pipelineStage: AdsExecutionLayerV1Stage = "validate";
    if (expired) {
      rejectionReason = "descriptor_expired";
      pipelineStage = "validate_execution";
    } else if (placementIncompatible) {
      rejectionReason = "placement_incompatible";
      pipelineStage = "validate_execution";
    } else if (identityIncomplete) {
      rejectionReason = "identity_incomplete";
      pipelineStage = "validate_execution";
    }

    let placementId: AdsPlatformPlacementId | null = null;
    let creativeReference: string | null = null;
    let creativeType: AdsPlatformCreativeType | null = null;
    if (isRecord(input.renderDescriptor)) {
      if (
        typeof input.renderDescriptor.placementId === "string" &&
        isAdsPlacementId(input.renderDescriptor.placementId)
      ) {
        placementId = input.renderDescriptor.placementId;
      }
      if (isNonEmptyString(input.renderDescriptor.creativeReference)) {
        creativeReference = input.renderDescriptor.creativeReference;
      }
      if (typeof input.renderDescriptor.creativeType === "string") {
        creativeType =
          input.renderDescriptor.creativeType as AdsPlatformCreativeType;
      }
    }
    const result = rejectedResult(pipelineStage, rejectionReason, {
      candidateId,
      placementId,
      creativeReference,
      creativeType,
    });
    const validation = validateAdsExecutionInternalResult(result, { nowMs });
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

  const descriptor = input.renderDescriptor as AdsRenderDescriptor;

  const baseDiagnostics = {
    candidateId,
    placementId: descriptor.placementId,
    creativeReference: descriptor.creativeReference,
    creativeType: descriptor.creativeType,
  } as const;

  // --- Validate Execution (re-assert gates after contract validation) ---
  if (descriptor.productionEnabled !== false) {
    const result = rejectedResult("validate_execution", "invalid_descriptor", {
      ...baseDiagnostics,
    });
    const validation = validateAdsExecutionInternalResult(result, { nowMs });
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
    const result = rejectedResult("validate_execution", "identity_incomplete", {
      ...baseDiagnostics,
    });
    const validation = validateAdsExecutionInternalResult(result, { nowMs });
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
      "validate_execution",
      "placement_incompatible",
      baseDiagnostics
    );
    const validation = validateAdsExecutionInternalResult(result, { nowMs });
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
    const result = rejectedResult("validate_execution", "descriptor_expired", {
      ...baseDiagnostics,
    });
    const validation = validateAdsExecutionInternalResult(result, { nowMs });
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  // --- Execute (deterministic internal snapshot; executionEnabled stays false) ---
  // No side effects: freeze the accepted internal result only.
  const result = acceptedResult(candidateId, descriptor);

  // --- Result ---
  const validation = validateAdsExecutionInternalResult(result, { nowMs });
  if (!validation.valid) {
    return { valid: false, issues: Object.freeze([...validation.issues]) };
  }

  return { valid: true, result };
}

/**
 * Lists fixed Execution Layer V1 stages.
 */
export function listAdsExecutionLayerV1Stages(): readonly AdsExecutionLayerV1Stage[] {
  return Object.freeze([...ADS_EXECUTION_LAYER_V1_STAGES]);
}

/**
 * Lists stable Execution Layer V1 rejection reasons.
 */
export function listAdsExecutionLayerV1RejectionReasons(): readonly AdsExecutionLayerV1RejectionReason[] {
  return Object.freeze([...ADS_EXECUTION_LAYER_V1_REJECTION_REASONS]);
}

// ---------------------------------------------------------------------------
// Foundation orchestrator (inventory → eligibility → … → execution result).
// Kept for existing measurement / internal-delivery-pilot consumers.
// Prefer runAdsExecutionLayerV1 for the Candidate Selection → Render Descriptor
// Pipeline → Execution Layer path.
// ---------------------------------------------------------------------------
export * from "./executionLayerFoundation";
