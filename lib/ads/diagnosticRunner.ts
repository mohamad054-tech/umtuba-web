import { ADS_DELIVERY_ENABLED } from "./constants";
import type { AdsInventoryBridgeResult } from "./inventoryBridge";
import {
  ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
  type AdsCandidateSelectionInventory,
  type AdsSelectionCandidate,
} from "./platform/candidateSelection";
import {
  runAdsCanonicalStackV1,
  type AdsCanonicalStackV1Result,
} from "./platform/canonicalStack";
import type { AdsServingCorrelationV1 } from "./platform/servingFoundation";
import { getCanonicalPlacement } from "./platform/taxonomyMapper";

/**
 * Ads Diagnostic Runner V1 — pure contracts and helpers only.
 *
 * Execution authority lives in `diagnosticRunnerServer.ts` (server-only),
 * which performs DB-backed `assertPlatformAdminDb` before any inventory load.
 *
 * This module never:
 * - trusts caller-forged admin gates
 * - mutates the database
 * - enables delivery/billing
 * - renders ads to users
 */

export const ADS_DIAGNOSTIC_RUNNER_CONTRACT_VERSION = "v1" as const;

export const ADS_DIAGNOSTIC_RUNNER_AUTHORITY = {
  authoritativeDecisionPath: false,
  authoritativeProductionServing: false,
  productionAccepted: false,
  deliveryEnabled: false,
  billingEnabled: false,
  productionEnabled: false,
  mutatesDatabase: false,
  triggersMeasurementIngestion: false,
  triggersBilling: false,
  rendersAds: false,
} as const;

export const ADS_DIAGNOSTIC_CORRELATION_ID_MAX_LENGTH = 128;

/** Matches repository UUID policy used by nav/messaging helpers. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const CORRELATION_ID_RE = /^[A-Za-z0-9_.:-]+$/;

const REQUEST_ALLOWED = new Set([
  "contractVersion",
  "advertiserAccountId",
  "placement",
  "campaignId",
  "adSetId",
  "candidateLimit",
  "correlationId",
  "currentTimestamp",
]);

const FORBIDDEN_REQUEST_FIELDS = new Set([
  "platformAdminVerified",
  "adminUserId",
  "gate",
  "isAdmin",
  "inventory",
  "selectionInventory",
  "candidates",
  "canonicalResult",
]);

const MAX_CANDIDATE_LIMIT = 64;

export type AdsDiagnosticRequestV1 = Readonly<{
  contractVersion: typeof ADS_DIAGNOSTIC_RUNNER_CONTRACT_VERSION;
  advertiserAccountId: string;
  placement: string;
  campaignId?: string | null;
  adSetId?: string | null;
  /** Optional max candidates fed into the canonical stack (1–64). */
  candidateLimit?: number | null;
  /** Optional operator correlation / request id (validated charset/length). */
  correlationId?: string | null;
  currentTimestamp: string;
}>;

export type AdsDiagnosticLoadedCandidateV1 = Readonly<{
  candidateId: string;
  placementId: string;
  campaignRef: string;
  advertiserRef: string;
  adSetRef: string;
  adRef: string;
  creativeRef: string;
  creativeType: string;
  domainPlacement: string | null;
  moderationSnapshotRef: string | null;
  provenanceFingerprint: string | null;
  inventorySource: string | null;
}>;

export type AdsDiagnosticReportV1 = Readonly<{
  contractVersion: typeof ADS_DIAGNOSTIC_RUNNER_CONTRACT_VERSION;
  request: AdsDiagnosticRequestV1;
  adminUserId: string;
  correlationId: string;
  placementId: string;
  inventorySource: "inventory_bridge_v1";
  decisionEngine: "runAdsCanonicalStackV1";
  loadedCandidates: readonly AdsDiagnosticLoadedCandidateV1[];
  bridgeExclusionReasons: readonly string[];
  bridgeExcludedCount: number;
  scopedCandidateCount: number;
  canonicalOutcomeValid: boolean;
  canonicalIssues: readonly string[];
  canonicalResult: AdsCanonicalStackV1Result | null;
  decisionTrace: AdsCanonicalStackV1Result["decisionTrace"] | null;
  servingLifecycle: AdsCanonicalStackV1Result["servingLifecycle"] | null;
  eligibility: Readonly<{
    eligibleCandidateIds: readonly string[];
    rejected: readonly Readonly<{
      candidateId: string;
      reason: string;
    }>[];
  }>;
  rankingInputs: Readonly<{
    signalCandidateIds: readonly string[];
  }>;
  auctionInputs: Readonly<{
    winnerCandidateId: string | null;
    auctionAccepted: boolean | null;
  }>;
  fraudIvtDecision: Readonly<{
    trustLevel: string | null;
    fraudAccepted: boolean | null;
    rejectionReason: string | null;
  }>;
  renderEligibility: Readonly<{
    renderAccepted: boolean | null;
    rejectionReason: string | null;
  }>;
  deliveryGate: AdsCanonicalStackV1Result["deliveryGate"] | null;
  measurementHandoff: Readonly<{
    packagePresent: boolean;
    measurementEnabled: false;
    triggersIngestion: false;
  }>;
  billingHandoff: Readonly<{
    billingEligible: boolean;
    billingEnabled: false;
    triggersBilling: false;
    chargePresent: boolean;
  }>;
  finalCanonicalDecision: Readonly<{
    stackAccepted: boolean;
    stackRejected: boolean;
    pipelineStage: string | null;
    rejectionReason: string | null;
    candidateId: string | null;
  }>;
  rejectionReasons: readonly string[];
  provenance: AdsCanonicalStackV1Result["provenance"];
  correlation: AdsServingCorrelationV1 | null;
  authoritativeDecisionPath: false;
  authoritativeProductionServing: false;
  productionAccepted: false;
  deliveryEnabled: false;
  billingEnabled: false;
  productionEnabled: false;
  mutatesDatabase: false;
  triggersMeasurementIngestion: false;
  triggersBilling: false;
  rendersAds: false;
}>;

export type AdsDiagnosticRunnerOutcome =
  | Readonly<{ ok: true; report: AdsDiagnosticReportV1 }>
  | Readonly<{ ok: false; message: string; issues?: readonly string[] }>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAdsDiagnosticUuid(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value.trim()));
}

export function isAdsDiagnosticCorrelationId(
  value: string | null | undefined
): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  return (
    trimmed.length > 0 &&
    trimmed.length <= ADS_DIAGNOSTIC_CORRELATION_ID_MAX_LENGTH &&
    CORRELATION_ID_RE.test(trimmed)
  );
}

function freezeAuthority<T extends Record<string, unknown>>(
  value: T
): T & typeof ADS_DIAGNOSTIC_RUNNER_AUTHORITY {
  return Object.freeze({
    ...value,
    ...ADS_DIAGNOSTIC_RUNNER_AUTHORITY,
  });
}

/**
 * Parse + validate a diagnostic request. Server-authoritative shape only.
 * Rejects unknown fields and forgeable auth/inventory injection fields.
 */
export function parseAdsDiagnosticRequestV1(
  input: unknown
):
  | { ok: true; request: AdsDiagnosticRequestV1 }
  | { ok: false; message: string; issues: readonly string[] } {
  if (!isRecord(input)) {
    return {
      ok: false,
      message: "Diagnostic request must be an object.",
      issues: Object.freeze(["Diagnostic request must be an object."]),
    };
  }
  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (FORBIDDEN_REQUEST_FIELDS.has(key)) {
      issues.push(`Forbidden diagnostic request field "${key}".`);
      continue;
    }
    if (!REQUEST_ALLOWED.has(key)) {
      issues.push(`Unknown diagnostic request field "${key}".`);
    }
  }
  if (input.contractVersion !== ADS_DIAGNOSTIC_RUNNER_CONTRACT_VERSION) {
    issues.push(
      `contractVersion must be "${ADS_DIAGNOSTIC_RUNNER_CONTRACT_VERSION}".`
    );
  }
  if (
    typeof input.advertiserAccountId !== "string" ||
    !isAdsDiagnosticUuid(input.advertiserAccountId)
  ) {
    issues.push("advertiserAccountId must be a valid UUID.");
  }
  if (typeof input.placement !== "string" || input.placement.trim().length < 1) {
    issues.push("placement is required.");
  }
  if (
    typeof input.currentTimestamp !== "string" ||
    Number.isNaN(Date.parse(input.currentTimestamp))
  ) {
    issues.push("currentTimestamp must be a valid ISO timestamp.");
  }
  if (input.campaignId != null && input.campaignId !== "") {
    if (
      typeof input.campaignId !== "string" ||
      !isAdsDiagnosticUuid(input.campaignId)
    ) {
      issues.push("campaignId must be a valid UUID when provided.");
    }
  }
  if (input.adSetId != null && input.adSetId !== "") {
    if (
      typeof input.adSetId !== "string" ||
      !isAdsDiagnosticUuid(input.adSetId)
    ) {
      issues.push("adSetId must be a valid UUID when provided.");
    }
  }
  if (
    input.candidateLimit != null &&
    (typeof input.candidateLimit !== "number" ||
      !Number.isInteger(input.candidateLimit) ||
      input.candidateLimit < 1 ||
      input.candidateLimit > MAX_CANDIDATE_LIMIT)
  ) {
    issues.push(
      `candidateLimit must be an integer from 1 to ${MAX_CANDIDATE_LIMIT}.`
    );
  }
  if (input.correlationId != null && input.correlationId !== "") {
    if (
      typeof input.correlationId !== "string" ||
      !isAdsDiagnosticCorrelationId(input.correlationId)
    ) {
      issues.push(
        `correlationId must be 1–${ADS_DIAGNOSTIC_CORRELATION_ID_MAX_LENGTH} chars of [A-Za-z0-9_.:-].`
      );
    }
  }

  let placementId: string | null = null;
  if (typeof input.placement === "string" && input.placement.trim()) {
    try {
      placementId = getCanonicalPlacement(input.placement.trim());
    } catch {
      issues.push(`Unsupported placement "${input.placement}".`);
    }
  }

  if (issues.length > 0 || !placementId) {
    return {
      ok: false,
      message: issues[0] ?? "Invalid diagnostic request.",
      issues: Object.freeze(issues),
    };
  }

  return {
    ok: true,
    request: Object.freeze({
      contractVersion: ADS_DIAGNOSTIC_RUNNER_CONTRACT_VERSION,
      advertiserAccountId: String(input.advertiserAccountId).trim(),
      placement: String(input.placement).trim(),
      campaignId:
        typeof input.campaignId === "string" && input.campaignId.trim()
          ? input.campaignId.trim()
          : null,
      adSetId:
        typeof input.adSetId === "string" && input.adSetId.trim()
          ? input.adSetId.trim()
          : null,
      candidateLimit:
        typeof input.candidateLimit === "number" ? input.candidateLimit : null,
      correlationId:
        typeof input.correlationId === "string" && input.correlationId.trim()
          ? input.correlationId.trim()
          : null,
      currentTimestamp: String(input.currentTimestamp),
    }),
  };
}

function mapLoadedCandidate(
  candidate: AdsSelectionCandidate
): AdsDiagnosticLoadedCandidateV1 {
  const identity = candidate.provenanceIdentity;
  return Object.freeze({
    candidateId: candidate.candidateId,
    placementId: candidate.placementId,
    campaignRef: candidate.campaignRef,
    advertiserRef: candidate.advertiserRef,
    adSetRef: candidate.adSetRef,
    adRef: candidate.adRef,
    creativeRef: candidate.creativeRef,
    creativeType: candidate.creativeType,
    domainPlacement: identity?.domainPlacement ?? null,
    moderationSnapshotRef: identity?.moderationSnapshotRef ?? null,
    provenanceFingerprint: identity?.provenanceFingerprint ?? null,
    inventorySource: identity?.inventorySource ?? null,
  });
}

/**
 * Scope bridge selection inventory to the diagnostic request.
 * Inventory Bridge remains the sole inventory source.
 */
export function scopeDiagnosticSelectionInventory(input: {
  bridge: AdsInventoryBridgeResult;
  placementId: string;
  campaignId: string | null;
  adSetId: string | null;
  candidateLimit: number | null;
  sourceId: string;
}): AdsCandidateSelectionInventory {
  const filtered = input.bridge.selectionInventory.candidates.filter(
    (candidate) => {
      if (candidate.placementId !== input.placementId) return false;
      if (input.campaignId && candidate.campaignRef !== input.campaignId) {
        return false;
      }
      if (input.adSetId && candidate.adSetRef !== input.adSetId) {
        return false;
      }
      return true;
    }
  );
  const limited =
    input.candidateLimit != null
      ? filtered.slice(0, input.candidateLimit)
      : filtered;

  return Object.freeze({
    contractVersion: ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
    sourceId: input.sourceId,
    revision: input.bridge.selectionInventory.revision,
    candidates: Object.freeze([...limited]),
  });
}

function addHoursIso(timestamp: string, hours: number): string {
  const ms = Date.parse(timestamp);
  return new Date(ms + hours * 60 * 60 * 1000).toISOString();
}

/**
 * Build canonical-stack diagnostic scaffolding from scoped inventory.
 * Synthetic signals are inspection-only — never production authority.
 */
export function buildDiagnosticCanonicalStackInput(input: {
  inventory: AdsCandidateSelectionInventory;
  placementId: string;
  correlationId: string;
  currentTimestamp: string;
}): Record<string, unknown> {
  const candidates = input.inventory.candidates;
  const primary = candidates[0];
  const rankingSignals = candidates.map((candidate) =>
    Object.freeze({
      candidateId: candidate.candidateId,
      placementCompatible: true,
      creativeCompatible: true,
      policyEligible: true,
      deliveryEligible: true,
      qualityScore: 0.75,
      relevanceScore: 0.7,
      freshnessScore: 0.65,
    })
  );
  const budgetSnapshots = candidates.map((candidate) =>
    Object.freeze({
      candidateId: candidate.candidateId,
      dailyBudgetMinor: 10_000,
      lifetimeBudgetMinor: 100_000,
      remainingBudgetMinor: 5_000,
    })
  );
  const pacingSnapshots = candidates.map((candidate, index) =>
    Object.freeze({
      candidateId: candidate.candidateId,
      pacingState: "on_pace" as const,
      pacingWindow: Object.freeze({
        windowId: `diag-window-${index + 1}`,
        targetDeliveryFraction: 0.5,
        actualDeliveryFraction: 0.4,
      }),
    })
  );
  const frequencySnapshots = candidates.map((candidate) =>
    Object.freeze({
      candidateId: candidate.candidateId,
      campaignId: candidate.campaignRef,
      userExposureCount: 0,
      dailyExposureCount: 0,
      campaignExposureCount: 0,
      dailyCap: 10,
      lifetimeCap: 100,
      campaignCap: 50,
    })
  );

  const creativeType = primary?.creativeType === "image" ? "image" : "video";

  return {
    inventory: input.inventory,
    selectionContext: {
      placement: { placementId: input.placementId },
      countryCode: "US",
      languageCode: "en-US",
      platform: "web",
      deviceClass: "mobile",
      viewerAgeGatePassed: true,
      selectionRequestId: input.correlationId,
      evaluatedAt: input.currentTimestamp,
    },
    rankingSignals,
    budgetSnapshots,
    pacingSnapshots,
    frequencySnapshots,
    invalidTrafficSignals: {
      trustLevel: "trusted",
      reportingHandleValid: true,
      duplicateEvent: false,
      impossibleSequence: false,
      suspiciousImpression: false,
      suspiciousClick: false,
    },
    pricing: {
      pricingModel: "cpm",
      unitPriceMinor: 5_000,
      currency: "USD",
      quantity: 1,
    },
    creativeDescriptor: {
      creativeReference: primary?.creativeRef ?? "diag-creative-none",
      creativeType,
      mediaReference: "diag-media-ref",
      thumbnailReference: "diag-thumb-ref",
      clickDestinationReference: "diag-destination-ref",
    },
    impressionHandle: "diag-imp-handle-v1",
    clickHandle: "diag-clk-handle-v1",
    disclosureLabel: "Sponsored",
    cacheHints: {
      cacheable: false,
      maxAgeSeconds: null,
      cacheKey: null,
    },
    expiresAt: addHoursIso(input.currentTimestamp, 1),
    currentTimestamp: input.currentTimestamp,
    eventType: "impression",
    seenDedupeKeys: [],
    seenDeliveryAttemptKeys: [],
    seenBillingHandoffKeys: [],
  };
}

/** Assemble the inspection report after canonical execution. */
export function buildAdsDiagnosticReportV1(input: {
  request: AdsDiagnosticRequestV1;
  adminUserId: string;
  correlationId: string;
  placementId: string;
  bridge: AdsInventoryBridgeResult;
  scopedInventory: AdsCandidateSelectionInventory;
  canonicalOutcome: ReturnType<typeof runAdsCanonicalStackV1>;
}): AdsDiagnosticReportV1 {
  const result =
    input.canonicalOutcome.valid ? input.canonicalOutcome.result : null;
  const selection = result?.selectionResult ?? null;
  const rejectionReasons: string[] = [];
  if (!input.canonicalOutcome.valid) {
    rejectionReasons.push(...input.canonicalOutcome.issues);
  }
  if (result?.rejectionReason) {
    rejectionReasons.push(result.rejectionReason);
  }
  for (const reason of input.bridge.exclusionReasons) {
    rejectionReasons.push(`bridge:${reason}`);
  }
  if (selection) {
    for (const rejected of selection.rejectedCandidates) {
      rejectionReasons.push(
        `eligibility:${rejected.candidateId}:${rejected.reason}`
      );
    }
  }

  return freezeAuthority({
    contractVersion: ADS_DIAGNOSTIC_RUNNER_CONTRACT_VERSION,
    request: input.request,
    adminUserId: input.adminUserId,
    correlationId: input.correlationId,
    placementId: input.placementId,
    inventorySource: "inventory_bridge_v1" as const,
    decisionEngine: "runAdsCanonicalStackV1" as const,
    loadedCandidates: Object.freeze(
      input.scopedInventory.candidates.map(mapLoadedCandidate)
    ),
    bridgeExclusionReasons: input.bridge.exclusionReasons,
    bridgeExcludedCount: input.bridge.excludedCount,
    scopedCandidateCount: input.scopedInventory.candidates.length,
    canonicalOutcomeValid: input.canonicalOutcome.valid,
    canonicalIssues: Object.freeze(
      input.canonicalOutcome.valid ? [] : [...input.canonicalOutcome.issues]
    ),
    canonicalResult: result,
    decisionTrace: result?.decisionTrace ?? null,
    servingLifecycle: result?.servingLifecycle ?? null,
    eligibility: Object.freeze({
      eligibleCandidateIds: Object.freeze(
        selection
          ? selection.eligibleCandidates.map((c) => c.candidateId)
          : []
      ),
      rejected: Object.freeze(
        selection
          ? selection.rejectedCandidates.map((c) =>
              Object.freeze({
                candidateId: c.candidateId,
                reason: c.reason,
              })
            )
          : []
      ),
    }),
    rankingInputs: Object.freeze({
      signalCandidateIds: Object.freeze(
        input.scopedInventory.candidates.map((c) => c.candidateId)
      ),
    }),
    auctionInputs: Object.freeze({
      winnerCandidateId:
        result?.auctionResult?.auctionWinner?.candidateId ?? null,
      auctionAccepted:
        result?.auctionResult != null
          ? result.auctionResult.auctionWinner != null
          : null,
    }),
    fraudIvtDecision: Object.freeze({
      trustLevel: result?.fraudResult?.diagnostics.trustLevel ?? null,
      fraudAccepted: result?.fraudResult?.fraudEligible ?? null,
      rejectionReason: result?.fraudResult?.rejectionReason ?? null,
    }),
    renderEligibility: Object.freeze({
      renderAccepted: result?.renderResult?.renderAccepted ?? null,
      rejectionReason:
        result?.renderResult?.diagnostics.rejectionReason ?? null,
    }),
    deliveryGate: result?.deliveryGate ?? null,
    measurementHandoff: Object.freeze({
      packagePresent: result?.measurementPackage != null,
      measurementEnabled: false as const,
      triggersIngestion: false as const,
    }),
    billingHandoff: Object.freeze({
      billingEligible: result?.billingEligible ?? false,
      billingEnabled: false as const,
      triggersBilling: false as const,
      chargePresent: result?.chargeResult != null,
    }),
    finalCanonicalDecision: Object.freeze({
      stackAccepted: result?.stackAccepted ?? false,
      stackRejected: result?.stackRejected ?? !input.canonicalOutcome.valid,
      pipelineStage: result?.pipelineStage ?? null,
      rejectionReason: result?.rejectionReason ?? null,
      candidateId: result?.decisionTrace?.candidateId ?? null,
    }),
    rejectionReasons: Object.freeze([...rejectionReasons]),
    provenance: result?.provenance ?? null,
    correlation: result?.servingLifecycle?.correlation ?? null,
  });
}

/** Assert global delivery kill switch remains closed for diagnostics. */
export function assertDiagnosticDeliveryKillSwitchClosed():
  | { ok: true }
  | { ok: false; message: string; issues: readonly string[] } {
  if ((ADS_DELIVERY_ENABLED as boolean) === true) {
    return {
      ok: false,
      message: "Ad delivery is not enabled in this foundation release.",
      issues: Object.freeze([
        "ADS_DELIVERY_ENABLED must remain false for diagnostics.",
      ]),
    };
  }
  return { ok: true };
}

export function assertDiagnosticReportNonAuthoritative(
  report: AdsDiagnosticReportV1
): { ok: true } | { ok: false; message: string } {
  if (report.productionAccepted !== false) {
    return {
      ok: false,
      message: "Diagnostic runner refused a production-accepted outcome.",
    };
  }
  if (report.deliveryEnabled !== false || report.billingEnabled !== false) {
    return {
      ok: false,
      message: "Diagnostic runner refused an enabled delivery/billing outcome.",
    };
  }
  if (report.authoritativeDecisionPath !== false) {
    return {
      ok: false,
      message: "Diagnostic report must not claim decision-path authority.",
    };
  }
  return { ok: true };
}

export function resolveDiagnosticCorrelationId(input: {
  request: AdsDiagnosticRequestV1;
  adminUserId: string;
  placementId: string;
}): string {
  if (input.request.correlationId) {
    return input.request.correlationId;
  }
  // Server-generated — UUID + placement keep charset/length safe.
  return `diag.${input.adminUserId}.${input.placementId}`;
}
