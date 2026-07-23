import { describe, expect, it } from "vitest";
import {
  ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
  type AdsRenderDescriptor,
} from "./renderDescriptor";
import {
  ADS_RENDER_DESCRIPTOR_PIPELINE_CONTRACT_VERSION,
  ADS_RENDER_DESCRIPTOR_PIPELINE_REJECTION_REASONS,
  ADS_RENDER_DESCRIPTOR_PIPELINE_STAGES,
  deriveAdsRenderTrackingReferences,
  evaluateAdsRenderCandidateEligibility,
  listAdsRenderDescriptorPipelineRejectionReasons,
  listAdsRenderDescriptorPipelineStages,
  runAdsRenderDescriptorPipeline,
  validateAdsRenderDescriptorPipelineResult,
  type AdsRenderEligibleCandidate,
} from "./renderDescriptorPipeline";

const NOW = "2026-07-23T12:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const EXPIRES = "2026-07-23T13:00:00.000Z";

function baseEligibility(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    campaignActive: true,
    creativeActive: true,
    policyAllowed: true,
    requiresAgeGate: false,
    ...overrides,
  };
}

function baseEligibleCandidate(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    candidateId: "candidate-1",
    campaignRef: "campaign-1",
    advertiserRef: "advertiser-1",
    creativeRef: "creative-ref-1",
    placementId: "WATCH_FEED",
    creativeType: "video",
    adSetRef: "ad-set-1",
    adRef: "ad-1",
    eligibility: baseEligibility(),
    ...overrides,
  };
}

function basePlacementDescriptor(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    placementId: "WATCH_FEED",
    ...overrides,
  };
}

function baseCreativeDescriptor(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    creativeReference: "creative-ref-1",
    creativeType: "video",
    mediaReference: "media-ref-1",
    thumbnailReference: "thumb-ref-1",
    clickDestinationReference: "destination-ref-1",
    ...overrides,
  };
}

function basePipelineInput(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    eligibleCandidate: baseEligibleCandidate(),
    placementDescriptor: basePlacementDescriptor(),
    creativeDescriptor: baseCreativeDescriptor(),
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
    viewerAgeGatePassed: true,
    ...overrides,
  };
}

describe("Ads Render Descriptor Pipeline V1 Hardening", () => {
  it("exposes stable contract stages and reachable rejection reasons", () => {
    expect(listAdsRenderDescriptorPipelineStages()).toEqual([
      "validate",
      "bind_placement",
      "bind_creative",
      "build_descriptor",
      "result",
    ]);
    expect(ADS_RENDER_DESCRIPTOR_PIPELINE_STAGES).toEqual(
      listAdsRenderDescriptorPipelineStages()
    );
    expect(listAdsRenderDescriptorPipelineRejectionReasons()).toEqual([
      "candidate_ineligible",
      "placement_mismatch",
      "creative_mismatch",
      "placement_incompatible",
      "unsupported_creative",
      "invalid_descriptor",
    ]);
    expect(ADS_RENDER_DESCRIPTOR_PIPELINE_REJECTION_REASONS).not.toContain(
      "invalid_contract"
    );
  });

  it("converts an eligible candidate into a typed render descriptor", () => {
    const outcome = runAdsRenderDescriptorPipeline(basePipelineInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }

    expect(outcome.result.contractVersion).toBe(
      ADS_RENDER_DESCRIPTOR_PIPELINE_CONTRACT_VERSION
    );
    expect(outcome.result.renderAccepted).toBe(true);
    expect(outcome.result.renderRejected).toBe(false);
    expect(outcome.result.pipelineStage).toBe("result");
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
    expect(outcome.result.diagnostics).toEqual({
      candidateId: "candidate-1",
      candidatePlacementId: "WATCH_FEED",
      bindingPlacementId: "WATCH_FEED",
      creativeType: "video",
      creativeReference: "creative-ref-1",
      bindingAccepted: true,
      rejectionReason: null,
    });

    const descriptor = outcome.result.renderDescriptor as AdsRenderDescriptor;
    expect(descriptor).not.toBeNull();
    expect(descriptor.descriptorVersion).toBe(
      ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION
    );
    expect(descriptor.placementId).toBe("WATCH_FEED");
    expect(descriptor.creativeReference).toBe("creative-ref-1");
    expect(descriptor.creativeType).toBe("video");
    expect(descriptor.trackingReferences).toEqual({
      campaignId: "campaign-1",
      adSetId: "ad-set-1",
      adId: "ad-1",
      creativeId: "creative-ref-1",
    });
    expect(descriptor.productionEnabled).toBe(false);
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.diagnostics)).toBe(true);
    expect(Object.isFrozen(descriptor)).toBe(true);

    expect(
      validateAdsRenderDescriptorPipelineResult(outcome.result, {
        nowMs: NOW_MS,
      })
    ).toEqual({ valid: true });
  });

  it("derives tracking identity only from the authoritative candidate", () => {
    const omitted = runAdsRenderDescriptorPipeline(basePipelineInput());
    expect(omitted.valid).toBe(true);
    if (!omitted.valid) {
      return;
    }
    expect(omitted.result.renderDescriptor?.trackingReferences).toEqual({
      campaignId: "campaign-1",
      adSetId: "ad-set-1",
      adId: "ad-1",
      creativeId: "creative-ref-1",
    });

    const matchingEcho = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        trackingReferences: {
          campaignId: "campaign-1",
          adSetId: "ad-set-1",
          adId: "ad-1",
          creativeId: "creative-ref-1",
        },
      })
    );
    expect(matchingEcho.valid).toBe(true);
    if (!matchingEcho.valid || !omitted.valid) {
      return;
    }
    expect(JSON.stringify(matchingEcho.result.renderDescriptor)).toBe(
      JSON.stringify(omitted.result.renderDescriptor)
    );
    expect(matchingEcho.result.renderDescriptor?.trackingReferences).toEqual(
      omitted.result.renderDescriptor?.trackingReferences
    );

    const mismatched = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        trackingReferences: {
          campaignId: "override-campaign",
          adSetId: "ad-set-1",
          adId: "ad-1",
          creativeId: "creative-ref-1",
        },
      })
    );
    expect(mismatched.valid).toBe(false);
    if (!mismatched.valid) {
      expect(
        mismatched.issues.some((issue) =>
          issue.includes("trackingReferences.campaignId must match")
        )
      ).toBe(true);
      expect(
        mismatched.issues.some((issue) => issue.includes("no override"))
      ).toBe(true);
    }

    const candidate = baseEligibleCandidate() as unknown as AdsRenderEligibleCandidate;
    expect(deriveAdsRenderTrackingReferences(candidate)).toEqual({
      campaignId: "campaign-1",
      adSetId: "ad-set-1",
      adId: "ad-1",
      creativeId: "creative-ref-1",
    });
  });

  it("rejects ineligible candidates fail-closed at validate", () => {
    const inactiveCampaign = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        eligibleCandidate: baseEligibleCandidate({
          eligibility: baseEligibility({ campaignActive: false }),
        }),
      })
    );
    expect(inactiveCampaign.valid).toBe(true);
    if (inactiveCampaign.valid) {
      expect(inactiveCampaign.result.renderAccepted).toBe(false);
      expect(inactiveCampaign.result.pipelineStage).toBe("validate");
      expect(inactiveCampaign.result.diagnostics.rejectionReason).toBe(
        "candidate_ineligible"
      );
      expect(inactiveCampaign.result.renderDescriptor).toBeNull();
    }

    const inactiveCreative = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        eligibleCandidate: baseEligibleCandidate({
          eligibility: baseEligibility({ creativeActive: false }),
        }),
      })
    );
    expect(inactiveCreative.valid).toBe(true);
    if (inactiveCreative.valid) {
      expect(inactiveCreative.result.diagnostics.rejectionReason).toBe(
        "candidate_ineligible"
      );
    }

    const policyBlocked = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        eligibleCandidate: baseEligibleCandidate({
          eligibility: baseEligibility({ policyAllowed: false }),
        }),
      })
    );
    expect(policyBlocked.valid).toBe(true);
    if (policyBlocked.valid) {
      expect(policyBlocked.result.diagnostics.rejectionReason).toBe(
        "candidate_ineligible"
      );
    }

    const ageGated = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        eligibleCandidate: baseEligibleCandidate({
          eligibility: baseEligibility({ requiresAgeGate: true }),
        }),
        viewerAgeGatePassed: false,
      })
    );
    expect(ageGated.valid).toBe(true);
    if (ageGated.valid) {
      expect(ageGated.result.pipelineStage).toBe("validate");
      expect(ageGated.result.diagnostics.rejectionReason).toBe(
        "candidate_ineligible"
      );
    }

    expect(
      evaluateAdsRenderCandidateEligibility(
        {
          campaignActive: true,
          creativeActive: true,
          policyAllowed: true,
          requiresAgeGate: true,
        },
        true
      )
    ).toBeNull();
  });

  it("rejects unknown placement and missing bindings hard-fail", () => {
    const unknownPlacement = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        eligibleCandidate: baseEligibleCandidate({
          placementId: "NOT_A_PLACEMENT",
        }),
      })
    );
    expect(unknownPlacement.valid).toBe(false);
    if (!unknownPlacement.valid) {
      expect(
        unknownPlacement.issues.some((issue) =>
          issue.includes("eligibleCandidate.placementId")
        )
      ).toBe(true);
    }

    const missingPlacement = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        placementDescriptor: undefined,
      })
    );
    expect(missingPlacement.valid).toBe(false);
    if (!missingPlacement.valid) {
      expect(
        missingPlacement.issues.some((issue) =>
          issue.includes("placementDescriptor")
        )
      ).toBe(true);
    }

    const { placementDescriptor: _removedPlacement, ...withoutPlacement } =
      basePipelineInput();
    expect(runAdsRenderDescriptorPipeline(withoutPlacement).valid).toBe(false);

    const { creativeDescriptor: _removedCreative, ...withoutCreative } =
      basePipelineInput();
    const missingCreative = runAdsRenderDescriptorPipeline(withoutCreative);
    expect(missingCreative.valid).toBe(false);
    if (!missingCreative.valid) {
      expect(
        missingCreative.issues.some((issue) =>
          issue.includes("creativeDescriptor")
        )
      ).toBe(true);
    }
  });

  it("rejects placement descriptor mismatches with unambiguous diagnostics", () => {
    const outcome = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        placementDescriptor: basePlacementDescriptor({
          placementId: "DISCOVER_FEED",
        }),
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.renderAccepted).toBe(false);
    expect(outcome.result.pipelineStage).toBe("bind_placement");
    expect(outcome.result.diagnostics.rejectionReason).toBe(
      "placement_mismatch"
    );
    expect(outcome.result.diagnostics.candidatePlacementId).toBe("WATCH_FEED");
    expect(outcome.result.diagnostics.bindingPlacementId).toBe("DISCOVER_FEED");
    expect(
      Object.prototype.hasOwnProperty.call(
        outcome.result.diagnostics,
        "placementId"
      )
    ).toBe(false);
  });

  it("rejects creative allowlist and registry incompatibilities", () => {
    const allowlist = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        placementDescriptor: basePlacementDescriptor({
          acceptedCreativeTypes: ["image"],
        }),
      })
    );
    expect(allowlist.valid).toBe(true);
    if (allowlist.valid) {
      expect(allowlist.result.pipelineStage).toBe("bind_placement");
      expect(allowlist.result.diagnostics.rejectionReason).toBe(
        "unsupported_creative"
      );
    }

    const incompatible = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        eligibleCandidate: baseEligibleCandidate({
          placementId: "WATCH_FEED",
          creativeType: "text",
        }),
        placementDescriptor: basePlacementDescriptor({
          placementId: "WATCH_FEED",
        }),
        creativeDescriptor: baseCreativeDescriptor({
          creativeType: "text",
          creativeReference: "creative-ref-1",
        }),
      })
    );
    expect(incompatible.valid).toBe(true);
    if (incompatible.valid) {
      expect(incompatible.result.pipelineStage).toBe("bind_placement");
      expect(incompatible.result.diagnostics.rejectionReason).toBe(
        "placement_incompatible"
      );
    }
  });

  it("rejects creative descriptor binding mismatches", () => {
    const refMismatch = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        creativeDescriptor: baseCreativeDescriptor({
          creativeReference: "other-creative",
        }),
      })
    );
    expect(refMismatch.valid).toBe(true);
    if (refMismatch.valid) {
      expect(refMismatch.result.pipelineStage).toBe("bind_creative");
      expect(refMismatch.result.diagnostics.rejectionReason).toBe(
        "creative_mismatch"
      );
    }

    const typeMismatch = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        creativeDescriptor: baseCreativeDescriptor({
          creativeType: "image",
        }),
      })
    );
    expect(typeMismatch.valid).toBe(true);
    if (typeMismatch.valid) {
      expect(typeMismatch.result.pipelineStage).toBe("bind_creative");
      expect(typeMismatch.result.diagnostics.rejectionReason).toBe(
        "creative_mismatch"
      );
    }
  });

  it("soft-rejects invalid descriptors at build_descriptor", () => {
    const outcome = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        expiresAt: "2026-07-23T11:00:00.000Z",
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.result.renderAccepted).toBe(false);
    expect(outcome.result.pipelineStage).toBe("build_descriptor");
    expect(outcome.result.diagnostics.rejectionReason).toBe(
      "invalid_descriptor"
    );
    expect(outcome.result.renderDescriptor).toBeNull();
  });

  it("hard-fails malformed input and unknown fields", () => {
    expect(runAdsRenderDescriptorPipeline(null).valid).toBe(false);
    expect(runAdsRenderDescriptorPipeline("nope").valid).toBe(false);

    const unknownField = runAdsRenderDescriptorPipeline(
      basePipelineInput({ extraField: true })
    );
    expect(unknownField.valid).toBe(false);

    const duplicateHandles = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        impressionHandle: "same-handle",
        clickHandle: "same-handle",
      })
    );
    expect(duplicateHandles.valid).toBe(false);

    const urlMaterial = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        creativeDescriptor: baseCreativeDescriptor({
          mediaReference: "https://cdn.example.com/video.mp4",
        }),
      })
    );
    expect(urlMaterial.valid).toBe(false);

    const missingEligibility = runAdsRenderDescriptorPipeline(
      basePipelineInput({
        eligibleCandidate: {
          ...baseEligibleCandidate(),
          eligibility: undefined,
        },
      })
    );
    expect(missingEligibility.valid).toBe(false);
  });

  it("does not mutate input candidate or binding objects", () => {
    const input = basePipelineInput({
      placementDescriptor: basePlacementDescriptor({
        acceptedCreativeTypes: ["video", "image"],
      }),
    });
    const snapshot = structuredClone(input);

    const outcome = runAdsRenderDescriptorPipeline(input);
    expect(outcome.valid).toBe(true);
    expect(input).toEqual(snapshot);
    expect(input.eligibleCandidate).toEqual(snapshot.eligibleCandidate);
    expect(input.placementDescriptor).toEqual(snapshot.placementDescriptor);
    expect(input.creativeDescriptor).toEqual(snapshot.creativeDescriptor);
  });

  it("produces deterministic output for identical inputs", () => {
    const input = basePipelineInput({
      cacheHints: {
        cacheable: true,
        maxAgeSeconds: 60,
        cacheKey: "deterministic-key",
      },
    });
    const first = runAdsRenderDescriptorPipeline(input);
    const second = runAdsRenderDescriptorPipeline(structuredClone(input));
    expect(first.valid).toBe(true);
    expect(second.valid).toBe(true);
    if (!first.valid || !second.valid) {
      return;
    }
    expect(JSON.stringify(first.result)).toBe(JSON.stringify(second.result));
    expect(first.result).toEqual(second.result);
  });

  it("keeps accepted results immutable and production-disabled", () => {
    const outcome = runAdsRenderDescriptorPipeline(basePipelineInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid || outcome.result.renderDescriptor === null) {
      return;
    }

    expect(() => {
      (outcome.result as { renderAccepted: boolean }).renderAccepted = false;
    }).toThrow();
    expect(() => {
      (outcome.result.diagnostics as { candidateId: string }).candidateId =
        "mutated";
    }).toThrow();
    expect(() => {
      (
        outcome.result.renderDescriptor as { creativeReference: string }
      ).creativeReference = "mutated";
    }).toThrow();
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.deliveryEnabled).toBe(false);
  });

  it("validates pipeline result contracts fail-closed", () => {
    const accepted = runAdsRenderDescriptorPipeline(basePipelineInput());
    expect(accepted.valid).toBe(true);
    if (!accepted.valid) {
      return;
    }

    expect(
      validateAdsRenderDescriptorPipelineResult({
        ...accepted.result,
        renderAccepted: true,
        renderRejected: true,
      })
    ).toEqual(
      expect.objectContaining({
        valid: false,
      })
    );

    expect(
      validateAdsRenderDescriptorPipelineResult({
        ...accepted.result,
        productionEnabled: true,
      })
    ).toEqual(
      expect.objectContaining({
        valid: false,
      })
    );

    expect(validateAdsRenderDescriptorPipelineResult(null)).toEqual({
      valid: false,
      issues: ["Render descriptor pipeline result must be an object."],
    });
  });
});
