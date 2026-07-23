import { describe, expect, it } from "vitest";
import {
  ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
  runAdsCandidateSelection,
} from "./candidateSelection";
import {
  ADS_SELECTION_RENDER_ADAPTER_CONTRACT_VERSION,
  adaptAdsSelectionToRenderEligible,
  validateAdsSelectionRenderAdapterResult,
} from "./selectionRenderAdapter";

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

describe("Ads Selection → Render Adapter V1", () => {
  it("adapts an eligible selection candidate into render input + provenance", () => {
    const inventory = baseInventory();
    const selection = runAdsCandidateSelection(inventory, baseContext());
    expect(selection.valid).toBe(true);
    if (!selection.valid) {
      return;
    }

    const outcome = adaptAdsSelectionToRenderEligible({
      inventory,
      selectionResult: selection.result,
      candidateId: "candidate-1",
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) {
      return;
    }

    expect(outcome.result.contractVersion).toBe(
      ADS_SELECTION_RENDER_ADAPTER_CONTRACT_VERSION
    );
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.eligibleCandidate).toEqual({
      candidateId: "candidate-1",
      campaignRef: "campaign-1",
      advertiserRef: "advertiser-1",
      creativeRef: "creative-ref-1",
      placementId: "WATCH_FEED",
      creativeType: "video",
      adSetRef: "ad-set-1",
      adRef: "ad-1",
      eligibility: {
        campaignActive: true,
        creativeActive: true,
        policyAllowed: true,
        requiresAgeGate: false,
      },
    });
    expect(outcome.result.provenance.candidateId).toBe("candidate-1");
    expect(outcome.result.provenance.adSetRef).toBe("ad-set-1");
    expect(outcome.result.provenance.adRef).toBe("ad-1");
    expect(outcome.result.provenance.bindingToken.length).toBeGreaterThan(0);
    expect(validateAdsSelectionRenderAdapterResult(outcome.result)).toEqual({
      valid: true,
    });
  });

  it("rejects candidates not in the eligible set (no client reconstruction)", () => {
    const inventory = baseInventory({
      candidates: [
        baseCandidate(),
        baseCandidate({
          candidateId: "candidate-2",
          creativeRef: "creative-ref-2",
          eligibility: baseEligibility({ campaignActive: false }),
        }),
      ],
    });
    const selection = runAdsCandidateSelection(inventory, baseContext());
    expect(selection.valid).toBe(true);
    if (!selection.valid) {
      return;
    }
    expect(
      selection.result.eligibleCandidates.map((c) => c.candidateId)
    ).toEqual(["candidate-1"]);

    const rejected = adaptAdsSelectionToRenderEligible({
      inventory,
      selectionResult: selection.result,
      candidateId: "candidate-2",
    });
    expect(rejected.valid).toBe(false);
    if (rejected.valid) {
      return;
    }
    expect(
      rejected.issues.some((issue) =>
        issue.includes("not present in selectionResult.eligibleCandidates")
      )
    ).toBe(true);
  });

  it("rejects caller-supplied adSetRef/adRef as unknown fields", () => {
    const inventory = baseInventory();
    const selection = runAdsCandidateSelection(inventory, baseContext());
    expect(selection.valid).toBe(true);
    if (!selection.valid) {
      return;
    }

    expect(
      adaptAdsSelectionToRenderEligible({
        inventory,
        selectionResult: selection.result,
        candidateId: "candidate-1",
        adSetRef: "hijack-adset",
        adRef: "hijack-ad",
      }).valid
    ).toBe(false);
  });

  it("fails closed when inventory markers diverge from selection diagnostics", () => {
    const inventory = baseInventory();
    const selection = runAdsCandidateSelection(inventory, baseContext());
    expect(selection.valid).toBe(true);
    if (!selection.valid) {
      return;
    }

    const mismatched = adaptAdsSelectionToRenderEligible({
      inventory: baseInventory({ revision: 99 }),
      selectionResult: selection.result,
      candidateId: "candidate-1",
    });
    expect(mismatched.valid).toBe(false);
  });

  it("rejects unknown fields", () => {
    const inventory = baseInventory();
    const selection = runAdsCandidateSelection(inventory, baseContext());
    expect(selection.valid).toBe(true);
    if (!selection.valid) {
      return;
    }

    expect(
      adaptAdsSelectionToRenderEligible({
        inventory,
        selectionResult: selection.result,
        candidateId: "candidate-1",
        extra: true,
      }).valid
    ).toBe(false);
  });
});
