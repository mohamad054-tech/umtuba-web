import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
  ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS,
  buildAdsRenderDescriptor,
  type AdsRenderDescriptor,
} from "./renderDescriptor";
import {
  ADS_EXECUTION_LAYER_V1_CONTRACT_VERSION,
  ADS_EXECUTION_LAYER_V1_INPUT_ALLOWED_FIELDS,
  ADS_EXECUTION_LAYER_V1_REJECTION_REASONS,
  ADS_EXECUTION_LAYER_V1_STAGES,
  listAdsExecutionLayerV1RejectionReasons,
  listAdsExecutionLayerV1Stages,
  runAdsExecutionLayerV1,
  validateAdsExecutionInternalResult,
  type AdsExecutionInternalResult,
} from "./executionLayer";

const SOURCE_PATH = path.join(__dirname, "executionLayer.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

const NOW = "2026-07-23T12:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const EXPIRES = "2026-07-23T13:00:00.000Z";
const EXPIRED = "2026-07-23T11:00:00.000Z";

/** Contract: expired iff expiresAtMs + ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS < nowMs. */
const BOUNDARY_EXPIRES_AT = "2026-07-23T12:00:00.000Z";
const BOUNDARY_EXPIRES_AT_MS = Date.parse(BOUNDARY_EXPIRES_AT);

function isoFromMs(ms: number): string {
  return new Date(ms).toISOString();
}

function expectKillSwitchesDisabled(result: AdsExecutionInternalResult): void {
  expect(result.productionEnabled).toBe(false);
  expect(result.deliveryEnabled).toBe(false);
  expect(result.executionEnabled).toBe(false);
}

function baseDescriptorDraft(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    descriptorVersion: ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
    placementId: "WATCH_FEED",
    creativeReference: "creative-ref-1",
    creativeType: "video",
    mediaReference: "media-ref-1",
    thumbnailReference: "thumb-ref-1",
    clickDestinationReference: "destination-ref-1",
    disclosure: {
      label: "Sponsored",
      mustDisplay: true,
    },
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
    ...overrides,
  };
}

function buildDescriptor(
  overrides: Record<string, unknown> = {}
): AdsRenderDescriptor {
  const outcome = buildAdsRenderDescriptor(baseDescriptorDraft(overrides), {
    nowMs: NOW_MS,
  });
  if (!outcome.valid) {
    throw new Error(
      `test fixture descriptor invalid: ${outcome.issues.join("; ")}`
    );
  }
  return outcome.descriptor;
}

function baseInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    candidateId: "candidate-1",
    renderDescriptor: buildDescriptor(),
    currentTimestamp: NOW,
    ...overrides,
  };
}

describe("Ads Execution Layer V1", () => {
  it("exposes stable contract stages and rejection reasons", () => {
    expect(ADS_EXECUTION_LAYER_V1_CONTRACT_VERSION).toBe("v1");
    expect(listAdsExecutionLayerV1Stages()).toEqual([
      "validate",
      "validate_execution",
      "execute",
      "result",
    ]);
    expect(ADS_EXECUTION_LAYER_V1_STAGES).toEqual(
      listAdsExecutionLayerV1Stages()
    );
    expect(listAdsExecutionLayerV1RejectionReasons()).toEqual([
      "invalid_descriptor",
      "descriptor_expired",
      "placement_incompatible",
      "identity_incomplete",
    ]);
    expect(ADS_EXECUTION_LAYER_V1_REJECTION_REASONS).toEqual(
      listAdsExecutionLayerV1RejectionReasons()
    );
    expect([...ADS_EXECUTION_LAYER_V1_INPUT_ALLOWED_FIELDS]).toEqual([
      "candidateId",
      "renderDescriptor",
      "currentTimestamp",
    ]);
  });

  it("accepts a validated render descriptor into an internal result", () => {
    const outcome = runAdsExecutionLayerV1(baseInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }

    expect(outcome.result.contractVersion).toBe(
      ADS_EXECUTION_LAYER_V1_CONTRACT_VERSION
    );
    expect(outcome.result.executionAccepted).toBe(true);
    expect(outcome.result.executionRejected).toBe(false);
    expect(outcome.result.candidateId).toBe("candidate-1");
    expect(outcome.result.pipelineStage).toBe("result");
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.executionEnabled).toBe(false);
    expect(outcome.result.renderDescriptor).not.toBeNull();
    expect(outcome.result.renderDescriptor?.creativeReference).toBe(
      "creative-ref-1"
    );
    expect(outcome.result.diagnostics).toEqual({
      candidateId: "candidate-1",
      placementId: "WATCH_FEED",
      creativeReference: "creative-ref-1",
      creativeType: "video",
      executionAccepted: true,
      rejectionReason: null,
    });
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.diagnostics)).toBe(true);
    expect(Object.isFrozen(outcome.result.renderDescriptor)).toBe(true);
    expect(
      validateAdsExecutionInternalResult(outcome.result, { nowMs: NOW_MS })
    ).toEqual({ valid: true });
  });

  it("is deterministic for identical inputs", () => {
    const first = runAdsExecutionLayerV1(baseInput());
    const second = runAdsExecutionLayerV1(baseInput());
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (!first.valid || !second.valid) {
      return;
    }
    expect(first.result).toEqual(second.result);
  });

  it("does not mutate inputs", () => {
    const descriptor = buildDescriptor();
    const input = {
      candidateId: "candidate-1",
      renderDescriptor: descriptor,
      currentTimestamp: NOW,
    };
    const snapshot = structuredClone(input);
    const outcome = runAdsExecutionLayerV1(input);
    expect(outcome.valid).toBe(true);
    expect(input).toEqual(snapshot);
  });

  it("keeps kill switches false even when execution is accepted", () => {
    const outcome = runAdsExecutionLayerV1(baseInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.executionEnabled).toBe(false);
    expect(outcome.result.renderDescriptor?.productionEnabled).toBe(false);
  });

  it("soft-rejects expired descriptors", () => {
    const outcome = runAdsExecutionLayerV1(
      baseInput({
        renderDescriptor: baseDescriptorDraft({ expiresAt: EXPIRED }),
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.executionAccepted).toBe(false);
    expect(outcome.result.executionRejected).toBe(true);
    expect(outcome.result.renderDescriptor).toBeNull();
    expect(outcome.result.pipelineStage).toBe("validate_execution");
    expect(outcome.result.diagnostics.rejectionReason).toBe(
      "descriptor_expired"
    );
    expectKillSwitchesDisabled(outcome.result);
  });

  it("soft-rejects placement-incompatible descriptors", () => {
    const outcome = runAdsExecutionLayerV1(
      baseInput({
        renderDescriptor: baseDescriptorDraft({
          placementId: "WATCH_FEED",
          creativeType: "game_promotion",
        }),
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.executionAccepted).toBe(false);
    expect(outcome.result.diagnostics.rejectionReason).toBe(
      "placement_incompatible"
    );
    expect(outcome.result.pipelineStage).toBe("validate_execution");
    expect(outcome.result.renderDescriptor).toBeNull();
    expectKillSwitchesDisabled(outcome.result);
  });

  it("soft-rejects incomplete tracking identity", () => {
    const outcome = runAdsExecutionLayerV1(
      baseInput({
        renderDescriptor: baseDescriptorDraft({
          trackingReferences: {
            campaignId: "campaign-1",
            adSetId: "ad-set-1",
            adId: "ad-1",
            creativeId: "",
          },
        }),
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.executionAccepted).toBe(false);
    expect(outcome.result.diagnostics.rejectionReason).toBe(
      "identity_incomplete"
    );
    expect(outcome.result.pipelineStage).toBe("validate_execution");
    expectKillSwitchesDisabled(outcome.result);
  });

  it("soft-rejects malformed descriptors as invalid_descriptor", () => {
    const outcome = runAdsExecutionLayerV1(
      baseInput({
        renderDescriptor: baseDescriptorDraft({
          mediaReference: "https://evil.example/media.mp4",
        }),
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.executionAccepted).toBe(false);
    expect(outcome.result.diagnostics.rejectionReason).toBe(
      "invalid_descriptor"
    );
    expect(outcome.result.pipelineStage).toBe("validate");
    expectKillSwitchesDisabled(outcome.result);
  });

  it("honors exact ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS expiry boundaries", () => {
    // Contract (unchanged): expired iff expiresAtMs + SKEW < nowMs.
    // Post-expiry acceptance window for currentTimestamp is [expiresAt, expiresAt+SKEW].
    expect(ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS).toBe(5_000);

    const descriptor = buildDescriptor({
      expiresAt: BOUNDARY_EXPIRES_AT,
    });
    const lowerBoundaryMs = BOUNDARY_EXPIRES_AT_MS;
    const upperBoundaryMs =
      BOUNDARY_EXPIRES_AT_MS + ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS;

    const atLower = runAdsExecutionLayerV1(
      baseInput({
        renderDescriptor: descriptor,
        currentTimestamp: isoFromMs(lowerBoundaryMs),
      })
    );
    expect(atLower.valid).toBe(true);
    if (atLower.valid) {
      expect(atLower.result.executionAccepted).toBe(true);
      expectKillSwitchesDisabled(atLower.result);
    }

    const beforeLower = runAdsExecutionLayerV1(
      baseInput({
        renderDescriptor: descriptor,
        currentTimestamp: isoFromMs(lowerBoundaryMs - 1),
      })
    );
    expect(beforeLower.valid).toBe(true);
    if (beforeLower.valid) {
      expect(beforeLower.result.executionAccepted).toBe(true);
      expectKillSwitchesDisabled(beforeLower.result);
    }

    const atUpper = runAdsExecutionLayerV1(
      baseInput({
        renderDescriptor: descriptor,
        currentTimestamp: isoFromMs(upperBoundaryMs),
      })
    );
    expect(atUpper.valid).toBe(true);
    if (atUpper.valid) {
      expect(atUpper.result.executionAccepted).toBe(true);
      expectKillSwitchesDisabled(atUpper.result);
    }

    const afterUpper = runAdsExecutionLayerV1(
      baseInput({
        renderDescriptor: descriptor,
        currentTimestamp: isoFromMs(upperBoundaryMs + 1),
      })
    );
    expect(afterUpper.valid).toBe(true);
    if (afterUpper.valid) {
      expect(afterUpper.result.executionAccepted).toBe(false);
      expect(afterUpper.result.executionRejected).toBe(true);
      expect(afterUpper.result.diagnostics.rejectionReason).toBe(
        "descriptor_expired"
      );
      expect(afterUpper.result.pipelineStage).toBe("validate_execution");
      expect(afterUpper.result.renderDescriptor).toBeNull();
      expectKillSwitchesDisabled(afterUpper.result);
    }
  });

  it("treats candidateId as opaque selection binding and never rewrites descriptor tracking identity", () => {
    // V1 design: candidateId is an opaque upstream selection binding only.
    // It is intentionally not cross-checked against trackingReferences;
    // creative/campaign/ad-set/ad identity remains descriptor-authoritative.
    const descriptor = buildDescriptor();
    const trackingSnapshot = {
      campaignId: descriptor.trackingReferences.campaignId,
      adSetId: descriptor.trackingReferences.adSetId,
      adId: descriptor.trackingReferences.adId,
      creativeId: descriptor.trackingReferences.creativeId,
    };

    const outcome = runAdsExecutionLayerV1(
      baseInput({
        candidateId: "opaque-selection-binding-999",
        renderDescriptor: descriptor,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }

    expect(outcome.result.candidateId).toBe("opaque-selection-binding-999");
    expect(outcome.result.renderDescriptor?.trackingReferences).toEqual(
      trackingSnapshot
    );
    expect(outcome.result.renderDescriptor?.trackingReferences.campaignId).toBe(
      "campaign-1"
    );
    expect(outcome.result.renderDescriptor?.trackingReferences.adSetId).toBe(
      "ad-set-1"
    );
    expect(outcome.result.renderDescriptor?.trackingReferences.adId).toBe(
      "ad-1"
    );
    expect(outcome.result.renderDescriptor?.trackingReferences.creativeId).toBe(
      "creative-ref-1"
    );
    expectKillSwitchesDisabled(outcome.result);
  });

  it("fails closed on unknown input fields and missing candidateId", () => {
    expect(
      runAdsExecutionLayerV1({
        ...baseInput(),
        selectedAd: "nope",
      }).valid
    ).toBe(false);

    expect(
      runAdsExecutionLayerV1({
        renderDescriptor: buildDescriptor(),
        currentTimestamp: NOW,
      }).valid
    ).toBe(false);

    expect(runAdsExecutionLayerV1(null).valid).toBe(false);
  });

  it("rejects client-authoritative identity override fields with no fallback", () => {
    const outcome = runAdsExecutionLayerV1({
      ...baseInput(),
      campaignId: "client-override",
      adSetId: "client-override",
      adId: "client-override",
      creativeId: "client-override",
      trackingReferences: {
        campaignId: "hijack",
        adSetId: "hijack",
        adId: "hijack",
        creativeId: "hijack",
      },
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) {
      return;
    }
    expect(
      outcome.issues.some((issue) => issue.includes("unknown field"))
    ).toBe(true);
    expect(outcome).not.toHaveProperty("result");
  });

  it("hard-fails on prohibited top-level URL/storage fields", () => {
    const outcome = runAdsExecutionLayerV1({
      ...baseInput(),
      mediaUrl: "https://evil.example/ad.mp4",
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) {
      return;
    }
    expect(
      outcome.issues.some(
        (issue) =>
          issue.includes('prohibited field "mediaUrl"') ||
          issue.includes("not allowed on execution layer input")
      )
    ).toBe(true);
    expect(outcome).not.toHaveProperty("result");
  });

  it("validateAdsExecutionInternalResult accepts valid and rejects malformed", () => {
    const accepted = runAdsExecutionLayerV1(baseInput());
    expect(accepted.valid).toBe(true);
    if (!accepted.valid) {
      return;
    }
    expect(
      validateAdsExecutionInternalResult(accepted.result, { nowMs: NOW_MS })
    ).toEqual({ valid: true });

    expect(validateAdsExecutionInternalResult(null).valid).toBe(false);
    expect(
      validateAdsExecutionInternalResult({
        ...accepted.result,
        productionEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsExecutionInternalResult({
        ...accepted.result,
        executionEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsExecutionInternalResult({
        ...accepted.result,
        deliveryEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsExecutionInternalResult({
        ...accepted.result,
        executionAccepted: true,
        executionRejected: true,
      }).valid
    ).toBe(false);
  });

  it("has no ranking, delivery, DB, network, or product imports", () => {
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
      /\brankCandidates\b|\brunAuction\b|\bpacing\b|\bbilling\b/i
    );
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/executionEnabled: false/);
    expect(SOURCE).toMatch(/validateAdsRenderDescriptor/);
    expect(SOURCE).toMatch(/runAdsExecutionLayerV1/);
  });
});
