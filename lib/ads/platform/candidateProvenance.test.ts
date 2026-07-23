import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_MAX_ID_LENGTH } from "./deliveryContracts";
import {
  ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION,
  ADS_PROVENANCE_FINGERPRINT_PREFIX,
  assertProvenanceMatchesRenderDescriptor,
  assertProvenanceMatchesRenderEligible,
  buildAdsBridgeCandidateProvenance,
  buildAdsCandidateProvenanceBinding,
  buildAdsCandidateProvenanceBindingToken,
  buildAdsCandidateProvenanceFingerprint,
  isAdsIssuedProvenanceBinding,
  validateAdsBridgeCandidateProvenance,
  validateAdsCandidateProvenanceBinding,
} from "./candidateProvenance";
import { ADS_RENDER_DESCRIPTOR_CONTRACT_VERSION } from "./renderDescriptor";
import { buildAdsRenderDescriptor } from "./renderDescriptor";

const NOW_MS = Date.parse("2026-07-23T12:00:00.000Z");

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";
const UUID_C = "33333333-3333-4333-8333-333333333333";
const UUID_D = "44444444-4444-4444-8444-444444444444";
const UUID_E = "55555555-5555-4555-8555-555555555555";

function baseBindingInput(
  overrides: Record<string, unknown> = {}
): Parameters<typeof buildAdsCandidateProvenanceBinding>[0] {
  return {
    candidateId: "ad-1:WATCH_FEED",
    campaignRef: "campaign-1",
    advertiserRef: "advertiser-1",
    creativeRef: "creative-ref-1",
    placementId: "WATCH_FEED",
    domainPlacement: "watch_feed",
    adSetRef: "ad-set-1",
    adRef: "ad-1",
    selectionRequestId: "selection-req-1",
    inventorySourceId: "inv-1",
    inventoryRevision: 1,
    moderationSnapshotRef: "mod-snap-1",
    ...overrides,
  } as Parameters<typeof buildAdsCandidateProvenanceBinding>[0];
}

describe("Ads Candidate Provenance Foundation V1", () => {
  it("builds a bounded fingerprint and freezes productionEnabled false", () => {
    const outcome = buildAdsCandidateProvenanceBinding(baseBindingInput());
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.provenance.contractVersion).toBe(
      ADS_CANDIDATE_PROVENANCE_CONTRACT_VERSION
    );
    expect(outcome.provenance.productionEnabled).toBe(false);
    expect(outcome.provenance.bindingTokenAuthoritative).toBe(false);
    expect(outcome.provenance.provenanceFingerprint).toBe(
      buildAdsCandidateProvenanceFingerprint({
        advertiserRef: "advertiser-1",
        campaignRef: "campaign-1",
        adSetRef: "ad-set-1",
        creativeRef: "creative-ref-1",
        adRef: "ad-1",
        domainPlacement: "watch_feed",
        placementId: "WATCH_FEED",
        candidateId: "ad-1:WATCH_FEED",
      })
    );
    expect(outcome.provenance.bindingToken).toBe(
      outcome.provenance.provenanceFingerprint
    );
    expect(outcome.provenance.bindingToken).toBe(
      buildAdsCandidateProvenanceBindingToken({
        advertiserRef: "advertiser-1",
        campaignRef: "campaign-1",
        adSetRef: "ad-set-1",
        creativeRef: "creative-ref-1",
        adRef: "ad-1",
        domainPlacement: "watch_feed",
        placementId: "WATCH_FEED",
        candidateId: "ad-1:WATCH_FEED",
      })
    );
    expect(outcome.provenance.bindingToken.startsWith(ADS_PROVENANCE_FINGERPRINT_PREFIX)).toBe(
      true
    );
    expect(outcome.provenance.bindingToken.length).toBeLessThanOrEqual(
      ADS_DELIVERY_MAX_ID_LENGTH
    );
    expect(outcome.provenance.bindingToken.includes("|")).toBe(false);
    expect(isAdsIssuedProvenanceBinding(outcome.provenance)).toBe(true);
    expect(validateAdsCandidateProvenanceBinding(outcome.provenance)).toEqual({
      valid: true,
    });
  });

  it("keeps UUID-dense provenance within bindingToken length limits", () => {
    const candidateId = `${UUID_E}:WATCH_FEED`;
    const outcome = buildAdsCandidateProvenanceBinding(
      baseBindingInput({
        candidateId,
        campaignRef: UUID_C,
        advertiserRef: UUID_A,
        creativeRef: UUID_D,
        adSetRef: UUID_B,
        adRef: UUID_E,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }
    expect(outcome.provenance.bindingToken.length).toBeLessThanOrEqual(
      ADS_DELIVERY_MAX_ID_LENGTH
    );
    expect(outcome.provenance.advertiserRef).toBe(UUID_A);
    expect(outcome.provenance.campaignRef).toBe(UUID_C);
    expect(validateAdsCandidateProvenanceBinding(outcome.provenance).valid).toBe(
      true
    );
  });

  it("is deterministic for identical binding + placement and differs otherwise", () => {
    const a = buildAdsCandidateProvenanceFingerprint({
      advertiserRef: UUID_A,
      campaignRef: UUID_C,
      adSetRef: UUID_B,
      creativeRef: UUID_D,
      adRef: UUID_E,
      domainPlacement: "watch_feed",
      placementId: "WATCH_FEED",
      candidateId: `${UUID_E}:WATCH_FEED`,
    });
    const b = buildAdsCandidateProvenanceFingerprint({
      advertiserRef: UUID_A,
      campaignRef: UUID_C,
      adSetRef: UUID_B,
      creativeRef: UUID_D,
      adRef: UUID_E,
      domainPlacement: "watch_feed",
      placementId: "WATCH_FEED",
      candidateId: `${UUID_E}:WATCH_FEED`,
    });
    const differentPlacement = buildAdsCandidateProvenanceFingerprint({
      advertiserRef: UUID_A,
      campaignRef: UUID_C,
      adSetRef: UUID_B,
      creativeRef: UUID_D,
      adRef: UUID_E,
      domainPlacement: "search_results",
      placementId: "SEARCH",
      candidateId: `${UUID_E}:SEARCH`,
    });
    const differentBinding = buildAdsCandidateProvenanceFingerprint({
      advertiserRef: UUID_A,
      campaignRef: UUID_C,
      adSetRef: UUID_B,
      creativeRef: UUID_D,
      adRef: "99999999-9999-4999-8999-999999999999",
      domainPlacement: "watch_feed",
      placementId: "WATCH_FEED",
      candidateId: "99999999-9999-4999-8999-999999999999:WATCH_FEED",
    });
    expect(a).toBe(b);
    expect(a).not.toBe(differentPlacement);
    expect(a).not.toBe(differentBinding);
  });

  it("rejects tampered digests, forged authority, and unknown fields", () => {
    const outcome = buildAdsCandidateProvenanceBinding(baseBindingInput());
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
        provenanceFingerprint: "tampered",
      }).valid
    ).toBe(false);
    expect(
      validateAdsCandidateProvenanceBinding({
        ...outcome.provenance,
        bindingTokenAuthoritative: true,
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
    expect(
      isAdsIssuedProvenanceBinding({ ...outcome.provenance })
    ).toBe(false);
  });

  it("fails closed on missing or malformed identity fields", () => {
    expect(
      buildAdsCandidateProvenanceBinding(
        baseBindingInput({ advertiserRef: "" })
      ).valid
    ).toBe(false);
    expect(
      buildAdsCandidateProvenanceBinding(
        baseBindingInput({ domainPlacement: "" })
      ).valid
    ).toBe(false);
    expect(
      buildAdsCandidateProvenanceBinding(
        baseBindingInput({ placementId: "NOT_A_PLACEMENT" as never })
      ).valid
    ).toBe(false);
  });

  it("builds bridge provenance and rejects candidate/placement disagreement", () => {
    const ok = buildAdsBridgeCandidateProvenance({
      advertiserAccountId: UUID_A,
      campaignId: UUID_C,
      adSetId: UUID_B,
      creativeId: UUID_D,
      adId: UUID_E,
      domainPlacement: "watch_feed",
      placementId: "WATCH_FEED",
      candidateId: `${UUID_E}:WATCH_FEED`,
      inventorySource: "catalog",
      moderationSnapshotRef: "mod:1",
    });
    expect(ok.valid).toBe(true);
    if (!ok.valid) return;
    expect(validateAdsBridgeCandidateProvenance(ok.provenance).valid).toBe(true);
    expect(ok.provenance.bindingTokenAuthoritative).toBe(false);
    expect(ok.provenance.provenanceFingerprint.length).toBeLessThanOrEqual(
      ADS_DELIVERY_MAX_ID_LENGTH
    );

    const badCandidate = buildAdsBridgeCandidateProvenance({
      advertiserAccountId: UUID_A,
      campaignId: UUID_C,
      adSetId: UUID_B,
      creativeId: UUID_D,
      adId: UUID_E,
      domainPlacement: "watch_feed",
      placementId: "WATCH_FEED",
      candidateId: "wrong:WATCH_FEED",
      inventorySource: "catalog",
      moderationSnapshotRef: "mod:1",
    });
    expect(badCandidate.valid).toBe(false);
  });

  it("asserts provenance against eligible candidate and descriptor identity", () => {
    const built = buildAdsCandidateProvenanceBinding(baseBindingInput());
    expect(built.valid).toBe(true);
    if (!built.valid) {
      return;
    }

    const eligible = {
      candidateId: "ad-1:WATCH_FEED",
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
