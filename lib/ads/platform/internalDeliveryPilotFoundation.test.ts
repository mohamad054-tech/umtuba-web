import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
  createEmptyInventory,
  type AdsCandidateMetadata,
} from "./candidateInventory";
import {
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
  type AdsDeliveryRequest,
} from "./deliveryContracts";
import {
  ADS_ELIGIBILITY_ACTIVE_STATUS,
  ADS_ELIGIBILITY_DELIVERY_FLAG_KEY,
  type AdsEligibilityCandidateState,
} from "./eligibilityRules";
import {
  createEmptyAdsExecutionResult,
  runAdsExecutionLayer,
  type AdsExecutionResult,
} from "./executionLayer";
import {
  ADS_INTERNAL_DELIVERY_PILOT_CONTRACT_VERSION,
  ADS_INTERNAL_DELIVERY_PILOT_FAILURE_REASONS,
  ADS_INTERNAL_DELIVERY_PILOT_INPUT_ALLOWED_FIELDS,
  ADS_INTERNAL_DELIVERY_PILOT_RESULT_ALLOWED_FIELDS,
  createEmptyAdsInternalDeliveryPilotResult,
  runInternalDeliveryPilot,
  validateAdsInternalDeliveryPilotResult,
} from "./internalDeliveryPilotFoundation";
import { ADS_PLACEMENT_REGISTRY } from "./placementRegistry";
import type { AdsRenderDescriptor } from "./renderDescriptor";
import type { AdsRenderMaterial } from "./serveBoundary";

const SOURCE_PATH = path.join(__dirname, "internalDeliveryPilotFoundation.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

const NOW = "2026-07-22T12:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const EXPIRES = "2026-07-22T13:00:00.000Z";
const GENERATED_AT = "2026-07-22T11:00:00.000Z";

function inventoryCandidate(
  overrides: Partial<AdsCandidateMetadata> &
    Pick<AdsCandidateMetadata, "candidateId">
): Record<string, unknown> {
  const id = overrides.candidateId;
  return {
    candidateId: id,
    campaignRef: overrides.campaignRef ?? `campaign-ref-${id}`,
    adSetRef: overrides.adSetRef ?? `ad-set-ref-${id}`,
    adRef: overrides.adRef ?? `ad-ref-${id}`,
    creativeRef: overrides.creativeRef ?? `creative-ref-${id}`,
    placement: overrides.placement ?? "WATCH_FEED",
    creativeType: overrides.creativeType ?? "video",
    eligibilitySnapshot: overrides.eligibilitySnapshot ?? {
      snapshotRef: `eligibility-snapshot-${id}`,
      revision: 1,
    },
    inventorySource: overrides.inventorySource ?? "catalog",
    revision: overrides.revision ?? 1,
    timestamps: overrides.timestamps ?? {
      createdAt: "2026-07-22T10:00:00.000Z",
      updatedAt: "2026-07-22T10:30:00.000Z",
    },
  };
}

function baseInventory(
  candidates: Record<string, unknown>[] = [
    inventoryCandidate({ candidateId: "candidate-1" }),
  ]
): Record<string, unknown> {
  return {
    contractVersion: ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
    inventoryId: "inventory-1",
    revision: 1,
    generatedAt: GENERATED_AT,
    candidates,
  };
}

function eligibilityState(
  overrides: Partial<AdsEligibilityCandidateState> & { candidateId: string }
): AdsEligibilityCandidateState {
  const id = overrides.candidateId;
  return {
    candidateId: id,
    campaignId: overrides.campaignId ?? `campaign-${id}`,
    adSetId: overrides.adSetId ?? `ad-set-${id}`,
    adId: overrides.adId ?? `ad-${id}`,
    creativeId: overrides.creativeId ?? `creative-${id}`,
    placementId: overrides.placementId ?? "WATCH_FEED",
    campaignStatus: overrides.campaignStatus ?? ADS_ELIGIBILITY_ACTIVE_STATUS,
    adSetStatus: overrides.adSetStatus ?? ADS_ELIGIBILITY_ACTIVE_STATUS,
    adStatus: overrides.adStatus ?? ADS_ELIGIBILITY_ACTIVE_STATUS,
    campaignStartsAt: overrides.campaignStartsAt ?? "2026-07-01T00:00:00.000Z",
    campaignEndsAt:
      overrides.campaignEndsAt === undefined
        ? "2026-08-01T00:00:00.000Z"
        : overrides.campaignEndsAt,
    adSetStartsAt: overrides.adSetStartsAt ?? "2026-07-01T00:00:00.000Z",
    adSetEndsAt:
      overrides.adSetEndsAt === undefined
        ? "2026-08-01T00:00:00.000Z"
        : overrides.adSetEndsAt,
    budgetExhausted: overrides.budgetExhausted ?? false,
    creativePresent: overrides.creativePresent ?? true,
    creativeApproved: overrides.creativeApproved ?? true,
    policyBlocked: overrides.policyBlocked ?? false,
    targetedCountryCodes: overrides.targetedCountryCodes ?? ["US"],
    targetedLanguageCodes: overrides.targetedLanguageCodes ?? ["en"],
    audienceMatched: overrides.audienceMatched ?? true,
  };
}

function enabledFlagsFor(placementId: string): Record<string, boolean> {
  const flagKey =
    ADS_PLACEMENT_REGISTRY[placementId as keyof typeof ADS_PLACEMENT_REGISTRY]
      .featureFlag.key;
  return {
    [ADS_ELIGIBILITY_DELIVERY_FLAG_KEY]: true,
    [flagKey]: true,
  };
}

function baseRequest(
  candidateIds: readonly string[],
  overrides: Partial<AdsDeliveryRequest> = {}
): AdsDeliveryRequest {
  return {
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    placementId: "WATCH_FEED",
    candidates: candidateIds.map((id) => ({
      candidateId: id,
      campaignId: `campaign-${id}`,
      adSetId: `ad-set-${id}`,
      adId: `ad-${id}`,
      creativeId: `creative-${id}`,
    })),
    viewer: { opaqueViewerId: "viewer-opaque-1" },
    geo: { countryCode: "US" },
    languageCode: "en-US",
    deviceClass: "mobile",
    featureFlags: {
      [ADS_ELIGIBILITY_DELIVERY_FLAG_KEY]: false,
      ADS_PLACEMENT_WATCH_FEED_ENABLED: false,
    },
    currentTimestamp: NOW,
    ...overrides,
  };
}

function renderMaterialFor(
  candidateId: string,
  overrides: Partial<AdsRenderMaterial> = {}
): AdsRenderMaterial {
  return Object.freeze({
    candidateId,
    creativeReference:
      overrides.creativeReference ?? `creative-ref-${candidateId}`,
    mediaReference: overrides.mediaReference ?? `media-ref-${candidateId}`,
    thumbnailReference:
      overrides.thumbnailReference === undefined
        ? null
        : overrides.thumbnailReference,
    clickDestinationReference:
      overrides.clickDestinationReference ?? `destination-ref-${candidateId}`,
    impressionHandle: overrides.impressionHandle ?? `imp-${candidateId}`,
    clickHandle: overrides.clickHandle ?? `clk-${candidateId}`,
    ...(overrides.trackingReferences !== undefined
      ? { trackingReferences: overrides.trackingReferences }
      : {}),
    disclosureLabel: overrides.disclosureLabel ?? "Sponsored",
    cacheHints: overrides.cacheHints ?? {
      cacheable: false,
      maxAgeSeconds: null,
      cacheKey: null,
    },
    expiresAt: overrides.expiresAt ?? EXPIRES,
  });
}

function successfulExecutionResult(): AdsExecutionResult {
  const outcome = runAdsExecutionLayer({
    inventory: baseInventory([
      inventoryCandidate({ candidateId: "candidate-1" }),
    ]),
    request: baseRequest(["candidate-1"], {
      featureFlags: enabledFlagsFor("WATCH_FEED"),
    }),
    eligibilityStates: [eligibilityState({ candidateId: "candidate-1" })],
    renderMaterial: renderMaterialFor("candidate-1"),
  });
  expect(outcome.valid).toBe(true);
  if (!outcome.valid) {
    throw new Error("expected successful execution");
  }
  return outcome.result;
}

describe("Ads Internal Delivery Pilot Foundation", () => {
  it("exposes contract version and allowed fields", () => {
    expect(ADS_INTERNAL_DELIVERY_PILOT_CONTRACT_VERSION).toBe("v1");
    expect([...ADS_INTERNAL_DELIVERY_PILOT_INPUT_ALLOWED_FIELDS]).toEqual([
      "executionResult",
    ]);
    expect(ADS_INTERNAL_DELIVERY_PILOT_RESULT_ALLOWED_FIELDS).toContain(
      "pilotSuccess"
    );
    expect(ADS_INTERNAL_DELIVERY_PILOT_RESULT_ALLOWED_FIELDS).toContain(
      "served"
    );
    expect(ADS_INTERNAL_DELIVERY_PILOT_FAILURE_REASONS).toContain(
      "empty_pipeline"
    );
  });

  it("completes a successful internal pilot without serving", () => {
    const executionResult = successfulExecutionResult();
    expect(executionResult.selectedCandidateId).toBe("candidate-1");
    expect(executionResult.renderDescriptor).not.toBeNull();

    const outcome = runInternalDeliveryPilot(
      { executionResult },
      { nowMs: NOW_MS }
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.pilotSuccess).toBe(true);
    expect(outcome.result.selectedCandidateId).toBe("candidate-1");
    expect(outcome.result.renderDescriptor).toEqual(
      executionResult.renderDescriptor
    );
    expect(outcome.result.reason).toBeNull();
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.served).toBe(false);
  });

  it("soft-fails an empty pipeline", () => {
    const empty = createEmptyAdsExecutionResult();
    const outcome = runInternalDeliveryPilot({ executionResult: empty });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result).toEqual(createEmptyAdsInternalDeliveryPilotResult());
    expect(outcome.result.pilotSuccess).toBe(false);
    expect(outcome.result.reason).toBe("empty_pipeline");
    expect(outcome.result.renderDescriptor).toBeNull();
    expect(outcome.result.selectedCandidateId).toBeNull();
    expect(outcome.result.served).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.productionEnabled).toBe(false);
  });

  it("soft-fails when selected without render descriptor", () => {
    const outcome = runAdsExecutionLayer({
      inventory: baseInventory([
        inventoryCandidate({ candidateId: "candidate-1" }),
      ]),
      request: baseRequest(["candidate-1"], {
        featureFlags: enabledFlagsFor("WATCH_FEED"),
      }),
      eligibilityStates: [eligibilityState({ candidateId: "candidate-1" })],
      renderMaterial: null,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.selectedCandidateId).toBe("candidate-1");
    expect(outcome.result.renderDescriptor).toBeNull();

    const pilot = runInternalDeliveryPilot(
      { executionResult: outcome.result },
      { nowMs: NOW_MS }
    );
    expect(pilot.valid).toBe(true);
    if (!pilot.valid) return;
    expect(pilot.result.pilotSuccess).toBe(false);
    expect(pilot.result.reason).toBe("missing_render_descriptor");
    expect(pilot.result.renderDescriptor).toBeNull();
    expect(pilot.result.selectedCandidateId).toBe("candidate-1");
    expect(pilot.result.served).toBe(false);
  });

  it("rejects an invalid render descriptor", () => {
    const executionResult = successfulExecutionResult();
    const descriptor = executionResult.renderDescriptor;
    expect(descriptor).not.toBeNull();
    if (!descriptor) return;

    const invalidDescriptor = {
      ...descriptor,
      mediaReference: "https://cdn.example.com/video.mp4",
    } as AdsRenderDescriptor;

    const tampered = {
      ...executionResult,
      renderDescriptor: invalidDescriptor,
    };

    const outcome = runInternalDeliveryPilot(
      { executionResult: tampered },
      { nowMs: NOW_MS }
    );
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some(
        (issue) =>
          issue.includes("Invalid render descriptor") ||
          issue.includes("Inconsistent execution result") ||
          issue.includes("not a URL")
      )
    ).toBe(true);
  });

  it("rejects an invalid selected candidate id", () => {
    const executionResult = successfulExecutionResult();
    const tampered = {
      ...executionResult,
      selectedCandidateId: "not-in-selectable-set",
    };

    const outcome = runInternalDeliveryPilot(
      { executionResult: tampered },
      { nowMs: NOW_MS }
    );
    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) =>
        issue.includes("Inconsistent execution result")
      )
    ).toBe(true);
  });

  it("rejects unknown fields and non-execution inputs", () => {
    expect(runInternalDeliveryPilot(null).valid).toBe(false);
    expect(
      runInternalDeliveryPilot({
        executionResult: createEmptyAdsExecutionResult(),
        inventory: createEmptyInventory({ generatedAt: GENERATED_AT }),
      }).valid
    ).toBe(false);
    expect(
      runInternalDeliveryPilot({
        candidates: [{ candidateId: "raw" }],
      }).valid
    ).toBe(false);
  });

  it("rejects productionEnabled, deliveryEnabled, or served being true", () => {
    expect(
      validateAdsInternalDeliveryPilotResult({
        ...createEmptyAdsInternalDeliveryPilotResult(),
        productionEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsInternalDeliveryPilotResult({
        ...createEmptyAdsInternalDeliveryPilotResult(),
        deliveryEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsInternalDeliveryPilotResult({
        ...createEmptyAdsInternalDeliveryPilotResult(),
        served: true,
      }).valid
    ).toBe(false);
  });

  it("produces deterministic frozen output without mutating inputs", () => {
    const executionResult = successfulExecutionResult();
    const input = { executionResult };
    const snapshot = structuredClone(input);

    const first = runInternalDeliveryPilot(input, { nowMs: NOW_MS });
    const second = runInternalDeliveryPilot(input, { nowMs: NOW_MS });
    expect(first.valid && second.valid).toBe(true);
    if (!first.valid || !second.valid) return;

    expect(first.result).toEqual(second.result);
    expect(Object.isFrozen(first.result)).toBe(true);
    expect(first.result.served).toBe(false);
    expect(first.result.deliveryEnabled).toBe(false);
    expect(first.result.productionEnabled).toBe(false);
    expect(input).toEqual(snapshot);
  });

  it("keeps served, deliveryEnabled, and productionEnabled false on success", () => {
    const outcome = runInternalDeliveryPilot(
      { executionResult: successfulExecutionResult() },
      { nowMs: NOW_MS }
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.served).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.renderDescriptor?.productionEnabled).toBe(false);
  });

  it("validateAdsInternalDeliveryPilotResult accepts empty and rejects malformed", () => {
    expect(
      validateAdsInternalDeliveryPilotResult(
        createEmptyAdsInternalDeliveryPilotResult()
      )
    ).toEqual({ valid: true });
    expect(validateAdsInternalDeliveryPilotResult(null).valid).toBe(false);
    expect(
      validateAdsInternalDeliveryPilotResult({
        ...createEmptyAdsInternalDeliveryPilotResult(),
        extra: true,
      }).valid
    ).toBe(false);
  });

  it("has no product wiring, database, network, or rendering", () => {
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|live|store|world|messenger|games|learning|search|notifications)(\/|["'])/i
    );
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*supabase[^"']*["']|require\(["'][^"']*supabase|createClient\s*\(/i
    );
    expect(SOURCE).not.toMatch(/\bfetch\s*\(|\baxios\b/);
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/ADS_DELIVERY_ENABLED\s*=\s*true/);
    expect(SOURCE).not.toMatch(
      /\brankCandidates\b|\brunAuction\b|\bpacing\b|\bbilling\b|renderCreative|serveAd\b/i
    );
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/served: false/);
    expect(SOURCE).toMatch(/runInternalDeliveryPilot/);
    expect(SOURCE).toMatch(/validateAdsExecutionResult/);
  });
});
