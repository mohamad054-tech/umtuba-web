import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runAdsCanonicalStackV1 } from "./canonicalStack";
import { ADS_CANDIDATE_SELECTION_CONTRACT_VERSION } from "./candidateSelection";
import * as platform from "./index";
import {
  ADS_SERVING_AUTHORITATIVE_ENTRYPOINT,
  ADS_SERVING_FOUNDATION_CONTRACT_VERSION,
  ADS_SERVING_LIFECYCLE_STAGES,
  applyAdsServingIdempotencyClaimV1,
  assertAdsServingKillSwitchesClosedV1,
  assertAdsServingStageTransitionV1,
  buildAdsServingCorrelationV1,
  buildAdsServingIdempotencyKeysV1,
  claimAdsServingIdempotencyV1,
  createAdsServingLifecycleV1,
  evaluateAdsServingEnvironmentGateV1,
  listAdsServingLifecycleStagesV1,
  transitionAdsServingStageV1,
  validateAdsServingLifecycleV1,
  type AdsServingLifecycleV1,
} from "./servingFoundation";

const SOURCE = readFileSync(
  path.join(__dirname, "servingFoundation.ts"),
  "utf8"
);
const INDEX_SOURCE = readFileSync(path.join(__dirname, "index.ts"), "utf8");
const CANONICAL_SOURCE = readFileSync(
  path.join(__dirname, "canonicalStack.ts"),
  "utf8"
);

const NOW = "2026-07-23T12:00:00.000Z";
const EXPIRES = "2026-07-23T13:00:00.000Z";
const EVALUATED_AT = "2026-07-23T10:00:00.000Z";

function createLifecycle(): AdsServingLifecycleV1 {
  const correlation = buildAdsServingCorrelationV1({
    servingRequestId: "serving-req-1",
    selectionRequestId: "selection-req-1",
    placementId: "WATCH_FEED",
  });
  expect(correlation.valid).toBe(true);
  if (!correlation.valid) {
    throw new Error("correlation failed");
  }
  const created = createAdsServingLifecycleV1({
    correlation: correlation.correlation,
  });
  expect(created.valid).toBe(true);
  if (!created.valid) {
    throw new Error("lifecycle create failed");
  }
  return created.lifecycle;
}

function advanceAllTo(
  lifecycle: AdsServingLifecycleV1,
  throughStage: (typeof ADS_SERVING_LIFECYCLE_STAGES)[number]
): AdsServingLifecycleV1 {
  let current = lifecycle;
  for (const stage of ADS_SERVING_LIFECYCLE_STAGES) {
    const outcome = transitionAdsServingStageV1({
      lifecycle: current,
      stage,
      status: "accepted",
      ...(stage === "delivery_attempt" ? { deliveryAccepted: true } : {}),
      ...(stage === "measurement_handoff"
        ? { measurementAccepted: true }
        : {}),
      ...(stage === "billing_handoff"
        ? { billingHandoffAccepted: true }
        : {}),
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      throw new Error(`failed advancing to ${stage}`);
    }
    current = outcome.lifecycle;
    if (stage === throughStage) {
      break;
    }
  }
  return current;
}

function baseStackInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    inventory: {
      contractVersion: ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
      sourceId: "injected-source-1",
      revision: 1,
      candidates: [
        {
          candidateId: "candidate-1",
          creativeRef: "creative-ref-1",
          creativeType: "video",
          placementId: "WATCH_FEED",
          campaignRef: "campaign-1",
          advertiserRef: "advertiser-1",
          adSetRef: "ad-set-1",
          adRef: "ad-1",
          eligibility: {
            campaignActive: true,
            creativeActive: true,
            policyAllowed: true,
            requiresAgeGate: false,
            targetedCountryCodes: ["US"],
            targetedLanguageCodes: ["en"],
            targetedPlatforms: ["web", "ios", "android"],
            targetedDeviceClasses: ["mobile", "tablet", "desktop"],
          },
        },
      ],
    },
    selectionContext: {
      placement: { placementId: "WATCH_FEED" },
      countryCode: "US",
      languageCode: "en-US",
      platform: "web",
      deviceClass: "mobile",
      viewerAgeGatePassed: true,
      selectionRequestId: "selection-req-1",
      evaluatedAt: EVALUATED_AT,
    },
    rankingSignals: [
      {
        candidateId: "candidate-1",
        placementCompatible: true,
        creativeCompatible: true,
        policyEligible: true,
        deliveryEligible: true,
        qualityScore: 0.9,
        relevanceScore: 0.8,
        freshnessScore: 0.7,
      },
    ],
    budgetSnapshots: [
      {
        candidateId: "candidate-1",
        dailyBudgetMinor: 10_000,
        lifetimeBudgetMinor: 100_000,
        remainingBudgetMinor: 5_000,
      },
    ],
    pacingSnapshots: [
      {
        candidateId: "candidate-1",
        pacingState: "on_pace",
        pacingWindow: {
          windowId: "window-1",
          targetDeliveryFraction: 0.5,
          actualDeliveryFraction: 0.4,
        },
      },
    ],
    frequencySnapshots: [
      {
        candidateId: "candidate-1",
        campaignId: "campaign-1",
        userExposureCount: 0,
        dailyExposureCount: 0,
        campaignExposureCount: 0,
        dailyCap: 10,
        lifetimeCap: 100,
        campaignCap: 50,
      },
    ],
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

describe("Ads Production Serving Foundation V1", () => {
  it("exposes stable lifecycle order and contract version", () => {
    expect(listAdsServingLifecycleStagesV1()).toEqual([
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
    ]);
    expect(ADS_SERVING_LIFECYCLE_STAGES).toEqual(
      listAdsServingLifecycleStagesV1()
    );
    expect(ADS_SERVING_FOUNDATION_CONTRACT_VERSION).toBe("v1");
    expect(ADS_SERVING_AUTHORITATIVE_ENTRYPOINT).toBe("runAdsCanonicalStackV1");
  });

  it("rejects invalid stage reordering and skips", () => {
    const lifecycle = createLifecycle();
    expect(
      assertAdsServingStageTransitionV1({
        currentStage: null,
        nextStage: "auction",
      }).valid
    ).toBe(false);

    const intake = transitionAdsServingStageV1({
      lifecycle,
      stage: "request_intake",
      status: "accepted",
    });
    expect(intake.valid).toBe(true);
    if (!intake.valid) {
      return;
    }

    const skip = transitionAdsServingStageV1({
      lifecycle: intake.lifecycle,
      stage: "ranking",
      status: "accepted",
    });
    expect(skip.valid).toBe(false);
    if (skip.valid) {
      return;
    }
    expect(skip.rejectionReason).toBe("invalid_stage_order");
    expect(skip.lifecycle.productionAccepted).toBe(false);
    expect(skip.lifecycle.authoritativeProductionServing).toBe(false);
  });

  it("rejects duplicate delivery becoming authoritative", () => {
    let lifecycle = advanceAllTo(createLifecycle(), "render_eligibility");
    const keys = buildAdsServingIdempotencyKeysV1({
      correlationId: lifecycle.correlation.correlationId,
      candidateId: "candidate-1",
      eventType: "impression",
      reportingHandle: "imp-handle-1",
    });
    expect(keys.valid).toBe(true);
    if (!keys.valid) {
      return;
    }

    const first = claimAdsServingIdempotencyV1({
      kind: "delivery_attempt",
      key: keys.keys.deliveryAttemptKey as string,
      seenKeys: [],
      lifecycle,
    });
    expect(first.valid).toBe(true);
    if (!first.valid) {
      return;
    }
    expect(first.authoritativeClaim).toBe(false);
    expect(first.productionAccepted).toBe(false);
    lifecycle = applyAdsServingIdempotencyClaimV1({
      lifecycle,
      claim: first,
    });

    const duplicate = claimAdsServingIdempotencyV1({
      kind: "delivery_attempt",
      key: keys.keys.deliveryAttemptKey as string,
      seenKeys: [keys.keys.deliveryAttemptKey as string],
      lifecycle,
    });
    expect(duplicate.valid).toBe(false);
    if (duplicate.valid) {
      return;
    }
    expect(duplicate.rejectionReason).toBe("duplicate_delivery_attempt");
    expect(duplicate.authoritativeClaim).toBe(false);
    expect(duplicate.diagnosticClaimAccepted).toBe(false);
  });

  it("rejects duplicate measurement becoming billable", () => {
    let lifecycle = advanceAllTo(createLifecycle(), "render_eligibility");
    const keys = buildAdsServingIdempotencyKeysV1({
      correlationId: lifecycle.correlation.correlationId,
      candidateId: "candidate-1",
      eventType: "impression",
      reportingHandle: "imp-handle-1",
    });
    expect(keys.valid).toBe(true);
    if (!keys.valid) {
      return;
    }

    const delivery = claimAdsServingIdempotencyV1({
      kind: "delivery_attempt",
      key: keys.keys.deliveryAttemptKey as string,
      lifecycle,
    });
    expect(delivery.valid).toBe(true);
    if (!delivery.valid) {
      return;
    }
    lifecycle = applyAdsServingIdempotencyClaimV1({
      lifecycle,
      claim: delivery,
    });
    const deliveryAdvance = transitionAdsServingStageV1({
      lifecycle,
      stage: "delivery_attempt",
      status: "accepted",
      deliveryAccepted: true,
    });
    expect(deliveryAdvance.valid).toBe(true);
    if (!deliveryAdvance.valid) {
      return;
    }
    lifecycle = deliveryAdvance.lifecycle;

    const firstMeasure = claimAdsServingIdempotencyV1({
      kind: "measurement_event",
      key: keys.keys.measurementEventKey as string,
      lifecycle,
    });
    expect(firstMeasure.valid).toBe(true);
    if (!firstMeasure.valid) {
      return;
    }
    expect(firstMeasure.authoritativeClaim).toBe(false);

    const duplicateMeasure = claimAdsServingIdempotencyV1({
      kind: "measurement_event",
      key: keys.keys.measurementEventKey as string,
      seenKeys: [keys.keys.measurementEventKey as string],
      lifecycle,
    });
    expect(duplicateMeasure.valid).toBe(false);
    if (duplicateMeasure.valid) {
      return;
    }
    expect(duplicateMeasure.rejectionReason).toBe("duplicate_measurement_event");
    expect(duplicateMeasure.diagnosticClaimAccepted).toBe(false);

    const billingBeforeMeasure = claimAdsServingIdempotencyV1({
      kind: "billing_handoff",
      key: keys.keys.billingHandoffKey as string,
      lifecycle,
    });
    expect(billingBeforeMeasure.valid).toBe(false);
    if (billingBeforeMeasure.valid) {
      return;
    }
    expect(billingBeforeMeasure.rejectionReason).toBe(
      "billing_before_measurement"
    );
  });

  it("rejects billing before accepted delivery and measurement", () => {
    const lifecycle = createLifecycle();
    const keys = buildAdsServingIdempotencyKeysV1({
      correlationId: lifecycle.correlation.correlationId,
      candidateId: "candidate-1",
      eventType: "impression",
      reportingHandle: "imp-handle-1",
    });
    expect(keys.valid).toBe(true);
    if (!keys.valid) {
      return;
    }

    const beforeDelivery = claimAdsServingIdempotencyV1({
      kind: "billing_handoff",
      key: keys.keys.billingHandoffKey as string,
      lifecycle,
    });
    expect(beforeDelivery.valid).toBe(false);
    if (beforeDelivery.valid) {
      return;
    }
    expect(beforeDelivery.rejectionReason).toBe("billing_before_delivery");
  });

  it("keeps kill switches closed and blocks bypass attempts", () => {
    const gate = evaluateAdsServingEnvironmentGateV1();
    expect(gate.diagnosticsEnabled).toBe(true);
    expect(gate.productionDeliveryEnabled).toBe(false);
    expect(gate.productionBillingEnabled).toBe(false);
    expect(gate.productionAccepted).toBe(false);
    expect(assertAdsServingKillSwitchesClosedV1(gate).valid).toBe(true);
    expect(
      assertAdsServingKillSwitchesClosedV1({
        ...gate,
        productionDeliveryEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      assertAdsServingKillSwitchesClosedV1({
        ...gate,
        productionBillingEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      assertAdsServingKillSwitchesClosedV1({
        ...gate,
        productionAccepted: true,
      }).valid
    ).toBe(false);
  });

  it("never claims production acceptance on lifecycle validation", () => {
    const lifecycle = advanceAllTo(createLifecycle(), "billing_handoff");
    expect(validateAdsServingLifecycleV1(lifecycle).valid).toBe(true);
    expect(lifecycle.productionAccepted).toBe(false);
    expect(lifecycle.authoritativeProductionServing).toBe(false);
    expect(lifecycle.deliveryEnabled).toBe(false);
    expect(lifecycle.billingEnabled).toBe(false);

    expect(
      validateAdsServingLifecycleV1({
        ...lifecycle,
        productionAccepted: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsServingLifecycleV1({
        ...lifecycle,
        authoritativeProductionServing: true,
      }).valid
    ).toBe(false);
  });

  it("does not create a second authoritative pipeline entrypoint", () => {
    expect(SOURCE).not.toMatch(/export function runAdsServing/i);
    expect(SOURCE).not.toMatch(/authoritativeDecisionPath:\s*true/);
    expect(SOURCE).toMatch(/runAdsCanonicalStackV1/);
    expect(INDEX_SOURCE).toMatch(/servingFoundation/);
    expect(INDEX_SOURCE).toMatch(
      /Sole authoritative production decision entrypoint/
    );
    expect(typeof platform.runAdsCanonicalStackV1).toBe("function");
    expect(typeof platform.transitionAdsServingStageV1).toBe("function");
    expect(typeof platform.claimAdsServingIdempotencyV1).toBe("function");
    expect("runAdsServingPipelineV1" in platform).toBe(false);
    expect(ADS_SERVING_AUTHORITATIVE_ENTRYPOINT).toBe(
      "runAdsCanonicalStackV1"
    );
  });

  it("deep imports cannot manufacture production authority", async () => {
    const deep = await import("./servingFoundation");
    const gate = deep.evaluateAdsServingEnvironmentGateV1();
    expect(gate.productionAccepted).toBe(false);
    expect(gate.productionDeliveryEnabled).toBe(false);
    expect(gate.productionBillingEnabled).toBe(false);

    const correlation = deep.buildAdsServingCorrelationV1({
      servingRequestId: "deep-req-1",
    });
    expect(correlation.valid).toBe(true);
    if (!correlation.valid) {
      return;
    }
    const created = deep.createAdsServingLifecycleV1({
      correlation: correlation.correlation,
    });
    expect(created.valid).toBe(true);
    if (!created.valid) {
      return;
    }
    expect(created.lifecycle.productionAccepted).toBe(false);
    expect(created.lifecycle.authoritativeProductionServing).toBe(false);
    expect(deep.ADS_SERVING_AUTHORITATIVE_ENTRYPOINT).toBe(
      "runAdsCanonicalStackV1"
    );
    expect(CANONICAL_SOURCE).toMatch(/servingLifecycle/);
    expect(CANONICAL_SOURCE).toMatch(/ADS_SERVING_AUTHORITATIVE_ENTRYPOINT/);
  });

  it("canonical stack attaches serving lifecycle with kill switches closed", () => {
    const outcome = runAdsCanonicalStackV1(baseStackInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.servingLifecycle.contractVersion).toBe("v1");
    expect(outcome.result.servingLifecycle.productionAccepted).toBe(false);
    expect(
      outcome.result.servingLifecycle.authoritativeProductionServing
    ).toBe(false);
    expect(outcome.result.servingLifecycle.environmentGate.productionDeliveryEnabled).toBe(
      false
    );
    expect(outcome.result.servingLifecycle.environmentGate.productionBillingEnabled).toBe(
      false
    );
    expect(outcome.result.productionAccepted).toBe(false);
    expect(outcome.result.authoritativeDecisionPath).toBe(true);
    expect(outcome.result.servingLifecycle.deliveryAccepted).toBe(true);
    expect(outcome.result.servingLifecycle.measurementAccepted).toBe(true);
    expect(outcome.result.servingLifecycle.correlation.correlationId).toContain(
      "srv-corr:"
    );
    expect(
      outcome.result.servingLifecycle.stages.map((stage) => stage.stage)
    ).toEqual([...ADS_SERVING_LIFECYCLE_STAGES]);
  });

  it("canonical stack rejects duplicate delivery attempt keys", () => {
    const first = runAdsCanonicalStackV1(baseStackInput());
    expect(first.valid).toBe(true);
    if (!first.valid) {
      return;
    }
    const deliveryKey =
      first.result.servingLifecycle.idempotency.deliveryAttemptKey;
    expect(typeof deliveryKey).toBe("string");

    const second = runAdsCanonicalStackV1(
      baseStackInput({
        seenDeliveryAttemptKeys: [deliveryKey],
      })
    );
    expect(second.valid).toBe(true);
    if (!second.valid) {
      return;
    }
    expect(second.result.stackAccepted).toBe(false);
    expect(second.result.rejectionReason).toBe("delivery_rejected");
    expect(second.result.billingEligible).toBe(false);
    expect(second.result.productionAccepted).toBe(false);
  });

  it("has no entropy, network, supabase, or product imports", () => {
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*supabase[^"']*["']|createClient\s*\(/i
    );
    expect(SOURCE).not.toMatch(/from ["']\.\/index["']/);
  });
});
