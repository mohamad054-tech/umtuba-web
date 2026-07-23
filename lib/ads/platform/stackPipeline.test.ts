import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertProvenanceMatchesDeliveryResult,
  buildAdsCandidateProvenanceBinding,
} from "./candidateProvenance";
import { ADS_CANDIDATE_SELECTION_CONTRACT_VERSION } from "./candidateSelection";
import {
  runAdsExecutionLayerV1,
  type AdsExecutionInternalResult,
} from "./executionLayer";
import {
  runInternalDeliveryPilotV1,
  type AdsInternalDeliveryInternalResult,
} from "./internalDeliveryPilot";
import { prepareAdsMeasurementFromDeliveryV1 } from "./measurementFoundation";
import {
  ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
  buildAdsRenderDescriptor,
} from "./renderDescriptor";
import {
  ADS_STACK_PIPELINE_V1_CONTRACT_VERSION,
  ADS_STACK_PIPELINE_V1_STAGES,
  listAdsStackPipelineV1Stages,
  runAdsStackPipelineV1,
  validateAdsStackPipelineV1Result,
} from "./stackPipeline";

const SOURCE_PATH = path.join(__dirname, "stackPipeline.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

const NOW = "2026-07-23T12:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const EXPIRES = "2026-07-23T13:00:00.000Z";
const EVALUATED_AT = "2026-07-23T10:00:00.000Z";

function baseEligibility(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    campaignActive: true,
    creativeActive: true,
    policyAllowed: true,
    requiresAgeGate: false,
    targetedCountryCodes: ["US"],
    targetedLanguageCodes: ["en"],
    targetedPlatforms: ["web", "ios", "android"],
    targetedDeviceClasses: ["mobile", "tablet", "desktop"],
    ...overrides,
  };
}

function baseCandidate(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    candidateId: "candidate-1",
    creativeRef: "creative-ref-1",
    creativeType: "video",
    placementId: "WATCH_FEED",
    campaignRef: "campaign-1",
    advertiserRef: "advertiser-1",
    adSetRef: "ad-set-1",
    adRef: "ad-1",
    eligibility: baseEligibility(),
    ...overrides,
  };
}

function baseInventory(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    contractVersion: ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
    sourceId: "injected-source-1",
    revision: 1,
    candidates: [baseCandidate()],
    ...overrides,
  };
}

function baseContext(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    placement: { placementId: "WATCH_FEED" },
    countryCode: "US",
    languageCode: "en-US",
    platform: "web",
    deviceClass: "mobile",
    viewerAgeGatePassed: true,
    selectionRequestId: "selection-req-1",
    evaluatedAt: EVALUATED_AT,
    ...overrides,
  };
}

function baseStackInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    inventory: baseInventory(),
    selectionContext: baseContext(),
    candidateId: "candidate-1",
    creativeDescriptor: {
      creativeReference: "creative-ref-1",
      creativeType: "video",
      mediaReference: "media-ref-1",
      thumbnailReference: "thumb-ref-1",
      clickDestinationReference: "destination-ref-1",
    },
    impressionHandle: "imp-handle-1",
    clickHandle: "clk-handle-1",
    disclosureLabel: "Sponsored",
    cacheHints: {
      cacheable: false,
      maxAgeSeconds: null,
      cacheKey: null,
    },
    expiresAt: EXPIRES,
    currentTimestamp: NOW,
    eventType: "impression",
    ...overrides,
  };
}

function issuedProvenanceForDescriptor() {
  const outcome = buildAdsCandidateProvenanceBinding({
    candidateId: "candidate-1",
    campaignRef: "campaign-1",
    advertiserRef: "advertiser-1",
    creativeRef: "creative-ref-1",
    placementId: "WATCH_FEED",
    adSetRef: "ad-set-1",
    adRef: "ad-1",
    selectionRequestId: "selection-req-1",
    inventorySourceId: "injected-source-1",
    inventoryRevision: 1,
  });
  if (!outcome.valid) {
    throw new Error(outcome.issues.join("; "));
  }
  return outcome.provenance;
}

describe("Ads Stack Pipeline V1 (canonical unification)", () => {
  it("exposes stable stages and prefers the V1 measurement path", () => {
    expect(listAdsStackPipelineV1Stages()).toEqual([
      "select",
      "adapt_selection_render",
      "render",
      "execute",
      "deliver",
      "measure",
      "result",
    ]);
    expect(ADS_STACK_PIPELINE_V1_STAGES).toEqual(
      listAdsStackPipelineV1Stages()
    );
    expect(SOURCE).toMatch(/runAdsCandidateSelection/);
    expect(SOURCE).toMatch(/adaptAdsSelectionToRenderEligible/);
    expect(SOURCE).toMatch(/runAdsRenderDescriptorPipeline/);
    expect(SOURCE).toMatch(/runAdsExecutionLayerV1/);
    expect(SOURCE).toMatch(/runInternalDeliveryPilotV1/);
    expect(SOURCE).toMatch(/prepareAdsMeasurementFromDeliveryV1/);
    expect(SOURCE).not.toMatch(/runAdsExecutionLayer\(/);
    expect(SOURCE).not.toMatch(/runInternalDeliveryPilot\(/);
    expect(SOURCE).not.toMatch(/prepareAdsMeasurementFoundation\(/);
  });

  it("runs the full canonical stack with mandatory measurement and kill switches off", () => {
    const outcome = runAdsStackPipelineV1(baseStackInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }

    expect(outcome.result.contractVersion).toBe(
      ADS_STACK_PIPELINE_V1_CONTRACT_VERSION
    );
    expect(outcome.result.stackAccepted).toBe(true);
    expect(outcome.result.stackRejected).toBe(false);
    expect(outcome.result.pipelineStage).toBe("result");
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.executionEnabled).toBe(false);
    expect(outcome.result.measurementEnabled).toBe(false);

    expect(outcome.result.provenance?.candidateId).toBe("candidate-1");
    expect(outcome.result.executionResult?.candidateId).toBe("candidate-1");
    expect(outcome.result.deliveryResult?.candidateId).toBe("candidate-1");
    expect(outcome.result.deliveryResult?.deliveryAccepted).toBe(true);
    expect(outcome.result.measurementPackage).not.toBeNull();
    expect(outcome.result.measurementPackage?.measurementReady).toBe(true);
    expect(outcome.result.measurementPackage?.eventType).toBe("impression");
    expect(outcome.result.measurementPackage?.measurementEnabled).toBe(false);

    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(validateAdsStackPipelineV1Result(outcome.result)).toEqual({
      valid: true,
    });
  });

  it("successful stack always produces a measurement package", () => {
    const outcome = runAdsStackPipelineV1(baseStackInput({ eventType: "click" }));
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.stackAccepted).toBe(true);
    expect(outcome.result.measurementPackage).not.toBeNull();
    expect(outcome.result.measurementPackage?.eventType).toBe("click");
  });

  it("missing measurement eventType fails closed", () => {
    const { eventType: _omit, ...withoutEvent } = baseStackInput();
    void _omit;
    expect(runAdsStackPipelineV1(withoutEvent).valid).toBe(false);
  });

  it("fails closed on unknown candidateId on the stack path", () => {
    const outcome = runAdsStackPipelineV1(
      baseStackInput({ candidateId: "unknown-candidate" })
    );
    expect(outcome.valid).toBe(false);
  });

  it("fails closed on rejected/non-eligible candidateId on the stack path", () => {
    const outcome = runAdsStackPipelineV1(
      baseStackInput({
        inventory: baseInventory({
          candidates: [
            baseCandidate({
              eligibility: baseEligibility({ campaignActive: false }),
            }),
          ],
        }),
      })
    );
    expect(outcome.valid).toBe(false);
  });

  it("is deterministic for identical inputs", () => {
    const input = baseStackInput();
    const first = runAdsStackPipelineV1(input);
    const second = runAdsStackPipelineV1(structuredClone(input));
    expect(first).toEqual(second);
  });

  it("does not mutate stack inputs", () => {
    const input = baseStackInput();
    const snapshot = structuredClone(input);
    runAdsStackPipelineV1(input);
    expect(input).toEqual(snapshot);
  });

  it("soft-rejects when render rejects without emitting delivery/measurement", () => {
    const outcome = runAdsStackPipelineV1(
      baseStackInput({
        creativeDescriptor: {
          creativeReference: "wrong-creative",
          creativeType: "video",
          mediaReference: "media-ref-1",
          thumbnailReference: "thumb-ref-1",
          clickDestinationReference: "destination-ref-1",
        },
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.stackAccepted).toBe(false);
    expect(outcome.result.pipelineStage).toBe("render");
    expect(outcome.result.deliveryResult).toBeNull();
    expect(outcome.result.measurementPackage).toBeNull();
    expect(Object.isFrozen(outcome.result)).toBe(true);
  });

  it("fails closed on unknown fields and caller adSetRef/adRef", () => {
    expect(
      runAdsStackPipelineV1({
        ...baseStackInput(),
        auctionBid: 1,
      }).valid
    ).toBe(false);
    expect(
      runAdsStackPipelineV1({
        ...baseStackInput(),
        adSetRef: "hijack",
        adRef: "hijack",
      }).valid
    ).toBe(false);
  });

  it("delivery provenance mismatch fails closed", () => {
    const provenance = issuedProvenanceForDescriptor();
    const mismatchedCarrier: AdsInternalDeliveryInternalResult = {
      contractVersion: "v1",
      deliveryAccepted: true,
      deliveryRejected: false,
      candidateId: "other-candidate",
      renderDescriptor: null,
      diagnostics: {
        candidateId: "other-candidate",
        placementId: "WATCH_FEED",
        creativeReference: "creative-ref-1",
        creativeType: "video",
        deliveryAccepted: true,
        rejectionReason: null,
      },
      pipelineStage: "result",
      productionEnabled: false,
      deliveryEnabled: false,
      executionEnabled: false,
    };
    expect(
      assertProvenanceMatchesDeliveryResult(provenance, mismatchedCarrier).valid
    ).toBe(false);
  });

  it("deliveryAccepted:false cannot produce accepted measurement", () => {
    const provenance = issuedProvenanceForDescriptor();
    const descriptorOutcome = buildAdsRenderDescriptor(
      {
        descriptorVersion: ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
        placementId: "WATCH_FEED",
        creativeReference: "creative-ref-1",
        creativeType: "video",
        mediaReference: "media-ref-1",
        thumbnailReference: "thumb-ref-1",
        clickDestinationReference: "destination-ref-1",
        disclosure: { label: "Sponsored", mustDisplay: true },
        reportingHandles: {
          impressionHandle: "imp-handle-1",
          clickHandle: "clk-handle-1",
        },
        trackingReferences: {
          campaignId: "campaign-1",
          adSetId: "ad-set-1",
          adId: "ad-1",
          creativeId: "creative-ref-1",
        },
        cacheHints: {
          cacheable: false,
          maxAgeSeconds: null,
          cacheKey: null,
        },
        expiresAt: EXPIRES,
        productionEnabled: false,
      },
      { nowMs: NOW_MS }
    );
    expect(descriptorOutcome.valid).toBe(true);
    if (!descriptorOutcome.valid) {
      return;
    }

    const execution = runAdsExecutionLayerV1({
      candidateId: "candidate-1",
      renderDescriptor: descriptorOutcome.descriptor,
      currentTimestamp: NOW,
      provenance,
    });
    expect(execution.valid).toBe(true);
    if (!execution.valid) {
      return;
    }

    const rejectedDelivery: AdsInternalDeliveryInternalResult = {
      contractVersion: "v1",
      deliveryAccepted: false,
      deliveryRejected: true,
      candidateId: "candidate-1",
      renderDescriptor: null,
      diagnostics: {
        candidateId: "candidate-1",
        placementId: "WATCH_FEED",
        creativeReference: "creative-ref-1",
        creativeType: "video",
        deliveryAccepted: false,
        rejectionReason: "execution_not_accepted",
      },
      pipelineStage: "validate",
      productionEnabled: false,
      deliveryEnabled: false,
      executionEnabled: false,
    };

    const measurement = prepareAdsMeasurementFromDeliveryV1({
      deliveryResult: rejectedDelivery,
      eventType: "impression",
      provenance,
    });
    expect(measurement.valid).toBe(false);
    if (measurement.valid) {
      return;
    }
    expect(
      measurement.issues.some((issue) =>
        issue.includes("deliveryAccepted must be true")
      )
    ).toBe(true);

    // Accepted execution still cannot measure without accepted delivery.
    const softRejectedExecution: AdsExecutionInternalResult = {
      ...execution.result,
      executionAccepted: false,
      executionRejected: true,
      renderDescriptor: null,
      pipelineStage: "validate",
      diagnostics: {
        ...execution.result.diagnostics,
        executionAccepted: false,
        rejectionReason: "invalid_descriptor",
      },
    };
    const deliveryFromRejected = runInternalDeliveryPilotV1({
      executionResult: softRejectedExecution,
      currentTimestamp: NOW,
    });
    expect(deliveryFromRejected.valid).toBe(true);
    if (!deliveryFromRejected.valid) {
      return;
    }
    expect(deliveryFromRejected.result.deliveryAccepted).toBe(false);
    expect(
      prepareAdsMeasurementFromDeliveryV1({
        deliveryResult: deliveryFromRejected.result,
        eventType: "impression",
        provenance,
      }).valid
    ).toBe(false);
  });

  it("has no network, DB, or product imports", () => {
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
      /from ["']\.\/(ranking|scoring|auction|budget|pacing|frequency|billing|charging|fraud|invalidTraffic)["']/
    );
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/executionEnabled: false/);
    expect(SOURCE).toMatch(/measurementEnabled: false/);
  });
});
