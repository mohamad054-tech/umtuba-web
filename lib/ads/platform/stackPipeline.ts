import {
  assertProvenanceMatchesDeliveryResult,
  assertProvenanceMatchesExecutionResult,
  assertProvenanceMatchesRenderDescriptor,
  assertProvenanceMatchesRenderEligible,
  type AdsCandidateProvenanceBinding,
} from "./candidateProvenance";
import {
  runAdsCandidateSelection,
  type AdsCandidateSelectionResult,
} from "./candidateSelection";
import type { ContractValidationResult } from "./creativeContracts";
import {
  runAdsExecutionLayerV1,
  type AdsExecutionInternalResult,
} from "./executionLayer";
import {
  runInternalDeliveryPilotV1,
  type AdsInternalDeliveryInternalResult,
} from "./internalDeliveryPilot";
import {
  prepareAdsMeasurementFromDeliveryV1,
  type AdsMeasurementFoundationEventType,
  type AdsMeasurementFoundationPackage,
} from "./measurementFoundation";
import type { AdsRenderCacheHints } from "./renderDescriptor";
import type { AdsRenderDisclosureLabel } from "./renderDescriptor";
import {
  runAdsRenderDescriptorPipeline,
  type AdsRenderCreativeDescriptor,
  type AdsRenderDescriptorPipelineResult,
  type AdsRenderPlacementDescriptor,
} from "./renderDescriptorPipeline";
import type { AdsReportingHandleOpaqueToken } from "./reportingHandle";
import {
  adaptAdsSelectionToRenderEligible,
  type AdsSelectionRenderAdapterResult,
} from "./selectionRenderAdapter";

/**
 * Ads Stack Pipeline V1 — single canonical execution path.
 *
 *   Candidate Selection
 *   → Selection→Render Adapter (+ issued provenance)
 *   → Render Descriptor Pipeline
 *   → Execution Layer V1
 *   → Internal Delivery Pilot V1
 *   → Measurement V1 (mandatory)
 *
 * This is the preferred public orchestration entry for Ads V1
 * (`runAdsStackPipelineV1`). Legacy foundation APIs are quarantined under
 * `adsPlatformCompatibility` — they are not peers of this entrypoint.
 *
 * Measurement is mandatory: stackAccepted=true always implies a non-null
 * measurementPackage. Missing eventType fails closed.
 *
 * Kill switches are always false:
 *   productionEnabled = false
 *   deliveryEnabled = false
 *   executionEnabled = false
 *   measurementEnabled = false
 *
 * Never renders, delivers, networks, writes DB, bills, auctions, ranks, or
 * ingests analytics. Never auto-picks a winner — caller supplies an eligible
 * candidateId only (no ranking / randomness).
 */

export const ADS_STACK_PIPELINE_V1_CONTRACT_VERSION = "v1" as const;

/** Fixed stack stages in evaluation order. None may be skipped on accept. */
export const ADS_STACK_PIPELINE_V1_STAGES = [
  "select",
  "adapt_selection_render",
  "render",
  "execute",
  "deliver",
  "measure",
  "result",
] as const;

export type AdsStackPipelineV1Stage =
  (typeof ADS_STACK_PIPELINE_V1_STAGES)[number];

/**
 * Top-level keys allowed on stack pipeline input.
 * Unknown fields fail closed.
 * adSetRef / adRef are NOT accepted — they come from inventory via the adapter.
 */
export const ADS_STACK_PIPELINE_V1_INPUT_ALLOWED_FIELDS = [
  "inventory",
  "selectionContext",
  "candidateId",
  "placementDescriptor",
  "creativeDescriptor",
  "impressionHandle",
  "clickHandle",
  "disclosureLabel",
  "cacheHints",
  "expiresAt",
  "currentTimestamp",
  "eventType",
  "seenDedupeKeys",
] as const;

export type AdsStackPipelineV1Input = Readonly<{
  inventory: unknown;
  selectionContext: unknown;
  /** Must become eligible via Candidate Selection; no ranking. */
  candidateId: string;
  placementDescriptor?: AdsRenderPlacementDescriptor;
  creativeDescriptor: AdsRenderCreativeDescriptor;
  impressionHandle: AdsReportingHandleOpaqueToken;
  clickHandle: AdsReportingHandleOpaqueToken;
  disclosureLabel: AdsRenderDisclosureLabel;
  cacheHints: AdsRenderCacheHints;
  expiresAt: string;
  currentTimestamp: string;
  /** Required — Measurement V1 is mandatory on the canonical stack. */
  eventType: AdsMeasurementFoundationEventType;
  seenDedupeKeys?: readonly string[];
}>;

export type AdsStackPipelineV1Result = Readonly<{
  contractVersion: typeof ADS_STACK_PIPELINE_V1_CONTRACT_VERSION;
  stackAccepted: boolean;
  stackRejected: boolean;
  pipelineStage: AdsStackPipelineV1Stage;
  selectionResult: AdsCandidateSelectionResult | null;
  selectionRenderAdapter: AdsSelectionRenderAdapterResult | null;
  provenance: AdsCandidateProvenanceBinding | null;
  renderResult: AdsRenderDescriptorPipelineResult | null;
  executionResult: AdsExecutionInternalResult | null;
  deliveryResult: AdsInternalDeliveryInternalResult | null;
  /**
   * Non-null when stackAccepted is true. Null only on soft-reject / hard-fail
   * paths that stop before measure.
   */
  measurementPackage: AdsMeasurementFoundationPackage | null;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
  measurementEnabled: false;
}>;

export type AdsStackPipelineV1Outcome =
  | Readonly<{ valid: true; result: AdsStackPipelineV1Result }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const INPUT_ALLOWED = new Set<string>(ADS_STACK_PIPELINE_V1_INPUT_ALLOWED_FIELDS);
const STAGE_SET = new Set<string>(ADS_STACK_PIPELINE_V1_STAGES);
const EVENT_TYPE_SET = new Set<string>([
  "impression",
  "qualified_view",
  "click",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function freezeStackResult(
  result: AdsStackPipelineV1Result
): AdsStackPipelineV1Result {
  return Object.freeze({
    contractVersion: ADS_STACK_PIPELINE_V1_CONTRACT_VERSION,
    stackAccepted: result.stackAccepted,
    stackRejected: result.stackRejected,
    pipelineStage: result.pipelineStage,
    selectionResult: result.selectionResult,
    selectionRenderAdapter: result.selectionRenderAdapter,
    provenance: result.provenance,
    renderResult: result.renderResult,
    executionResult: result.executionResult,
    deliveryResult: result.deliveryResult,
    measurementPackage: result.measurementPackage,
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
    measurementEnabled: false as const,
  });
}

function rejectedStack(
  pipelineStage: AdsStackPipelineV1Stage,
  partial: Partial<AdsStackPipelineV1Result> = {}
): AdsStackPipelineV1Result {
  return freezeStackResult({
    contractVersion: ADS_STACK_PIPELINE_V1_CONTRACT_VERSION,
    stackAccepted: false,
    stackRejected: true,
    pipelineStage,
    selectionResult: partial.selectionResult ?? null,
    selectionRenderAdapter: partial.selectionRenderAdapter ?? null,
    provenance: partial.provenance ?? null,
    renderResult: partial.renderResult ?? null,
    executionResult: partial.executionResult ?? null,
    deliveryResult: partial.deliveryResult ?? null,
    measurementPackage: null,
    productionEnabled: false,
    deliveryEnabled: false,
    executionEnabled: false,
    measurementEnabled: false,
  });
}

/**
 * Pure shape validator for stack pipeline results.
 */
export function validateAdsStackPipelineV1Result(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Stack pipeline result must be an object."]),
    };
  }

  const issues: string[] = [];
  if (input.contractVersion !== ADS_STACK_PIPELINE_V1_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_STACK_PIPELINE_V1_CONTRACT_VERSION}".`
    );
  }
  if (typeof input.stackAccepted !== "boolean") {
    issues.push("stackAccepted must be a boolean.");
  }
  if (typeof input.stackRejected !== "boolean") {
    issues.push("stackRejected must be a boolean.");
  }
  if (
    typeof input.stackAccepted === "boolean" &&
    typeof input.stackRejected === "boolean" &&
    input.stackAccepted === input.stackRejected
  ) {
    issues.push("stackAccepted and stackRejected must be opposites.");
  }
  if (
    typeof input.pipelineStage !== "string" ||
    !STAGE_SET.has(input.pipelineStage)
  ) {
    issues.push(
      `pipelineStage must be one of: ${ADS_STACK_PIPELINE_V1_STAGES.join(", ")}.`
    );
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
  if (input.measurementEnabled !== false) {
    issues.push("measurementEnabled must be false.");
  }
  if (
    input.stackAccepted === true &&
    (input.measurementPackage === null || input.measurementPackage === undefined)
  ) {
    issues.push(
      "measurementPackage is required when stackAccepted is true (Measurement V1 is mandatory)."
    );
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Runs the canonical Ads V1 stack pipeline.
 * Deterministic. Fail closed. Never mutates inputs.
 * Measurement is mandatory — missing eventType fails closed; accept implies
 * a prepared measurement package.
 */
export function runAdsStackPipelineV1(
  input: unknown
): AdsStackPipelineV1Outcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Stack pipeline input must be an object."]),
    };
  }

  const parseIssues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED.has(key)) {
      parseIssues.push(`unknown field "${key}" is not allowed.`);
    }
  }

  for (const required of [
    "inventory",
    "selectionContext",
    "candidateId",
    "creativeDescriptor",
    "impressionHandle",
    "clickHandle",
    "disclosureLabel",
    "cacheHints",
    "expiresAt",
    "currentTimestamp",
    "eventType",
  ] as const) {
    if (!(required in input)) {
      parseIssues.push(`Stack pipeline input must include ${required}.`);
    }
  }

  if (
    typeof input.eventType !== "string" ||
    !EVENT_TYPE_SET.has(input.eventType)
  ) {
    parseIssues.push(
      'eventType must be "impression", "qualified_view", or "click".'
    );
  }

  if (parseIssues.length > 0) {
    return { valid: false, issues: Object.freeze([...parseIssues]) };
  }

  const eventType = input.eventType as AdsMeasurementFoundationEventType;

  // --- Select ---
  const selectionOutcome = runAdsCandidateSelection(
    input.inventory,
    input.selectionContext
  );
  if (!selectionOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...selectionOutcome.issues.map((issue) => `selection: ${issue}`),
      ]),
    };
  }

  // --- Adapt Selection → Render (+ issued provenance) ---
  const adapterOutcome = adaptAdsSelectionToRenderEligible({
    inventory: input.inventory,
    selectionResult: selectionOutcome.result,
    candidateId: input.candidateId,
  });
  if (!adapterOutcome.valid) {
    return { valid: false, issues: adapterOutcome.issues };
  }

  const adapterResult = adapterOutcome.result;
  const provenance = adapterResult.provenance;
  const eligibleCandidate = adapterResult.eligibleCandidate;

  const provenanceEligible = assertProvenanceMatchesRenderEligible(
    provenance,
    eligibleCandidate
  );
  if (!provenanceEligible.valid) {
    return {
      valid: false,
      issues: Object.freeze([...provenanceEligible.issues]),
    };
  }

  const placementDescriptor: AdsRenderPlacementDescriptor =
    input.placementDescriptor !== undefined
      ? (input.placementDescriptor as AdsRenderPlacementDescriptor)
      : Object.freeze({ placementId: eligibleCandidate.placementId });

  // --- Render ---
  const renderOutcome = runAdsRenderDescriptorPipeline({
    eligibleCandidate,
    placementDescriptor,
    creativeDescriptor: input.creativeDescriptor,
    impressionHandle: input.impressionHandle,
    clickHandle: input.clickHandle,
    disclosureLabel: input.disclosureLabel,
    cacheHints: input.cacheHints,
    expiresAt: input.expiresAt,
    currentTimestamp: input.currentTimestamp,
    viewerAgeGatePassed:
      isRecord(input.selectionContext) &&
      typeof input.selectionContext.viewerAgeGatePassed === "boolean"
        ? input.selectionContext.viewerAgeGatePassed
        : true,
  });
  if (!renderOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...renderOutcome.issues.map((issue) => `render: ${issue}`),
      ]),
    };
  }

  if (
    !renderOutcome.result.renderAccepted ||
    renderOutcome.result.renderDescriptor === null
  ) {
    const result = rejectedStack("render", {
      selectionResult: selectionOutcome.result,
      selectionRenderAdapter: adapterResult,
      provenance,
      renderResult: renderOutcome.result,
    });
    const validation = validateAdsStackPipelineV1Result(result);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  const renderDescriptor = renderOutcome.result.renderDescriptor;
  const provenanceRender = assertProvenanceMatchesRenderDescriptor(
    provenance,
    renderDescriptor
  );
  if (!provenanceRender.valid) {
    return {
      valid: false,
      issues: Object.freeze([...provenanceRender.issues]),
    };
  }

  // --- Execute ---
  const executionOutcome = runAdsExecutionLayerV1({
    candidateId: provenance.candidateId,
    renderDescriptor,
    currentTimestamp: input.currentTimestamp,
    provenance,
  });
  if (!executionOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...executionOutcome.issues.map((issue) => `execution: ${issue}`),
      ]),
    };
  }

  if (!executionOutcome.result.executionAccepted) {
    const result = rejectedStack("execute", {
      selectionResult: selectionOutcome.result,
      selectionRenderAdapter: adapterResult,
      provenance,
      renderResult: renderOutcome.result,
      executionResult: executionOutcome.result,
    });
    const validation = validateAdsStackPipelineV1Result(result);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  const provenanceExecution = assertProvenanceMatchesExecutionResult(
    provenance,
    executionOutcome.result
  );
  if (!provenanceExecution.valid) {
    return {
      valid: false,
      issues: Object.freeze([...provenanceExecution.issues]),
    };
  }

  // --- Deliver ---
  const deliveryOutcome = runInternalDeliveryPilotV1({
    executionResult: executionOutcome.result,
    currentTimestamp: input.currentTimestamp,
  });
  if (!deliveryOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...deliveryOutcome.issues.map((issue) => `delivery: ${issue}`),
      ]),
    };
  }

  if (!deliveryOutcome.result.deliveryAccepted) {
    const result = rejectedStack("deliver", {
      selectionResult: selectionOutcome.result,
      selectionRenderAdapter: adapterResult,
      provenance,
      renderResult: renderOutcome.result,
      executionResult: executionOutcome.result,
      deliveryResult: deliveryOutcome.result,
    });
    const validation = validateAdsStackPipelineV1Result(result);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  const provenanceDelivery = assertProvenanceMatchesDeliveryResult(
    provenance,
    deliveryOutcome.result
  );
  if (!provenanceDelivery.valid) {
    return {
      valid: false,
      issues: Object.freeze([...provenanceDelivery.issues]),
    };
  }

  // --- Measure (mandatory) ---
  const measurementOutcome = prepareAdsMeasurementFromDeliveryV1({
    deliveryResult: deliveryOutcome.result,
    eventType,
    provenance,
    ...(input.seenDedupeKeys !== undefined
      ? { seenDedupeKeys: input.seenDedupeKeys }
      : {}),
  });
  if (!measurementOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...measurementOutcome.issues.map((issue) => `measurement: ${issue}`),
      ]),
    };
  }

  const result = freezeStackResult({
    contractVersion: ADS_STACK_PIPELINE_V1_CONTRACT_VERSION,
    stackAccepted: true,
    stackRejected: false,
    pipelineStage: "result",
    selectionResult: selectionOutcome.result,
    selectionRenderAdapter: adapterResult,
    provenance,
    renderResult: renderOutcome.result,
    executionResult: executionOutcome.result,
    deliveryResult: deliveryOutcome.result,
    measurementPackage: measurementOutcome.package,
    productionEnabled: false,
    deliveryEnabled: false,
    executionEnabled: false,
    measurementEnabled: false,
  });

  const validation = validateAdsStackPipelineV1Result(result);
  if (!validation.valid) {
    return { valid: false, issues: Object.freeze([...validation.issues]) };
  }

  return { valid: true, result };
}

/**
 * Lists fixed stack pipeline stages.
 */
export function listAdsStackPipelineV1Stages(): readonly AdsStackPipelineV1Stage[] {
  return Object.freeze([...ADS_STACK_PIPELINE_V1_STAGES]);
}
