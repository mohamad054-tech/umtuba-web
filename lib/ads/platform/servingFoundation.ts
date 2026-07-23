import type { ContractValidationResult } from "./creativeContracts";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";

/**
 * Ads Production Serving Foundation V1 — contracts only.
 *
 * Defines authoritative serving lifecycle stages, fail-closed state
 * transitions, correlation / provenance, idempotency handoff keys,
 * deterministic rejection reasons, structured diagnostics, and
 * environment / kill-switch gates for production-serving readiness.
 *
 * This module is NOT a second pipeline and NEVER authorizes production
 * delivery or billing. Sole authoritative public decision entrypoint:
 *   `runAdsCanonicalStackV1`
 *
 * Kill switches remain closed:
 *   productionDeliveryEnabled / productionBillingEnabled /
 *   productionAccepted are always false.
 *
 * Diagnostics may run. No result from this module may claim production
 * acceptance or manufacture an alternate authoritative decision path.
 *
 * Never renders, networks, writes DB, moves money, or enables production.
 */

export const ADS_SERVING_FOUNDATION_CONTRACT_VERSION = "v1" as const;

/**
 * Sole authoritative public decision entrypoint for Ads production decisions.
 * Serving foundation helpers cannot replace or peer this entrypoint.
 */
export const ADS_SERVING_AUTHORITATIVE_ENTRYPOINT =
  "runAdsCanonicalStackV1" as const;

/**
 * Authoritative serving lifecycle stages in required order.
 * Invalid stage ordering is rejected by the transition contract.
 */
export const ADS_SERVING_LIFECYCLE_STAGES = [
  "request_intake",
  "eligibility",
  "candidate_selection",
  "ranking",
  "auction",
  "fraud_ivt_decision",
  "render_eligibility",
  "delivery_attempt",
  "measurement_handoff",
  "billing_handoff",
] as const;

export type AdsServingLifecycleStage =
  (typeof ADS_SERVING_LIFECYCLE_STAGES)[number];

/**
 * Idempotency domains that must remain fail-closed under duplicates.
 */
export const ADS_SERVING_IDEMPOTENCY_KINDS = [
  "delivery_attempt",
  "measurement_event",
  "billing_handoff",
] as const;

export type AdsServingIdempotencyKind =
  (typeof ADS_SERVING_IDEMPOTENCY_KINDS)[number];

/**
 * Deterministic serving rejection reasons.
 * Order is documentation-stable; evaluation uses first-match where noted.
 */
export const ADS_SERVING_REJECTION_REASONS = [
  "invalid_stage_order",
  "stage_already_terminal",
  "missing_correlation",
  "provenance_mismatch",
  "duplicate_delivery_attempt",
  "duplicate_measurement_event",
  "duplicate_billing_handoff",
  "billing_before_delivery",
  "billing_before_measurement",
  "delivery_not_accepted",
  "measurement_not_accepted",
  "production_delivery_disabled",
  "production_billing_disabled",
  "environment_gate_closed",
  "kill_switch_closed",
] as const;

export type AdsServingRejectionReason =
  (typeof ADS_SERVING_REJECTION_REASONS)[number];

export const ADS_SERVING_CORRELATION_ALLOWED_FIELDS = [
  "servingRequestId",
  "correlationId",
  "decisionId",
  "selectionRequestId",
  "placementId",
] as const;

export const ADS_SERVING_PROVENANCE_ALLOWED_FIELDS = [
  "candidateId",
  "campaignRef",
  "advertiserRef",
  "adSetRef",
  "adRef",
  "creativeRef",
] as const;

export const ADS_SERVING_IDEMPOTENCY_ALLOWED_FIELDS = [
  "deliveryAttemptKey",
  "measurementEventKey",
  "billingHandoffKey",
] as const;

export const ADS_SERVING_ENVIRONMENT_GATE_ALLOWED_FIELDS = [
  "diagnosticsEnabled",
  "productionDeliveryEnabled",
  "productionBillingEnabled",
  "productionAccepted",
  "rejectionReason",
] as const;

export const ADS_SERVING_STAGE_RECORD_ALLOWED_FIELDS = [
  "stage",
  "status",
  "rejectionReason",
  "sequence",
] as const;

export const ADS_SERVING_LIFECYCLE_ALLOWED_FIELDS = [
  "contractVersion",
  "currentStage",
  "terminal",
  "stages",
  "correlation",
  "provenance",
  "idempotency",
  "environmentGate",
  "diagnostics",
  "deliveryAccepted",
  "measurementAccepted",
  "billingHandoffAccepted",
  "authoritativeProductionServing",
  "productionAccepted",
  "productionEnabled",
  "deliveryEnabled",
  "billingEnabled",
] as const;

export const ADS_SERVING_DIAGNOSTICS_ALLOWED_FIELDS = [
  "lifecycleComplete",
  "lastTransitionValid",
  "lastRejectionReason",
  "idempotencyClaims",
  "stageCount",
] as const;

export type AdsServingCorrelationV1 = Readonly<{
  servingRequestId: string;
  correlationId: string;
  decisionId: string;
  selectionRequestId: string | null;
  placementId: string | null;
}>;

export type AdsServingProvenanceV1 = Readonly<{
  candidateId: string | null;
  campaignRef: string | null;
  advertiserRef: string | null;
  adSetRef: string | null;
  adRef: string | null;
  creativeRef: string | null;
}>;

export type AdsServingIdempotencyKeysV1 = Readonly<{
  deliveryAttemptKey: string | null;
  measurementEventKey: string | null;
  billingHandoffKey: string | null;
}>;

/**
 * Environment / kill-switch gate — production remains closed in V1.
 * Diagnostics may run; production acceptance is always false.
 */
export type AdsServingEnvironmentGateV1 = Readonly<{
  diagnosticsEnabled: true;
  productionDeliveryEnabled: false;
  productionBillingEnabled: false;
  productionAccepted: false;
  rejectionReason: AdsServingRejectionReason;
}>;

export type AdsServingStageRecordV1 = Readonly<{
  stage: AdsServingLifecycleStage;
  status: "accepted" | "rejected" | "skipped";
  rejectionReason: AdsServingRejectionReason | null;
  sequence: number;
}>;

export type AdsServingDiagnosticsV1 = Readonly<{
  lifecycleComplete: boolean;
  lastTransitionValid: boolean;
  lastRejectionReason: AdsServingRejectionReason | null;
  idempotencyClaims: Readonly<{
    deliveryAttempt: boolean;
    measurementEvent: boolean;
    billingHandoff: boolean;
  }>;
  stageCount: number;
}>;

/**
 * Serving lifecycle artifact. Never claims production serving authority.
 * Canonical stack attaches this for correlation / ordering / idempotency;
 * only `runAdsCanonicalStackV1` remains the authoritative decision path.
 */
export type AdsServingLifecycleV1 = Readonly<{
  contractVersion: typeof ADS_SERVING_FOUNDATION_CONTRACT_VERSION;
  currentStage: AdsServingLifecycleStage | null;
  terminal: boolean;
  stages: readonly AdsServingStageRecordV1[];
  correlation: AdsServingCorrelationV1;
  provenance: AdsServingProvenanceV1;
  idempotency: AdsServingIdempotencyKeysV1;
  environmentGate: AdsServingEnvironmentGateV1;
  diagnostics: AdsServingDiagnosticsV1;
  deliveryAccepted: boolean;
  measurementAccepted: boolean;
  billingHandoffAccepted: boolean;
  /** Always false — this module cannot authorize production serving. */
  authoritativeProductionServing: false;
  productionAccepted: false;
  productionEnabled: false;
  deliveryEnabled: false;
  billingEnabled: false;
}>;

export type AdsServingTransitionOutcome =
  | Readonly<{ valid: true; lifecycle: AdsServingLifecycleV1 }>
  | Readonly<{
      valid: false;
      issues: readonly string[];
      rejectionReason: AdsServingRejectionReason;
      lifecycle: AdsServingLifecycleV1;
    }>;

export type AdsServingIdempotencyClaimOutcome =
  | Readonly<{
      valid: true;
      kind: AdsServingIdempotencyKind;
      key: string;
      /** Diagnostic claim only — never production-authoritative. */
      diagnosticClaimAccepted: true;
      authoritativeClaim: false;
      productionAccepted: false;
    }>
  | Readonly<{
      valid: false;
      kind: AdsServingIdempotencyKind;
      key: string;
      diagnosticClaimAccepted: false;
      authoritativeClaim: false;
      productionAccepted: false;
      rejectionReason: AdsServingRejectionReason;
      issues: readonly string[];
    }>;

const STAGE_SET = new Set<string>(ADS_SERVING_LIFECYCLE_STAGES);
const REJECTION_SET = new Set<string>(ADS_SERVING_REJECTION_REASONS);
const IDEMPOTENCY_KIND_SET = new Set<string>(ADS_SERVING_IDEMPOTENCY_KINDS);
const LIFECYCLE_ALLOWED = new Set<string>(ADS_SERVING_LIFECYCLE_ALLOWED_FIELDS);
const STAGE_INDEX = new Map<AdsServingLifecycleStage, number>(
  ADS_SERVING_LIFECYCLE_STAGES.map((stage, index) => [stage, index])
);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoundedId(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    value.trim().length <= ADS_DELIVERY_MAX_ID_LENGTH &&
    value === value.trim()
  );
}

function freezeEnvironmentGate(
  rejectionReason: AdsServingRejectionReason = "environment_gate_closed"
): AdsServingEnvironmentGateV1 {
  return Object.freeze({
    diagnosticsEnabled: true as const,
    productionDeliveryEnabled: false as const,
    productionBillingEnabled: false as const,
    productionAccepted: false as const,
    rejectionReason,
  });
}

function freezeProvenance(
  provenance: AdsServingProvenanceV1
): AdsServingProvenanceV1 {
  return Object.freeze({
    candidateId: provenance.candidateId,
    campaignRef: provenance.campaignRef,
    advertiserRef: provenance.advertiserRef,
    adSetRef: provenance.adSetRef,
    adRef: provenance.adRef,
    creativeRef: provenance.creativeRef,
  });
}

function freezeIdempotency(
  keys: AdsServingIdempotencyKeysV1
): AdsServingIdempotencyKeysV1 {
  return Object.freeze({
    deliveryAttemptKey: keys.deliveryAttemptKey,
    measurementEventKey: keys.measurementEventKey,
    billingHandoffKey: keys.billingHandoffKey,
  });
}

function freezeCorrelation(
  correlation: AdsServingCorrelationV1
): AdsServingCorrelationV1 {
  return Object.freeze({
    servingRequestId: correlation.servingRequestId,
    correlationId: correlation.correlationId,
    decisionId: correlation.decisionId,
    selectionRequestId: correlation.selectionRequestId,
    placementId: correlation.placementId,
  });
}

function freezeLifecycle(
  lifecycle: AdsServingLifecycleV1
): AdsServingLifecycleV1 {
  return Object.freeze({
    contractVersion: ADS_SERVING_FOUNDATION_CONTRACT_VERSION,
    currentStage: lifecycle.currentStage,
    terminal: lifecycle.terminal,
    stages: Object.freeze(
      lifecycle.stages.map((stage) =>
        Object.freeze({
          stage: stage.stage,
          status: stage.status,
          rejectionReason: stage.rejectionReason,
          sequence: stage.sequence,
        })
      )
    ),
    correlation: freezeCorrelation(lifecycle.correlation),
    provenance: freezeProvenance(lifecycle.provenance),
    idempotency: freezeIdempotency(lifecycle.idempotency),
    environmentGate: freezeEnvironmentGate(
      lifecycle.environmentGate.rejectionReason
    ),
    diagnostics: Object.freeze({
      lifecycleComplete: lifecycle.diagnostics.lifecycleComplete,
      lastTransitionValid: lifecycle.diagnostics.lastTransitionValid,
      lastRejectionReason: lifecycle.diagnostics.lastRejectionReason,
      idempotencyClaims: Object.freeze({
        deliveryAttempt: lifecycle.diagnostics.idempotencyClaims.deliveryAttempt,
        measurementEvent:
          lifecycle.diagnostics.idempotencyClaims.measurementEvent,
        billingHandoff: lifecycle.diagnostics.idempotencyClaims.billingHandoff,
      }),
      stageCount: lifecycle.diagnostics.stageCount,
    }),
    deliveryAccepted: lifecycle.deliveryAccepted,
    measurementAccepted: lifecycle.measurementAccepted,
    billingHandoffAccepted: lifecycle.billingHandoffAccepted,
    authoritativeProductionServing: false as const,
    productionAccepted: false as const,
    productionEnabled: false as const,
    deliveryEnabled: false as const,
    billingEnabled: false as const,
  });
}

/**
 * Builds deterministic correlation identifiers for one serving request.
 * Never uses wall-clock entropy — callers supply stable request ids.
 */
export function buildAdsServingCorrelationV1(input: {
  servingRequestId: string;
  selectionRequestId?: string | null;
  placementId?: string | null;
}):
  | { valid: true; correlation: AdsServingCorrelationV1 }
  | { valid: false; issues: readonly string[] } {
  const issues: string[] = [];
  if (!isBoundedId(input.servingRequestId)) {
    issues.push(
      "servingRequestId is required and must be a non-empty bounded string."
    );
  }
  if (
    input.selectionRequestId !== undefined &&
    input.selectionRequestId !== null &&
    !isBoundedId(input.selectionRequestId)
  ) {
    issues.push("selectionRequestId must be null or a bounded string.");
  }
  if (
    input.placementId !== undefined &&
    input.placementId !== null &&
    !isBoundedId(input.placementId)
  ) {
    issues.push("placementId must be null or a bounded string.");
  }
  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  const servingRequestId = input.servingRequestId.trim();
  const selectionRequestId =
    input.selectionRequestId === undefined || input.selectionRequestId === null
      ? null
      : input.selectionRequestId.trim();
  const placementId =
    input.placementId === undefined || input.placementId === null
      ? null
      : input.placementId.trim();

  return {
    valid: true,
    correlation: freezeCorrelation({
      servingRequestId,
      correlationId: `srv-corr:${ADS_SERVING_FOUNDATION_CONTRACT_VERSION}:${servingRequestId}`,
      decisionId: `srv-dec:${ADS_SERVING_FOUNDATION_CONTRACT_VERSION}:${servingRequestId}`,
      selectionRequestId,
      placementId,
    }),
  };
}

/**
 * Builds deterministic idempotency keys for delivery / measurement / billing.
 */
export function buildAdsServingIdempotencyKeysV1(input: {
  correlationId: string;
  candidateId: string;
  eventType: string;
  reportingHandle: string;
}):
  | { valid: true; keys: AdsServingIdempotencyKeysV1 }
  | { valid: false; issues: readonly string[] } {
  const issues: string[] = [];
  if (!isBoundedId(input.correlationId)) {
    issues.push("correlationId is required.");
  }
  if (!isBoundedId(input.candidateId)) {
    issues.push("candidateId is required.");
  }
  if (!isNonEmptyString(input.eventType)) {
    issues.push("eventType is required.");
  }
  if (!isBoundedId(input.reportingHandle)) {
    issues.push("reportingHandle is required.");
  }
  if (issues.length > 0) {
    return { valid: false, issues: Object.freeze([...issues]) };
  }

  const base = [
    ADS_SERVING_FOUNDATION_CONTRACT_VERSION,
    input.correlationId.trim(),
    input.candidateId.trim(),
    input.eventType.trim(),
    input.reportingHandle.trim(),
  ].join(":");

  return {
    valid: true,
    keys: freezeIdempotency({
      deliveryAttemptKey: `delivery:${base}`,
      measurementEventKey: `measurement:${base}`,
      billingHandoffKey: `billing:${base}`,
    }),
  };
}

/**
 * Evaluates environment / kill-switch gate. Production remains closed.
 */
export function evaluateAdsServingEnvironmentGateV1(): AdsServingEnvironmentGateV1 {
  return freezeEnvironmentGate("production_delivery_disabled");
}

/**
 * Creates an empty serving lifecycle bound to correlation identifiers.
 */
export function createAdsServingLifecycleV1(input: {
  correlation: AdsServingCorrelationV1;
  provenance?: AdsServingProvenanceV1;
}):
  | { valid: true; lifecycle: AdsServingLifecycleV1 }
  | { valid: false; issues: readonly string[] } {
  if (!isRecord(input) || !isRecord(input.correlation)) {
    return {
      valid: false,
      issues: Object.freeze(["correlation is required."]),
    };
  }
  const correlationBuild = buildAdsServingCorrelationV1({
    servingRequestId: input.correlation.servingRequestId,
    selectionRequestId: input.correlation.selectionRequestId,
    placementId: input.correlation.placementId,
  });
  if (!correlationBuild.valid) {
    return correlationBuild;
  }
  // Preserve built correlation ids when caller already minted them.
  const correlation = freezeCorrelation({
    servingRequestId: input.correlation.servingRequestId,
    correlationId: isBoundedId(input.correlation.correlationId)
      ? input.correlation.correlationId
      : correlationBuild.correlation.correlationId,
    decisionId: isBoundedId(input.correlation.decisionId)
      ? input.correlation.decisionId
      : correlationBuild.correlation.decisionId,
    selectionRequestId: input.correlation.selectionRequestId ?? null,
    placementId: input.correlation.placementId ?? null,
  });

  const provenance = freezeProvenance({
    candidateId: input.provenance?.candidateId ?? null,
    campaignRef: input.provenance?.campaignRef ?? null,
    advertiserRef: input.provenance?.advertiserRef ?? null,
    adSetRef: input.provenance?.adSetRef ?? null,
    adRef: input.provenance?.adRef ?? null,
    creativeRef: input.provenance?.creativeRef ?? null,
  });

  return {
    valid: true,
    lifecycle: freezeLifecycle({
      contractVersion: ADS_SERVING_FOUNDATION_CONTRACT_VERSION,
      currentStage: null,
      terminal: false,
      stages: Object.freeze([]),
      correlation,
      provenance,
      idempotency: freezeIdempotency({
        deliveryAttemptKey: null,
        measurementEventKey: null,
        billingHandoffKey: null,
      }),
      environmentGate: evaluateAdsServingEnvironmentGateV1(),
      diagnostics: Object.freeze({
        lifecycleComplete: false,
        lastTransitionValid: true,
        lastRejectionReason: null,
        idempotencyClaims: Object.freeze({
          deliveryAttempt: false,
          measurementEvent: false,
          billingHandoff: false,
        }),
        stageCount: 0,
      }),
      deliveryAccepted: false,
      measurementAccepted: false,
      billingHandoffAccepted: false,
      authoritativeProductionServing: false,
      productionAccepted: false,
      productionEnabled: false,
      deliveryEnabled: false,
      billingEnabled: false,
    }),
  };
}

function expectedNextStage(
  currentStage: AdsServingLifecycleStage | null
): AdsServingLifecycleStage | null {
  if (currentStage === null) {
    return "request_intake";
  }
  const index = STAGE_INDEX.get(currentStage);
  if (index === undefined) {
    return null;
  }
  if (index >= ADS_SERVING_LIFECYCLE_STAGES.length - 1) {
    return null;
  }
  return ADS_SERVING_LIFECYCLE_STAGES[index + 1] ?? null;
}

/**
 * Asserts a proposed stage transition is in required order.
 */
export function assertAdsServingStageTransitionV1(params: {
  currentStage: AdsServingLifecycleStage | null;
  nextStage: AdsServingLifecycleStage;
  terminal?: boolean;
}): ContractValidationResult {
  if (params.terminal === true) {
    return {
      valid: false,
      issues: Object.freeze([
        "Serving lifecycle is terminal; no further transitions are allowed.",
      ]),
    };
  }
  if (!STAGE_SET.has(params.nextStage)) {
    return {
      valid: false,
      issues: Object.freeze([`Unknown serving stage "${params.nextStage}".`]),
    };
  }
  const expected = expectedNextStage(params.currentStage);
  if (expected === null) {
    return {
      valid: false,
      issues: Object.freeze([
        "Serving lifecycle has no valid next stage (already complete or invalid).",
      ]),
    };
  }
  if (params.nextStage !== expected) {
    return {
      valid: false,
      issues: Object.freeze([
        `Invalid stage order: expected "${expected}" after "${params.currentStage ?? "∅"}", got "${params.nextStage}".`,
      ]),
    };
  }
  return { valid: true };
}

/**
 * Applies one ordered serving-stage transition. Rejects reorder / skip.
 */
export function transitionAdsServingStageV1(params: {
  lifecycle: AdsServingLifecycleV1;
  stage: AdsServingLifecycleStage;
  status: AdsServingStageRecordV1["status"];
  rejectionReason?: AdsServingRejectionReason | null;
  provenance?: Partial<AdsServingProvenanceV1>;
  idempotency?: Partial<AdsServingIdempotencyKeysV1>;
  deliveryAccepted?: boolean;
  measurementAccepted?: boolean;
  billingHandoffAccepted?: boolean;
}): AdsServingTransitionOutcome {
  const orderCheck = assertAdsServingStageTransitionV1({
    currentStage: params.lifecycle.currentStage,
    nextStage: params.stage,
    terminal: params.lifecycle.terminal,
  });
  if (!orderCheck.valid) {
    const rejected = freezeLifecycle({
      ...params.lifecycle,
      terminal: true,
      diagnostics: Object.freeze({
        ...params.lifecycle.diagnostics,
        lastTransitionValid: false,
        lastRejectionReason: "invalid_stage_order",
        stageCount: params.lifecycle.stages.length,
      }),
      authoritativeProductionServing: false,
      productionAccepted: false,
      productionEnabled: false,
      deliveryEnabled: false,
      billingEnabled: false,
    });
    return {
      valid: false,
      issues: Object.freeze([...orderCheck.issues]),
      rejectionReason: "invalid_stage_order",
      lifecycle: rejected,
    };
  }

  if (
    params.rejectionReason !== undefined &&
    params.rejectionReason !== null &&
    !REJECTION_SET.has(params.rejectionReason)
  ) {
    return {
      valid: false,
      issues: Object.freeze(["rejectionReason is not a serving rejection reason."]),
      rejectionReason: "invalid_stage_order",
      lifecycle: params.lifecycle,
    };
  }

  const sequence = params.lifecycle.stages.length + 1;
  const stageRecord = Object.freeze({
    stage: params.stage,
    status: params.status,
    rejectionReason: params.rejectionReason ?? null,
    sequence,
  });

  // Rejected paths and the final billing handoff are terminal.
  // Intermediate "skipped" (e.g. fraud for non-chargeable events) may continue.
  const terminal =
    params.status === "rejected" || params.stage === "billing_handoff";

  const next = freezeLifecycle({
    contractVersion: ADS_SERVING_FOUNDATION_CONTRACT_VERSION,
    currentStage: params.stage,
    terminal,
    stages: Object.freeze([...params.lifecycle.stages, stageRecord]),
    correlation: params.lifecycle.correlation,
    provenance: freezeProvenance({
      candidateId:
        params.provenance?.candidateId ?? params.lifecycle.provenance.candidateId,
      campaignRef:
        params.provenance?.campaignRef ?? params.lifecycle.provenance.campaignRef,
      advertiserRef:
        params.provenance?.advertiserRef ??
        params.lifecycle.provenance.advertiserRef,
      adSetRef: params.provenance?.adSetRef ?? params.lifecycle.provenance.adSetRef,
      adRef: params.provenance?.adRef ?? params.lifecycle.provenance.adRef,
      creativeRef:
        params.provenance?.creativeRef ?? params.lifecycle.provenance.creativeRef,
    }),
    idempotency: freezeIdempotency({
      deliveryAttemptKey:
        params.idempotency?.deliveryAttemptKey ??
        params.lifecycle.idempotency.deliveryAttemptKey,
      measurementEventKey:
        params.idempotency?.measurementEventKey ??
        params.lifecycle.idempotency.measurementEventKey,
      billingHandoffKey:
        params.idempotency?.billingHandoffKey ??
        params.lifecycle.idempotency.billingHandoffKey,
    }),
    environmentGate: evaluateAdsServingEnvironmentGateV1(),
    diagnostics: Object.freeze({
      lifecycleComplete:
        params.stage === "billing_handoff" && params.status === "accepted",
      lastTransitionValid: true,
      lastRejectionReason: params.rejectionReason ?? null,
      idempotencyClaims: params.lifecycle.diagnostics.idempotencyClaims,
      stageCount: sequence,
    }),
    deliveryAccepted:
      params.deliveryAccepted ?? params.lifecycle.deliveryAccepted,
    measurementAccepted:
      params.measurementAccepted ?? params.lifecycle.measurementAccepted,
    billingHandoffAccepted:
      params.billingHandoffAccepted ?? params.lifecycle.billingHandoffAccepted,
    authoritativeProductionServing: false,
    productionAccepted: false,
    productionEnabled: false,
    deliveryEnabled: false,
    billingEnabled: false,
  });

  return { valid: true, lifecycle: next };
}

/**
 * Fail-closed idempotency claim for delivery / measurement / billing handoffs.
 * Duplicates never become authoritative or billable. Production claim is always
 * false even on first diagnostic acceptance.
 */
export function claimAdsServingIdempotencyV1(params: {
  kind: AdsServingIdempotencyKind;
  key: string;
  seenKeys?: readonly string[];
  lifecycle: AdsServingLifecycleV1;
}): AdsServingIdempotencyClaimOutcome {
  if (!IDEMPOTENCY_KIND_SET.has(params.kind)) {
    return {
      valid: false,
      kind: params.kind,
      key: params.key,
      diagnosticClaimAccepted: false,
      authoritativeClaim: false,
      productionAccepted: false,
      rejectionReason: "kill_switch_closed",
      issues: Object.freeze(["Unknown idempotency kind."]),
    };
  }
  if (!isBoundedId(params.key)) {
    return {
      valid: false,
      kind: params.kind,
      key: String(params.key ?? ""),
      diagnosticClaimAccepted: false,
      authoritativeClaim: false,
      productionAccepted: false,
      rejectionReason: "missing_correlation",
      issues: Object.freeze(["Idempotency key must be a bounded non-empty string."]),
    };
  }

  const seen = params.seenKeys ?? [];
  if (seen.includes(params.key)) {
    const rejectionReason: AdsServingRejectionReason =
      params.kind === "delivery_attempt"
        ? "duplicate_delivery_attempt"
        : params.kind === "measurement_event"
          ? "duplicate_measurement_event"
          : "duplicate_billing_handoff";
    return {
      valid: false,
      kind: params.kind,
      key: params.key,
      diagnosticClaimAccepted: false,
      authoritativeClaim: false,
      productionAccepted: false,
      rejectionReason,
      issues: Object.freeze([
        `Duplicate ${params.kind} key "${params.key}" cannot become authoritative.`,
      ]),
    };
  }

  if (params.kind === "measurement_event" && !params.lifecycle.deliveryAccepted) {
    return {
      valid: false,
      kind: params.kind,
      key: params.key,
      diagnosticClaimAccepted: false,
      authoritativeClaim: false,
      productionAccepted: false,
      rejectionReason: "delivery_not_accepted",
      issues: Object.freeze([
        "Measurement handoff requires an accepted delivery attempt.",
      ]),
    };
  }

  if (params.kind === "billing_handoff") {
    if (!params.lifecycle.deliveryAccepted) {
      return {
        valid: false,
        kind: params.kind,
        key: params.key,
        diagnosticClaimAccepted: false,
        authoritativeClaim: false,
        productionAccepted: false,
        rejectionReason: "billing_before_delivery",
        issues: Object.freeze([
          "Billing handoff cannot occur before accepted delivery.",
        ]),
      };
    }
    if (!params.lifecycle.measurementAccepted) {
      return {
        valid: false,
        kind: params.kind,
        key: params.key,
        diagnosticClaimAccepted: false,
        authoritativeClaim: false,
        productionAccepted: false,
        rejectionReason: "billing_before_measurement",
        issues: Object.freeze([
          "Billing handoff cannot occur before accepted measurement.",
        ]),
      };
    }
    if (params.lifecycle.environmentGate.productionBillingEnabled !== false) {
      return {
        valid: false,
        kind: params.kind,
        key: params.key,
        diagnosticClaimAccepted: false,
        authoritativeClaim: false,
        productionAccepted: false,
        rejectionReason: "production_billing_disabled",
        issues: Object.freeze(["Production billing kill switch must remain closed."]),
      };
    }
  }

  if (
    params.kind === "delivery_attempt" &&
    params.lifecycle.environmentGate.productionDeliveryEnabled !== false
  ) {
    return {
      valid: false,
      kind: params.kind,
      key: params.key,
      diagnosticClaimAccepted: false,
      authoritativeClaim: false,
      productionAccepted: false,
      rejectionReason: "production_delivery_disabled",
      issues: Object.freeze(["Production delivery kill switch must remain closed."]),
    };
  }

  return {
    valid: true,
    kind: params.kind,
    key: params.key,
    diagnosticClaimAccepted: true,
    authoritativeClaim: false,
    productionAccepted: false,
  };
}

/**
 * Marks an idempotency claim on the lifecycle (diagnostic only).
 */
export function applyAdsServingIdempotencyClaimV1(params: {
  lifecycle: AdsServingLifecycleV1;
  claim: Extract<AdsServingIdempotencyClaimOutcome, { valid: true }>;
}): AdsServingLifecycleV1 {
  const claims = {
    deliveryAttempt:
      params.claim.kind === "delivery_attempt"
        ? true
        : params.lifecycle.diagnostics.idempotencyClaims.deliveryAttempt,
    measurementEvent:
      params.claim.kind === "measurement_event"
        ? true
        : params.lifecycle.diagnostics.idempotencyClaims.measurementEvent,
    billingHandoff:
      params.claim.kind === "billing_handoff"
        ? true
        : params.lifecycle.diagnostics.idempotencyClaims.billingHandoff,
  };

  const idempotency = freezeIdempotency({
    deliveryAttemptKey:
      params.claim.kind === "delivery_attempt"
        ? params.claim.key
        : params.lifecycle.idempotency.deliveryAttemptKey,
    measurementEventKey:
      params.claim.kind === "measurement_event"
        ? params.claim.key
        : params.lifecycle.idempotency.measurementEventKey,
    billingHandoffKey:
      params.claim.kind === "billing_handoff"
        ? params.claim.key
        : params.lifecycle.idempotency.billingHandoffKey,
  });

  return freezeLifecycle({
    ...params.lifecycle,
    idempotency,
    diagnostics: Object.freeze({
      ...params.lifecycle.diagnostics,
      idempotencyClaims: Object.freeze(claims),
    }),
    deliveryAccepted:
      params.claim.kind === "delivery_attempt"
        ? true
        : params.lifecycle.deliveryAccepted,
    measurementAccepted:
      params.claim.kind === "measurement_event"
        ? true
        : params.lifecycle.measurementAccepted,
    billingHandoffAccepted:
      params.claim.kind === "billing_handoff"
        ? true
        : params.lifecycle.billingHandoffAccepted,
    authoritativeProductionServing: false,
    productionAccepted: false,
    productionEnabled: false,
    deliveryEnabled: false,
    billingEnabled: false,
  });
}

/**
 * Asserts kill switches / environment gates cannot be bypassed.
 */
export function assertAdsServingKillSwitchesClosedV1(
  gate: unknown
): ContractValidationResult {
  if (!isRecord(gate)) {
    return {
      valid: false,
      issues: Object.freeze(["environmentGate must be an object."]),
    };
  }
  const issues: string[] = [];
  if (gate.diagnosticsEnabled !== true) {
    issues.push("diagnosticsEnabled must be true.");
  }
  if (gate.productionDeliveryEnabled !== false) {
    issues.push("productionDeliveryEnabled must be false (kill switch closed).");
  }
  if (gate.productionBillingEnabled !== false) {
    issues.push("productionBillingEnabled must be false (kill switch closed).");
  }
  if (gate.productionAccepted !== false) {
    issues.push("productionAccepted must be false (no production acceptance).");
  }
  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Pure shape validator for serving lifecycle artifacts.
 */
export function validateAdsServingLifecycleV1(
  input: unknown
): ContractValidationResult {
  if (!isRecord(input)) {
    return {
      valid: false,
      issues: Object.freeze(["Serving lifecycle must be an object."]),
    };
  }

  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!LIFECYCLE_ALLOWED.has(key)) {
      issues.push(`Serving lifecycle contains unknown field "${key}".`);
    }
  }
  if (input.contractVersion !== ADS_SERVING_FOUNDATION_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_SERVING_FOUNDATION_CONTRACT_VERSION}".`
    );
  }
  if (input.authoritativeProductionServing !== false) {
    issues.push(
      "authoritativeProductionServing must be false (serving foundation is not an authority path)."
    );
  }
  if (input.productionAccepted !== false) {
    issues.push("productionAccepted must be false.");
  }
  if (input.productionEnabled !== false) {
    issues.push("productionEnabled must be false.");
  }
  if (input.deliveryEnabled !== false) {
    issues.push("deliveryEnabled must be false.");
  }
  if (input.billingEnabled !== false) {
    issues.push("billingEnabled must be false.");
  }
  if (
    input.currentStage !== null &&
    (typeof input.currentStage !== "string" || !STAGE_SET.has(input.currentStage))
  ) {
    issues.push("currentStage must be null or a serving lifecycle stage.");
  }
  if (typeof input.terminal !== "boolean") {
    issues.push("terminal must be a boolean.");
  }
  if (!Array.isArray(input.stages)) {
    issues.push("stages must be an array.");
  } else {
    let previousIndex = -1;
    for (let i = 0; i < input.stages.length; i += 1) {
      const stage = input.stages[i];
      if (!isRecord(stage)) {
        issues.push(`stages[${i}] must be an object.`);
        continue;
      }
      if (typeof stage.stage !== "string" || !STAGE_SET.has(stage.stage)) {
        issues.push(`stages[${i}].stage is invalid.`);
        continue;
      }
      const index = STAGE_INDEX.get(stage.stage as AdsServingLifecycleStage) ?? -1;
      if (index !== previousIndex + 1) {
        issues.push(
          `stages[${i}] violates required serving order (cannot reorder or skip).`
        );
      }
      previousIndex = index;
      if (stage.sequence !== i + 1) {
        issues.push(`stages[${i}].sequence must equal ${i + 1}.`);
      }
    }
  }

  const gateCheck = assertAdsServingKillSwitchesClosedV1(input.environmentGate);
  if (!gateCheck.valid) {
    issues.push(...gateCheck.issues);
  }

  if (!isRecord(input.correlation)) {
    issues.push("correlation must be an object.");
  } else if (!isBoundedId(input.correlation.correlationId)) {
    issues.push("correlation.correlationId is required.");
  }

  if (
    input.billingHandoffAccepted === true &&
    (input.deliveryAccepted !== true || input.measurementAccepted !== true)
  ) {
    issues.push(
      "billingHandoffAccepted requires deliveryAccepted and measurementAccepted."
    );
  }

  return issues.length === 0
    ? { valid: true }
    : { valid: false, issues: Object.freeze([...issues]) };
}

/**
 * Lists fixed serving lifecycle stages.
 */
export function listAdsServingLifecycleStagesV1(): readonly AdsServingLifecycleStage[] {
  return Object.freeze([...ADS_SERVING_LIFECYCLE_STAGES]);
}
