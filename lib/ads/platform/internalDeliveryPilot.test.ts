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
  runAdsExecutionLayerV1,
  validateAdsExecutionInternalResult,
  type AdsExecutionInternalResult,
} from "./executionLayer";
import {
  ADS_INTERNAL_DELIVERY_PILOT_V1_CONTRACT_VERSION,
  ADS_INTERNAL_DELIVERY_PILOT_V1_INPUT_ALLOWED_FIELDS,
  ADS_INTERNAL_DELIVERY_PILOT_V1_REJECTION_REASONS,
  ADS_INTERNAL_DELIVERY_PILOT_V1_STAGES,
  listAdsInternalDeliveryPilotV1RejectionReasons,
  listAdsInternalDeliveryPilotV1Stages,
  runInternalDeliveryPilotV1,
  validateAdsInternalDeliveryInternalResult,
  type AdsInternalDeliveryInternalResult,
} from "./internalDeliveryPilot";

const SOURCE_PATH = path.join(__dirname, "internalDeliveryPilot.ts");
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

function expectKillSwitchesDisabled(
  result: AdsInternalDeliveryInternalResult
): void {
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

function acceptedExecutionResult(
  overrides: Record<string, unknown> = {}
): AdsExecutionInternalResult {
  const outcome = runAdsExecutionLayerV1({
    candidateId: "candidate-1",
    renderDescriptor: buildDescriptor(),
    currentTimestamp: NOW,
    ...overrides,
  });
  expect(outcome.valid).toBe(true);
  if (!outcome.valid) {
    throw new Error("expected accepted execution result");
  }
  expect(outcome.result.executionAccepted).toBe(true);
  return outcome.result;
}

function rejectedExecutionResult(
  descriptorOverrides: Record<string, unknown>
): AdsExecutionInternalResult {
  const outcome = runAdsExecutionLayerV1({
    candidateId: "candidate-1",
    renderDescriptor: baseDescriptorDraft(descriptorOverrides),
    currentTimestamp: NOW,
  });
  expect(outcome.valid).toBe(true);
  if (!outcome.valid) {
    throw new Error("expected soft-rejected execution result");
  }
  expect(outcome.result.executionAccepted).toBe(false);
  return outcome.result;
}

function baseInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    executionResult: acceptedExecutionResult(),
    currentTimestamp: NOW,
    ...overrides,
  };
}

/**
 * Builds an accepted execution snapshot that passes structural validation, then
 * exposes a defective descriptor on later reads so validate_delivery soft-rejects.
 * Mirrors the expiry pin pattern: structural check sees a valid snapshot;
 * delivery re-assertion sees the gate failure under test.
 */
function acceptedExecutionWithDeliveryDescriptorDefect(
  defect: (descriptor: AdsRenderDescriptor) => AdsRenderDescriptor
): AdsExecutionInternalResult {
  const accepted = acceptedExecutionResult();
  const good = accepted.renderDescriptor;
  if (good === null) {
    throw new Error("expected accepted execution to include renderDescriptor");
  }
  const defective = defect(good);

  let structuralReads = 0;
  const structuralProbe = {
    ...accepted,
    get renderDescriptor() {
      structuralReads += 1;
      return good;
    },
  };
  // Pilot pins structural clock via expiresAt before calling the validator.
  const structuralNowMs = Date.parse(good.expiresAt);
  expect(
    validateAdsExecutionInternalResult(structuralProbe, {
      nowMs: structuralNowMs,
    })
  ).toEqual({ valid: true });

  // Pilot reads renderDescriptor twice for the expiry pin, then the validator
  // performs structuralReads accesses; subsequent reads serve the defect.
  const serveGoodThrough = 2 + structuralReads;
  let reads = 0;
  return {
    ...accepted,
    get renderDescriptor() {
      reads += 1;
      return reads <= serveGoodThrough ? good : defective;
    },
  } as AdsExecutionInternalResult;
}

describe("Ads Internal Delivery Pilot V1", () => {
  it("exposes stable contract stages and rejection reasons", () => {
    expect(ADS_INTERNAL_DELIVERY_PILOT_V1_CONTRACT_VERSION).toBe("v1");
    expect(listAdsInternalDeliveryPilotV1Stages()).toEqual([
      "validate",
      "validate_delivery",
      "deliver",
      "result",
    ]);
    expect(ADS_INTERNAL_DELIVERY_PILOT_V1_STAGES).toEqual(
      listAdsInternalDeliveryPilotV1Stages()
    );
    expect(listAdsInternalDeliveryPilotV1RejectionReasons()).toEqual([
      "execution_not_accepted",
      "invalid_descriptor",
      "descriptor_expired",
      "placement_incompatible",
      "identity_incomplete",
    ]);
    expect(ADS_INTERNAL_DELIVERY_PILOT_V1_REJECTION_REASONS).toEqual(
      listAdsInternalDeliveryPilotV1RejectionReasons()
    );
    expect([...ADS_INTERNAL_DELIVERY_PILOT_V1_INPUT_ALLOWED_FIELDS]).toEqual([
      "executionResult",
      "currentTimestamp",
    ]);
  });

  it("accepts a validated execution result into an internal delivery result", () => {
    const outcome = runInternalDeliveryPilotV1(baseInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }

    expect(outcome.result.contractVersion).toBe(
      ADS_INTERNAL_DELIVERY_PILOT_V1_CONTRACT_VERSION
    );
    expect(outcome.result.deliveryAccepted).toBe(true);
    expect(outcome.result.deliveryRejected).toBe(false);
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
      deliveryAccepted: true,
      rejectionReason: null,
    });
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.diagnostics)).toBe(true);
    expect(Object.isFrozen(outcome.result.renderDescriptor)).toBe(true);
    expect(
      validateAdsInternalDeliveryInternalResult(outcome.result, {
        nowMs: NOW_MS,
      })
    ).toEqual({ valid: true });
  });

  it("is deterministic for identical inputs", () => {
    const executionResult = acceptedExecutionResult();
    const input = { executionResult, currentTimestamp: NOW };
    const first = runInternalDeliveryPilotV1(input);
    const second = runInternalDeliveryPilotV1(input);
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (!first.valid || !second.valid) {
      return;
    }
    expect(first.result).toEqual(second.result);
  });

  it("does not mutate inputs", () => {
    const executionResult = acceptedExecutionResult();
    const input = { executionResult, currentTimestamp: NOW };
    const snapshot = structuredClone(input);
    const outcome = runInternalDeliveryPilotV1(input);
    expect(outcome.valid).toBe(true);
    expect(input).toEqual(snapshot);
  });

  it("keeps kill switches false even when delivery is accepted", () => {
    const outcome = runInternalDeliveryPilotV1(baseInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expectKillSwitchesDisabled(outcome.result);
    expect(outcome.result.renderDescriptor?.productionEnabled).toBe(false);
  });

  it("soft-rejects when upstream execution was not accepted", () => {
    const executionResult = rejectedExecutionResult({ expiresAt: EXPIRED });
    const outcome = runInternalDeliveryPilotV1({
      executionResult,
      currentTimestamp: NOW,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.deliveryAccepted).toBe(false);
    expect(outcome.result.deliveryRejected).toBe(true);
    expect(outcome.result.renderDescriptor).toBeNull();
    expect(outcome.result.pipelineStage).toBe("validate");
    expect(outcome.result.diagnostics.rejectionReason).toBe(
      "execution_not_accepted"
    );
    expectKillSwitchesDisabled(outcome.result);
  });

  it("soft-rejects expired descriptors at validate_delivery", () => {
    // Accept execution at expiry boundary, then advance the pilot clock past skew.
    const accepted = acceptedExecutionResult({
      renderDescriptor: buildDescriptor({
        expiresAt: BOUNDARY_EXPIRES_AT,
      }),
      currentTimestamp: BOUNDARY_EXPIRES_AT,
    });
    expect(accepted.executionAccepted).toBe(true);

    const afterSkew = runInternalDeliveryPilotV1({
      executionResult: accepted,
      currentTimestamp: isoFromMs(
        BOUNDARY_EXPIRES_AT_MS + ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS + 1
      ),
    });
    expect(afterSkew.valid).toBe(true);
    if (!afterSkew.valid) {
      return;
    }
    expect(afterSkew.result.deliveryAccepted).toBe(false);
    expect(afterSkew.result.diagnostics.rejectionReason).toBe(
      "descriptor_expired"
    );
    expect(afterSkew.result.pipelineStage).toBe("validate_delivery");
    expect(afterSkew.result.renderDescriptor).toBeNull();
    expectKillSwitchesDisabled(afterSkew.result);
  });

  it("honors exact ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS expiry boundaries", () => {
    expect(ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS).toBe(5_000);

    const accepted = acceptedExecutionResult({
      renderDescriptor: buildDescriptor({
        expiresAt: BOUNDARY_EXPIRES_AT,
      }),
      currentTimestamp: BOUNDARY_EXPIRES_AT,
    });

    const lowerBoundaryMs = BOUNDARY_EXPIRES_AT_MS;
    const upperBoundaryMs =
      BOUNDARY_EXPIRES_AT_MS + ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS;

    const atLower = runInternalDeliveryPilotV1({
      executionResult: accepted,
      currentTimestamp: isoFromMs(lowerBoundaryMs),
    });
    expect(atLower.valid).toBe(true);
    if (atLower.valid) {
      expect(atLower.result.deliveryAccepted).toBe(true);
      expectKillSwitchesDisabled(atLower.result);
    }

    const beforeLower = runInternalDeliveryPilotV1({
      executionResult: accepted,
      currentTimestamp: isoFromMs(lowerBoundaryMs - 1),
    });
    expect(beforeLower.valid).toBe(true);
    if (beforeLower.valid) {
      expect(beforeLower.result.deliveryAccepted).toBe(true);
      expectKillSwitchesDisabled(beforeLower.result);
    }

    const atUpper = runInternalDeliveryPilotV1({
      executionResult: accepted,
      currentTimestamp: isoFromMs(upperBoundaryMs),
    });
    expect(atUpper.valid).toBe(true);
    if (atUpper.valid) {
      expect(atUpper.result.deliveryAccepted).toBe(true);
      expectKillSwitchesDisabled(atUpper.result);
    }

    const afterUpper = runInternalDeliveryPilotV1({
      executionResult: accepted,
      currentTimestamp: isoFromMs(upperBoundaryMs + 1),
    });
    expect(afterUpper.valid).toBe(true);
    if (afterUpper.valid) {
      expect(afterUpper.result.deliveryAccepted).toBe(false);
      expect(afterUpper.result.deliveryRejected).toBe(true);
      expect(afterUpper.result.diagnostics.rejectionReason).toBe(
        "descriptor_expired"
      );
      expect(afterUpper.result.pipelineStage).toBe("validate_delivery");
      expect(afterUpper.result.renderDescriptor).toBeNull();
      expectKillSwitchesDisabled(afterUpper.result);
    }
  });

  it("soft-rejects incomplete tracking identity at validate_delivery", () => {
    const executionResult = acceptedExecutionWithDeliveryDescriptorDefect(
      (descriptor) =>
        ({
          ...descriptor,
          trackingReferences: {
            ...descriptor.trackingReferences,
            creativeId: "",
          },
        }) as AdsRenderDescriptor
    );

    const outcome = runInternalDeliveryPilotV1({
      executionResult,
      currentTimestamp: NOW,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }

    expect(outcome.result.deliveryAccepted).toBe(false);
    expect(outcome.result.deliveryRejected).toBe(true);
    expect(outcome.result.renderDescriptor).toBeNull();
    expect(outcome.result.pipelineStage).toBe("validate_delivery");
    expect(outcome.result.diagnostics.rejectionReason).toBe(
      "identity_incomplete"
    );
    expect(outcome.result.diagnostics.deliveryAccepted).toBe(false);
    expectKillSwitchesDisabled(outcome.result);
  });

  it("soft-rejects placement-incompatible descriptors at validate_delivery", () => {
    const executionResult = acceptedExecutionWithDeliveryDescriptorDefect(
      (descriptor) =>
        ({
          ...descriptor,
          placementId: "WATCH_FEED",
          creativeType: "game_promotion",
        }) as AdsRenderDescriptor
    );

    const outcome = runInternalDeliveryPilotV1({
      executionResult,
      currentTimestamp: NOW,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }

    expect(outcome.result.deliveryAccepted).toBe(false);
    expect(outcome.result.deliveryRejected).toBe(true);
    expect(outcome.result.renderDescriptor).toBeNull();
    expect(outcome.result.pipelineStage).toBe("validate_delivery");
    expect(outcome.result.diagnostics.rejectionReason).toBe(
      "placement_incompatible"
    );
    expect(outcome.result.diagnostics.deliveryAccepted).toBe(false);
    expectKillSwitchesDisabled(outcome.result);
  });

  it("treats candidateId as opaque selection binding and never rewrites descriptor tracking identity", () => {
    const descriptor = buildDescriptor();
    const trackingSnapshot = {
      campaignId: descriptor.trackingReferences.campaignId,
      adSetId: descriptor.trackingReferences.adSetId,
      adId: descriptor.trackingReferences.adId,
      creativeId: descriptor.trackingReferences.creativeId,
    };

    const execution = runAdsExecutionLayerV1({
      candidateId: "opaque-selection-binding-999",
      renderDescriptor: descriptor,
      currentTimestamp: NOW,
    });
    expect(execution.valid).toBe(true);
    if (!execution.valid) {
      return;
    }

    const outcome = runInternalDeliveryPilotV1({
      executionResult: execution.result,
      currentTimestamp: NOW,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }

    expect(outcome.result.candidateId).toBe("opaque-selection-binding-999");
    expect(outcome.result.renderDescriptor?.trackingReferences).toEqual(
      trackingSnapshot
    );
    expectKillSwitchesDisabled(outcome.result);
  });

  it("fails closed on unknown input fields and missing executionResult", () => {
    expect(
      runInternalDeliveryPilotV1({
        ...baseInput(),
        selectedAd: "nope",
      }).valid
    ).toBe(false);

    expect(
      runInternalDeliveryPilotV1({
        currentTimestamp: NOW,
      }).valid
    ).toBe(false);

    expect(runInternalDeliveryPilotV1(null).valid).toBe(false);
  });

  it("rejects client-authoritative identity override fields with no fallback", () => {
    const outcome = runInternalDeliveryPilotV1({
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
    const outcome = runInternalDeliveryPilotV1({
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
          issue.includes("not allowed on internal delivery pilot input")
      )
    ).toBe(true);
    expect(outcome).not.toHaveProperty("result");
  });

  it("hard-fails on inconsistent execution results", () => {
    const executionResult = acceptedExecutionResult();
    const tampered = {
      ...executionResult,
      selectedCandidateId: "not-a-field",
      executionAccepted: true,
      executionRejected: true,
    };
    const outcome = runInternalDeliveryPilotV1({
      executionResult: tampered,
      currentTimestamp: NOW,
    });
    expect(outcome.valid).toBe(false);
    if (outcome.valid) {
      return;
    }
    expect(
      outcome.issues.some((issue) =>
        issue.includes("Inconsistent execution result")
      )
    ).toBe(true);
  });

  it("validateAdsInternalDeliveryInternalResult accepts valid and rejects malformed", () => {
    const accepted = runInternalDeliveryPilotV1(baseInput());
    expect(accepted.valid).toBe(true);
    if (!accepted.valid) {
      return;
    }
    expect(
      validateAdsInternalDeliveryInternalResult(accepted.result, {
        nowMs: NOW_MS,
      })
    ).toEqual({ valid: true });

    expect(validateAdsInternalDeliveryInternalResult(null).valid).toBe(false);
    expect(
      validateAdsInternalDeliveryInternalResult({
        ...accepted.result,
        productionEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsInternalDeliveryInternalResult({
        ...accepted.result,
        executionEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsInternalDeliveryInternalResult({
        ...accepted.result,
        deliveryEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsInternalDeliveryInternalResult({
        ...accepted.result,
        deliveryAccepted: true,
        deliveryRejected: true,
      }).valid
    ).toBe(false);
  });

  it("asserts kill switches on every representative soft-reject path", () => {
    const paths = [
      runInternalDeliveryPilotV1({
        executionResult: rejectedExecutionResult({ expiresAt: EXPIRED }),
        currentTimestamp: NOW,
      }),
      runInternalDeliveryPilotV1({
        executionResult: acceptedExecutionResult({
          renderDescriptor: buildDescriptor({
            expiresAt: BOUNDARY_EXPIRES_AT,
          }),
          currentTimestamp: BOUNDARY_EXPIRES_AT,
        }),
        currentTimestamp: isoFromMs(
          BOUNDARY_EXPIRES_AT_MS + ADS_RENDER_DESCRIPTOR_EXPIRY_SKEW_MS + 1
        ),
      }),
      runInternalDeliveryPilotV1({
        executionResult: acceptedExecutionWithDeliveryDescriptorDefect(
          (descriptor) =>
            ({
              ...descriptor,
              trackingReferences: {
                ...descriptor.trackingReferences,
                creativeId: "",
              },
            }) as AdsRenderDescriptor
        ),
        currentTimestamp: NOW,
      }),
      runInternalDeliveryPilotV1({
        executionResult: acceptedExecutionWithDeliveryDescriptorDefect(
          (descriptor) =>
            ({
              ...descriptor,
              placementId: "WATCH_FEED",
              creativeType: "game_promotion",
            }) as AdsRenderDescriptor
        ),
        currentTimestamp: NOW,
      }),
    ];

    for (const outcome of paths) {
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) {
        continue;
      }
      expect(outcome.result.deliveryAccepted).toBe(false);
      expect(outcome.result.renderDescriptor).toBeNull();
      expectKillSwitchesDisabled(outcome.result);
    }
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
    expect(SOURCE).toMatch(/validateAdsExecutionInternalResult/);
    expect(SOURCE).toMatch(/runInternalDeliveryPilotV1/);
  });
});
