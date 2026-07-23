import { describe, expect, it } from "vitest";
import {
  ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION,
  assertProvenanceMatchesRenderDescriptor,
  assertProvenanceMatchesRenderEligible,
  buildAdsCandidateProvenanceBinding,
  buildAdsCandidateProvenanceBindingToken,
  validateAdsCandidateProvenanceBinding,
} from "./candidateProvenance";
import { ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION } from "./renderDescriptor";
import { buildAdsRenderDescriptor } from "./renderDescriptor";

const NOW_MS = Date.parse("2026-07-23T12:00:00.000Z");

describe("Ads Candidate Provenance Binding V1", () => {
  it("builds a deterministic binding token and freezes productionEnabled false", () => {
    const outcome = buildAdsCandidateProvenanceBinding({
      candidateId: "candidate-1",
      campaignRef: "campaign-1",
      advertiserRef: "advertiser-1",
      creativeRef: "creative-ref-1",
      placementId: "WATCH_FEED",
      adSetRef: "ad-set-1",
      adRef: "ad-1",
      selectionRequestId: "selection-req-1",
      inventorySourceId: "inv-1",
      inventoryRevision: 1,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.provenance.contractVersion).toBe(
      ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION
    );
    expect(outcome.provenance.productionEnabled).toBe(false);
    expect(outcome.provenance.bindingToken).toBe(
      buildAdsCandidateProvenanceBindingToken({
        candidateId: "candidate-1",
        campaignRef: "campaign-1",
        advertiserRef: "advertiser-1",
        creativeRef: "creative-ref-1",
        placementId: "WATCH_FEED",
        adSetRef: "ad-set-1",
        adRef: "ad-1",
        selectionRequestId: "selection-req-1",
        inventorySourceId: "inv-1",
        inventoryRevision: 1,
      })
    );
    expect(validateAdsCandidateProvenanceBinding(outcome.provenance)).toEqual({
      valid: true,
    });
  });

  it("rejects tampered binding tokens and unknown fields", () => {
    const outcome = buildAdsCandidateProvenanceBinding({
      candidateId: "candidate-1",
      campaignRef: "campaign-1",
      advertiserRef: "advertiser-1",
      creativeRef: "creative-ref-1",
      placementId: "WATCH_FEED",
      adSetRef: "ad-set-1",
      adRef: "ad-1",
      selectionRequestId: "selection-req-1",
      inventorySourceId: "inv-1",
      inventoryRevision: 1,
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(
      validateAdsCandidateProvenanceBinding({
        ...outcome.provenance,
        bindingToken: "tampered",
      }).valid
    ).toBe(false);
    expect(
      validateAdsCandidateProvenanceBinding({
        ...outcome.provenance,
        extra: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsCandidateProvenanceBinding({
        ...outcome.provenance,
        productionEnabled: true,
      }).valid
    ).toBe(false);
  });

  it("asserts provenance against eligible candidate and descriptor identity", () => {
    const built = buildAdsCandidateProvenanceBinding({
      candidateId: "candidate-1",
      campaignRef: "campaign-1",
      advertiserRef: "advertiser-1",
      creativeRef: "creative-ref-1",
      placementId: "WATCH_FEED",
      adSetRef: "ad-set-1",
      adRef: "ad-1",
      selectionRequestId: "selection-req-1",
      inventorySourceId: "inv-1",
      inventoryRevision: 1,
    });
    expect(built.valid).toBe(true);
    if (!built.valid) {
      return;
    }

    const eligible = {
      candidateId: "candidate-1",
      campaignRef: "campaign-1",
      advertiserRef: "advertiser-1",
      creativeRef: "creative-ref-1",
      placementId: "WATCH_FEED" as const,
      creativeType: "video" as const,
      adSetRef: "ad-set-1",
      adRef: "ad-1",
      eligibility: {
        campaignActive: true,
        creativeActive: true,
        policyAllowed: true,
        requiresAgeGate: false,
      },
    };
    expect(
      assertProvenanceMatchesRenderEligible(built.provenance, eligible)
    ).toEqual({ valid: true });
    expect(
      assertProvenanceMatchesRenderEligible(built.provenance, {
        ...eligible,
        candidateId: "other",
      }).valid
    ).toBe(false);

    const descriptorOutcome = buildAdsRenderDescriptor(
      {
        descriptorVersion: ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION,
        placementId: "WATCH_FEED",
        creativeReference: "creative-ref-1",
        creativeType: "video",
        mediaReference: "media-ref-1",
        thumbnailReference: null,
        clickDestinationReference: "dest-1",
        disclosure: { label: "Sponsored", mustDisplay: true },
        reportingHandles: {
          impressionHandle: "imp-1",
          clickHandle: "clk-1",
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
        expiresAt: "2026-07-23T13:00:00.000Z",
        productionEnabled: false,
      },
      { nowMs: NOW_MS }
    );
    expect(descriptorOutcome.valid).toBe(true);
    if (!descriptorOutcome.valid) {
      return;
    }
    expect(
      assertProvenanceMatchesRenderDescriptor(
        built.provenance,
        descriptorOutcome.descriptor
      )
    ).toEqual({ valid: true });
  });
});
