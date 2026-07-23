import { describe, expect, it } from "vitest";
import {
  ADS_CANONICAL_PLATFORM_IDS,
  isCanonicalPlatformId,
} from "./taxonomy";
import {
  ADS_CANDIDATE_SELECTION_CONTRACT_VERSION,
  ADS_CANDIDATE_SELECTION_FILTER_ORDER,
  ADS_CANDIDATE_SELECTION_INVENTORY_OUTCOMES,
  ADS_CANDIDATE_SELECTION_MAX_CANDIDATES,
  ADS_CANDIDATE_SELECTION_PLATFORMS,
  buildAdsCandidateSelectionInventory,
  createEmptyAdsCandidateSelectionInventory,
  createEmptyAdsCandidateSelectionResult,
  evaluateAdsCandidateSelectionFilters,
  evaluateCandidatePlacementCompatibility,
  iterateAdsCandidateSelectionInventory,
  rejectionReasonForCompatibilityFailure,
  runAdsCandidateSelection,
  validateAdsCandidateSelectionContext,
  validateAdsCandidateSelectionInventory,
  validateAdsCandidateSelectionResult,
  validateAdsSelectionCandidate,
  validateCandidateCreativeCompatibility,
  validateCandidatePlacementCompatibility,
  type AdsCandidateSelectionContext,
  type AdsSelectionCandidate,
} from "./candidateSelection";

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
    campaignRef: "campaign-ref-1",
    advertiserRef: "advertiser-ref-1",
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

describe("Ads Candidate Selection Foundation V1", () => {
  describe("candidate validation", () => {
    it("accepts a valid selection candidate", () => {
      expect(validateAdsSelectionCandidate(baseCandidate())).toEqual({
        valid: true,
      });
    });

    it("requires opaque advertiser and campaign references", () => {
      const missingAdvertiser = validateAdsSelectionCandidate(
        baseCandidate({ advertiserRef: "" })
      );
      expect(missingAdvertiser.valid).toBe(false);

      const urlCampaign = validateAdsSelectionCandidate(
        baseCandidate({ campaignRef: "https://evil.example/campaign" })
      );
      expect(urlCampaign.valid).toBe(false);
      if (!urlCampaign.valid) {
        expect(urlCampaign.issues.some((i) => i.includes("opaque"))).toBe(true);
      }
    });

    it("rejects unsupported creative types on the candidate contract", () => {
      const result = validateAdsSelectionCandidate(
        baseCandidate({ creativeType: "text" })
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(
          result.issues.some((i) => i.includes("image, video, carousel"))
        ).toBe(true);
      }
    });

    it("rejects unknown candidate fields (fail closed)", () => {
      const result = validateAdsSelectionCandidate(
        baseCandidate({ mediaUrl: "https://cdn.example/a.jpg" })
      );
      expect(result.valid).toBe(false);
    });

    it("rejects invalid eligibility state shapes", () => {
      const result = validateAdsSelectionCandidate(
        baseCandidate({
          eligibility: baseEligibility({ campaignActive: "yes" }),
        })
      );
      expect(result.valid).toBe(false);
    });
  });

  describe("inventory abstraction", () => {
    it("accepts empty injected inventory", () => {
      const empty = createEmptyAdsCandidateSelectionInventory({
        sourceId: "empty-source",
        revision: 3,
      });
      expect(validateAdsCandidateSelectionInventory(empty)).toEqual({
        valid: true,
      });
      expect(empty.candidates).toEqual([]);
      expect(iterateAdsCandidateSelectionInventory(empty)).toEqual([]);
    });

    it("builds immutable candidates with deterministic iteration order", () => {
      const outcome = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({ candidateId: "c-b", creativeRef: "cr-b" }),
            baseCandidate({ candidateId: "c-a", creativeRef: "cr-a" }),
          ],
        })
      );
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;

      const ids = iterateAdsCandidateSelectionInventory(outcome.inventory).map(
        (c) => c.candidateId
      );
      expect(ids).toEqual(["c-b", "c-a"]);
      expect(Object.isFrozen(outcome.inventory)).toBe(true);
      expect(Object.isFrozen(outcome.inventory.candidates[0])).toBe(true);
    });

    it("rejects duplicate candidate ids as inventory outcomes", () => {
      const result = validateAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({ candidateId: "dup" }),
            baseCandidate({
              candidateId: "dup",
              creativeRef: "creative-ref-2",
            }),
          ],
        })
      );
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(
          result.issues.some((i) => i.includes("duplicate candidateId"))
        ).toBe(true);
      }
      expect(ADS_CANDIDATE_SELECTION_INVENTORY_OUTCOMES).toContain(
        "duplicate_candidate"
      );
      expect(ADS_CANDIDATE_SELECTION_FILTER_ORDER).not.toContain(
        "duplicate_candidate"
      );
      expect(ADS_CANDIDATE_SELECTION_FILTER_ORDER).not.toContain(
        "invalid_contract"
      );
    });

    it("rejects oversized inventories", () => {
      const candidates = Array.from(
        { length: ADS_CANDIDATE_SELECTION_MAX_CANDIDATES + 1 },
        (_, i) =>
          baseCandidate({
            candidateId: `candidate-${i}`,
            creativeRef: `creative-${i}`,
          })
      );
      const result = validateAdsCandidateSelectionInventory(
        baseInventory({ candidates })
      );
      expect(result.valid).toBe(false);
    });
  });

  describe("placement and creative compatibility (typed)", () => {
    it("accepts matching candidate and placement descriptor", () => {
      const candidate = buildAdsCandidateSelectionInventory(baseInventory());
      expect(candidate.valid).toBe(true);
      if (!candidate.valid) return;

      const typed = evaluateCandidatePlacementCompatibility(
        candidate.inventory.candidates[0] as AdsSelectionCandidate,
        { placementId: "WATCH_FEED" }
      );
      expect(typed).toEqual({ compatible: true });
      expect(
        validateCandidatePlacementCompatibility(
          candidate.inventory.candidates[0] as AdsSelectionCandidate,
          { placementId: "WATCH_FEED" }
        )
      ).toEqual({ valid: true });
    });

    it("types placement mismatch separately from unsupported creative", () => {
      const candidate = buildAdsCandidateSelectionInventory(baseInventory());
      expect(candidate.valid).toBe(true);
      if (!candidate.valid) return;

      const mismatch = evaluateCandidatePlacementCompatibility(
        candidate.inventory.candidates[0] as AdsSelectionCandidate,
        { placementId: "SEARCH" }
      );
      expect(mismatch.compatible).toBe(false);
      if (mismatch.compatible) return;
      expect(mismatch.category).toBe("placement_mismatch");
      expect(rejectionReasonForCompatibilityFailure(mismatch.category)).toBe(
        "placement_incompatible"
      );
    });

    it("types descriptor allowlist rejection as creative_not_allowed_for_placement", () => {
      const candidate = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [baseCandidate({ creativeType: "video" })],
        })
      );
      expect(candidate.valid).toBe(true);
      if (!candidate.valid) return;

      const outcome = evaluateCandidatePlacementCompatibility(
        candidate.inventory.candidates[0] as AdsSelectionCandidate,
        {
          placementId: "WATCH_FEED",
          acceptedCreativeTypes: ["image", "carousel"],
        }
      );
      expect(outcome.compatible).toBe(false);
      if (outcome.compatible) return;
      expect(outcome.category).toBe("creative_not_allowed_for_placement");
      expect(rejectionReasonForCompatibilityFailure(outcome.category)).toBe(
        "unsupported_creative"
      );
    });

    it("types WORLD_NEARBY + video as creative_not_allowed_for_placement", () => {
      const candidate = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({
              placementId: "WORLD_NEARBY",
              creativeType: "video",
            }),
          ],
        })
      );
      expect(candidate.valid).toBe(true);
      if (!candidate.valid) return;

      const outcome = evaluateCandidatePlacementCompatibility(
        candidate.inventory.candidates[0] as AdsSelectionCandidate,
        { placementId: "WORLD_NEARBY" }
      );
      expect(outcome.compatible).toBe(false);
      if (outcome.compatible) return;
      expect(outcome.category).toBe("creative_not_allowed_for_placement");
      expect(rejectionReasonForCompatibilityFailure(outcome.category)).toBe(
        "unsupported_creative"
      );
    });

    it("supports image, video, and carousel on WATCH_FEED", () => {
      expect(
        validateCandidateCreativeCompatibility("WATCH_FEED", "image")
      ).toEqual({ valid: true });
      expect(
        validateCandidateCreativeCompatibility("WATCH_FEED", "video")
      ).toEqual({ valid: true });
      expect(
        validateCandidateCreativeCompatibility("WATCH_FEED", "carousel")
      ).toEqual({ valid: true });
    });

    it("rejects unsupported creative combinations", () => {
      expect(
        validateCandidateCreativeCompatibility("WATCH_FEED", "text").valid
      ).toBe(false);
      expect(
        validateCandidateCreativeCompatibility("WORLD_NEARBY", "video").valid
      ).toBe(false);
      expect(
        validateCandidateCreativeCompatibility("WORLD_NEARBY", "carousel").valid
      ).toBe(false);
    });
  });

  describe("eligibility filtering", () => {
    it("marks a fully matching candidate eligible", () => {
      const inventory = buildAdsCandidateSelectionInventory(baseInventory());
      expect(inventory.valid).toBe(true);
      if (!inventory.valid) return;

      const reason = evaluateAdsCandidateSelectionFilters(
        inventory.inventory.candidates[0],
        baseContext() as AdsCandidateSelectionContext
      );
      expect(reason).toBeNull();
    });

    it("rejects inactive campaigns and creatives", () => {
      const campaign = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({
              eligibility: baseEligibility({ campaignActive: false }),
            }),
          ],
        })
      );
      expect(campaign.valid).toBe(true);
      if (!campaign.valid) return;
      expect(
        evaluateAdsCandidateSelectionFilters(
          campaign.inventory.candidates[0],
          baseContext() as AdsCandidateSelectionContext
        )
      ).toBe("campaign_inactive");

      const creative = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({
              eligibility: baseEligibility({ creativeActive: false }),
            }),
          ],
        })
      );
      expect(creative.valid).toBe(true);
      if (!creative.valid) return;
      expect(
        evaluateAdsCandidateSelectionFilters(
          creative.inventory.candidates[0],
          baseContext() as AdsCandidateSelectionContext
        )
      ).toBe("creative_inactive");
    });

    it("rejects policy-blocked candidates", () => {
      const inventory = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({
              eligibility: baseEligibility({ policyAllowed: false }),
            }),
          ],
        })
      );
      expect(inventory.valid).toBe(true);
      if (!inventory.valid) return;
      expect(
        evaluateAdsCandidateSelectionFilters(
          inventory.inventory.candidates[0],
          baseContext() as AdsCandidateSelectionContext
        )
      ).toBe("policy_blocked");
    });

    it("enforces boolean age-gate semantics without numeric age", () => {
      const restricted = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({
              eligibility: baseEligibility({ requiresAgeGate: true }),
            }),
          ],
        })
      );
      expect(restricted.valid).toBe(true);
      if (!restricted.valid) return;

      // Restricted + false → rejected
      expect(
        evaluateAdsCandidateSelectionFilters(
          restricted.inventory.candidates[0],
          baseContext({
            viewerAgeGatePassed: false,
          }) as AdsCandidateSelectionContext
        )
      ).toBe("age_gate");

      // Restricted + true → may continue
      expect(
        evaluateAdsCandidateSelectionFilters(
          restricted.inventory.candidates[0],
          baseContext({
            viewerAgeGatePassed: true,
          }) as AdsCandidateSelectionContext
        )
      ).toBeNull();

      // Unrestricted candidate does not require age data (false pass is OK)
      const unrestricted = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({
              eligibility: baseEligibility({ requiresAgeGate: false }),
            }),
          ],
        })
      );
      expect(unrestricted.valid).toBe(true);
      if (!unrestricted.valid) return;
      expect(
        evaluateAdsCandidateSelectionFilters(
          unrestricted.inventory.candidates[0],
          baseContext({
            viewerAgeGatePassed: false,
          }) as AdsCandidateSelectionContext
        )
      ).toBeNull();

      // Missing age context fails closed at context validation (inventory path)
      const missingAge = runAdsCandidateSelection(
        baseInventory({
          candidates: [
            baseCandidate({
              eligibility: baseEligibility({ requiresAgeGate: true }),
            }),
          ],
        }),
        baseContext({ viewerAgeGatePassed: undefined })
      );
      expect(missingAge.valid).toBe(false);
    });

    it("rejects country mismatch", () => {
      const inventory = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({
              eligibility: baseEligibility({
                targetedCountryCodes: ["DE"],
              }),
            }),
          ],
        })
      );
      expect(inventory.valid).toBe(true);
      if (!inventory.valid) return;
      expect(
        evaluateAdsCandidateSelectionFilters(
          inventory.inventory.candidates[0],
          baseContext({ countryCode: "US" }) as AdsCandidateSelectionContext
        )
      ).toBe("country_mismatch");
    });

    it("rejects language mismatch", () => {
      const inventory = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({
              eligibility: baseEligibility({
                targetedLanguageCodes: ["fr"],
              }),
            }),
          ],
        })
      );
      expect(inventory.valid).toBe(true);
      if (!inventory.valid) return;
      expect(
        evaluateAdsCandidateSelectionFilters(
          inventory.inventory.candidates[0],
          baseContext({ languageCode: "en-US" }) as AdsCandidateSelectionContext
        )
      ).toBe("language_mismatch");
    });

    it("rejects platform and device mismatches", () => {
      const platformInventory = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({
              eligibility: baseEligibility({
                targetedPlatforms: ["ios"],
              }),
            }),
          ],
        })
      );
      expect(platformInventory.valid).toBe(true);
      if (!platformInventory.valid) return;
      expect(
        evaluateAdsCandidateSelectionFilters(
          platformInventory.inventory.candidates[0],
          baseContext({ platform: "web" }) as AdsCandidateSelectionContext
        )
      ).toBe("platform_mismatch");

      const deviceInventory = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({
              eligibility: baseEligibility({
                targetedDeviceClasses: ["desktop"],
              }),
            }),
          ],
        })
      );
      expect(deviceInventory.valid).toBe(true);
      if (!deviceInventory.valid) return;
      expect(
        evaluateAdsCandidateSelectionFilters(
          deviceInventory.inventory.candidates[0],
          baseContext({ deviceClass: "mobile" }) as AdsCandidateSelectionContext
        )
      ).toBe("device_mismatch");
    });

    it("uses only the first failure in declared filter order (multi-fail)", () => {
      const inventory = buildAdsCandidateSelectionInventory(
        baseInventory({
          candidates: [
            baseCandidate({
              candidateId: "multi-fail",
              creativeRef: "cr-multi",
              // Would also fail creative, policy, age, placement, country, etc.
              eligibility: baseEligibility({
                campaignActive: false,
                creativeActive: false,
                policyAllowed: false,
                requiresAgeGate: true,
                targetedCountryCodes: ["JP"],
                targetedLanguageCodes: ["fr"],
                targetedPlatforms: ["ios"],
                targetedDeviceClasses: ["desktop"],
              }),
            }),
          ],
        })
      );
      expect(inventory.valid).toBe(true);
      if (!inventory.valid) return;

      const context = baseContext({
        viewerAgeGatePassed: false,
        placement: { placementId: "SEARCH" },
        countryCode: "US",
        languageCode: "en-US",
        platform: "web",
        deviceClass: "mobile",
      }) as AdsCandidateSelectionContext;

      const first = evaluateAdsCandidateSelectionFilters(
        inventory.inventory.candidates[0],
        context
      );
      const second = evaluateAdsCandidateSelectionFilters(
        inventory.inventory.candidates[0],
        context
      );

      expect(first).toBe("campaign_inactive");
      expect(second).toBe("campaign_inactive");
      expect(first).toBe(ADS_CANDIDATE_SELECTION_FILTER_ORDER[0]);

      const run = runAdsCandidateSelection(
        baseInventory({
          candidates: [
            baseCandidate({
              candidateId: "multi-fail",
              creativeRef: "cr-multi",
              eligibility: baseEligibility({
                campaignActive: false,
                creativeActive: false,
                policyAllowed: false,
                requiresAgeGate: true,
                targetedCountryCodes: ["JP"],
              }),
            }),
          ],
        }),
        baseContext({ viewerAgeGatePassed: false })
      );
      expect(run.valid).toBe(true);
      if (!run.valid) return;
      expect(run.result.rejectedCandidates).toEqual([
        { candidateId: "multi-fail", reason: "campaign_inactive" },
      ]);
      expect(run.result.diagnostics.rejectionCounts).toEqual({
        campaign_inactive: 1,
      });
    });

    it("declares filter order equal to runtime evaluation sequence", () => {
      expect([...ADS_CANDIDATE_SELECTION_FILTER_ORDER]).toEqual([
        "campaign_inactive",
        "creative_inactive",
        "policy_blocked",
        "age_gate",
        "placement_incompatible",
        "unsupported_creative",
        "country_mismatch",
        "language_mismatch",
        "platform_mismatch",
        "device_mismatch",
      ]);

      const steps: Array<{
        eligibility?: Record<string, unknown>;
        placementId?: string;
        creativeType?: string;
        context?: Record<string, unknown>;
        expected: (typeof ADS_CANDIDATE_SELECTION_FILTER_ORDER)[number];
      }> = [
        {
          eligibility: { campaignActive: false },
          expected: "campaign_inactive",
        },
        {
          eligibility: { creativeActive: false },
          expected: "creative_inactive",
        },
        {
          eligibility: { policyAllowed: false },
          expected: "policy_blocked",
        },
        {
          eligibility: { requiresAgeGate: true },
          context: { viewerAgeGatePassed: false },
          expected: "age_gate",
        },
        {
          placementId: "WATCH_FEED",
          context: { placement: { placementId: "SEARCH" } },
          expected: "placement_incompatible",
        },
        {
          placementId: "WORLD_NEARBY",
          creativeType: "video",
          context: { placement: { placementId: "WORLD_NEARBY" } },
          expected: "unsupported_creative",
        },
        {
          eligibility: { targetedCountryCodes: ["DE"] },
          expected: "country_mismatch",
        },
        {
          eligibility: { targetedLanguageCodes: ["fr"] },
          expected: "language_mismatch",
        },
        {
          eligibility: { targetedPlatforms: ["ios"] },
          expected: "platform_mismatch",
        },
        {
          eligibility: { targetedDeviceClasses: ["desktop"] },
          expected: "device_mismatch",
        },
      ];

      for (const step of steps) {
        const built = buildAdsCandidateSelectionInventory(
          baseInventory({
            candidates: [
              baseCandidate({
                placementId: step.placementId ?? "WATCH_FEED",
                creativeType: step.creativeType ?? "video",
                eligibility: baseEligibility(step.eligibility ?? {}),
              }),
            ],
          })
        );
        expect(built.valid).toBe(true);
        if (!built.valid) return;
        const reason = evaluateAdsCandidateSelectionFilters(
          built.inventory.candidates[0],
          baseContext(step.context ?? {}) as AdsCandidateSelectionContext
        );
        expect(reason).toBe(step.expected);
      }
    });
  });

  describe("selection result contracts", () => {
    it("produces eligible/rejected sets with diagnostics and no winner", () => {
      const outcome = runAdsCandidateSelection(
        baseInventory({
          candidates: [
            baseCandidate({ candidateId: "ok", creativeRef: "cr-ok" }),
            baseCandidate({
              candidateId: "policy-fail",
              creativeRef: "cr-policy",
              eligibility: baseEligibility({ policyAllowed: false }),
            }),
            baseCandidate({
              candidateId: "country-fail",
              creativeRef: "cr-country",
              eligibility: baseEligibility({
                targetedCountryCodes: ["JP"],
              }),
            }),
          ],
        }),
        baseContext()
      );

      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;

      expect(outcome.result.selectedCandidate).toBeNull();
      expect(outcome.result.productionEnabled).toBe(false);
      expect(outcome.result.selectionMetadata.selectedCandidateId).toBeNull();
      expect(outcome.result.eligibleCandidates.map((c) => c.candidateId)).toEqual([
        "ok",
      ]);
      expect(outcome.result.rejectedCandidates).toEqual([
        { candidateId: "policy-fail", reason: "policy_blocked" },
        { candidateId: "country-fail", reason: "country_mismatch" },
      ]);
      expect(outcome.result.diagnostics.evaluatedCount).toBe(3);
      expect(outcome.result.diagnostics.eligibleCount).toBe(1);
      expect(outcome.result.diagnostics.rejectedCount).toBe(2);
      expect(outcome.result.diagnostics.filterOrder).toEqual(
        ADS_CANDIDATE_SELECTION_FILTER_ORDER
      );
      expect(outcome.result.diagnostics.rejectionCounts).toEqual({
        policy_blocked: 1,
        country_mismatch: 1,
      });
      expect(validateAdsCandidateSelectionResult(outcome.result)).toEqual({
        valid: true,
      });
    });

    it("returns empty result for empty inventory", () => {
      const outcome = runAdsCandidateSelection(
        createEmptyAdsCandidateSelectionInventory({ sourceId: "empty-1" }),
        baseContext()
      );
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;
      expect(outcome.result.eligibleCandidates).toEqual([]);
      expect(outcome.result.rejectedCandidates).toEqual([]);
      expect(outcome.result.diagnostics.evaluatedCount).toBe(0);
      expect(outcome.result.selectedCandidate).toBeNull();
    });

    it("is deterministic for identical inputs", () => {
      const inventory = baseInventory({
        candidates: [
          baseCandidate({ candidateId: "c1", creativeRef: "cr1" }),
          baseCandidate({
            candidateId: "c2",
            creativeRef: "cr2",
            eligibility: baseEligibility({ campaignActive: false }),
          }),
          baseCandidate({ candidateId: "c3", creativeRef: "cr3" }),
        ],
      });
      const context = baseContext();

      const first = runAdsCandidateSelection(inventory, context);
      const second = runAdsCandidateSelection(inventory, context);

      expect(first).toEqual(second);
      expect(first.valid).toBe(true);
      if (!first.valid) return;
      expect(first.result.eligibleCandidates.map((c) => c.candidateId)).toEqual([
        "c1",
        "c3",
      ]);
      expect(first.result.rejectedCandidates.map((c) => c.candidateId)).toEqual([
        "c2",
      ]);
    });

    it("rejects unsupported creative during selection with typed reason", () => {
      const allowlistOutcome = runAdsCandidateSelection(
        baseInventory({
          candidates: [
            baseCandidate({
              candidateId: "video-blocked",
              creativeType: "video",
            }),
          ],
        }),
        baseContext({
          placement: {
            placementId: "WATCH_FEED",
            acceptedCreativeTypes: ["image", "carousel"],
          },
        })
      );
      expect(allowlistOutcome.valid).toBe(true);
      if (!allowlistOutcome.valid) return;
      expect(allowlistOutcome.result.rejectedCandidates[0]?.reason).toBe(
        "unsupported_creative"
      );

      const nearbyOutcome = runAdsCandidateSelection(
        baseInventory({
          candidates: [
            baseCandidate({
              candidateId: "video-near",
              placementId: "WORLD_NEARBY",
              creativeType: "video",
            }),
          ],
        }),
        baseContext({
          placement: { placementId: "WORLD_NEARBY" },
        })
      );
      expect(nearbyOutcome.valid).toBe(true);
      if (!nearbyOutcome.valid) return;
      expect(nearbyOutcome.result.eligibleCandidates).toEqual([]);
      expect(nearbyOutcome.result.rejectedCandidates[0]?.reason).toBe(
        "unsupported_creative"
      );
    });

    it("fails closed on unknown placement on the run path", () => {
      expect(() =>
        runAdsCandidateSelection(
          baseInventory({
            candidates: [
              baseCandidate({ placementId: "NOT_A_REAL_PLACEMENT" }),
            ],
          }),
          baseContext()
        )
      ).not.toThrow();

      const unknownCandidatePlacement = runAdsCandidateSelection(
        baseInventory({
          candidates: [
            baseCandidate({ placementId: "NOT_A_REAL_PLACEMENT" }),
          ],
        }),
        baseContext()
      );
      expect(unknownCandidatePlacement.valid).toBe(false);
      if (unknownCandidatePlacement.valid) return;
      expect(
        unknownCandidatePlacement.issues.some((i) =>
          i.includes("placementId")
        )
      ).toBe(true);

      const unknownContextPlacement = runAdsCandidateSelection(
        baseInventory(),
        baseContext({
          placement: { placementId: "ALSO_NOT_REAL" },
        })
      );
      expect(unknownContextPlacement.valid).toBe(false);
      if (unknownContextPlacement.valid) return;
      expect(
        unknownContextPlacement.issues.some((i) =>
          i.includes("placement.placementId")
        )
      ).toBe(true);

      // Neither path can produce eligible candidates when validation fails.
      expect(unknownCandidatePlacement.valid).toBe(false);
      expect(unknownContextPlacement.valid).toBe(false);
    });

    it("does not mutate inventory or context inputs", () => {
      const targetedCountries = ["US", "CA"];
      const targetedLanguages = ["en"];
      const targetedPlatforms = ["web", "ios"] as const;
      const targetedDevices = ["mobile"] as const;
      const candidates = [
        baseCandidate({
          candidateId: "immutable-1",
          eligibility: baseEligibility({
            targetedCountryCodes: targetedCountries,
            targetedLanguageCodes: targetedLanguages,
            targetedPlatforms: [...targetedPlatforms],
            targetedDeviceClasses: [...targetedDevices],
          }),
        }),
      ];
      const inventory = baseInventory({ candidates });
      const context = baseContext({
        placement: { placementId: "WATCH_FEED" },
      });

      Object.freeze(targetedCountries);
      Object.freeze(targetedLanguages);
      Object.freeze(candidates);
      Object.freeze(inventory);
      Object.freeze(context);
      Object.freeze(context.placement);
      Object.freeze(candidates[0]);
      Object.freeze(candidates[0].eligibility);

      const beforeInventory = JSON.stringify(inventory);
      const beforeContext = JSON.stringify(context);
      const beforeCountries = JSON.stringify(targetedCountries);

      const outcome = runAdsCandidateSelection(inventory, context);
      expect(outcome.valid).toBe(true);

      expect(JSON.stringify(inventory)).toBe(beforeInventory);
      expect(JSON.stringify(context)).toBe(beforeContext);
      expect(JSON.stringify(targetedCountries)).toBe(beforeCountries);
      expect(candidates).toHaveLength(1);
      expect(candidates[0].candidateId).toBe("immutable-1");
    });

    it("fails closed on invalid contracts", () => {
      const badInventory = runAdsCandidateSelection(
        { contractVersion: "v0", sourceId: "x", revision: 1, candidates: [] },
        baseContext()
      );
      expect(badInventory.valid).toBe(false);

      const badContext = runAdsCandidateSelection(
        baseInventory(),
        baseContext({ countryCode: "usa" })
      );
      expect(badContext.valid).toBe(false);

      expect(
        validateAdsCandidateSelectionContext(
          baseContext({ unknownFlag: true })
        ).valid
      ).toBe(false);

      const empty = createEmptyAdsCandidateSelectionResult();
      expect(empty.selectedCandidate).toBeNull();
      expect(empty.productionEnabled).toBe(false);
      expect(validateAdsCandidateSelectionResult(empty)).toEqual({
        valid: true,
      });
    });

    it("preserves advertiser and campaign refs on eligible candidates", () => {
      const outcome = runAdsCandidateSelection(baseInventory(), baseContext());
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;
      expect(outcome.result.eligibleCandidates[0]).toEqual({
        candidateId: "candidate-1",
        campaignRef: "campaign-ref-1",
        advertiserRef: "advertiser-ref-1",
        creativeRef: "creative-ref-1",
      });
    });

    it("reuses canonical platform taxonomy values", () => {
      expect(ADS_CANDIDATE_SELECTION_PLATFORMS).toBe(ADS_CANONICAL_PLATFORM_IDS);
      for (const platform of ADS_CANDIDATE_SELECTION_PLATFORMS) {
        expect(isCanonicalPlatformId(platform)).toBe(true);
      }
    });
  });
});
