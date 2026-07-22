import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ADS_DELIVERY_ENABLED } from "../constants";
import {
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
  ADS_DELIVERY_MAX_CANDIDATES,
  ADS_DELIVERY_MAX_ID_LENGTH,
  ADS_DELIVERY_MAX_REQUEST_BYTES,
  freezeDeliveryRequest,
  validateDeliveryRequest,
  type AdsDeliveryRequest,
} from "./deliveryContracts";
import {
  ADS_DELIVERY_EXCLUSION_REASONS,
  createEmptyEligibilityResult,
  isAdsDeliveryExclusionReason,
  validateDeliveryEligibilityResult,
  type AdsDeliveryEligibilityResult,
} from "./deliveryEligibilityContracts";
import {
  createEmptySelectionResult,
  validateDeliverySelectionResult,
  type AdsDeliverySelectionResult,
} from "./deliverySelectionContracts";
import {
  ADS_PLACEMENT_REGISTRY,
  validateAdsPlacementRegistry,
} from "./placementRegistry";

function baseCandidate(id = "candidate-1") {
  return {
    candidateId: id,
    campaignId: "campaign-1",
    adSetId: "ad-set-1",
    adId: "ad-1",
    creativeId: "creative-1",
  };
}

function baseRequest(
  overrides: Partial<AdsDeliveryRequest> = {}
): AdsDeliveryRequest {
  return {
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    placementId: "WATCH_FEED",
    candidates: [baseCandidate()],
    viewer: { opaqueViewerId: "viewer-opaque-1" },
    geo: { countryCode: "US", regionCode: "CA" },
    languageCode: "en",
    deviceClass: "mobile",
    featureFlags: {
      ADS_DELIVERY_ENABLED: false,
      ADS_PLACEMENT_WATCH_FEED_ENABLED: false,
    },
    currentTimestamp: "2026-07-22T08:59:30.000Z",
    experiment: {
      experimentKey: "delivery-pilot",
      armId: "control",
    },
    ...overrides,
  };
}

function baseEligibilitySuccess(
  overrides: Partial<{
    contractVersion: typeof ADS_DELIVERY_ENGINE_CONTRACT_VERSION;
    eligibleCandidates: AdsDeliveryEligibilityResult["eligibleCandidates"];
    excludedCandidates: AdsDeliveryEligibilityResult["excludedCandidates"];
    productionEnabled: false;
  }> = {}
): AdsDeliveryEligibilityResult {
  return {
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    status: "eligible",
    eligibleCandidates: [{ candidateId: "candidate-1" }],
    excludedCandidates: [
      { candidateId: "candidate-2", reason: "geo_mismatch" },
    ],
    productionEnabled: false,
    ...overrides,
  };
}

function baseSelection(
  overrides: Partial<AdsDeliverySelectionResult> = {}
): AdsDeliverySelectionResult {
  return {
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    selectedCandidateId: "candidate-1",
    evaluatedCandidateCount: 3,
    rejectedCandidateCount: 2,
    exclusionSummary: {
      geo_mismatch: 1,
      language_mismatch: 1,
    },
    productionEnabled: false,
    ...overrides,
  };
}

describe("Ads Delivery Engine Contracts V1", () => {
  it("accepts a valid delivery request", () => {
    expect(validateDeliveryRequest(baseRequest())).toEqual({ valid: true });
  });

  it("rejects invalid contract versions", () => {
    const result = validateDeliveryRequest({
      ...baseRequest(),
      contractVersion: "v0",
    } as unknown);
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("contractVersion"))).toBe(
        true
      );
    }
  });

  it("rejects invalid placements using the platform registry", () => {
    expect(validateAdsPlacementRegistry()).toEqual([]);
    expect(ADS_PLACEMENT_REGISTRY.WATCH_FEED.id).toBe("WATCH_FEED");

    const result = validateDeliveryRequest({
      ...baseRequest(),
      placementId: "stories",
    } as unknown);
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("placementId"))).toBe(
        true
      );
    }
  });

  it("rejects duplicate candidate IDs", () => {
    const result = validateDeliveryRequest(
      baseRequest({
        candidates: [baseCandidate("dup"), baseCandidate("dup")],
      })
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("duplicate"))).toBe(
        true
      );
    }
  });

  it("rejects empty candidates", () => {
    const result = validateDeliveryRequest(baseRequest({ candidates: [] }));
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("empty"))).toBe(true);
    }
  });

  it("rejects oversized candidate payloads", () => {
    const tooMany = Array.from({ length: ADS_DELIVERY_MAX_CANDIDATES + 1 }, (_, i) =>
      baseCandidate(`candidate-${i}`)
    );
    const result = validateDeliveryRequest(baseRequest({ candidates: tooMany }));
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("max count"))
      ).toBe(true);
    }
  });

  it("rejects oversized serialized request payloads", () => {
    const bloatedFlags: Record<string, boolean> = {};
    // Keep under key-count limit but exceed byte budget with long keys.
    for (let i = 0; i < 16; i += 1) {
      bloatedFlags[`flag_${"x".repeat(5000)}_${i}`] = false;
    }
    const result = validateDeliveryRequest(
      baseRequest({ featureFlags: bloatedFlags })
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(
        result.issues.some(
          (issue) =>
            issue.includes("max serialized size") ||
            issue.includes("max key count")
        )
      ).toBe(true);
    }
    expect(ADS_DELIVERY_MAX_REQUEST_BYTES).toBeGreaterThan(0);
  });

  it("rejects oversized candidate ids", () => {
    const oversized = "c".repeat(ADS_DELIVERY_MAX_ID_LENGTH + 1);
    const result = validateDeliveryRequest(
      baseRequest({
        candidates: [
          {
            ...baseCandidate(),
            candidateId: oversized,
          },
        ],
      })
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("candidateId"))).toBe(
        true
      );
    }
  });

  it("rejects invalid geo and language shapes", () => {
    const badGeo = validateDeliveryRequest(
      baseRequest({
        geo: { countryCode: "usa" },
      })
    );
    expect(badGeo).toMatchObject({ valid: false });

    const badLanguage = validateDeliveryRequest(
      baseRequest({ languageCode: "!!" })
    );
    expect(badLanguage).toMatchObject({ valid: false });
  });

  it("freezes request snapshots for immutable contract behavior", () => {
    const frozen = freezeDeliveryRequest(baseRequest());
    expect(Object.isFrozen(frozen)).toBe(true);
    expect(Object.isFrozen(frozen.candidates)).toBe(true);
    expect(Object.isFrozen(frozen.candidates[0])).toBe(true);
    expect(Object.isFrozen(frozen.viewer)).toBe(true);
    expect(Object.isFrozen(frozen.featureFlags)).toBe(true);

    expect(() => {
      (frozen as { placementId: string }).placementId = "SEARCH";
    }).toThrow();
  });
});

describe("Ads Delivery Eligibility Contracts V1", () => {
  it("accepts a successful eligibility result", () => {
    expect(validateDeliveryEligibilityResult(baseEligibilitySuccess())).toEqual(
      { valid: true }
    );
  });

  it("accepts an empty eligibility result", () => {
    const empty = createEmptyEligibilityResult([
      { candidateId: "candidate-1", reason: "delivery_disabled" },
    ]);
    expect(validateDeliveryEligibilityResult(empty)).toEqual({ valid: true });
    expect(empty.productionEnabled).toBe(false);
    expect(empty.status).toBe("empty");
    expect(Object.isFrozen(empty)).toBe(true);
  });

  it("rejects invalid exclusion reasons", () => {
    expect(isAdsDeliveryExclusionReason("geo_mismatch")).toBe(true);
    expect(isAdsDeliveryExclusionReason("not_a_reason")).toBe(false);
    expect(ADS_DELIVERY_EXCLUSION_REASONS).toContain("unknown");

    const result = validateDeliveryEligibilityResult(
      baseEligibilitySuccess({
        excludedCandidates: [
          {
            candidateId: "candidate-2",
            reason: "not_a_reason",
          } as unknown as {
            candidateId: string;
            reason: "geo_mismatch";
          },
        ],
      })
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("reason"))).toBe(
        true
      );
    }
  });

  it("requires productionEnabled to remain false", () => {
    const result = validateDeliveryEligibilityResult({
      ...baseEligibilitySuccess(),
      productionEnabled: true,
    } as unknown);
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("productionEnabled"))
      ).toBe(true);
    }
  });

  it("rejects duplicate candidate ids across eligible and excluded", () => {
    const result = validateDeliveryEligibilityResult(
      baseEligibilitySuccess({
        eligibleCandidates: [{ candidateId: "same" }],
        excludedCandidates: [{ candidateId: "same", reason: "unknown" }],
      })
    );
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(result.issues.some((issue) => issue.includes("duplicate"))).toBe(
        true
      );
    }
  });
});

describe("Ads Delivery Selection Contracts V1", () => {
  it("accepts a valid selection result with productionEnabled false", () => {
    const result = baseSelection();
    expect(validateDeliverySelectionResult(result)).toEqual({ valid: true });
    expect(result.productionEnabled).toBe(false);
  });

  it("rejects productionEnabled true", () => {
    const result = validateDeliverySelectionResult({
      ...baseSelection(),
      productionEnabled: true,
    } as unknown);
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("productionEnabled"))
      ).toBe(true);
    }
  });

  it("rejects invalid exclusion reasons in the summary", () => {
    const result = validateDeliverySelectionResult({
      ...baseSelection(),
      exclusionSummary: { bogus_reason: 1 },
    } as unknown);
    expect(result).toMatchObject({ valid: false });
    if (!result.valid) {
      expect(
        result.issues.some((issue) => issue.includes("invalid exclusion reason"))
      ).toBe(true);
    }
  });

  it("creates empty selection results without executing delivery", () => {
    const empty = createEmptySelectionResult(2, {
      delivery_disabled: 2,
    });
    expect(validateDeliverySelectionResult(empty)).toEqual({ valid: true });
    expect(empty.selectedCandidateId).toBeNull();
    expect(empty.productionEnabled).toBe(false);
    expect(empty.rejectedCandidateCount).toBe(2);
    expect(Object.isFrozen(empty)).toBe(true);
  });

  it("rejects count inconsistencies", () => {
    const result = validateDeliverySelectionResult(
      baseSelection({
        evaluatedCandidateCount: 1,
        rejectedCandidateCount: 3,
      })
    );
    expect(result).toMatchObject({ valid: false });
  });
});

describe("Ads Delivery contract safety invariants", () => {
  it("keeps Ads delivery disabled and does not execute delivery", () => {
    expect(ADS_DELIVERY_ENABLED).toBe(false);
    for (const placement of Object.values(ADS_PLACEMENT_REGISTRY)) {
      expect(placement.featureFlag.enabledByDefault).toBe(false);
      expect(placement.visibility).toBe("hidden");
    }

    // Valid contracts never imply production execution.
    expect(validateDeliveryRequest(baseRequest())).toEqual({ valid: true });
    expect(createEmptyEligibilityResult().productionEnabled).toBe(false);
    expect(createEmptySelectionResult().productionEnabled).toBe(false);
    expect(createEmptySelectionResult().selectedCandidateId).toBeNull();
  });

  it("does not wire delivery contracts into product surfaces", () => {
    const markers =
      /validateDeliveryRequest|validateDeliveryEligibilityResult|validateDeliverySelectionResult|deliveryContracts|deliveryEligibilityContracts|deliverySelectionContracts|serveAd|runAuction/;

    const roots = ["watch", "discover", "live", "store", "world", "learning"];
    for (const root of roots) {
      const dir = path.join(process.cwd(), "app", root);
      let source = "";
      try {
        source = readFileSync(path.join(dir, "page.tsx"), "utf8");
      } catch {
        // Alternate entry files are acceptable; absence is fine.
      }
      expect(source).not.toMatch(markers);
    }

    const watchFeed = readFileSync(
      path.join(process.cwd(), "app", "actions", "loadWatchFeed.ts"),
      "utf8"
    );
    const discoverFeed = readFileSync(
      path.join(process.cwd(), "app", "actions", "loadDiscoverFeed.ts"),
      "utf8"
    );
    expect(watchFeed).not.toMatch(markers);
    expect(discoverFeed).not.toMatch(markers);
  });

  it("exports only contract modules from the platform barrel", () => {
    const indexSource = readFileSync(
      path.join(process.cwd(), "lib", "ads", "platform", "index.ts"),
      "utf8"
    );
    expect(indexSource).toContain('export * from "./deliveryContracts"');
    expect(indexSource).toContain(
      'export * from "./deliveryEligibilityContracts"'
    );
    expect(indexSource).toContain(
      'export * from "./deliverySelectionContracts"'
    );
  });
});
