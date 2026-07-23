import { ADS_DELIVERY_ENABLED } from "../constants";
import {
  runAdsAuction,
  type AdsAuctionResult,
} from "./auction";
import {
  evaluateAdsBilling,
  type AdsBillingEvaluationResult,
  type AdsBillingPricingSnapshot,
} from "./billing";
import {
  evaluateAdsBudget,
  type AdsBudgetEvaluationResult,
  type AdsBudgetSnapshot,
} from "./budget";
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
import type { AdsChargeableEventType } from "./charging";
import type { ContractValidationResult } from "./creativeContracts";
import {
  runAdsExecutionLayerV1,
  type AdsExecutionInternalResult,
} from "./executionLayer";
import {
  evaluateAdsFraud,
  type AdsFraudEvaluationResult,
} from "./fraud";
import {
  evaluateAdsFrequency,
  type AdsFrequencyEvaluationResult,
  type AdsFrequencySnapshot,
} from "./frequency";
import {
  runInternalDeliveryPilotV1,
  type AdsInternalDeliveryInternalResult,
} from "./internalDeliveryPilot";
import {
  buildAdsMeasurementDedupeKey,
  prepareAdsMeasurementFromDeliveryV1,
  type AdsMeasurementFoundationEventType,
  type AdsMeasurementFoundationPackage,
} from "./measurementFoundation";
import {
  evaluateAdsPacing,
  type AdsPacingEvaluationResult,
  type AdsPacingSnapshot,
} from "./pacing";
import {
  getAdsPlacement,
  isAdsPlacementId,
} from "./placementRegistry";
import {
  rankAdsCandidates,
  type AdsRankingResult,
} from "./ranking";
import type { AdsRenderCacheHints } from "./renderDescriptor";
import type { AdsRenderDisclosureLabel } from "./renderDescriptor";
import {
  runAdsRenderDescriptorPipeline,
  type AdsRenderCreativeDescriptor,
  type AdsRenderDescriptorPipelineResult,
  type AdsRenderPlacementDescriptor,
} from "./renderDescriptorPipeline";
import type { AdsReportingHandleOpaqueToken } from "./reportingHandle";
import type { AdsRankingCandidateSignals } from "./scoring";
import {
  adaptAdsSelectionToRenderEligible,
  type AdsSelectionRenderAdapterResult,
} from "./selectionRenderAdapter";
import {
  ADS_SERVING_AUTHORITATIVE_ENTRYPOINT,
  applyAdsServingIdempotencyClaimV1,
  assertAdsServingKillSwitchesClosedV1,
  buildAdsServingCorrelationV1,
  buildAdsServingIdempotencyKeysV1,
  claimAdsServingIdempotencyV1,
  createAdsServingLifecycleV1,
  transitionAdsServingStageV1,
  validateAdsServingLifecycleV1,
  type AdsServingLifecycleV1,
  type AdsServingLifecycleStage,
  type AdsServingRejectionReason,
} from "./servingFoundation";

/**
 * Ads Canonical Stack V1 — sole authoritative production-disabled decision path.
 *
 * Preferred public entrypoint: `runAdsCanonicalStackV1`.
 *
 * Stage order:
 *   delivery_gate
 *   → select
 *   → score_rank
 *   → budget
 *   → pacing
 *   → frequency
 *   → auction
 *   → fraud
 *   → adapt_selection_render
 *   → render
 *   → execute
 *   → deliver
 *   → measure
 *   → bill
 *   → result
 *
 * Delivery-gate semantics (Option B):
 *   Gate failure is recorded and never yields production acceptance.
 *   Foundation diagnostic stages may continue. `productionAccepted` is always
 *   false while delivery is disabled. `stackAccepted` means foundation
 *   diagnostic completion only — never unqualified production acceptance.
 *
 * Winner authority is Selection → Ranking → Auction only.
 * Callers must NOT supply candidateId / auctionWinner / chargeResult /
 * billable identity. Continuous ranking scores and server snapshots
 * (budget / pacing / frequency / IVT signals / pricing) are explicit
 * foundation inputs — never reconstructed from array order or randomness.
 *
 * Kill switches are always false:
 *   productionEnabled / deliveryEnabled / executionEnabled /
 *   measurementEnabled / billingEnabled
 *   productionAccepted
 *
 * Never renders, networks, writes DB, moves money, or enables production.
 */

export const ADS_CANONICAL_STACK_V1_CONTRACT_VERSION = "v1" as const;

/** Fixed canonical stages in evaluation order. */
export const ADS_CANONICAL_STACK_V1_STAGES = [
  "delivery_gate",
  "select",
  "score_rank",
  "budget",
  "pacing",
  "frequency",
  "auction",
  "fraud",
  "adapt_selection_render",
  "render",
  "execute",
  "deliver",
  "measure",
  "bill",
  "result",
] as const;

export type AdsCanonicalStackV1Stage =
  (typeof ADS_CANONICAL_STACK_V1_STAGES)[number];

/**
 * Canonical rejection reasons (safe internal metadata only).
 * Order is documentation-only.
 */
export const ADS_CANONICAL_STACK_V1_REJECTION_REASONS = [
  "global_delivery_disabled",
  "placement_delivery_disabled",
  "no_eligible_candidates",
  "no_rankable_candidates",
  "budget_ineligible",
  "pacing_ineligible",
  "frequency_ineligible",
  "no_auction_winner",
  "fraud_rejected",
  "render_rejected",
  "execution_rejected",
  "delivery_rejected",
  "measurement_rejected",
  "billing_ineligible",
] as const;

export type AdsCanonicalStackV1RejectionReason =
  (typeof ADS_CANONICAL_STACK_V1_REJECTION_REASONS)[number];

/**
 * Top-level keys allowed on canonical stack input.
 * Unknown fields fail closed.
 * candidateId / auctionWinner / billableEvent / chargeResult / trust /
 * monetary fields on events are NOT accepted from the caller.
 */
export const ADS_CANONICAL_STACK_V1_INPUT_ALLOWED_FIELDS = [
  "inventory",
  "selectionContext",
  "rankingSignals",
  "budgetSnapshots",
  "pacingSnapshots",
  "frequencySnapshots",
  "invalidTrafficSignals",
  "pricing",
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
  "seenDeliveryAttemptKeys",
  "seenBillingHandoffKeys",
] as const;

/**
 * IVT / fraud signal flags without identity — identity is bound from the
 * auction winner + measurement dedupe key by the orchestrator.
 */
export type AdsCanonicalStackInvalidTrafficSignals = Readonly<{
  trustLevel:
    | "trusted"
    | "unverified"
    | "suspicious"
    | "rejected"
    | "untrusted"
    | "provisional";
  reportingHandleValid: boolean;
  duplicateEvent: boolean;
  impossibleSequence: boolean;
  suspiciousImpression: boolean;
  suspiciousClick: boolean;
}>;

export type AdsCanonicalStackV1Input = Readonly<{
  inventory: unknown;
  selectionContext: unknown;
  /** Continuous + gate signals for candidates; intersected with selection. */
  rankingSignals: readonly AdsRankingCandidateSignals[];
  budgetSnapshots: readonly AdsBudgetSnapshot[];
  pacingSnapshots: readonly AdsPacingSnapshot[];
  frequencySnapshots: readonly AdsFrequencySnapshot[];
  invalidTrafficSignals: AdsCanonicalStackInvalidTrafficSignals;
  /** Server-authoritative pricing snapshot for billing evaluation only. */
  pricing: AdsBillingPricingSnapshot;
  placementDescriptor?: AdsRenderPlacementDescriptor;
  creativeDescriptor: AdsRenderCreativeDescriptor;
  impressionHandle: AdsReportingHandleOpaqueToken;
  clickHandle: AdsReportingHandleOpaqueToken;
  disclosureLabel: AdsRenderDisclosureLabel;
  cacheHints: AdsRenderCacheHints;
  expiresAt: string;
  currentTimestamp: string;
  eventType: AdsMeasurementFoundationEventType;
  seenDedupeKeys?: readonly string[];
  /** Idempotency ledger for diagnostic delivery attempts (fail-closed). */
  seenDeliveryAttemptKeys?: readonly string[];
  /** Idempotency ledger for diagnostic billing handoffs (fail-closed). */
  seenBillingHandoffKeys?: readonly string[];
}>;

export type AdsCanonicalDecisionTraceStage = Readonly<{
  stage: AdsCanonicalStackV1Stage;
  status: "accepted" | "rejected" | "skipped";
  rejectionReason: AdsCanonicalStackV1RejectionReason | null;
  candidateId: string | null;
}>;

/**
 * Safe internal decision trace — no URLs, media, PII, or payment secrets.
 * Deterministic and immutable; emitted on success and rejection.
 */
export type AdsCanonicalDecisionTraceV1 = Readonly<{
  contractVersion: typeof ADS_CANONICAL_STACK_V1_CONTRACT_VERSION;
  stages: readonly AdsCanonicalDecisionTraceStage[];
  terminalStage: AdsCanonicalStackV1Stage;
  stackAccepted: boolean;
  rejectionReason: AdsCanonicalStackV1RejectionReason | null;
  candidateId: string | null;
}>;

export type AdsCanonicalDeliveryGateV1 = Readonly<{
  globalDeliveryEnabled: false;
  placementDeliveryEnabled: false;
  passed: false;
  rejectionReason: AdsCanonicalStackV1RejectionReason;
}>;

export type AdsCanonicalStackV1Result = Readonly<{
  contractVersion: typeof ADS_CANONICAL_STACK_V1_CONTRACT_VERSION;
  /**
   * Foundation diagnostic acceptance only.
   * Never means production delivery/billing is enabled.
   */
  stackAccepted: boolean;
  stackRejected: boolean;
  /**
   * Production acceptance — always false in V1 while delivery is disabled.
   * Failed delivery gate can never set this true.
   */
  productionAccepted: false;
  pipelineStage: AdsCanonicalStackV1Stage;
  rejectionReason: AdsCanonicalStackV1RejectionReason | null;
  decisionTrace: AdsCanonicalDecisionTraceV1;
  deliveryGate: AdsCanonicalDeliveryGateV1;
  selectionResult: AdsCandidateSelectionResult | null;
  rankingResult: AdsRankingResult | null;
  budgetResults: readonly AdsBudgetEvaluationResult[];
  pacingResults: readonly AdsPacingEvaluationResult[];
  frequencyResults: readonly AdsFrequencyEvaluationResult[];
  auctionResult: AdsAuctionResult | null;
  fraudResult: AdsFraudEvaluationResult | null;
  selectionRenderAdapter: AdsSelectionRenderAdapterResult | null;
  provenance: AdsCandidateProvenanceBinding | null;
  renderResult: AdsRenderDescriptorPipelineResult | null;
  executionResult: AdsExecutionInternalResult | null;
  deliveryResult: AdsInternalDeliveryInternalResult | null;
  measurementPackage: AdsMeasurementFoundationPackage | null;
  /**
   * Diagnostic billing eligibility from the canonical path only.
   * Requires accepted delivery + measurement + fraud pass inside this stack.
   * Never authorizes money movement (`billingEnabled` / `productionAccepted`
   * remain false).
   */
  billingEligible: boolean;
  billingResult: AdsBillingEvaluationResult | null;
  chargeResult: AdsBillingEvaluationResult["chargeResult"];
  /**
   * Production-serving foundation lifecycle (ordering, correlation,
   * idempotency, kill switches). Attached by the canonical path only —
   * never an alternate authority surface.
   */
  servingLifecycle: AdsServingLifecycleV1;
  /** Marks this result as the sole authoritative decision artifact. */
  authoritativeDecisionPath: true;
  productionEnabled: false;
  deliveryEnabled: false;
  executionEnabled: false;
  measurementEnabled: false;
  billingEnabled: false;
}>;

export type AdsCanonicalStackV1Outcome =
  | Readonly<{ valid: true; result: AdsCanonicalStackV1Result }>
  | Readonly<{ valid: false; issues: readonly string[] }>;

const INPUT_ALLOWED = new Set<string>(
  ADS_CANONICAL_STACK_V1_INPUT_ALLOWED_FIELDS
);
const STAGE_SET = new Set<string>(ADS_CANONICAL_STACK_V1_STAGES);
const REJECTION_REASON_SET = new Set<string>(
  ADS_CANONICAL_STACK_V1_REJECTION_REASONS
);
const EVENT_TYPE_SET = new Set<string>([
  "impression",
  "qualified_view",
  "click",
]);
const IVT_TRUST_SET = new Set<string>([
  "trusted",
  "unverified",
  "suspicious",
  "rejected",
  "untrusted",
  "provisional",
]);
const FORBIDDEN_CALLER_FIELDS = [
  "candidateId",
  "auctionWinner",
  "selectedCandidateId",
  "billableEvent",
  "chargeResult",
  "billingEligible",
  "trustLevel",
  "unitPriceMinor",
  "currency",
  "quantity",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isChargeableEventType(
  eventType: AdsMeasurementFoundationEventType
): eventType is AdsChargeableEventType {
  return eventType === "impression" || eventType === "click";
}

type TraceBuilder = {
  stages: AdsCanonicalDecisionTraceStage[];
  push: (
    stage: AdsCanonicalStackV1Stage,
    status: AdsCanonicalDecisionTraceStage["status"],
    rejectionReason: AdsCanonicalStackV1RejectionReason | null,
    candidateId: string | null
  ) => void;
  freeze: (
    terminalStage: AdsCanonicalStackV1Stage,
    stackAccepted: boolean,
    rejectionReason: AdsCanonicalStackV1RejectionReason | null,
    candidateId: string | null
  ) => AdsCanonicalDecisionTraceV1;
};

function createTraceBuilder(): TraceBuilder {
  const stages: AdsCanonicalDecisionTraceStage[] = [];
  return {
    stages,
    push(stage, status, rejectionReason, candidateId) {
      stages.push(
        Object.freeze({
          stage,
          status,
          rejectionReason,
          candidateId,
        })
      );
    },
    freeze(terminalStage, stackAccepted, rejectionReason, candidateId) {
      return Object.freeze({
        contractVersion: ADS_CANONICAL_STACK_V1_CONTRACT_VERSION,
        stages: Object.freeze([...stages]),
        terminalStage,
        stackAccepted,
        rejectionReason,
        candidateId,
      });
    },
  };
}

function evaluateDeliveryGate(
  placementId: string | null
): AdsCanonicalDeliveryGateV1 {
  // Structural enforcement — never comment-only.
  // Cast through boolean so the === true checks remain structurally present
  // even while V1 constants are typed as literal false.
  const globalOpen = (ADS_DELIVERY_ENABLED as boolean) === true;
  let placementOpen = false;
  if (placementId !== null && isAdsPlacementId(placementId)) {
    placementOpen =
      (getAdsPlacement(placementId).featureFlag.enabledByDefault as boolean) ===
      true;
  }

  let rejectionReason: AdsCanonicalStackV1RejectionReason =
    "global_delivery_disabled";
  if (!globalOpen) {
    rejectionReason = "global_delivery_disabled";
  } else if (!placementOpen) {
    rejectionReason = "placement_delivery_disabled";
  }

  // V1 contracts force both flags false; passed is always false.
  return Object.freeze({
    globalDeliveryEnabled: false as const,
    placementDeliveryEnabled: false as const,
    passed: false as const,
    rejectionReason,
  });
}

function freezeCanonicalResult(
  result: AdsCanonicalStackV1Result
): AdsCanonicalStackV1Result {
  return Object.freeze({
    contractVersion: ADS_CANONICAL_STACK_V1_CONTRACT_VERSION,
    stackAccepted: result.stackAccepted,
    stackRejected: result.stackRejected,
    productionAccepted: false as const,
    pipelineStage: result.pipelineStage,
    rejectionReason: result.rejectionReason,
    decisionTrace: result.decisionTrace,
    deliveryGate: result.deliveryGate,
    selectionResult: result.selectionResult,
    rankingResult: result.rankingResult,
    budgetResults: Object.freeze([...result.budgetResults]),
    pacingResults: Object.freeze([...result.pacingResults]),
    frequencyResults: Object.freeze([...result.frequencyResults]),
    auctionResult: result.auctionResult,
    fraudResult: result.fraudResult,
    selectionRenderAdapter: result.selectionRenderAdapter,
    provenance: result.provenance,
    renderResult: result.renderResult,
    executionResult: result.executionResult,
    deliveryResult: result.deliveryResult,
    measurementPackage: result.measurementPackage,
    billingEligible: result.billingEligible,
    billingResult: result.billingResult,
    chargeResult: result.chargeResult,
    servingLifecycle: result.servingLifecycle,
    authoritativeDecisionPath: true as const,
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    executionEnabled: false as const,
    measurementEnabled: false as const,
    billingEnabled: false as const,
  });
}

function emptyPartial(): Partial<AdsCanonicalStackV1Result> {
  return {
    selectionResult: null,
    rankingResult: null,
    budgetResults: Object.freeze([]),
    pacingResults: Object.freeze([]),
    frequencyResults: Object.freeze([]),
    auctionResult: null,
    fraudResult: null,
    selectionRenderAdapter: null,
    provenance: null,
    renderResult: null,
    executionResult: null,
    deliveryResult: null,
    measurementPackage: null,
    billingEligible: false,
    billingResult: null,
    chargeResult: null,
  };
}

function rejectedResult(params: {
  pipelineStage: AdsCanonicalStackV1Stage;
  rejectionReason: AdsCanonicalStackV1RejectionReason;
  deliveryGate: AdsCanonicalDeliveryGateV1;
  decisionTrace: AdsCanonicalDecisionTraceV1;
  servingLifecycle: AdsServingLifecycleV1;
  partial?: Partial<AdsCanonicalStackV1Result>;
}): AdsCanonicalStackV1Result {
  const partial = params.partial ?? emptyPartial();
  return freezeCanonicalResult({
    contractVersion: ADS_CANONICAL_STACK_V1_CONTRACT_VERSION,
    stackAccepted: false,
    stackRejected: true,
    productionAccepted: false,
    pipelineStage: params.pipelineStage,
    rejectionReason: params.rejectionReason,
    decisionTrace: params.decisionTrace,
    deliveryGate: params.deliveryGate,
    selectionResult: partial.selectionResult ?? null,
    rankingResult: partial.rankingResult ?? null,
    budgetResults: partial.budgetResults ?? Object.freeze([]),
    pacingResults: partial.pacingResults ?? Object.freeze([]),
    frequencyResults: partial.frequencyResults ?? Object.freeze([]),
    auctionResult: partial.auctionResult ?? null,
    fraudResult: partial.fraudResult ?? null,
    selectionRenderAdapter: partial.selectionRenderAdapter ?? null,
    provenance: partial.provenance ?? null,
    renderResult: partial.renderResult ?? null,
    executionResult: partial.executionResult ?? null,
    deliveryResult: partial.deliveryResult ?? null,
    measurementPackage: null,
    billingEligible: false,
    billingResult: partial.billingResult ?? null,
    chargeResult: null,
    servingLifecycle: params.servingLifecycle,
    authoritativeDecisionPath: true,
    productionEnabled: false,
    deliveryEnabled: false,
    executionEnabled: false,
    measurementEnabled: false,
    billingEnabled: false,
  });
}

function resolveSelectionRequestId(selectionContext: unknown): string | null {
  if (!isRecord(selectionContext)) {
    return null;
  }
  return typeof selectionContext.selectionRequestId === "string"
    ? selectionContext.selectionRequestId
    : null;
}

function advanceServingStage(
  lifecycle: AdsServingLifecycleV1,
  stage: AdsServingLifecycleStage,
  status: "accepted" | "rejected" | "skipped",
  rejectionReason: AdsServingRejectionReason | null = null,
  extras: {
    provenance?: Parameters<typeof transitionAdsServingStageV1>[0]["provenance"];
    idempotency?: Parameters<
      typeof transitionAdsServingStageV1
    >[0]["idempotency"];
    deliveryAccepted?: boolean;
    measurementAccepted?: boolean;
    billingHandoffAccepted?: boolean;
  } = {}
):
  | { valid: true; lifecycle: AdsServingLifecycleV1 }
  | { valid: false; issues: readonly string[]; lifecycle: AdsServingLifecycleV1 } {
  const outcome = transitionAdsServingStageV1({
    lifecycle,
    stage,
    status,
    rejectionReason,
    ...extras,
  });
  if (!outcome.valid) {
    return {
      valid: false,
      issues: outcome.issues,
      lifecycle: outcome.lifecycle,
    };
  }
  return { valid: true, lifecycle: outcome.lifecycle };
}

function indexByCandidateId<T extends { candidateId: string }>(
  items: readonly T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.candidateId, item);
  }
  return map;
}

function resolvePlacementId(selectionContext: unknown): string | null {
  if (!isRecord(selectionContext)) {
    return null;
  }
  const placement = selectionContext.placement;
  if (isRecord(placement) && typeof placement.placementId === "string") {
    return placement.placementId;
  }
  return null;
}

/**
 * Pure shape validator for canonical stack results.
 */
export function validateAdsCanonicalStackV1Result(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Canonical stack result must be an object."]),
    };
  }

  const issues: string[] = [];
  if (input.contractVersion !== ADS_CANONICAL_STACK_V1_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_CANONICAL_STACK_V1_CONTRACT_VERSION}".`
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
  if (input.productionAccepted !== false) {
    issues.push(
      "productionAccepted must be false (delivery gate / kill switches keep production closed)."
    );
  }
  if (input.authoritativeDecisionPath !== true) {
    issues.push("authoritativeDecisionPath must be true for canonical results.");
  }
  if (
    typeof input.pipelineStage !== "string" ||
    !STAGE_SET.has(input.pipelineStage)
  ) {
    issues.push(
      `pipelineStage must be one of: ${ADS_CANONICAL_STACK_V1_STAGES.join(", ")}.`
    );
  }
  if (
    input.rejectionReason !== null &&
    (typeof input.rejectionReason !== "string" ||
      !REJECTION_REASON_SET.has(input.rejectionReason))
  ) {
    issues.push("rejectionReason must be null or a canonical rejection reason.");
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
  if (input.billingEnabled !== false) {
    issues.push("billingEnabled must be false.");
  }
  if (typeof input.billingEligible !== "boolean") {
    issues.push("billingEligible must be a boolean.");
  }
  if (
    input.stackAccepted === true &&
    (input.measurementPackage === null || input.measurementPackage === undefined)
  ) {
    issues.push(
      "measurementPackage is required when stackAccepted is true."
    );
  }
  if (input.stackRejected === true && input.chargeResult !== null) {
    issues.push("chargeResult must be null when stackRejected is true.");
  }
  if (input.billingEligible !== true && input.chargeResult !== null) {
    issues.push("chargeResult must be null when billingEligible is false.");
  }
  if (!isRecord(input.decisionTrace)) {
    issues.push("decisionTrace must be an object.");
  } else {
    if (
      input.decisionTrace.contractVersion !==
      ADS_CANONICAL_STACK_V1_CONTRACT_VERSION
    ) {
      issues.push("decisionTrace.contractVersion must match stack contract.");
    }
    if (!Array.isArray(input.decisionTrace.stages)) {
      issues.push("decisionTrace.stages must be an array.");
    }
  }
  if (!isRecord(input.deliveryGate)) {
    issues.push("deliveryGate must be an object.");
  } else {
    if (input.deliveryGate.passed !== false) {
      issues.push("deliveryGate.passed must be false while delivery is disabled.");
    }
    if (input.deliveryGate.globalDeliveryEnabled !== false) {
      issues.push("deliveryGate.globalDeliveryEnabled must be false.");
    }
    if (input.deliveryGate.placementDeliveryEnabled !== false) {
      issues.push("deliveryGate.placementDeliveryEnabled must be false.");
    }
  }
  if (!("servingLifecycle" in input)) {
    issues.push("servingLifecycle is required on canonical stack results.");
  } else {
    const servingValidation = validateAdsServingLifecycleV1(
      input.servingLifecycle
    );
    if (!servingValidation.valid) {
      issues.push(
        ...servingValidation.issues.map((issue) => `servingLifecycle: ${issue}`)
      );
    }
    if (isRecord(input.servingLifecycle)) {
      if (input.servingLifecycle.productionAccepted !== false) {
        issues.push("servingLifecycle.productionAccepted must be false.");
      }
      if (input.servingLifecycle.authoritativeProductionServing !== false) {
        issues.push(
          "servingLifecycle.authoritativeProductionServing must be false."
        );
      }
      const gateCheck = assertAdsServingKillSwitchesClosedV1(
        input.servingLifecycle.environmentGate
      );
      if (!gateCheck.valid) {
        issues.push(
          ...gateCheck.issues.map((issue) => `servingLifecycle: ${issue}`)
        );
      }
    }
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

function parseInvalidTrafficSignals(
  input: unknown
):
  | { valid: true; signals: AdsCanonicalStackInvalidTrafficSignals }
  | { valid: false; issues: string[] } {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: ["invalidTrafficSignals must be an object."],
    };
  }
  const allowed = new Set([
    "trustLevel",
    "reportingHandleValid",
    "duplicateEvent",
    "impossibleSequence",
    "suspiciousImpression",
    "suspiciousClick",
  ]);
  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!allowed.has(key)) {
      issues.push(`invalidTrafficSignals unknown field "${key}".`);
    }
  }
  if (
    typeof input.trustLevel !== "string" ||
    !IVT_TRUST_SET.has(input.trustLevel)
  ) {
    issues.push("invalidTrafficSignals.trustLevel is invalid.");
  }
  for (const flag of [
    "reportingHandleValid",
    "duplicateEvent",
    "impossibleSequence",
    "suspiciousImpression",
    "suspiciousClick",
  ] as const) {
    if (typeof input[flag] !== "boolean") {
      issues.push(`invalidTrafficSignals.${flag} must be a boolean.`);
    }
  }
  if (issues.length > 0) {
    return { valid: false, issues };
  }
  return {
    valid: true,
    signals: Object.freeze({
      trustLevel: input.trustLevel as AdsCanonicalStackInvalidTrafficSignals["trustLevel"],
      reportingHandleValid: input.reportingHandleValid as boolean,
      duplicateEvent: input.duplicateEvent as boolean,
      impossibleSequence: input.impossibleSequence as boolean,
      suspiciousImpression: input.suspiciousImpression as boolean,
      suspiciousClick: input.suspiciousClick as boolean,
    }),
  };
}

/**
 * Runs the canonical Ads V1 decision stack.
 * Deterministic. Fail closed. Never mutates inputs.
 * Winner comes only from Selection → Ranking → Auction.
 */
export function runAdsCanonicalStackV1(
  input: unknown
): AdsCanonicalStackV1Outcome {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Canonical stack input must be an object."]),
    };
  }

  const parseIssues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!INPUT_ALLOWED.has(key)) {
      parseIssues.push(`unknown field "${key}" is not allowed.`);
    }
  }
  for (const forbidden of FORBIDDEN_CALLER_FIELDS) {
    if (forbidden in input) {
      parseIssues.push(
        `caller field "${forbidden}" is not allowed — winner / billing identity are stack-authoritative.`
      );
    }
  }

  for (const required of [
    "inventory",
    "selectionContext",
    "rankingSignals",
    "budgetSnapshots",
    "pacingSnapshots",
    "frequencySnapshots",
    "invalidTrafficSignals",
    "pricing",
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
      parseIssues.push(`Canonical stack input must include ${required}.`);
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

  if (!Array.isArray(input.rankingSignals)) {
    parseIssues.push("rankingSignals must be an array.");
  }
  if (!Array.isArray(input.budgetSnapshots)) {
    parseIssues.push("budgetSnapshots must be an array.");
  }
  if (!Array.isArray(input.pacingSnapshots)) {
    parseIssues.push("pacingSnapshots must be an array.");
  }
  if (!Array.isArray(input.frequencySnapshots)) {
    parseIssues.push("frequencySnapshots must be an array.");
  }

  const ivtParse = parseInvalidTrafficSignals(input.invalidTrafficSignals);
  if (!ivtParse.valid) {
    parseIssues.push(...ivtParse.issues);
  }

  if (parseIssues.length > 0) {
    return { valid: false, issues: Object.freeze([...parseIssues]) };
  }

  // Structural lock: serving foundation cannot redefine the authority path.
  if (ADS_SERVING_AUTHORITATIVE_ENTRYPOINT !== "runAdsCanonicalStackV1") {
    return {
      valid: false,
      issues: Object.freeze([
        "Serving authoritative entrypoint mismatch — canonical stack only.",
      ]),
    };
  }

  const eventType = input.eventType as AdsMeasurementFoundationEventType;
  const ivtSignals = (
    ivtParse as { valid: true; signals: AdsCanonicalStackInvalidTrafficSignals }
  ).signals;
  const placementId = resolvePlacementId(input.selectionContext);
  const selectionRequestId = resolveSelectionRequestId(input.selectionContext);
  const servingRequestId = selectionRequestId ?? `serving:${placementId ?? "unknown"}`;
  const correlationOutcome = buildAdsServingCorrelationV1({
    servingRequestId,
    selectionRequestId,
    placementId,
  });
  if (!correlationOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...correlationOutcome.issues.map((issue) => `serving: ${issue}`),
      ]),
    };
  }
  const lifecycleCreate = createAdsServingLifecycleV1({
    correlation: correlationOutcome.correlation,
  });
  if (!lifecycleCreate.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...lifecycleCreate.issues.map((issue) => `serving: ${issue}`),
      ]),
    };
  }
  let servingLifecycle = lifecycleCreate.lifecycle;

  const deliveryGate = evaluateDeliveryGate(placementId);
  const trace = createTraceBuilder();

  // --- delivery_gate (Option B: record fail-closed production denial) ---
  // ADS_DELIVERY_ENABLED and placement enabledByDefault are false in V1.
  // Gate failure never yields productionAccepted=true. Foundation diagnostic
  // stages may continue under kill switches.
  if (deliveryGate.passed) {
    trace.push("delivery_gate", "accepted", null, null);
  } else {
    trace.push(
      "delivery_gate",
      "rejected",
      deliveryGate.rejectionReason,
      null
    );
  }

  // Serving lifecycle: request intake (diagnostics may continue; production closed).
  {
    const advance = advanceServingStage(
      servingLifecycle,
      "request_intake",
      "accepted",
      null
    );
    if (!advance.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...advance.issues.map((issue) => `serving: ${issue}`),
        ]),
      };
    }
    servingLifecycle = advance.lifecycle;
  }

  // --- select ---
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

  if (selectionOutcome.result.eligibleCandidates.length === 0) {
    const eligibilityAdvance = advanceServingStage(
      servingLifecycle,
      "eligibility",
      "rejected",
      "environment_gate_closed"
    );
    if (eligibilityAdvance.valid) {
      servingLifecycle = eligibilityAdvance.lifecycle;
    }
    trace.push("select", "rejected", "no_eligible_candidates", null);
    const decisionTrace = trace.freeze(
      "select",
      false,
      "no_eligible_candidates",
      null
    );
    const result = rejectedResult({
      pipelineStage: "select",
      rejectionReason: "no_eligible_candidates",
      deliveryGate,
      decisionTrace,
      servingLifecycle,
      partial: { selectionResult: selectionOutcome.result },
    });
    const validation = validateAdsCanonicalStackV1Result(result);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  {
    const eligibilityAdvance = advanceServingStage(
      servingLifecycle,
      "eligibility",
      "accepted",
      null
    );
    if (!eligibilityAdvance.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...eligibilityAdvance.issues.map((issue) => `serving: ${issue}`),
        ]),
      };
    }
    servingLifecycle = eligibilityAdvance.lifecycle;
    const selectionAdvance = advanceServingStage(
      servingLifecycle,
      "candidate_selection",
      "accepted",
      null
    );
    if (!selectionAdvance.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...selectionAdvance.issues.map((issue) => `serving: ${issue}`),
        ]),
      };
    }
    servingLifecycle = selectionAdvance.lifecycle;
  }

  trace.push("select", "accepted", null, null);

  const eligibleIds = new Set(
    selectionOutcome.result.eligibleCandidates.map((c) => c.candidateId)
  );

  // Intersect caller ranking signals with selection-eligible ids only.
  const rankingSignals = (
    input.rankingSignals as readonly AdsRankingCandidateSignals[]
  ).filter((signal) => eligibleIds.has(signal.candidateId));

  if (rankingSignals.length === 0) {
    const rankingAdvance = advanceServingStage(
      servingLifecycle,
      "ranking",
      "rejected",
      "environment_gate_closed"
    );
    if (rankingAdvance.valid) {
      servingLifecycle = rankingAdvance.lifecycle;
    }
    trace.push("score_rank", "rejected", "no_rankable_candidates", null);
    const decisionTrace = trace.freeze(
      "score_rank",
      false,
      "no_rankable_candidates",
      null
    );
    const result = rejectedResult({
      pipelineStage: "score_rank",
      rejectionReason: "no_rankable_candidates",
      deliveryGate,
      decisionTrace,
      servingLifecycle,
      partial: { selectionResult: selectionOutcome.result },
    });
    const validation = validateAdsCanonicalStackV1Result(result);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  // --- score_rank ---
  const rankingOutcome = rankAdsCandidates({ candidates: rankingSignals });
  if (!rankingOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...rankingOutcome.issues.map((issue) => `ranking: ${issue}`),
      ]),
    };
  }

  if (rankingOutcome.result.rankedCandidates.length === 0) {
    const rankingAdvance = advanceServingStage(
      servingLifecycle,
      "ranking",
      "rejected",
      "environment_gate_closed"
    );
    if (rankingAdvance.valid) {
      servingLifecycle = rankingAdvance.lifecycle;
    }
    trace.push("score_rank", "rejected", "no_rankable_candidates", null);
    const decisionTrace = trace.freeze(
      "score_rank",
      false,
      "no_rankable_candidates",
      null
    );
    const result = rejectedResult({
      pipelineStage: "score_rank",
      rejectionReason: "no_rankable_candidates",
      deliveryGate,
      decisionTrace,
      servingLifecycle,
      partial: {
        selectionResult: selectionOutcome.result,
        rankingResult: rankingOutcome.result,
      },
    });
    const validation = validateAdsCanonicalStackV1Result(result);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  const topRankedId = rankingOutcome.result.rankedCandidates[0]?.candidateId ?? null;
  trace.push("score_rank", "accepted", null, topRankedId);
  {
    const rankingAdvance = advanceServingStage(
      servingLifecycle,
      "ranking",
      "accepted",
      null
    );
    if (!rankingAdvance.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...rankingAdvance.issues.map((issue) => `serving: ${issue}`),
        ]),
      };
    }
    servingLifecycle = rankingAdvance.lifecycle;
  }

  const budgetById = indexByCandidateId(
    input.budgetSnapshots as readonly AdsBudgetSnapshot[]
  );
  const pacingById = indexByCandidateId(
    input.pacingSnapshots as readonly AdsPacingSnapshot[]
  );
  const frequencyById = indexByCandidateId(
    input.frequencySnapshots as readonly AdsFrequencySnapshot[]
  );

  const budgetResults: AdsBudgetEvaluationResult[] = [];
  const pacingResults: AdsPacingEvaluationResult[] = [];
  const frequencyResults: AdsFrequencyEvaluationResult[] = [];
  const eligibilityState: { candidateId: string; eligible: boolean }[] = [];

  let budgetRejectId: string | null = null;
  let pacingRejectId: string | null = null;
  let frequencyRejectId: string | null = null;

  for (const ranked of rankingOutcome.result.rankedCandidates) {
    const budgetSnap = budgetById.get(ranked.candidateId);
    const pacingSnap = pacingById.get(ranked.candidateId);
    const frequencySnap = frequencyById.get(ranked.candidateId);

    let budgetOk = false;
    let pacingOk = false;
    let frequencyOk = false;

    if (budgetSnap) {
      const budgetOutcome = evaluateAdsBudget(budgetSnap);
      if (!budgetOutcome.valid) {
        return {
          valid: false,
          issues: Object.freeze([
            ...budgetOutcome.issues.map(
              (issue) => `budget[${ranked.candidateId}]: ${issue}`
            ),
          ]),
        };
      }
      budgetResults.push(budgetOutcome.result);
      budgetOk = budgetOutcome.result.budgetEligible;
      if (!budgetOk && budgetRejectId === null) {
        budgetRejectId = ranked.candidateId;
      }
    } else if (budgetRejectId === null) {
      budgetRejectId = ranked.candidateId;
    }

    if (pacingSnap) {
      const pacingOutcome = evaluateAdsPacing(pacingSnap);
      if (!pacingOutcome.valid) {
        return {
          valid: false,
          issues: Object.freeze([
            ...pacingOutcome.issues.map(
              (issue) => `pacing[${ranked.candidateId}]: ${issue}`
            ),
          ]),
        };
      }
      pacingResults.push(pacingOutcome.result);
      pacingOk = pacingOutcome.result.pacingEligible;
      if (!pacingOk && pacingRejectId === null) {
        pacingRejectId = ranked.candidateId;
      }
    } else if (pacingRejectId === null) {
      pacingRejectId = ranked.candidateId;
    }

    if (frequencySnap) {
      const frequencyOutcome = evaluateAdsFrequency(frequencySnap);
      if (!frequencyOutcome.valid) {
        return {
          valid: false,
          issues: Object.freeze([
            ...frequencyOutcome.issues.map(
              (issue) => `frequency[${ranked.candidateId}]: ${issue}`
            ),
          ]),
        };
      }
      frequencyResults.push(frequencyOutcome.result);
      frequencyOk = frequencyOutcome.result.frequencyEligible;
      if (!frequencyOk && frequencyRejectId === null) {
        frequencyRejectId = ranked.candidateId;
      }
    } else if (frequencyRejectId === null) {
      frequencyRejectId = ranked.candidateId;
    }

    eligibilityState.push({
      candidateId: ranked.candidateId,
      eligible: budgetOk && pacingOk && frequencyOk,
    });
  }

  const frozenBudgetResults = Object.freeze([...budgetResults]);
  const frozenPacingResults = Object.freeze([...pacingResults]);
  const frozenFrequencyResults = Object.freeze([...frequencyResults]);

  // Gate stages: if NO ranked candidate is eligible after budget, stop before auction.
  const anyBudgetEligible = eligibilityState.some((entry) => {
    const budget = budgetResults.find((r) => r.candidateId === entry.candidateId);
    return budget?.budgetEligible === true;
  });
  if (!anyBudgetEligible) {
    const auctionAdvance = advanceServingStage(
      servingLifecycle,
      "auction",
      "rejected",
      "environment_gate_closed"
    );
    if (auctionAdvance.valid) {
      servingLifecycle = auctionAdvance.lifecycle;
    }
    trace.push("budget", "rejected", "budget_ineligible", budgetRejectId);
    const decisionTrace = trace.freeze(
      "budget",
      false,
      "budget_ineligible",
      budgetRejectId
    );
    const result = rejectedResult({
      pipelineStage: "budget",
      rejectionReason: "budget_ineligible",
      deliveryGate,
      decisionTrace,
      servingLifecycle,
      partial: {
        selectionResult: selectionOutcome.result,
        rankingResult: rankingOutcome.result,
        budgetResults: frozenBudgetResults,
        pacingResults: frozenPacingResults,
        frequencyResults: frozenFrequencyResults,
      },
    });
    const validation = validateAdsCanonicalStackV1Result(result);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }
  trace.push("budget", "accepted", null, topRankedId);

  const anyPacingEligible = eligibilityState.some((entry) => {
    const pacing = pacingResults.find((r) => r.candidateId === entry.candidateId);
    const budget = budgetResults.find((r) => r.candidateId === entry.candidateId);
    return (
      budget?.budgetEligible === true && pacing?.pacingEligible === true
    );
  });
  if (!anyPacingEligible) {
    const auctionAdvance = advanceServingStage(
      servingLifecycle,
      "auction",
      "rejected",
      "environment_gate_closed"
    );
    if (auctionAdvance.valid) {
      servingLifecycle = auctionAdvance.lifecycle;
    }
    trace.push("pacing", "rejected", "pacing_ineligible", pacingRejectId);
    const decisionTrace = trace.freeze(
      "pacing",
      false,
      "pacing_ineligible",
      pacingRejectId
    );
    const result = rejectedResult({
      pipelineStage: "pacing",
      rejectionReason: "pacing_ineligible",
      deliveryGate,
      decisionTrace,
      servingLifecycle,
      partial: {
        selectionResult: selectionOutcome.result,
        rankingResult: rankingOutcome.result,
        budgetResults: frozenBudgetResults,
        pacingResults: frozenPacingResults,
        frequencyResults: frozenFrequencyResults,
      },
    });
    const validation = validateAdsCanonicalStackV1Result(result);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }
  trace.push("pacing", "accepted", null, topRankedId);

  const anyFrequencyEligible = eligibilityState.some((entry) => entry.eligible);
  if (!anyFrequencyEligible) {
    const auctionAdvance = advanceServingStage(
      servingLifecycle,
      "auction",
      "rejected",
      "environment_gate_closed"
    );
    if (auctionAdvance.valid) {
      servingLifecycle = auctionAdvance.lifecycle;
    }
    trace.push(
      "frequency",
      "rejected",
      "frequency_ineligible",
      frequencyRejectId
    );
    const decisionTrace = trace.freeze(
      "frequency",
      false,
      "frequency_ineligible",
      frequencyRejectId
    );
    const result = rejectedResult({
      pipelineStage: "frequency",
      rejectionReason: "frequency_ineligible",
      deliveryGate,
      decisionTrace,
      servingLifecycle,
      partial: {
        selectionResult: selectionOutcome.result,
        rankingResult: rankingOutcome.result,
        budgetResults: frozenBudgetResults,
        pacingResults: frozenPacingResults,
        frequencyResults: frozenFrequencyResults,
      },
    });
    const validation = validateAdsCanonicalStackV1Result(result);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }
  trace.push("frequency", "accepted", null, topRankedId);

  // --- auction ---
  const auctionOutcome = runAdsAuction({
    rankedCandidates: rankingOutcome.result.rankedCandidates.map((c) =>
      Object.freeze({
        candidateId: c.candidateId,
        rank: c.rank,
        totalScore: c.totalScore,
      })
    ),
    rankingMetadata: rankingOutcome.result.metadata,
    eligibilityState: Object.freeze(
      eligibilityState.map((entry) => Object.freeze({ ...entry }))
    ),
  });
  if (!auctionOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...auctionOutcome.issues.map((issue) => `auction: ${issue}`),
      ]),
    };
  }

  if (auctionOutcome.result.auctionWinner === null) {
    const auctionAdvance = advanceServingStage(
      servingLifecycle,
      "auction",
      "rejected",
      "environment_gate_closed"
    );
    if (auctionAdvance.valid) {
      servingLifecycle = auctionAdvance.lifecycle;
    }
    trace.push("auction", "rejected", "no_auction_winner", null);
    const decisionTrace = trace.freeze(
      "auction",
      false,
      "no_auction_winner",
      null
    );
    const result = rejectedResult({
      pipelineStage: "auction",
      rejectionReason: "no_auction_winner",
      deliveryGate,
      decisionTrace,
      servingLifecycle,
      partial: {
        selectionResult: selectionOutcome.result,
        rankingResult: rankingOutcome.result,
        budgetResults: frozenBudgetResults,
        pacingResults: frozenPacingResults,
        frequencyResults: frozenFrequencyResults,
        auctionResult: auctionOutcome.result,
      },
    });
    const validation = validateAdsCanonicalStackV1Result(result);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  const winnerId = auctionOutcome.result.auctionWinner.candidateId;
  trace.push("auction", "accepted", null, winnerId);
  {
    const auctionAdvance = advanceServingStage(
      servingLifecycle,
      "auction",
      "accepted",
      null,
      {
        provenance: {
          candidateId: winnerId,
        },
      }
    );
    if (!auctionAdvance.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...auctionAdvance.issues.map((issue) => `serving: ${issue}`),
        ]),
      };
    }
    servingLifecycle = auctionAdvance.lifecycle;
  }

  const winnerEligible = selectionOutcome.result.eligibleCandidates.find(
    (c) => c.candidateId === winnerId
  );
  if (!winnerEligible) {
    return {
      valid: false,
      issues: Object.freeze([
        "auction winner is not present in selection eligibleCandidates.",
      ]),
    };
  }

  const reportingHandle =
    eventType === "click"
      ? (input.clickHandle as string)
      : (input.impressionHandle as string);
  const eventId = buildAdsMeasurementDedupeKey({
    eventType,
    selectedCandidateId: winnerId,
    reportingHandle,
  });

  // --- fraud / IVT (before delivery / measurement / billing) ---
  // IVT/fraud contracts only accept impression|click. Other measurement event
  // types skip fraud with a hard fail-closed on billing later.
  let fraudResult: AdsFraudEvaluationResult | null = null;
  if (eventType === "impression" || eventType === "click") {
    const fraudOutcome = evaluateAdsFraud({
      invalidTrafficSnapshot: {
        eventId,
        candidateId: winnerId,
        campaignId: winnerEligible.campaignRef,
        eventType,
        trustLevel: ivtSignals.trustLevel,
        reportingHandleValid: ivtSignals.reportingHandleValid,
        duplicateEvent: ivtSignals.duplicateEvent,
        impossibleSequence: ivtSignals.impossibleSequence,
        suspiciousImpression: ivtSignals.suspiciousImpression,
        suspiciousClick: ivtSignals.suspiciousClick,
      },
    });
    if (!fraudOutcome.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...fraudOutcome.issues.map((issue) => `fraud: ${issue}`),
        ]),
      };
    }

    fraudResult = fraudOutcome.result;
    if (!fraudOutcome.result.fraudEligible) {
      const fraudAdvance = advanceServingStage(
        servingLifecycle,
        "fraud_ivt_decision",
        "rejected",
        "environment_gate_closed",
        {
          provenance: {
            candidateId: winnerId,
            campaignRef: winnerEligible.campaignRef,
          },
        }
      );
      if (fraudAdvance.valid) {
        servingLifecycle = fraudAdvance.lifecycle;
      }
      trace.push("fraud", "rejected", "fraud_rejected", winnerId);
      const decisionTrace = trace.freeze(
        "fraud",
        false,
        "fraud_rejected",
        winnerId
      );
      const result = rejectedResult({
        pipelineStage: "fraud",
        rejectionReason: "fraud_rejected",
        deliveryGate,
        decisionTrace,
        servingLifecycle,
        partial: {
          selectionResult: selectionOutcome.result,
          rankingResult: rankingOutcome.result,
          budgetResults: frozenBudgetResults,
          pacingResults: frozenPacingResults,
          frequencyResults: frozenFrequencyResults,
          auctionResult: auctionOutcome.result,
          fraudResult: fraudOutcome.result,
        },
      });
      const validation = validateAdsCanonicalStackV1Result(result);
      if (!validation.valid) {
        return { valid: false, issues: Object.freeze([...validation.issues]) };
      }
      return { valid: true, result };
    }
    trace.push("fraud", "accepted", null, winnerId);
    {
      const fraudAdvance = advanceServingStage(
        servingLifecycle,
        "fraud_ivt_decision",
        "accepted",
        null,
        {
          provenance: {
            candidateId: winnerId,
            campaignRef: winnerEligible.campaignRef,
            advertiserRef: winnerEligible.advertiserRef,
            adSetRef: winnerEligible.adSetRef,
            adRef: winnerEligible.adRef,
            creativeRef: winnerEligible.creativeRef,
          },
        }
      );
      if (!fraudAdvance.valid) {
        return {
          valid: false,
          issues: Object.freeze([
            ...fraudAdvance.issues.map((issue) => `serving: ${issue}`),
          ]),
        };
      }
      servingLifecycle = fraudAdvance.lifecycle;
    }
  } else {
    trace.push("fraud", "skipped", null, winnerId);
    {
      const fraudAdvance = advanceServingStage(
        servingLifecycle,
        "fraud_ivt_decision",
        "skipped",
        null,
        {
          provenance: {
            candidateId: winnerId,
            campaignRef: winnerEligible.campaignRef,
          },
        }
      );
      if (!fraudAdvance.valid) {
        return {
          valid: false,
          issues: Object.freeze([
            ...fraudAdvance.issues.map((issue) => `serving: ${issue}`),
          ]),
        };
      }
      servingLifecycle = fraudAdvance.lifecycle;
    }
  }

  // --- adapt (auction winner only — never caller candidateId) ---
  const adapterOutcome = adaptAdsSelectionToRenderEligible({
    inventory: input.inventory,
    selectionResult: selectionOutcome.result,
    candidateId: winnerId,
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
  trace.push("adapt_selection_render", "accepted", null, winnerId);

  const placementDescriptor: AdsRenderPlacementDescriptor =
    input.placementDescriptor !== undefined
      ? (input.placementDescriptor as AdsRenderPlacementDescriptor)
      : Object.freeze({ placementId: eligibleCandidate.placementId });

  // --- render ---
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
    const renderAdvance = advanceServingStage(
      servingLifecycle,
      "render_eligibility",
      "rejected",
      "environment_gate_closed"
    );
    if (renderAdvance.valid) {
      servingLifecycle = renderAdvance.lifecycle;
    }
    trace.push("render", "rejected", "render_rejected", winnerId);
    const decisionTrace = trace.freeze(
      "render",
      false,
      "render_rejected",
      winnerId
    );
    const result = rejectedResult({
      pipelineStage: "render",
      rejectionReason: "render_rejected",
      deliveryGate,
      decisionTrace,
      servingLifecycle,
      partial: {
        selectionResult: selectionOutcome.result,
        rankingResult: rankingOutcome.result,
        budgetResults: frozenBudgetResults,
        pacingResults: frozenPacingResults,
        frequencyResults: frozenFrequencyResults,
        auctionResult: auctionOutcome.result,
        fraudResult,
        selectionRenderAdapter: adapterResult,
        provenance,
        renderResult: renderOutcome.result,
      },
    });
    const validation = validateAdsCanonicalStackV1Result(result);
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
  trace.push("render", "accepted", null, winnerId);
  {
    const renderAdvance = advanceServingStage(
      servingLifecycle,
      "render_eligibility",
      "accepted",
      null
    );
    if (!renderAdvance.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...renderAdvance.issues.map((issue) => `serving: ${issue}`),
        ]),
      };
    }
    servingLifecycle = renderAdvance.lifecycle;
  }

  // --- execute ---
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
    trace.push("execute", "rejected", "execution_rejected", winnerId);
    const decisionTrace = trace.freeze(
      "execute",
      false,
      "execution_rejected",
      winnerId
    );
    const result = rejectedResult({
      pipelineStage: "execute",
      rejectionReason: "execution_rejected",
      deliveryGate,
      decisionTrace,
      servingLifecycle,
      partial: {
        selectionResult: selectionOutcome.result,
        rankingResult: rankingOutcome.result,
        budgetResults: frozenBudgetResults,
        pacingResults: frozenPacingResults,
        frequencyResults: frozenFrequencyResults,
        auctionResult: auctionOutcome.result,
        fraudResult,
        selectionRenderAdapter: adapterResult,
        provenance,
        renderResult: renderOutcome.result,
        executionResult: executionOutcome.result,
      },
    });
    const validation = validateAdsCanonicalStackV1Result(result);
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
  trace.push("execute", "accepted", null, winnerId);

  // --- deliver ---
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
    trace.push("deliver", "rejected", "delivery_rejected", winnerId);
    const decisionTrace = trace.freeze(
      "deliver",
      false,
      "delivery_rejected",
      winnerId
    );
    const result = rejectedResult({
      pipelineStage: "deliver",
      rejectionReason: "delivery_rejected",
      deliveryGate,
      decisionTrace,
      servingLifecycle,
      partial: {
        selectionResult: selectionOutcome.result,
        rankingResult: rankingOutcome.result,
        budgetResults: frozenBudgetResults,
        pacingResults: frozenPacingResults,
        frequencyResults: frozenFrequencyResults,
        auctionResult: auctionOutcome.result,
        fraudResult,
        selectionRenderAdapter: adapterResult,
        provenance,
        renderResult: renderOutcome.result,
        executionResult: executionOutcome.result,
        deliveryResult: deliveryOutcome.result,
      },
    });
    const validation = validateAdsCanonicalStackV1Result(result);
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

  const idempotencyKeysOutcome = buildAdsServingIdempotencyKeysV1({
    correlationId: servingLifecycle.correlation.correlationId,
    candidateId: winnerId,
    eventType,
    reportingHandle,
  });
  if (!idempotencyKeysOutcome.valid) {
    return {
      valid: false,
      issues: Object.freeze([
        ...idempotencyKeysOutcome.issues.map((issue) => `serving: ${issue}`),
      ]),
    };
  }

  const seenDeliveryAttemptKeys = Array.isArray(input.seenDeliveryAttemptKeys)
    ? (input.seenDeliveryAttemptKeys as readonly string[])
    : [];
  const deliveryClaim = claimAdsServingIdempotencyV1({
    kind: "delivery_attempt",
    key: idempotencyKeysOutcome.keys.deliveryAttemptKey as string,
    seenKeys: seenDeliveryAttemptKeys,
    lifecycle: servingLifecycle,
  });
  if (!deliveryClaim.valid) {
    const deliveryAdvance = advanceServingStage(
      servingLifecycle,
      "delivery_attempt",
      "rejected",
      deliveryClaim.rejectionReason
    );
    if (deliveryAdvance.valid) {
      servingLifecycle = deliveryAdvance.lifecycle;
    }
    trace.push("deliver", "rejected", "delivery_rejected", winnerId);
    const decisionTrace = trace.freeze(
      "deliver",
      false,
      "delivery_rejected",
      winnerId
    );
    const result = rejectedResult({
      pipelineStage: "deliver",
      rejectionReason: "delivery_rejected",
      deliveryGate,
      decisionTrace,
      servingLifecycle,
      partial: {
        selectionResult: selectionOutcome.result,
        rankingResult: rankingOutcome.result,
        budgetResults: frozenBudgetResults,
        pacingResults: frozenPacingResults,
        frequencyResults: frozenFrequencyResults,
        auctionResult: auctionOutcome.result,
        fraudResult,
        selectionRenderAdapter: adapterResult,
        provenance,
        renderResult: renderOutcome.result,
        executionResult: executionOutcome.result,
        deliveryResult: deliveryOutcome.result,
      },
    });
    const validation = validateAdsCanonicalStackV1Result(result);
    if (!validation.valid) {
      return { valid: false, issues: Object.freeze([...validation.issues]) };
    }
    return { valid: true, result };
  }

  servingLifecycle = applyAdsServingIdempotencyClaimV1({
    lifecycle: servingLifecycle,
    claim: deliveryClaim,
  });
  {
    const deliveryAdvance = advanceServingStage(
      servingLifecycle,
      "delivery_attempt",
      "accepted",
      null,
      {
        idempotency: {
          deliveryAttemptKey: deliveryClaim.key,
        },
        deliveryAccepted: true,
      }
    );
    if (!deliveryAdvance.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...deliveryAdvance.issues.map((issue) => `serving: ${issue}`),
        ]),
      };
    }
    servingLifecycle = deliveryAdvance.lifecycle;
  }
  trace.push("deliver", "accepted", null, winnerId);

  // --- measure ---
  const measurementOutcome = prepareAdsMeasurementFromDeliveryV1({
    deliveryResult: deliveryOutcome.result,
    eventType,
    provenance,
    ...(input.seenDedupeKeys !== undefined
      ? { seenDedupeKeys: input.seenDedupeKeys }
      : {}),
  });
  if (!measurementOutcome.valid) {
    const measureAdvance = advanceServingStage(
      servingLifecycle,
      "measurement_handoff",
      "rejected",
      "duplicate_measurement_event"
    );
    if (measureAdvance.valid) {
      servingLifecycle = measureAdvance.lifecycle;
    }
    trace.push("measure", "rejected", "measurement_rejected", winnerId);
    return {
      valid: false,
      issues: Object.freeze([
        ...measurementOutcome.issues.map((issue) => `measurement: ${issue}`),
      ]),
    };
  }

  // Serving measurement idempotency key may be supplied via seenDedupeKeys as
  // a shared fail-closed ledger (in addition to foundation package dedupe).
  const measurementClaim = claimAdsServingIdempotencyV1({
    kind: "measurement_event",
    key: idempotencyKeysOutcome.keys.measurementEventKey as string,
    seenKeys: Array.isArray(input.seenDedupeKeys)
      ? (input.seenDedupeKeys as readonly string[])
      : [],
    lifecycle: servingLifecycle,
  });
  if (!measurementClaim.valid) {
    const measureAdvance = advanceServingStage(
      servingLifecycle,
      "measurement_handoff",
      "rejected",
      measurementClaim.rejectionReason
    );
    if (measureAdvance.valid) {
      servingLifecycle = measureAdvance.lifecycle;
    }
    trace.push("measure", "rejected", "measurement_rejected", winnerId);
    return {
      valid: false,
      issues: Object.freeze([...measurementClaim.issues]),
    };
  }
  servingLifecycle = applyAdsServingIdempotencyClaimV1({
    lifecycle: servingLifecycle,
    claim: measurementClaim,
  });
  {
    const measureAdvance = advanceServingStage(
      servingLifecycle,
      "measurement_handoff",
      "accepted",
      null,
      {
        idempotency: {
          measurementEventKey: measurementClaim.key,
        },
        measurementAccepted: true,
      }
    );
    if (!measureAdvance.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...measureAdvance.issues.map((issue) => `serving: ${issue}`),
        ]),
      };
    }
    servingLifecycle = measureAdvance.lifecycle;
  }
  trace.push("measure", "accepted", null, winnerId);

  // --- bill (only after accepted delivery + measurement + fraud pass) ---
  let billingResult: AdsBillingEvaluationResult | null = null;
  let billingEligible = false;
  let chargeResult: AdsBillingEvaluationResult["chargeResult"] = null;

  const fraudPassed = fraudResult?.fraudEligible === true;
  const seenBillingHandoffKeys = Array.isArray(input.seenBillingHandoffKeys)
    ? (input.seenBillingHandoffKeys as readonly string[])
    : [];
  const billingClaim = claimAdsServingIdempotencyV1({
    kind: "billing_handoff",
    key: idempotencyKeysOutcome.keys.billingHandoffKey as string,
    seenKeys: seenBillingHandoffKeys,
    lifecycle: servingLifecycle,
  });

  if (!billingClaim.valid) {
    const billAdvance = advanceServingStage(
      servingLifecycle,
      "billing_handoff",
      "rejected",
      billingClaim.rejectionReason
    );
    if (billAdvance.valid) {
      servingLifecycle = billAdvance.lifecycle;
    }
    trace.push("bill", "rejected", "billing_ineligible", winnerId);
    billingEligible = false;
    chargeResult = null;
  } else if (!isChargeableEventType(eventType) || !fraudPassed) {
    const billAdvance = advanceServingStage(
      servingLifecycle,
      "billing_handoff",
      "rejected",
      "production_billing_disabled"
    );
    if (billAdvance.valid) {
      servingLifecycle = billAdvance.lifecycle;
    }
    trace.push("bill", "rejected", "billing_ineligible", winnerId);
    billingEligible = false;
    chargeResult = null;
  } else {
    const billingOutcome = evaluateAdsBilling({
      billableEvent: {
        eventId,
        candidateId: winnerId,
        campaignId: provenance.campaignRef,
        eventType,
        // Trust is stack-authoritative from fraud eligibility — never caller-supplied.
        trustLevel: "trusted",
      },
      pricing: input.pricing,
    });
    if (!billingOutcome.valid) {
      return {
        valid: false,
        issues: Object.freeze([
          ...billingOutcome.issues.map((issue) => `billing: ${issue}`),
        ]),
      };
    }
    billingResult = billingOutcome.result;
    billingEligible = billingOutcome.result.billingEligible;
    chargeResult = billingOutcome.result.chargeResult;
    if (!billingEligible) {
      const billAdvance = advanceServingStage(
        servingLifecycle,
        "billing_handoff",
        "rejected",
        "production_billing_disabled"
      );
      if (billAdvance.valid) {
        servingLifecycle = billAdvance.lifecycle;
      }
      trace.push("bill", "rejected", "billing_ineligible", winnerId);
      chargeResult = null;
    } else {
      servingLifecycle = applyAdsServingIdempotencyClaimV1({
        lifecycle: servingLifecycle,
        claim: billingClaim,
      });
      const billAdvance = advanceServingStage(
        servingLifecycle,
        "billing_handoff",
        "accepted",
        null,
        {
          idempotency: {
            billingHandoffKey: billingClaim.key,
          },
          billingHandoffAccepted: true,
        }
      );
      if (!billAdvance.valid) {
        return {
          valid: false,
          issues: Object.freeze([
            ...billAdvance.issues.map((issue) => `serving: ${issue}`),
          ]),
        };
      }
      servingLifecycle = billAdvance.lifecycle;
      trace.push("bill", "accepted", null, winnerId);
    }
  }

  // Foundation diagnostic acceptance only (Option B).
  // productionAccepted remains false while the delivery gate / kill switches
  // keep production closed — never an unqualified production acceptance.
  const stackAccepted = true;
  const pipelineStage: AdsCanonicalStackV1Stage = "result";
  const rejectionReason: AdsCanonicalStackV1RejectionReason | null = null;

  trace.push("result", "accepted", null, winnerId);

  const decisionTrace = trace.freeze(
    pipelineStage,
    stackAccepted,
    rejectionReason,
    winnerId
  );

  const result = freezeCanonicalResult({
    contractVersion: ADS_CANONICAL_STACK_V1_CONTRACT_VERSION,
    stackAccepted,
    stackRejected: false,
    productionAccepted: false,
    pipelineStage,
    rejectionReason,
    decisionTrace,
    deliveryGate,
    selectionResult: selectionOutcome.result,
    rankingResult: rankingOutcome.result,
    budgetResults: frozenBudgetResults,
    pacingResults: frozenPacingResults,
    frequencyResults: frozenFrequencyResults,
    auctionResult: auctionOutcome.result,
    fraudResult,
    selectionRenderAdapter: adapterResult,
    provenance,
    renderResult: renderOutcome.result,
    executionResult: executionOutcome.result,
    deliveryResult: deliveryOutcome.result,
    measurementPackage: measurementOutcome.package,
    billingEligible,
    billingResult,
    chargeResult: billingEligible ? chargeResult : null,
    servingLifecycle,
    authoritativeDecisionPath: true,
    productionEnabled: false,
    deliveryEnabled: false,
    executionEnabled: false,
    measurementEnabled: false,
    billingEnabled: false,
  });

  const validation = validateAdsCanonicalStackV1Result(result);
  if (!validation.valid) {
    return { valid: false, issues: Object.freeze([...validation.issues]) };
  }

  return { valid: true, result };
}

/**
 * Lists fixed canonical stack stages.
 */
export function listAdsCanonicalStackV1Stages(): readonly AdsCanonicalStackV1Stage[] {
  return Object.freeze([...ADS_CANONICAL_STACK_V1_STAGES]);
}
