import {
  buildCandidateInventory,
  listCandidates,
  validateCandidateInventory,
  type AdsCandidateInventory,
  type AdsCandidateMetadata,
} from "./candidateInventory";
import type {
  AdsPlatformCreativeType,
  ContractValidationResult,
} from "./creativeContracts";
import {
  validateCreativePlacementCompatibility,
  type AdsCreativePlacementCompatibilityResult,
} from "./creativePlacementCompatibility";
import {
  freezeDeliveryRequest,
  validateDeliveryRequest,
  type AdsDeliveryCandidateAd,
  type AdsDeliveryRequest,
} from "./deliveryContracts";
import {
  buildAdsDeliveryDecisionTrace,
  validateAdsDeliveryDecisionTrace,
  type AdsDeliveryDecisionTrace,
} from "./deliveryDecisionTrace";
import {
  evaluateAdsCandidateEligibility,
  type AdsCandidateEligibilityDecision,
  type AdsEligibilityCandidateState,
} from "./eligibilityRules";
import type { AdsPlatformPlacementId } from "./placementRegistry";
import {
  buildAdsSelectionResult,
  createEmptyAdsSelectionResult,
  validateAdsSelectionResult,
  type AdsSelectionResult,
} from "./selectionResult";

/**
 * Ads Execution Layer Foundation V1 — in-memory pipeline orchestrator only.
 *
 * Coordinates existing foundations in a fixed order:
 *   inventory → eligibility → creative↔placement compatibility →
 *   decision trace → selection result → render descriptor placeholder →
 *   execution result
 *
 * This is NOT a delivery engine. It never:
 * - chooses / ranks / auctions / paces ads
 * - queries a database or imports Supabase
 * - loads inventory from storage
 * - mutates inputs
 * - writes events or reports
 * - enables ADS_DELIVERY_ENABLED or placement flags
 * - renders creatives or returns a selected advertisement
 *
 * productionEnabled is always false. executionCompleted is true only when
 * the in-memory pipeline finishes successfully.
 */

export const ADS_EXECUTION_LAYER_CONTRACT_VERSION = "v1" as const;

/**
 * Top-level keys allowed on the execution-layer input.
 * Unknown fields fail closed.
 */
export const ADS_EXECUTION_LAYER_ALLOWED_FIELDS = [
  "inventory",
  "request",
  "eligibilityStates",
] as const;

/**
 * Top-level keys allowed on a successful AdsExecutionResult.
 * Unknown fields fail closed.
 */
export const ADS_EXECUTION_RESULT_ALLOWED_FIELDS = [
  "contractVersion",
  "evaluatedCandidates",
  "rejectedCandidates",
  "eligibilityResults",
  "compatibilityResults",
  "traces",
  "selectionSummary",
  "renderDescriptorPlaceholder",
  "productionEnabled",
  "executionCompleted",
] as const;

export type AdsExecutionRejectionStage = "eligibility" | "compatibility";

/** Inventory-derived evaluated candidate reference (metadata only). */
export type AdsExecutionEvaluatedCandidate = Readonly<{
  candidateId: string;
  campaignRef: string;
  adSetRef: string;
  adRef: string;
  creativeRef: string;
  placement: AdsPlatformPlacementId;
  creativeType: AdsPlatformCreativeType;
}>;

/** Deterministic rejection record — never a selected ad. */
export type AdsExecutionRejectedCandidate = Readonly<{
  candidateId: string;
  stage: AdsExecutionRejectionStage;
  reason: string;
}>;

/** Per-candidate compatibility outcome bound to inventory metadata. */
export type AdsExecutionCompatibilityResult = Readonly<{
  candidateId: string;
  placement: AdsPlatformPlacementId;
  creativeType: AdsPlatformCreativeType;
  compatible: boolean;
  reason: string | null;
  productionEnabled: false;
}>;

/**
 * Canonical Execution Result V1.
 * No selected advertisement. No delivery. No rendering.
 */
export type AdsExecutionResult = Readonly<{
  contractVersion: typeof ADS_EXECUTION_LAYER_CONTRACT_VERSION;
  evaluatedCandidates: readonly AdsExecutionEvaluatedCandidate[];
  rejectedCandidates: readonly AdsExecutionRejectedCandidate[];
  eligibilityResults: readonly AdsCandidateEligibilityDecision[];
  compatibilityResults: readonly AdsExecutionCompatibilityResult[];
  traces: readonly AdsDeliveryDecisionTrace[];
  selectionSummary: AdsSelectionResult;
  /** Always null in V1 — no ad is selected to render. */
  renderDescriptorPlaceholder: null;
  productionEnabled: false;
  executionCompleted: true;
}>;

/**
 * Execution input — in-memory inventory + delivery request + eligibility states.
 * eligibilityStates must align 1:1 (same candidateIds, same order) with inventory.
 */
export type AdsExecutionLayerInput = Readonly<{
  inventory: unknown;
  request: unknown;
  eligibilityStates: unknown;
}>;

export type AdsExecutionLayerOutcome =
  | Readonly<{ valid: true; result: AdsExecutionResult }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const INPUT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_EXECUTION_LAYER_ALLOWED_FIELDS
);
const RESULT_ALLOWED_FIELD_SET = new Set<string>(
  ADS_EXECUTION_RESULT_ALLOWED_FIELDS
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function freezeEvaluatedCandidate(
  candidate: AdsCandidateMetadata
): AdsExecutionEvaluatedCandidate {
  return Object.freeze({
    candidateId: candidate.candidateId,
    campaignRef: candidate.campaignRef,
    adSetRef: candidate.adSetRef,
    adRef: candidate.adRef,
    creativeRef: candidate.creativeRef,
    placement: candidate.placement,
    creativeType: candidate.creativeType,
  });
}

function freezeCompatibilityResult(
  entry: AdsExecutionCompatibilityResult
): AdsExecutionCompatibilityResult {
  return Object.freeze({ ...entry });
}

function freezeRejectedCandidate(
  entry: AdsExecutionRejectedCandidate
): AdsExecutionRejectedCandidate {
  return Object.freeze({ ...entry });
}

function freezeExecutionResult(result: AdsExecutionResult): AdsExecutionResult {
  return Object.freeze({
    contractVersion: result.contractVersion,
    evaluatedCandidates: Object.freeze(
      result.evaluatedCandidates.map((entry) => Object.freeze({ ...entry }))
    ),
    rejectedCandidates: Object.freeze(
      result.rejectedCandidates.map((entry) => Object.freeze({ ...entry }))
    ),
    eligibilityResults: Object.freeze(
      result.eligibilityResults.map((entry) => Object.freeze({ ...entry }))
    ),
    compatibilityResults: Object.freeze(
      result.compatibilityResults.map((entry) => Object.freeze({ ...entry }))
    ),
    traces: Object.freeze([...result.traces]),
    selectionSummary: result.selectionSummary,
    renderDescriptorPlaceholder: null,
    productionEnabled: false as const,
    executionCompleted: true as const,
  });
}

function collectCandidateIdConsistencyIssues(
  inventoryCandidates: readonly AdsCandidateMetadata[],
  requestCandidates: readonly AdsDeliveryCandidateAd[],
  eligibilityStates: readonly AdsEligibilityCandidateState[]
): string[] {
  const issues: string[] = [];

  if (requestCandidates.length !== inventoryCandidates.length) {
    issues.push(
      "request.candidates length is inconsistent with inventory.candidates length."
    );
  }
  if (eligibilityStates.length !== inventoryCandidates.length) {
    issues.push(
      "eligibilityStates length is inconsistent with inventory.candidates length."
    );
  }

  const inventoryIds = inventoryCandidates.map((c) => c.candidateId);
  const requestIds = requestCandidates.map((c) => c.candidateId);
  const eligibilityIds = eligibilityStates.map((c) => c.candidateId);

  const seenInventory = new Set<string>();
  for (const id of inventoryIds) {
    if (seenInventory.has(id)) {
      issues.push(`inventory contains duplicate candidateId "${id}".`);
    }
    seenInventory.add(id);
  }

  const seenRequest = new Set<string>();
  for (const id of requestIds) {
    if (seenRequest.has(id)) {
      issues.push(`request.candidates contain duplicate candidateId "${id}".`);
    }
    seenRequest.add(id);
  }

  const seenEligibility = new Set<string>();
  for (const id of eligibilityIds) {
    if (seenEligibility.has(id)) {
      issues.push(`eligibilityStates contain duplicate candidateId "${id}".`);
    }
    seenEligibility.add(id);
  }

  const maxLen = Math.max(
    inventoryIds.length,
    requestIds.length,
    eligibilityIds.length
  );
  for (let i = 0; i < maxLen; i++) {
    const inventoryId = inventoryIds[i];
    const requestId = requestIds[i];
    const eligibilityId = eligibilityIds[i];

    if (
      inventoryId !== undefined &&
      requestId !== undefined &&
      inventoryId !== requestId
    ) {
      issues.push(
        `request.candidates[${i}].candidateId "${requestId}" is inconsistent with inventory.candidates[${i}].candidateId "${inventoryId}".`
      );
    }
    if (
      inventoryId !== undefined &&
      eligibilityId !== undefined &&
      inventoryId !== eligibilityId
    ) {
      issues.push(
        `eligibilityStates[${i}].candidateId "${eligibilityId}" is inconsistent with inventory.candidates[${i}].candidateId "${inventoryId}".`
      );
    }
  }

  for (let i = 0; i < inventoryCandidates.length; i++) {
    const meta = inventoryCandidates[i];
    const state = eligibilityStates[i];
    if (!state) {
      continue;
    }
    if (
      isNonEmptyString(state.placementId) &&
      state.placementId !== meta.placement
    ) {
      issues.push(
        `eligibilityStates[${i}].placementId "${state.placementId}" is inconsistent with inventory placement "${meta.placement}".`
      );
    }
  }

  return issues;
}

function isEligibilityStateShape(
  value: unknown
): value is AdsEligibilityCandidateState {
  if (!isRecord(value)) {
    return false;
  }
  const requiredStrings = [
    "candidateId",
    "campaignId",
    "adSetId",
    "adId",
    "creativeId",
    "placementId",
    "campaignStatus",
    "adSetStatus",
    "adStatus",
    "campaignStartsAt",
    "adSetStartsAt",
  ] as const;
  for (const key of requiredStrings) {
    if (!isNonEmptyString(value[key])) {
      return false;
    }
  }
  if (
    value.campaignEndsAt !== null &&
    !isNonEmptyString(value.campaignEndsAt)
  ) {
    return false;
  }
  if (value.adSetEndsAt !== null && !isNonEmptyString(value.adSetEndsAt)) {
    return false;
  }
  if (typeof value.budgetExhausted !== "boolean") return false;
  if (typeof value.creativePresent !== "boolean") return false;
  if (typeof value.creativeApproved !== "boolean") return false;
  if (typeof value.policyBlocked !== "boolean") return false;
  if (typeof value.audienceMatched !== "boolean") return false;
  if (!Array.isArray(value.targetedCountryCodes)) return false;
  if (!Array.isArray(value.targetedLanguageCodes)) return false;
  return true;
}

function validateEligibilityStatesArray(
  value: unknown
):
  | Readonly<{ valid: true; states: readonly AdsEligibilityCandidateState[] }>
  | Readonly<{ valid: false; issues: readonly string[] }> {
  if (!Array.isArray(value)) {
    return {
      valid: false,
      issues: Object.freeze(["eligibilityStates must be an array."]),
    };
  }

  const issues: string[] = [];
  const states: AdsEligibilityCandidateState[] = [];

  value.forEach((entry, index) => {
    if (!isEligibilityStateShape(entry)) {
      issues.push(
        `eligibilityStates[${index}] is malformed or missing required fields.`
      );
      return;
    }
    states.push(entry);
  });

  return issues.length === 0
    ? { valid: true, states: Object.freeze([...states]) }
    : { valid: false, issues: Object.freeze([...issues]) };
}

function toDeliveryCandidate(
  meta: AdsCandidateMetadata,
  state: AdsEligibilityCandidateState
): AdsDeliveryCandidateAd {
  return Object.freeze({
    candidateId: meta.candidateId,
    campaignId: state.campaignId,
    adSetId: state.adSetId,
    adId: state.adId,
    creativeId: state.creativeId,
  });
}

function classifyRejection(
  eligibility: AdsCandidateEligibilityDecision,
  compatibility: AdsCreativePlacementCompatibilityResult
): AdsExecutionRejectedCandidate | null {
  if (!eligibility.eligible) {
    return freezeRejectedCandidate({
      candidateId: eligibility.candidateId,
      stage: "eligibility",
      reason: String(eligibility.exclusionReason ?? "unknown"),
    });
  }
  if (!compatibility.compatible) {
    return freezeRejectedCandidate({
      candidateId: eligibility.candidateId,
      stage: "compatibility",
      reason: compatibility.reason ?? "incompatible",
    });
  }
  return null;
}

/**
 * Pure shape validator for Execution Result V1 outputs.
 * Fail-closed — does not execute the pipeline or deliver ads.
 */
export function validateAdsExecutionResult(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Execution result must be an object."]),
    };
  }

  const issues: string[] = [];

  for (const key of Object.keys(input)) {
    if (!RESULT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Execution result contains unknown field "${key}".`);
    }
  }

  if (input.contractVersion !== ADS_EXECUTION_LAYER_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_EXECUTION_LAYER_CONTRACT_VERSION}".`
    );
  }
  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }
  if (input.executionCompleted !== true) {
    issues.push("executionCompleted must be true.");
  }
  if (input.renderDescriptorPlaceholder !== null) {
    issues.push("renderDescriptorPlaceholder must be null.");
  }

  if (!Array.isArray(input.evaluatedCandidates)) {
    issues.push("evaluatedCandidates must be an array.");
  }
  if (!Array.isArray(input.rejectedCandidates)) {
    issues.push("rejectedCandidates must be an array.");
  }
  if (!Array.isArray(input.eligibilityResults)) {
    issues.push("eligibilityResults must be an array.");
  }
  if (!Array.isArray(input.compatibilityResults)) {
    issues.push("compatibilityResults must be an array.");
  }
  if (!Array.isArray(input.traces)) {
    issues.push("traces must be an array.");
  }

  if (
    Array.isArray(input.evaluatedCandidates) &&
    Array.isArray(input.eligibilityResults) &&
    input.evaluatedCandidates.length !== input.eligibilityResults.length
  ) {
    issues.push(
      "eligibilityResults length is inconsistent with evaluatedCandidates length."
    );
  }
  if (
    Array.isArray(input.evaluatedCandidates) &&
    Array.isArray(input.compatibilityResults) &&
    input.evaluatedCandidates.length !== input.compatibilityResults.length
  ) {
    issues.push(
      "compatibilityResults length is inconsistent with evaluatedCandidates length."
    );
  }
  if (
    Array.isArray(input.evaluatedCandidates) &&
    Array.isArray(input.traces) &&
    input.evaluatedCandidates.length !== input.traces.length
  ) {
    issues.push(
      "traces length is inconsistent with evaluatedCandidates length."
    );
  }

  if (Array.isArray(input.traces)) {
    input.traces.forEach((trace, index) => {
      const traceResult = validateAdsDeliveryDecisionTrace(trace);
      if (!traceResult.valid) {
        for (const issue of traceResult.issues) {
          issues.push(`traces[${index}]: ${issue}`);
        }
      }
    });
  }

  const selectionResult = validateAdsSelectionResult(input.selectionSummary);
  if (!selectionResult.valid) {
    for (const issue of selectionResult.issues) {
      issues.push(`selectionSummary: ${issue}`);
    }
  }

  if ("selectedCandidate" in input) {
    issues.push("Execution result must not include selectedCandidate.");
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Empty successful execution result — no candidates evaluated.
 * Does not query databases or enable delivery.
 */
export function createEmptyAdsExecutionResult(): AdsExecutionResult {
  return freezeExecutionResult({
    contractVersion: ADS_EXECUTION_LAYER_CONTRACT_VERSION,
    evaluatedCandidates: Object.freeze([]),
    rejectedCandidates: Object.freeze([]),
    eligibilityResults: Object.freeze([]),
    compatibilityResults: Object.freeze([]),
    traces: Object.freeze([]),
    selectionSummary: createEmptyAdsSelectionResult(0),
    renderDescriptorPlaceholder: null,
    productionEnabled: false,
    executionCompleted: true,
  });
}

/**
 * In-memory Execution Layer orchestrator V1.
 * Fail-closed on malformed inventory/request/states or inconsistent references.
 * Never selects an advertisement or enables production delivery.
 */
export function runAdsExecutionLayer(
  input: unknown
): AdsExecutionLayerOutcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Execution input must be an object."]),
    };
  }

  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED_FIELD_SET.has(key)) {
      issues.push(`Execution input contains unknown field "${key}".`);
    }
  }
  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  const inventoryValidation = validateCandidateInventory(input.inventory);
  if (!inventoryValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...inventoryValidation.issues.map(
          (issue) => `Malformed inventory: ${issue}`
        ),
      ]),
    };
  }

  const inventoryBuild = buildCandidateInventory(input.inventory);
  if (!inventoryBuild.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...inventoryBuild.issues.map(
          (issue) => `Malformed inventory: ${issue}`
        ),
      ]),
    };
  }
  const inventory: AdsCandidateInventory = inventoryBuild.inventory;

  const inventoryCandidates = listCandidates(inventory);

  const requestValidation = validateDeliveryRequest(input.request);
  if (!requestValidation.valid) {
    // Delivery request contracts forbid empty candidates, but an empty
    // inventory execution is a valid no-op for this orchestrator. Accept the
    // request only when the sole issue is empty candidates and inventory is empty.
    const remainingIssues = requestValidation.issues.filter(
      (issue) => issue !== "candidates must not be empty."
    );
    const allowEmptyRequest =
      inventoryCandidates.length === 0 &&
      remainingIssues.length === 0 &&
      isRecord(input.request) &&
      Array.isArray(input.request.candidates) &&
      input.request.candidates.length === 0;

    if (!allowEmptyRequest) {
      return {
        valid: false,
        issues: Object.freeze([
          ...(remainingIssues.length > 0
            ? remainingIssues
            : requestValidation.issues
          ).map((issue) => `Malformed request: ${issue}`),
        ]),
      };
    }
  }
  const request = freezeDeliveryRequest(input.request as AdsDeliveryRequest);

  const eligibilityValidation = validateEligibilityStatesArray(
    input.eligibilityStates
  );
  if (!eligibilityValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...eligibilityValidation.issues]),
    };
  }
  const eligibilityStates = eligibilityValidation.states;

  const consistencyIssues = collectCandidateIdConsistencyIssues(
    inventoryCandidates,
    request.candidates,
    eligibilityStates
  );
  if (consistencyIssues.length > 0) {
    return {
      valid: false,
      issues: Object.freeze([
        ...consistencyIssues.map(
          (issue) => `Inconsistent candidate references: ${issue}`
        ),
      ]),
    };
  }

  if (inventoryCandidates.length === 0) {
    const empty = createEmptyAdsExecutionResult();
    const emptyValidation = validateAdsExecutionResult(empty);
    if (!emptyValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([...emptyValidation.issues]),
      };
    }
    return { valid: true, result: empty };
  }

  const evaluatedCandidates: AdsExecutionEvaluatedCandidate[] = [];
  const rejectedCandidates: AdsExecutionRejectedCandidate[] = [];
  const eligibilityResults: AdsCandidateEligibilityDecision[] = [];
  const compatibilityResults: AdsExecutionCompatibilityResult[] = [];
  const traces: AdsDeliveryDecisionTrace[] = [];
  const deliveryCandidates: AdsDeliveryCandidateAd[] = [];

  for (let i = 0; i < inventoryCandidates.length; i++) {
    const meta = inventoryCandidates[i];
    const state = eligibilityStates[i];
    const requestCandidate = request.candidates[i];

    if (!state || !requestCandidate) {
      return {
        valid: false,
        issues: Object.freeze([
          `Inconsistent candidate references: missing aligned state for candidates[${i}].`,
        ]),
      };
    }

    evaluatedCandidates.push(freezeEvaluatedCandidate(meta));
    deliveryCandidates.push(toDeliveryCandidate(meta, state));

    // 1) Eligibility Rules
    const eligibility = evaluateAdsCandidateEligibility(request, state);
    eligibilityResults.push(Object.freeze({ ...eligibility }));

    // 2) Creative ↔ Placement Compatibility
    const compatibility = validateCreativePlacementCompatibility({
      placement: meta.placement,
      creativeType: meta.creativeType,
    });
    compatibilityResults.push(
      freezeCompatibilityResult({
        candidateId: meta.candidateId,
        placement: meta.placement,
        creativeType: meta.creativeType,
        compatible: compatibility.compatible,
        reason: compatibility.reason,
        productionEnabled: false,
      })
    );

    // 3) Decision Trace (from eligibility only)
    const traceOutcome = buildAdsDeliveryDecisionTrace(
      request,
      state,
      eligibility
    );
    if (!traceOutcome.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...traceOutcome.issues.map(
            (issue) => `Invalid trace for "${meta.candidateId}": ${issue}`
          ),
        ]),
      };
    }
    const traceValidation = validateAdsDeliveryDecisionTrace(traceOutcome.trace);
    if (!traceValidation.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...traceValidation.issues.map(
            (issue) => `Invalid trace for "${meta.candidateId}": ${issue}`
          ),
        ]),
      };
    }
    traces.push(traceOutcome.trace);

    const rejection = classifyRejection(eligibility, compatibility);
    if (rejection) {
      rejectedCandidates.push(rejection);
    }
  }

  // 4) Selection Result — summary only; never selects an ad
  const selectionRequest: AdsDeliveryRequest = freezeDeliveryRequest({
    ...request,
    candidates: Object.freeze(deliveryCandidates),
  });
  const selectionOutcome = buildAdsSelectionResult({
    request: selectionRequest,
    evaluatedCandidates: deliveryCandidates,
    eligibilityResults,
  });
  if (!selectionOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...selectionOutcome.issues.map(
          (issue) => `Invalid selection result: ${issue}`
        ),
      ]),
    };
  }
  const selectionValidation = validateAdsSelectionResult(
    selectionOutcome.result
  );
  if (!selectionValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...selectionValidation.issues.map(
          (issue) => `Invalid selection result: ${issue}`
        ),
      ]),
    };
  }

  // 5) Render Descriptor placeholder — always null (no selected ad)
  const result = freezeExecutionResult({
    contractVersion: ADS_EXECUTION_LAYER_CONTRACT_VERSION,
    evaluatedCandidates: Object.freeze(evaluatedCandidates),
    rejectedCandidates: Object.freeze(rejectedCandidates),
    eligibilityResults: Object.freeze(eligibilityResults),
    compatibilityResults: Object.freeze(compatibilityResults),
    traces: Object.freeze(traces),
    selectionSummary: selectionOutcome.result,
    renderDescriptorPlaceholder: null,
    productionEnabled: false,
    executionCompleted: true,
  });

  const resultValidation = validateAdsExecutionResult(result);
  if (!resultValidation.valid) {
    return {
      valid: false,
      issues: Object.freeze([...resultValidation.issues]),
    };
  }

  return { valid: true, result };
}
