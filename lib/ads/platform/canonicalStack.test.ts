import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_ENABLED } from "../constants";
import {
  ADS_CANONICAL_STACK_V1_CONTRACT_VERSION,
  ADS_CANONICAL_STACK_V1_STAGES,
  listAdsCanonicalStackV1Stages,
  runAdsCanonicalStackV1,
  validateAdsCanonicalStackV1Result,
} from "./canonicalStack";
import { ADS_CANDIDATE_SELECTION_CONTRACT_VERSION } from "./candidateSelection";
import * as compatibility from "./compatibility";
import * as platform from "./index";

const SOURCE_PATH = path.join(__dirname, "canonicalStack.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");
const INDEX_SOURCE = readFileSync(path.join(__dirname, "index.ts"), "utf8");

const NOW = "2026-07-23T12:00:00.000Z";
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

function rankingSignal(
  candidateId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    candidateId,
    placementCompatible: true,
    creativeCompatible: true,
    policyEligible: true,
    deliveryEligible: true,
    qualityScore: 0.9,
    relevanceScore: 0.8,
    freshnessScore: 0.7,
    ...overrides,
  };
}

function budgetSnapshot(
  candidateId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    candidateId,
    dailyBudgetMinor: 10_000,
    lifetimeBudgetMinor: 100_000,
    remainingBudgetMinor: 5_000,
    ...overrides,
  };
}

function pacingSnapshot(
  candidateId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    candidateId,
    pacingState: "on_pace",
    pacingWindow: {
      windowId: "window-1",
      targetDeliveryFraction: 0.5,
      actualDeliveryFraction: 0.4,
    },
    ...overrides,
  };
}

function frequencySnapshot(
  candidateId: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    candidateId,
    campaignId: "campaign-1",
    userExposureCount: 0,
    dailyExposureCount: 0,
    campaignExposureCount: 0,
    dailyCap: 10,
    lifetimeCap: 100,
    campaignCap: 50,
    ...overrides,
  };
}

function ivtSignals(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    trustLevel: "trusted",
    reportingHandleValid: true,
    duplicateEvent: false,
    impossibleSequence: false,
    suspiciousImpression: false,
    suspiciousClick: false,
    ...overrides,
  };
}

function baseStackInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    inventory: baseInventory(),
    selectionContext: baseContext(),
    rankingSignals: [rankingSignal("candidate-1")],
    budgetSnapshots: [budgetSnapshot("candidate-1")],
    pacingSnapshots: [pacingSnapshot("candidate-1")],
    frequencySnapshots: [frequencySnapshot("candidate-1")],
    invalidTrafficSignals: ivtSignals(),
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

describe("Ads Canonical Stack V1 (composition)", () => {
  it("exposes stable stage order and composes foundation modules", () => {
    expect(listAdsCanonicalStackV1Stages()).toEqual([
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
    ]);
    expect(ADS_CANONICAL_STACK_V1_STAGES).toEqual(
      listAdsCanonicalStackV1Stages()
    );
    expect(SOURCE).toMatch(/runAdsCandidateSelection/);
    expect(SOURCE).toMatch(/rankAdsCandidates/);
    expect(SOURCE).toMatch(/evaluateAdsBudget/);
    expect(SOURCE).toMatch(/evaluateAdsPacing/);
    expect(SOURCE).toMatch(/evaluateAdsFrequency/);
    expect(SOURCE).toMatch(/runAdsAuction/);
    expect(SOURCE).toMatch(/evaluateAdsFraud/);
    expect(SOURCE).toMatch(/adaptAdsSelectionToRenderEligible/);
    expect(SOURCE).toMatch(/runAdsRenderDescriptorPipeline/);
    expect(SOURCE).toMatch(/runAdsExecutionLayerV1/);
    expect(SOURCE).toMatch(/runInternalDeliveryPilotV1/);
    expect(SOURCE).toMatch(/prepareAdsMeasurementFromDeliveryV1/);
    expect(SOURCE).toMatch(/evaluateAdsBilling/);
    expect(SOURCE).toMatch(/ADS_DELIVERY_ENABLED/);
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*supabase[^"']*["']|createClient\s*\(/i
    );
  });

  it("runs the successful full canonical flow with kill switches off", () => {
    const outcome = runAdsCanonicalStackV1(baseStackInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }

    expect(outcome.result.contractVersion).toBe(
      ADS_CANONICAL_STACK_V1_CONTRACT_VERSION
    );
    expect(outcome.result.stackAccepted).toBe(true);
    expect(outcome.result.stackRejected).toBe(false);
    expect(outcome.result.productionAccepted).toBe(false);
    expect(outcome.result.authoritativeDecisionPath).toBe(true);
    expect(outcome.result.pipelineStage).toBe("result");
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.executionEnabled).toBe(false);
    expect(outcome.result.measurementEnabled).toBe(false);
    expect(outcome.result.billingEnabled).toBe(false);

    expect(outcome.result.auctionResult?.auctionWinner?.candidateId).toBe(
      "candidate-1"
    );
    expect(outcome.result.provenance?.candidateId).toBe("candidate-1");
    expect(outcome.result.deliveryResult?.deliveryAccepted).toBe(true);
    expect(outcome.result.measurementPackage).not.toBeNull();
    expect(outcome.result.billingEligible).toBe(true);
    expect(outcome.result.chargeResult).not.toBeNull();
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(validateAdsCanonicalStackV1Result(outcome.result)).toEqual({
      valid: true,
    });
  });

  it("enforces the global delivery gate while ADS_DELIVERY_ENABLED is false", () => {
    expect(ADS_DELIVERY_ENABLED).toBe(false);
    const outcome = runAdsCanonicalStackV1(baseStackInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.deliveryGate.passed).toBe(false);
    expect(outcome.result.deliveryGate.globalDeliveryEnabled).toBe(false);
    expect(outcome.result.deliveryGate.placementDeliveryEnabled).toBe(false);
    expect(outcome.result.deliveryGate.rejectionReason).toBe(
      "global_delivery_disabled"
    );
    expect(outcome.result.productionAccepted).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.decisionTrace.stages[0]?.stage).toBe("delivery_gate");
    expect(outcome.result.decisionTrace.stages[0]?.status).toBe("rejected");
    expect(SOURCE).toMatch(/ADS_DELIVERY_ENABLED\s+as\s+boolean\)\s*===\s*true/);
    expect(SOURCE).toMatch(/enabledByDefault/);
    expect(SOURCE).toMatch(/productionAccepted/);
    expect(SOURCE).toMatch(/Option B/);
  });

  it("soft-rejects when there are no eligible candidates", () => {
    const outcome = runAdsCanonicalStackV1(
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
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.stackAccepted).toBe(false);
    expect(outcome.result.pipelineStage).toBe("select");
    expect(outcome.result.rejectionReason).toBe("no_eligible_candidates");
    expect(outcome.result.auctionResult).toBeNull();
    expect(outcome.result.chargeResult).toBeNull();
    expect(outcome.result.billingEligible).toBe(false);
  });

  it("preserves ranking winner continuity into the auction winner", () => {
    const outcome = runAdsCanonicalStackV1(
      baseStackInput({
        inventory: baseInventory({
          candidates: [
            baseCandidate({ candidateId: "candidate-low", adRef: "ad-low" }),
            baseCandidate({
              candidateId: "candidate-high",
              adRef: "ad-high",
              creativeRef: "creative-ref-1",
            }),
          ],
        }),
        rankingSignals: [
          rankingSignal("candidate-low", {
            qualityScore: 0.2,
            relevanceScore: 0.2,
            freshnessScore: 0.2,
          }),
          rankingSignal("candidate-high", {
            qualityScore: 0.95,
            relevanceScore: 0.9,
            freshnessScore: 0.85,
          }),
        ],
        budgetSnapshots: [
          budgetSnapshot("candidate-low"),
          budgetSnapshot("candidate-high"),
        ],
        pacingSnapshots: [
          pacingSnapshot("candidate-low"),
          pacingSnapshot("candidate-high"),
        ],
        frequencySnapshots: [
          frequencySnapshot("candidate-low"),
          frequencySnapshot("candidate-high"),
        ],
        creativeDescriptor: {
          creativeReference: "creative-ref-1",
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
    expect(outcome.result.rankingResult?.rankedCandidates[0]?.candidateId).toBe(
      "candidate-high"
    );
    expect(outcome.result.auctionResult?.auctionWinner?.candidateId).toBe(
      "candidate-high"
    );
    expect(outcome.result.provenance?.candidateId).toBe("candidate-high");
    expect(outcome.result.deliveryResult?.candidateId).toBe("candidate-high");
  });

  it("stops auction/render when budget rejects all ranked candidates", () => {
    const outcome = runAdsCanonicalStackV1(
      baseStackInput({
        budgetSnapshots: [
          budgetSnapshot("candidate-1", { remainingBudgetMinor: 0 }),
        ],
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.stackAccepted).toBe(false);
    expect(outcome.result.pipelineStage).toBe("budget");
    expect(outcome.result.rejectionReason).toBe("budget_ineligible");
    expect(outcome.result.auctionResult).toBeNull();
    expect(outcome.result.renderResult).toBeNull();
    expect(outcome.result.chargeResult).toBeNull();
  });

  it("stops auction/render when pacing rejects all ranked candidates", () => {
    const outcome = runAdsCanonicalStackV1(
      baseStackInput({
        pacingSnapshots: [
          pacingSnapshot("candidate-1", { pacingState: "paused" }),
        ],
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.stackAccepted).toBe(false);
    expect(outcome.result.pipelineStage).toBe("pacing");
    expect(outcome.result.rejectionReason).toBe("pacing_ineligible");
    expect(outcome.result.auctionResult).toBeNull();
    expect(outcome.result.renderResult).toBeNull();
    expect(outcome.result.chargeResult).toBeNull();
  });

  it("stops auction/render when frequency rejects all ranked candidates", () => {
    const outcome = runAdsCanonicalStackV1(
      baseStackInput({
        frequencySnapshots: [
          frequencySnapshot("candidate-1", {
            userExposureCount: 10,
            dailyExposureCount: 10,
            campaignExposureCount: 10,
            dailyCap: 10,
          }),
        ],
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.stackAccepted).toBe(false);
    expect(outcome.result.pipelineStage).toBe("frequency");
    expect(outcome.result.rejectionReason).toBe("frequency_ineligible");
    expect(outcome.result.auctionResult).toBeNull();
    expect(outcome.result.renderResult).toBeNull();
    expect(outcome.result.chargeResult).toBeNull();
  });

  it("renders only the auction winner among multiple candidates", () => {
    const outcome = runAdsCanonicalStackV1(
      baseStackInput({
        inventory: baseInventory({
          candidates: [
            baseCandidate({ candidateId: "candidate-a", adRef: "ad-a" }),
            baseCandidate({ candidateId: "candidate-b", adRef: "ad-b" }),
          ],
        }),
        rankingSignals: [
          rankingSignal("candidate-a", {
            qualityScore: 0.4,
            relevanceScore: 0.4,
            freshnessScore: 0.4,
          }),
          rankingSignal("candidate-b", {
            qualityScore: 0.99,
            relevanceScore: 0.99,
            freshnessScore: 0.99,
          }),
        ],
        budgetSnapshots: [
          budgetSnapshot("candidate-a"),
          budgetSnapshot("candidate-b"),
        ],
        pacingSnapshots: [
          pacingSnapshot("candidate-a"),
          pacingSnapshot("candidate-b"),
        ],
        frequencySnapshots: [
          frequencySnapshot("candidate-a"),
          frequencySnapshot("candidate-b"),
        ],
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.auctionResult?.auctionWinner?.candidateId).toBe(
      "candidate-b"
    );
    expect(outcome.result.selectionRenderAdapter?.eligibleCandidate.candidateId).toBe(
      "candidate-b"
    );
    expect(outcome.result.provenance?.candidateId).toBe("candidate-b");
    expect(outcome.result.executionResult?.candidateId).toBe("candidate-b");
  });

  it("rejects caller-injected candidateId / winner fields", () => {
    expect(
      runAdsCanonicalStackV1({
        ...baseStackInput(),
        candidateId: "hijack",
      }).valid
    ).toBe(false);
    expect(
      runAdsCanonicalStackV1({
        ...baseStackInput(),
        auctionWinner: { candidateId: "hijack" },
      }).valid
    ).toBe(false);
    expect(
      runAdsCanonicalStackV1({
        ...baseStackInput(),
        selectedCandidateId: "hijack",
      }).valid
    ).toBe(false);
    expect(
      runAdsCanonicalStackV1({
        ...baseStackInput(),
        billableEvent: { eventId: "x" },
      }).valid
    ).toBe(false);
    expect(
      runAdsCanonicalStackV1({
        ...baseStackInput(),
        chargeResult: { chargeMinor: 1 },
      }).valid
    ).toBe(false);
  });

  it("blocks delivery, measurement, and billing on fraud rejection", () => {
    const outcome = runAdsCanonicalStackV1(
      baseStackInput({
        invalidTrafficSignals: ivtSignals({ duplicateEvent: true }),
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.stackAccepted).toBe(false);
    expect(outcome.result.pipelineStage).toBe("fraud");
    expect(outcome.result.rejectionReason).toBe("fraud_rejected");
    expect(outcome.result.fraudResult?.fraudEligible).toBe(false);
    expect(outcome.result.deliveryResult).toBeNull();
    expect(outcome.result.measurementPackage).toBeNull();
    expect(outcome.result.billingEligible).toBe(false);
    expect(outcome.result.chargeResult).toBeNull();
  });

  it("blocks billing when the reporting handle is invalid", () => {
    const outcome = runAdsCanonicalStackV1(
      baseStackInput({
        invalidTrafficSignals: ivtSignals({ reportingHandleValid: false }),
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.pipelineStage).toBe("fraud");
    expect(outcome.result.billingEligible).toBe(false);
    expect(outcome.result.chargeResult).toBeNull();
    expect(outcome.result.deliveryResult).toBeNull();
    expect(outcome.result.measurementPackage).toBeNull();
  });

  it("blocks measurement and billing when delivery rejects", () => {
    const outcome = runAdsCanonicalStackV1(
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
    expect(outcome.result.measurementPackage).toBeNull();
    expect(outcome.result.billingEligible).toBe(false);
    expect(outcome.result.chargeResult).toBeNull();
  });

  it("produces measurement from accepted delivery", () => {
    const outcome = runAdsCanonicalStackV1(baseStackInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.deliveryResult?.deliveryAccepted).toBe(true);
    expect(outcome.result.measurementPackage?.measurementReady).toBe(true);
    expect(outcome.result.measurementPackage?.eventType).toBe("impression");
  });

  it("produces billing eligibility for an accepted trusted billable event", () => {
    const outcome = runAdsCanonicalStackV1(baseStackInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.fraudResult?.fraudEligible).toBe(true);
    expect(outcome.result.billingEligible).toBe(true);
    expect(outcome.result.billingResult?.billingEligible).toBe(true);
    expect(outcome.result.billingResult?.authoritativeProductionBilling).toBe(
      false
    );
    expect(outcome.result.chargeResult?.chargeMinor).toBeGreaterThan(0);
    expect(outcome.result.billingEnabled).toBe(false);
    expect(outcome.result.productionAccepted).toBe(false);
  });

  it("returns chargeResult null on rejected paths", () => {
    const outcome = runAdsCanonicalStackV1(
      baseStackInput({
        invalidTrafficSignals: ivtSignals({ duplicateEvent: true }),
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.stackRejected).toBe(true);
    expect(outcome.result.chargeResult).toBeNull();
    expect(outcome.result.billingEligible).toBe(false);
  });

  it("preserves provenance continuity across every boundary", () => {
    const outcome = runAdsCanonicalStackV1(baseStackInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    const id = outcome.result.provenance?.candidateId;
    expect(id).toBe("candidate-1");
    expect(outcome.result.auctionResult?.auctionWinner?.candidateId).toBe(id);
    expect(
      outcome.result.selectionRenderAdapter?.eligibleCandidate.candidateId
    ).toBe(id);
    expect(outcome.result.executionResult?.candidateId).toBe(id);
    expect(outcome.result.deliveryResult?.candidateId).toBe(id);
    expect(outcome.result.billingResult?.candidateId).toBe(id);
    expect(outcome.result.fraudResult?.candidateId).toBe(id);
  });

  it("emits a stable decision trace on success and rejection", () => {
    const ok = runAdsCanonicalStackV1(baseStackInput());
    expect(ok.valid).toBe(true);
    if (!ok.valid) {
      return;
    }
    expect(Object.isFrozen(ok.result.decisionTrace)).toBe(true);
    expect(Object.isFrozen(ok.result.decisionTrace.stages)).toBe(true);
    expect(ok.result.decisionTrace.stages.map((s) => s.stage)).toEqual([
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
    ]);
    expect(JSON.stringify(ok.result.decisionTrace)).not.toMatch(
      /https?:\/\/|media-ref|password|secret|@/i
    );

    const rejected = runAdsCanonicalStackV1(
      baseStackInput({
        budgetSnapshots: [
          budgetSnapshot("candidate-1", { remainingBudgetMinor: 0 }),
        ],
      })
    );
    expect(rejected.valid).toBe(true);
    if (!rejected.valid) {
      return;
    }
    expect(rejected.result.decisionTrace.terminalStage).toBe("budget");
    expect(rejected.result.decisionTrace.stackAccepted).toBe(false);
    expect(rejected.result.decisionTrace.rejectionReason).toBe(
      "budget_ineligible"
    );
  });

  it("is deterministic for identical inputs", () => {
    const input = baseStackInput();
    const first = runAdsCanonicalStackV1(input);
    const second = runAdsCanonicalStackV1(structuredClone(input));
    expect(first).toEqual(second);
  });

  it("does not mutate stack inputs", () => {
    const input = baseStackInput();
    const snapshot = structuredClone(input);
    runAdsCanonicalStackV1(input);
    expect(input).toEqual(snapshot);
  });

  it("freezes nested outputs", () => {
    const outcome = runAdsCanonicalStackV1(baseStackInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.decisionTrace)).toBe(true);
    expect(Object.isFrozen(outcome.result.deliveryGate)).toBe(true);
    expect(Object.isFrozen(outcome.result.budgetResults)).toBe(true);
    expect(Object.isFrozen(outcome.result.pacingResults)).toBe(true);
    expect(Object.isFrozen(outcome.result.frequencyResults)).toBe(true);
  });

  it("keeps all kill switches false", () => {
    const outcome = runAdsCanonicalStackV1(baseStackInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.executionEnabled).toBe(false);
    expect(outcome.result.measurementEnabled).toBe(false);
    expect(outcome.result.billingEnabled).toBe(false);
    expect(SOURCE).not.toMatch(/ADS_DELIVERY_ENABLED\s*=\s*true/);
    expect(SOURCE).toMatch(/billingEnabled: false/);
  });

  it("exposes legacy and non-authoritative stage APIs only through compatibility", () => {
    expect("runAdsStackPipelineV1" in platform).toBe(false);
    expect("runAdsPilotSelector" in platform).toBe(false);
    expect("buildCandidateInventory" in platform).toBe(false);
    expect("evaluateAdsBilling" in platform).toBe(false);
    expect("runInternalDeliveryPilotV1" in platform).toBe(false);
    expect("prepareAdsMeasurementFromDeliveryV1" in platform).toBe(false);
    expect(typeof compatibility.runAdsStackPipelineV1).toBe("function");
    expect(typeof compatibility.runAdsPilotSelector).toBe("function");
    expect(typeof compatibility.buildCandidateInventory).toBe("function");
    expect(typeof compatibility.evaluateAdsBilling).toBe("function");
    expect(typeof platform.adsPlatformCompatibility.runAdsStackPipelineV1).toBe(
      "function"
    );
  });

  it("exposes one canonical authoritative entrypoint on the main barrel", () => {
    expect(typeof platform.runAdsCanonicalStackV1).toBe("function");
    expect(INDEX_SOURCE).toMatch(/runAdsCanonicalStackV1/);
    expect(INDEX_SOURCE).toMatch(
      /Sole authoritative production decision entrypoint/
    );
    expect(INDEX_SOURCE).not.toMatch(
      /export\s+\*\s+from\s+["']\.\/stackPipeline["']/
    );
    expect(INDEX_SOURCE).not.toMatch(
      /export\s+\*\s+from\s+["']\.\/billing["']/
    );
  });

  it("has no circular imports with foundation modules", () => {
    expect(SOURCE).not.toMatch(/from ["']\.\/index["']/);
    expect(SOURCE).not.toMatch(/from ["']\.\/compatibility["']/);
    expect(SOURCE).not.toMatch(/from ["']\.\/stackPipeline["']/);
    expect(SOURCE).not.toMatch(/from ["']\.\/measurementEventFlow["']/);
    expect(SOURCE).not.toMatch(/from ["']\.\/pilotSelector["']/);
    expect(SOURCE).not.toMatch(/from ["']\.\/selectableSet["']/);
    expect(SOURCE).not.toMatch(/from ["']\.\/serveBoundary["']/);
  });
});
