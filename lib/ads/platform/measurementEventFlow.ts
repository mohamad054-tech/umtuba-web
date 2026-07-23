import type { ContractValidationResult } from "./creativeContracts";
import {
  ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
  ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER,
  ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL,
  buildAdsMeasurementDedupeKey,
  validateAdsMeasurementFoundationPackage,
  type AdsMeasurementFoundationEventType,
  type AdsMeasurementFoundationPackage,
} from "./measurementFoundation";
import {
  runAdsClickMeasurementPipeline,
  runAdsImpressionMeasurementPipeline,
  runAdsViewabilityMeasurementPipeline,
  validateAdsMeasurementPipelineResult,
  validateAdsViewabilitySignal,
  type AdsMeasurementPipelineResult,
  type AdsViewabilitySignal,
} from "./measurementPipeline";
import {
  resolveAdsReportingHandle,
  validateAdsReportingHandleResolutionResult,
  type AdsReportingHandleResolutionEntry,
  type AdsReportingHandleResolutionResult,
} from "./reportingHandleResolution";
import type {
  AdsReportingHandleClientReference,
  AdsReportingHandleEventPermission,
  AdsReportingHandleOpaqueToken,
} from "./reportingHandle";

/**
 * Ads Measurement Event Flow V1 — separate event-reporting track.
 *
 * IMPORTANT — track separation:
 * - This module is a reporting-handle → package → pipeline orchestration
 *   track for client/opaque-token event flows.
 * - It is NOT the delivery-decision pipeline and is NOT an authoritative
 *   production decision entrypoint.
 * - Import via `adsPlatformCompatibility` only (not the flat platform barrel).
 * - It does NOT replace canonical Delivery → Measurement integration on
 *   `runAdsCanonicalStackV1`.
 *
 * Canonical delivery-decision + measurement path:
 *   Candidate Selection → Scoring/Ranking → Budget/Pacing → Frequency →
 *   Auction → Fraud/IVT → Adapter → Render → Execution V1 →
 *   Internal Delivery Pilot V1 → Measurement V1 → Billing
 *
 * Flow (this track only):
 *   Resolve reporting handle → Validate event → Build package →
 *   Run typed measurement pipeline → Flow Result
 *
 * Supports impression, viewability (`qualified_view`), and click paths with
 * in-memory deduplication. This layer NEVER:
 * - stores, appends, writes, or transmits events
 * - queries a database or imports Supabase
 * - uses the network
 * - enables ADS_DELIVERY_ENABLED, placement flags, or runtime measurement
 * - implements analytics, reporting, billing, attribution, or optimization
 * - imports product surfaces
 *
 * productionEnabled and measurementEnabled are always false.
 * flowAccepted means the internal flow completed successfully — not that
 * measurement is live or that anything was stored/sent.
 */

export const ADS_MEASUREMENT_EVENT_FLOW_CONTRACT_VERSION = "v1" as const;

/** Fixed flow stages in evaluation order. */
export const ADS_MEASUREMENT_EVENT_FLOW_STAGES = [
  "resolve_handle",
  "validate_event",
  "prepare_package",
  "run_pipeline",
  "result",
] as const;

export type AdsMeasurementEventFlowStage =
  (typeof ADS_MEASUREMENT_EVENT_FLOW_STAGES)[number];

/**
 * Top-level keys allowed on the flow input.
 * Unknown fields fail closed.
 */
export const ADS_MEASUREMENT_EVENT_FLOW_INPUT_ALLOWED_FIELDS = [
  "eventType",
  "reportingHandle",
  "currentTimestamp",
  "registry",
  "seenDedupeKeys",
  "viewabilitySignal",
] as const;

/**
 * Top-level keys allowed on AdsMeasurementEventFlowResult.
 * Unknown fields fail closed.
 */
export const ADS_MEASUREMENT_EVENT_FLOW_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "flowAccepted",
  "flowRejected",
  "flowStage",
  "eventType",
  "resolution",
  "measurementPackage",
  "pipelineResult",
  "productionEnabled",
  "measurementEnabled",
] as const;

export type AdsMeasurementEventFlowInput = Readonly<{
  eventType: AdsMeasurementFoundationEventType;
  reportingHandle:
    | AdsReportingHandleClientReference
    | AdsReportingHandleOpaqueToken;
  /** Explicit ISO-8601 current time — never read from the system clock. */
  currentTimestamp: string;
  registry: readonly AdsReportingHandleResolutionEntry[];
  seenDedupeKeys?: readonly string[];
  /** Required when eventType is qualified_view. */
  viewabilitySignal?: AdsViewabilitySignal;
}>;

/**
 * Canonical Measurement Event Flow Result V1.
 * In-memory only — never stored, sent, or reported.
 */
export type AdsMeasurementEventFlowResult = Readonly<{
  contractVersion: typeof ADS_MEASUREMENT_EVENT_FLOW_CONTRACT_VERSION;
  flowAccepted: boolean;
  flowRejected: boolean;
  flowStage: AdsMeasurementEventFlowStage;
  eventType: AdsMeasurementFoundationEventType | null;
  resolution: AdsReportingHandleResolutionResult | null;
  measurementPackage: AdsMeasurementFoundationPackage | null;
  pipelineResult: AdsMeasurementPipelineResult | null;
  productionEnabled: false;
  measurementEnabled: false;
}>;

export type AdsMeasurementEventFlowOutcome =
  | Readonly<{ valid: true; result: AdsMeasurementEventFlowResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_MEASUREMENT_EVENT_FLOW_INPUT_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_MEASUREMENT_EVENT_FLOW_RESULT_ALLOWED_FIELDS
);
const STAGE_SET = new Set<string>(ADS_MEASUREMENT_EVENT_FLOW_STAGES);
const EVENT_TYPE_SET = new Set<string>([
  "impression",
  "qualified_view",
  "click",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function freezeFlowResult(
  result: AdsMeasurementEventFlowResult
): AdsMeasurementEventFlowResult {
  return Object.freeze({
    contractVersion: ADS_MEASUREMENT_EVENT_FLOW_CONTRACT_VERSION,
    flowAccepted: result.flowAccepted,
    flowRejected: result.flowRejected,
    flowStage: result.flowStage,
    eventType: result.eventType,
    resolution: result.resolution,
    measurementPackage: result.measurementPackage,
    pipelineResult: result.pipelineResult,
    productionEnabled: false as const,
    measurementEnabled: false as const,
  });
}

function rejectedFlow(params: {
  flowStage: AdsMeasurementEventFlowStage;
  eventType?: AdsMeasurementFoundationEventType | null;
  resolution?: AdsReportingHandleResolutionResult | null;
  measurementPackage?: AdsMeasurementFoundationPackage | null;
  pipelineResult?: AdsMeasurementPipelineResult | null;
}): AdsMeasurementEventFlowResult {
  return freezeFlowResult({
    contractVersion: ADS_MEASUREMENT_EVENT_FLOW_CONTRACT_VERSION,
    flowAccepted: false,
    flowRejected: true,
    flowStage: params.flowStage,
    eventType: params.eventType ?? null,
    resolution: params.resolution ?? null,
    measurementPackage: params.measurementPackage ?? null,
    pipelineResult: params.pipelineResult ?? null,
    productionEnabled: false,
    measurementEnabled: false,
  });
}

function acceptedFlow(params: {
  eventType: AdsMeasurementFoundationEventType;
  resolution: AdsReportingHandleResolutionResult;
  measurementPackage: AdsMeasurementFoundationPackage;
  pipelineResult: AdsMeasurementPipelineResult;
}): AdsMeasurementEventFlowResult {
  return freezeFlowResult({
    contractVersion: ADS_MEASUREMENT_EVENT_FLOW_CONTRACT_VERSION,
    flowAccepted: true,
    flowRejected: false,
    flowStage: "result",
    eventType: params.eventType,
    resolution: params.resolution,
    measurementPackage: params.measurementPackage,
    pipelineResult: params.pipelineResult,
    productionEnabled: false,
    measurementEnabled: false,
  });
}

/**
 * Builds a Measurement Foundation package from a resolved reporting handle.
 * Deterministic — never stores or transmits.
 */
export function buildAdsMeasurementPackageFromResolvedHandle(params: {
  eventType: AdsMeasurementFoundationEventType;
  selectedCandidateId: string;
  reportingHandleToken: string;
}): AdsMeasurementFoundationPackage {
  return Object.freeze({
    contractVersion: ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
    measurementReady: true as const,
    eventType: params.eventType,
    dedupeKey: buildAdsMeasurementDedupeKey({
      eventType: params.eventType,
      selectedCandidateId: params.selectedCandidateId,
      reportingHandle: params.reportingHandleToken,
    }),
    trustLevel: ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL,
    signaturePlaceholder: ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER,
    productionEnabled: false as const,
    measurementEnabled: false as const,
  });
}

/**
 * Pure shape validator for Measurement Event Flow Result V1.
 * Fail-closed — does not store, send, or enable measurement.
 */
export function validateAdsMeasurementEventFlowResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Measurement event flow result must be an object.",
      ]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!RESULT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `Measurement event flow result contains unknown field "${key}".`
      );
    }
  }

  if (input.contractVersion !== ADS_MEASUREMENT_EVENT_FLOW_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_MEASUREMENT_EVENT_FLOW_CONTRACT_VERSION}".`
    );
  }

  if (typeof input.flowAccepted !== "boolean") {
    issues.push("flowAccepted must be a boolean.");
  }
  if (typeof input.flowRejected !== "boolean") {
    issues.push("flowRejected must be a boolean.");
  }
  if (
    typeof input.flowAccepted === "boolean" &&
    typeof input.flowRejected === "boolean" &&
    input.flowAccepted === input.flowRejected
  ) {
    issues.push("flowAccepted and flowRejected must be mutually exclusive.");
  }

  if (
    typeof input.flowStage !== "string" ||
    !STAGE_SET.has(input.flowStage)
  ) {
    issues.push(
      `flowStage must be one of: ${ADS_MEASUREMENT_EVENT_FLOW_STAGES.join(", ")}.`
    );
  }

  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }
  if (input.measurementEnabled !== false) {
    issues.push("measurementEnabled must be false.");
  }

  if (input.resolution !== null && input.resolution !== undefined) {
    const resolutionValidation = validateAdsReportingHandleResolutionResult(
      input.resolution
    );
    if (!resolutionValidation.valid) {
      for (const issue of resolutionValidation.issues) {
        issues.push(`resolution: ${issue}`);
      }
    }
  }

  if (
    input.measurementPackage !== null &&
    input.measurementPackage !== undefined
  ) {
    const packageValidation = validateAdsMeasurementFoundationPackage(
      input.measurementPackage
    );
    if (!packageValidation.valid) {
      for (const issue of packageValidation.issues) {
        issues.push(`measurementPackage: ${issue}`);
      }
    }
  }

  if (input.pipelineResult !== null && input.pipelineResult !== undefined) {
    const pipelineValidation = validateAdsMeasurementPipelineResult(
      input.pipelineResult
    );
    if (!pipelineValidation.valid) {
      for (const issue of pipelineValidation.issues) {
        issues.push(`pipelineResult: ${issue}`);
      }
    }
  }

  if (input.flowAccepted === true) {
    if (input.flowStage !== "result") {
      issues.push('flowStage must be "result" when flowAccepted is true.');
    }
    if (
      typeof input.eventType !== "string" ||
      !EVENT_TYPE_SET.has(input.eventType)
    ) {
      issues.push(
        'eventType must be "impression", "qualified_view", or "click" when flowAccepted is true.'
      );
    }
    if (input.resolution === null || input.resolution === undefined) {
      issues.push("resolution is required when flowAccepted is true.");
    }
    if (
      input.measurementPackage === null ||
      input.measurementPackage === undefined
    ) {
      issues.push("measurementPackage is required when flowAccepted is true.");
    }
    if (input.pipelineResult === null || input.pipelineResult === undefined) {
      issues.push("pipelineResult is required when flowAccepted is true.");
    } else if (
      isRecord(input.pipelineResult) &&
      input.pipelineResult.measurementAccepted !== true
    ) {
      issues.push(
        "pipelineResult.measurementAccepted must be true when flowAccepted is true."
      );
    }
  } else if (input.flowRejected === true) {
    if (input.flowStage === "result") {
      issues.push(
        'flowStage must not be "result" when flowRejected is true.'
      );
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

function runTypedPipeline(params: {
  eventType: AdsMeasurementFoundationEventType;
  measurementPackage: AdsMeasurementFoundationPackage;
  seenDedupeKeys?: readonly string[];
  viewabilitySignal?: AdsViewabilitySignal;
}) {
  if (params.eventType === "impression") {
    return runAdsImpressionMeasurementPipeline({
      measurementPackage: params.measurementPackage,
      ...(params.seenDedupeKeys !== undefined
        ? { seenDedupeKeys: params.seenDedupeKeys }
        : {}),
    });
  }
  if (params.eventType === "click") {
    return runAdsClickMeasurementPipeline({
      measurementPackage: params.measurementPackage,
      ...(params.seenDedupeKeys !== undefined
        ? { seenDedupeKeys: params.seenDedupeKeys }
        : {}),
    });
  }
  return runAdsViewabilityMeasurementPipeline({
    measurementPackage: params.measurementPackage,
    viewabilitySignal: params.viewabilitySignal as AdsViewabilitySignal,
    ...(params.seenDedupeKeys !== undefined
      ? { seenDedupeKeys: params.seenDedupeKeys }
      : {}),
  });
}

/**
 * Runs the internal measurement event flow.
 * Fail-closed on malformed input, unresolved handles, invalid viewability,
 * and pipeline rejection. Never stores, sends, or enables measurement.
 */
export function runAdsMeasurementEventFlow(
  input: unknown
): AdsMeasurementEventFlowOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze([
        "Measurement event flow input must be an object.",
      ]),
    };
  }

  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(
        `Measurement event flow input contains unknown field "${key}".`
      );
    }
  }
  for (const required of [
    "eventType",
    "reportingHandle",
    "currentTimestamp",
    "registry",
  ] as const) {
    if (!(required in input)) {
      issues.push(`Measurement event flow input must include ${required}.`);
    }
  }
  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  if (
    typeof input.eventType !== "string" ||
    !EVENT_TYPE_SET.has(input.eventType)
  ) {
    return {
      valid: false,
      issues: Object.freeze([
        'eventType must be "impression", "qualified_view", or "click".',
      ]),
    };
  }
  const eventType = input.eventType as AdsMeasurementFoundationEventType;
  const handleEventType = eventType as AdsReportingHandleEventPermission;

  // --- resolve_handle ---
  const resolutionOutcome = resolveAdsReportingHandle({
    reportingHandle: input.reportingHandle,
    eventType: handleEventType,
    currentTimestamp: input.currentTimestamp,
    registry: input.registry,
  });
  if (!resolutionOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([...resolutionOutcome.issues]),
    };
  }
  if (
    resolutionOutcome.result.handleRejected ||
    !resolutionOutcome.result.handleResolved
  ) {
    const result = rejectedFlow({
      flowStage: "resolve_handle",
      eventType,
      resolution: resolutionOutcome.result,
    });
    const resultValidation = validateAdsMeasurementEventFlowResult(result);
    if (!resultValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([...resultValidation.issues]),
      };
    }
    return { valid: true, result };
  }

  const resolution = resolutionOutcome.result;

  // --- validate_event ---
  if (eventType === "qualified_view") {
    if (!("viewabilitySignal" in input) || input.viewabilitySignal === undefined) {
      const result = rejectedFlow({
        flowStage: "validate_event",
        eventType,
        resolution,
      });
      return { valid: true, result };
    }
    const signalValidation = validateAdsViewabilitySignal(
      input.viewabilitySignal
    );
    if (!signalValidation.valid) {
      const result = rejectedFlow({
        flowStage: "validate_event",
        eventType,
        resolution,
      });
      return { valid: true, result };
    }
  } else if (input.viewabilitySignal !== undefined) {
    return {
      valid: false,
      issues: Object.freeze([
        "viewabilitySignal is only allowed when eventType is \"qualified_view\".",
      ]),
    };
  }

  if (
    resolution.bindings === null ||
    resolution.token === null ||
    resolution.payload === null
  ) {
    const result = rejectedFlow({
      flowStage: "validate_event",
      eventType,
      resolution,
    });
    return { valid: true, result };
  }

  // --- prepare_package ---
  const measurementPackage = buildAdsMeasurementPackageFromResolvedHandle({
    eventType,
    selectedCandidateId: resolution.bindings.candidateRef,
    reportingHandleToken: resolution.token,
  });
  const packageValidation =
    validateAdsMeasurementFoundationPackage(measurementPackage);
  if (!packageValidation.valid) {
    const result = rejectedFlow({
      flowStage: "prepare_package",
      eventType,
      resolution,
      measurementPackage: null,
    });
    return { valid: true, result };
  }

  // --- run_pipeline ---
  const pipelineOutcome = runTypedPipeline({
    eventType,
    measurementPackage,
    ...(input.seenDedupeKeys !== undefined
      ? { seenDedupeKeys: input.seenDedupeKeys as readonly string[] }
      : {}),
    ...(eventType === "qualified_view"
      ? { viewabilitySignal: input.viewabilitySignal as AdsViewabilitySignal }
      : {}),
  });
  if (!pipelineOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([...pipelineOutcome.issues]),
    };
  }

  if (
    pipelineOutcome.result.measurementRejected ||
    !pipelineOutcome.result.measurementAccepted
  ) {
    const result = rejectedFlow({
      flowStage: "run_pipeline",
      eventType,
      resolution,
      measurementPackage,
      pipelineResult: pipelineOutcome.result,
    });
    const resultValidation = validateAdsMeasurementEventFlowResult(result);
    if (!resultValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([...resultValidation.issues]),
      };
    }
    return { valid: true, result };
  }

  // --- result ---
  const result = acceptedFlow({
    eventType,
    resolution,
    measurementPackage,
    pipelineResult: pipelineOutcome.result,
  });
  const resultValidation = validateAdsMeasurementEventFlowResult(result);
  if (!resultValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...resultValidation.issues]),
    };
  }

  return { valid: true, result };
}
