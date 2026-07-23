import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_CANDIDATE_INVENTORY_CONTRACT_VERSION,
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
  runAdsExecutionLayer,
  runInternalDeliveryPilot,
  type AdsInternalDeliveryPilotResult,
} from "./compatibility";
import {
  ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
  ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER,
  ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL,
  prepareAdsMeasurementFoundation,
  type AdsMeasurementFoundationPackage,
} from "./measurementFoundation";
import {
  ADS_MEASUREMENT_PIPELINE_CONTRACT_VERSION,
  ADS_MEASUREMENT_PIPELINE_INPUT_ALLOWED_FIELDS,
  ADS_MEASUREMENT_PIPELINE_RESULT_ALLOWED_FIELDS,
  ADS_MEASUREMENT_PIPELINE_STAGES,
  ADS_VIEWABILITY_MIN_IN_VIEW_RATIO,
  ADS_VIEWABILITY_MIN_VISIBLE_MS,
  meetsAdsViewabilityThreshold,
  normalizeAdsMeasurementPackage,
  runAdsClickMeasurementPipeline,
  runAdsImpressionMeasurementPipeline,
  runAdsMeasurementPipeline,
  runAdsViewabilityMeasurementPipeline,
  validateAdsMeasurementPipelineResult,
  validateAdsViewabilitySignal,
} from "./measurementPipeline";
import { ADS_PLACEMENT_REGISTRY } from "./placementRegistry";
import type { AdsRenderMaterial } from "./serveBoundary";

const SOURCE_PATH = path.join(__dirname, "measurementPipeline.ts");
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

function successfulPilotResult(): AdsInternalDeliveryPilotResult {
  const execution = runAdsExecutionLayer({
    inventory: baseInventory([
      inventoryCandidate({ candidateId: "candidate-1" }),
    ]),
    request: baseRequest(["candidate-1"], {
      featureFlags: enabledFlagsFor("WATCH_FEED"),
    }),
    eligibilityStates: [eligibilityState({ candidateId: "candidate-1" })],
    renderMaterial: renderMaterialFor("candidate-1"),
  });
  expect(execution.valid).toBe(true);
  if (!execution.valid) {
    throw new Error("expected successful execution");
  }

  const pilot = runInternalDeliveryPilot(
    { executionResult: execution.result },
    { nowMs: NOW_MS }
  );
  expect(pilot.valid).toBe(true);
  if (!pilot.valid) {
    throw new Error("expected successful pilot");
  }
  expect(pilot.result.pilotSuccess).toBe(true);
  expect(pilot.result.served).toBe(false);
  return pilot.result;
}

function validFoundationPackage(
  eventType: AdsMeasurementFoundationPackage["eventType"] = "impression"
): AdsMeasurementFoundationPackage {
  const pilotResult = successfulPilotResult();
  const outcome = prepareAdsMeasurementFoundation(
    { pilotResult, eventType },
    { nowMs: NOW_MS }
  );
  expect(outcome.valid).toBe(true);
  if (!outcome.valid) {
    throw new Error("expected valid measurement foundation package");
  }
  return outcome.package;
}

describe("Ads Measurement Pipeline V1", () => {
  it("exposes contract version, stages, and allowed fields", () => {
    expect(ADS_MEASUREMENT_PIPELINE_CONTRACT_VERSION).toBe("v1");
    expect([...ADS_MEASUREMENT_PIPELINE_STAGES]).toEqual([
      "validate",
      "normalize",
      "deduplicate",
      "result",
    ]);
    expect([...ADS_MEASUREMENT_PIPELINE_INPUT_ALLOWED_FIELDS]).toEqual([
      "measurementPackage",
      "seenDedupeKeys",
    ]);
    expect(ADS_MEASUREMENT_PIPELINE_RESULT_ALLOWED_FIELDS).toContain(
      "measurementAccepted"
    );
    expect(ADS_MEASUREMENT_PIPELINE_RESULT_ALLOWED_FIELDS).toContain(
      "measurementRejected"
    );
    expect(ADS_MEASUREMENT_PIPELINE_RESULT_ALLOWED_FIELDS).toContain(
      "normalizedPackage"
    );
    expect(ADS_MEASUREMENT_PIPELINE_RESULT_ALLOWED_FIELDS).toContain(
      "pipelineStage"
    );
    expect(ADS_MEASUREMENT_PIPELINE_RESULT_ALLOWED_FIELDS).toContain(
      "productionEnabled"
    );
    expect(ADS_MEASUREMENT_PIPELINE_RESULT_ALLOWED_FIELDS).toContain(
      "measurementEnabled"
    );
  });

  it("accepts a valid measurement foundation package", () => {
    const measurementPackage = validFoundationPackage("impression");
    const outcome = runAdsMeasurementPipeline({ measurementPackage });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.measurementAccepted).toBe(true);
    expect(outcome.result.measurementRejected).toBe(false);
    expect(outcome.result.pipelineStage).toBe("result");
    expect(outcome.result.normalizedPackage).toEqual(measurementPackage);
    expect(outcome.result.normalizedPackage?.eventType).toBe("impression");
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.measurementEnabled).toBe(false);
    expect(validateAdsMeasurementPipelineResult(outcome.result)).toEqual({
      valid: true,
    });
  });

  it("rejects a duplicate package at the deduplicate stage", () => {
    const measurementPackage = validFoundationPackage("click");
    const first = runAdsMeasurementPipeline({ measurementPackage });
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    expect(first.result.measurementAccepted).toBe(true);

    const duplicate = runAdsMeasurementPipeline({
      measurementPackage,
      seenDedupeKeys: [first.result.normalizedPackage!.dedupeKey],
    });
    expect(duplicate.valid).toBe(true);
    if (!duplicate.valid) return;
    expect(duplicate.result.measurementAccepted).toBe(false);
    expect(duplicate.result.measurementRejected).toBe(true);
    expect(duplicate.result.normalizedPackage).toBeNull();
    expect(duplicate.result.pipelineStage).toBe("deduplicate");
    expect(duplicate.result.productionEnabled).toBe(false);
    expect(duplicate.result.measurementEnabled).toBe(false);
  });

  it("rejects an invalid package at the validate stage", () => {
    const outcome = runAdsMeasurementPipeline({
      measurementPackage: null,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.measurementAccepted).toBe(false);
    expect(outcome.result.measurementRejected).toBe(true);
    expect(outcome.result.pipelineStage).toBe("validate");
    expect(outcome.result.normalizedPackage).toBeNull();

    const unknownFields = runAdsMeasurementPipeline({
      measurementPackage: {
        contractVersion: ADS_MEASUREMENT_FOUNDATION_CONTRACT_VERSION,
        measurementReady: true,
        eventType: "impression",
        dedupeKey: "v1:impression:candidate-1:imp-candidate-1",
        trustLevel: ADS_MEASUREMENT_FOUNDATION_TRUST_LEVEL,
        signaturePlaceholder: ADS_MEASUREMENT_FOUNDATION_SIGNATURE_PLACEHOLDER,
        productionEnabled: false,
        measurementEnabled: false,
        extra: true,
      },
    });
    expect(unknownFields.valid).toBe(true);
    if (!unknownFields.valid) return;
    expect(unknownFields.result.measurementRejected).toBe(true);
    expect(unknownFields.result.pipelineStage).toBe("validate");
  });

  it("rejects invalid trust and invalid signature placeholder", () => {
    const base = validFoundationPackage("impression");

    const badTrust = runAdsMeasurementPipeline({
      measurementPackage: {
        ...base,
        trustLevel: "trusted" as unknown as typeof base.trustLevel,
      },
    });
    expect(badTrust.valid).toBe(true);
    if (!badTrust.valid) return;
    expect(badTrust.result.measurementRejected).toBe(true);
    expect(badTrust.result.pipelineStage).toBe("validate");
    expect(badTrust.result.normalizedPackage).toBeNull();

    const badSignature = runAdsMeasurementPipeline({
      measurementPackage: {
        ...base,
        signaturePlaceholder:
          "signed" as unknown as typeof base.signaturePlaceholder,
      },
    });
    expect(badSignature.valid).toBe(true);
    if (!badSignature.valid) return;
    expect(badSignature.result.measurementRejected).toBe(true);
    expect(badSignature.result.pipelineStage).toBe("validate");
  });

  it("produces deterministic output", () => {
    const measurementPackage = validFoundationPackage("impression");
    const input = { measurementPackage };
    const first = runAdsMeasurementPipeline(input);
    const second = runAdsMeasurementPipeline(input);
    expect(first.valid && second.valid).toBe(true);
    if (!first.valid || !second.valid) return;
    expect(first.result).toEqual(second.result);
    expect(first.result.normalizedPackage).toEqual(
      second.result.normalizedPackage
    );
    expect(normalizeAdsMeasurementPackage(measurementPackage)).toEqual(
      first.result.normalizedPackage
    );
  });

  it("produces immutable output without mutating inputs", () => {
    const measurementPackage = validFoundationPackage("click");
    const input = {
      measurementPackage,
      seenDedupeKeys: ["other-key"],
    };
    const snapshot = structuredClone(input);

    const outcome = runAdsMeasurementPipeline(input);
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.normalizedPackage)).toBe(true);
    expect(input).toEqual(snapshot);
  });

  it("keeps measurementEnabled and productionEnabled false", () => {
    const measurementPackage = validFoundationPackage("impression");
    const accepted = runAdsMeasurementPipeline({ measurementPackage });
    expect(accepted.valid).toBe(true);
    if (!accepted.valid) return;
    expect(accepted.result.measurementEnabled).toBe(false);
    expect(accepted.result.productionEnabled).toBe(false);

    const rejected = runAdsMeasurementPipeline({
      measurementPackage,
      seenDedupeKeys: [measurementPackage.dedupeKey],
    });
    expect(rejected.valid).toBe(true);
    if (!rejected.valid) return;
    expect(rejected.result.measurementEnabled).toBe(false);
    expect(rejected.result.productionEnabled).toBe(false);
    expect(rejected.result.measurementRejected).toBe(true);
  });

  it("rejects unknown pipeline input fields and malformed input", () => {
    const measurementPackage = validFoundationPackage("impression");
    expect(
      runAdsMeasurementPipeline({
        measurementPackage,
        sink: true,
      }).valid
    ).toBe(false);
    expect(runAdsMeasurementPipeline(null).valid).toBe(false);
    expect(runAdsMeasurementPipeline({}).valid).toBe(false);
  });

  it("runs typed impression and click measurement paths", () => {
    const impression = validFoundationPackage("impression");
    const click = validFoundationPackage("click");

    const impressionOk = runAdsImpressionMeasurementPipeline({
      measurementPackage: impression,
    });
    expect(impressionOk.valid).toBe(true);
    if (!impressionOk.valid) return;
    expect(impressionOk.result.measurementAccepted).toBe(true);

    const impressionRejected = runAdsImpressionMeasurementPipeline({
      measurementPackage: click,
    });
    expect(impressionRejected.valid).toBe(true);
    if (!impressionRejected.valid) return;
    expect(impressionRejected.result.measurementRejected).toBe(true);
    expect(impressionRejected.result.pipelineStage).toBe("validate");

    const clickOk = runAdsClickMeasurementPipeline({
      measurementPackage: click,
    });
    expect(clickOk.valid).toBe(true);
    if (!clickOk.valid) return;
    expect(clickOk.result.measurementAccepted).toBe(true);
  });

  it("runs the viewability measurement path for qualified_view packages", () => {
    const viewPackage = validFoundationPackage("qualified_view");
    const signal = {
      inViewRatio: ADS_VIEWABILITY_MIN_IN_VIEW_RATIO,
      visibleMs: ADS_VIEWABILITY_MIN_VISIBLE_MS,
    };
    expect(validateAdsViewabilitySignal(signal)).toEqual({ valid: true });
    expect(meetsAdsViewabilityThreshold(signal)).toBe(true);

    const accepted = runAdsViewabilityMeasurementPipeline({
      measurementPackage: viewPackage,
      viewabilitySignal: signal,
    });
    expect(accepted.valid).toBe(true);
    if (!accepted.valid) return;
    expect(accepted.result.measurementAccepted).toBe(true);
    expect(accepted.result.normalizedPackage?.eventType).toBe("qualified_view");

    const belowThreshold = runAdsViewabilityMeasurementPipeline({
      measurementPackage: viewPackage,
      viewabilitySignal: { inViewRatio: 0.2, visibleMs: 100 },
    });
    expect(belowThreshold.valid).toBe(true);
    if (!belowThreshold.valid) return;
    expect(belowThreshold.result.measurementRejected).toBe(true);
    expect(belowThreshold.result.pipelineStage).toBe("validate");

    const wrongType = runAdsViewabilityMeasurementPipeline({
      measurementPackage: validFoundationPackage("impression"),
      viewabilitySignal: signal,
    });
    expect(wrongType.valid).toBe(true);
    if (!wrongType.valid) return;
    expect(wrongType.result.measurementRejected).toBe(true);
  });

  it("rejects malformed and out-of-range qualified_view signals fail-closed", () => {
    const viewPackage = validFoundationPackage("qualified_view");

    const malformedSignals = [
      { inViewRatio: Number.NaN, visibleMs: ADS_VIEWABILITY_MIN_VISIBLE_MS },
      {
        inViewRatio: Number.POSITIVE_INFINITY,
        visibleMs: ADS_VIEWABILITY_MIN_VISIBLE_MS,
      },
      { inViewRatio: 1.01, visibleMs: ADS_VIEWABILITY_MIN_VISIBLE_MS },
      { inViewRatio: -0.1, visibleMs: ADS_VIEWABILITY_MIN_VISIBLE_MS },
      { inViewRatio: ADS_VIEWABILITY_MIN_IN_VIEW_RATIO, visibleMs: -1 },
      { inViewRatio: ADS_VIEWABILITY_MIN_IN_VIEW_RATIO, visibleMs: 1000.5 },
    ] as const;

    for (const signal of malformedSignals) {
      expect(validateAdsViewabilitySignal(signal).valid).toBe(false);
      const outcome = runAdsViewabilityMeasurementPipeline({
        measurementPackage: viewPackage,
        viewabilitySignal: signal,
      });
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;
      expect(outcome.result.measurementRejected).toBe(true);
      expect(outcome.result.pipelineStage).toBe("validate");
      expect(outcome.result.normalizedPackage).toBeNull();
      expect(outcome.result.productionEnabled).toBe(false);
      expect(outcome.result.measurementEnabled).toBe(false);
    }
  });

  it("rejects insufficient qualified_view thresholds while accepting exact boundaries", () => {
    const viewPackage = validFoundationPackage("qualified_view");

    const insufficientPercentage = {
      inViewRatio: 0.49,
      visibleMs: ADS_VIEWABILITY_MIN_VISIBLE_MS,
    };
    expect(validateAdsViewabilitySignal(insufficientPercentage)).toEqual({
      valid: true,
    });
    expect(meetsAdsViewabilityThreshold(insufficientPercentage)).toBe(false);
    const lowRatio = runAdsViewabilityMeasurementPipeline({
      measurementPackage: viewPackage,
      viewabilitySignal: insufficientPercentage,
    });
    expect(lowRatio.valid).toBe(true);
    if (!lowRatio.valid) return;
    expect(lowRatio.result.measurementRejected).toBe(true);
    expect(lowRatio.result.pipelineStage).toBe("validate");

    const insufficientDuration = {
      inViewRatio: ADS_VIEWABILITY_MIN_IN_VIEW_RATIO,
      visibleMs: 999,
    };
    expect(validateAdsViewabilitySignal(insufficientDuration)).toEqual({
      valid: true,
    });
    expect(meetsAdsViewabilityThreshold(insufficientDuration)).toBe(false);
    const lowDuration = runAdsViewabilityMeasurementPipeline({
      measurementPackage: viewPackage,
      viewabilitySignal: insufficientDuration,
    });
    expect(lowDuration.valid).toBe(true);
    if (!lowDuration.valid) return;
    expect(lowDuration.result.measurementRejected).toBe(true);
    expect(lowDuration.result.pipelineStage).toBe("validate");

    const exactBoundary = {
      inViewRatio: 0.5,
      visibleMs: 1000,
    };
    expect(exactBoundary.inViewRatio).toBe(ADS_VIEWABILITY_MIN_IN_VIEW_RATIO);
    expect(exactBoundary.visibleMs).toBe(ADS_VIEWABILITY_MIN_VISIBLE_MS);
    expect(validateAdsViewabilitySignal(exactBoundary)).toEqual({ valid: true });
    expect(meetsAdsViewabilityThreshold(exactBoundary)).toBe(true);
    const atBoundary = runAdsViewabilityMeasurementPipeline({
      measurementPackage: viewPackage,
      viewabilitySignal: exactBoundary,
    });
    expect(atBoundary.valid).toBe(true);
    if (!atBoundary.valid) return;
    expect(atBoundary.result.measurementAccepted).toBe(true);
    expect(atBoundary.result.pipelineStage).toBe("result");
    expect(atBoundary.result.productionEnabled).toBe(false);
    expect(atBoundary.result.measurementEnabled).toBe(false);
  });

  it("has no storage, network, database, reporting, or product wiring", () => {
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
      /\brankCandidates\b|\brunAuction\b|\bpacing\b|renderCreative|serveAd\b/i
    );
    expect(SOURCE).not.toMatch(/\blocalStorage\b|\bindexedDB\b/);
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/measurementEnabled: false/);
    expect(SOURCE).toMatch(/runAdsMeasurementPipeline/);
    expect(SOURCE).toMatch(/runAdsViewabilityMeasurementPipeline/);
    expect(SOURCE).toMatch(/validateAdsMeasurementFoundationPackage/);
  });
});
