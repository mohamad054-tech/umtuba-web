import { describe, expect, it } from "vitest";
import {
  ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
  type AdsDeliveryCandidateAd,
  type AdsDeliveryRequest,
} from "./deliveryContracts";
import type { AdsCandidateEligibilityDecision } from "./eligibilityRules";
import {
  ADS_SELECTION_RESULT_CONTRACT_VERSION,
  buildAdsSelectionResult,
  createEmptyAdsSelectionResult,
  validateAdsSelectionResult,
  type AdsSelectionResult,
  type AdsSelectionResultInput,
} from "./selectionResult";

function candidate(id: string): AdsDeliveryCandidateAd {
  return {
    candidateId: id,
    campaignId: `campaign-${id}`,
    adSetId: `ad-set-${id}`,
    adId: `ad-${id}`,
    creativeId: `creative-${id}`,
  };
}

function baseRequest(
  candidates: readonly AdsDeliveryCandidateAd[],
  overrides: Partial<AdsDeliveryRequest> = {}
): AdsDeliveryRequest {
  return {
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    placementId: "WATCH_FEED",
    candidates,
    viewer: { opaqueViewerId: "viewer-opaque-1" },
    geo: { countryCode: "US" },
    languageCode: "en-US",
    deviceClass: "mobile",
    featureFlags: {
      ADS_DELIVERY_ENABLED: false,
      ADS_PLACEMENT_WATCH_FEED_ENABLED: false,
    },
    currentTimestamp: "2026-07-22T12:00:00.000Z",
    ...overrides,
  };
}

function eligibleDecision(
  candidateId: string
): AdsCandidateEligibilityDecision {
  return {
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    candidateId,
    eligible: true,
    exclusionReason: null,
    matchedRule: null,
    productionEnabled: false,
  };
}

function rejectedDecision(
  candidateId: string,
  exclusionReason: AdsCandidateEligibilityDecision["exclusionReason"]
): AdsCandidateEligibilityDecision {
  return {
    contractVersion: ADS_DELIVERY_ENGINE_CONTRACT_VERSION,
    candidateId,
    eligible: false,
    exclusionReason,
    matchedRule: null,
    productionEnabled: false,
  };
}

function buildInput(
  candidateIds: readonly string[],
  decisions: readonly AdsCandidateEligibilityDecision[]
): AdsSelectionResultInput {
  const evaluatedCandidates = candidateIds.map(candidate);
  return {
    request: baseRequest(evaluatedCandidates),
    evaluatedCandidates,
    eligibilityResults: decisions,
  };
}

describe("Ads Selection Result Foundation V1", () => {
  it("summarizes all eligible candidates without selecting", () => {
    const outcome = buildAdsSelectionResult(
      buildInput(
        ["c1", "c2", "c3"],
        [
          eligibleDecision("c1"),
          eligibleDecision("c2"),
          eligibleDecision("c3"),
        ]
      )
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result).toEqual({
      contractVersion: ADS_SELECTION_RESULT_CONTRACT_VERSION,
      evaluatedCandidateCount: 3,
      eligibleCandidateCount: 3,
      rejectedCandidateCount: 0,
      rejectionSummary: {},
      eligibleCandidates: [
        { candidateId: "c1" },
        { candidateId: "c2" },
        { candidateId: "c3" },
      ],
      rejectedCandidates: [],
      selectedCandidate: null,
      productionEnabled: false,
      readyForFutureSelection: true,
    });
  });

  it("summarizes all rejected candidates without selecting", () => {
    const outcome = buildAdsSelectionResult(
      buildInput(
        ["c1", "c2"],
        [
          rejectedDecision("c1", "geo_mismatch"),
          rejectedDecision("c2", "budget_exhausted"),
        ]
      )
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.evaluatedCandidateCount).toBe(2);
    expect(outcome.result.eligibleCandidateCount).toBe(0);
    expect(outcome.result.rejectedCandidateCount).toBe(2);
    expect(outcome.result.rejectionSummary).toEqual({
      geo_mismatch: 1,
      budget_exhausted: 1,
    });
    expect(outcome.result.eligibleCandidates).toEqual([]);
    expect(outcome.result.rejectedCandidates).toEqual([
      { candidateId: "c1", reason: "geo_mismatch" },
      { candidateId: "c2", reason: "budget_exhausted" },
    ]);
    expect(outcome.result.selectedCandidate).toBeNull();
    expect(outcome.result.productionEnabled).toBe(false);
    expect(outcome.result.readyForFutureSelection).toBe(true);
  });

  it("summarizes mixed eligible and rejected results", () => {
    const outcome = buildAdsSelectionResult(
      buildInput(
        ["c1", "c2", "c3", "c4"],
        [
          eligibleDecision("c1"),
          rejectedDecision("c2", "language_mismatch"),
          eligibleDecision("c3"),
          rejectedDecision("c4", "language_mismatch"),
        ]
      )
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.evaluatedCandidateCount).toBe(4);
    expect(outcome.result.eligibleCandidateCount).toBe(2);
    expect(outcome.result.rejectedCandidateCount).toBe(2);
    expect(outcome.result.rejectionSummary).toEqual({
      language_mismatch: 2,
    });
    expect(outcome.result.eligibleCandidates.map((c) => c.candidateId)).toEqual(
      ["c1", "c3"]
    );
    expect(outcome.result.rejectedCandidates.map((c) => c.candidateId)).toEqual(
      ["c2", "c4"]
    );
  });

  it("rejects duplicate candidate IDs", () => {
    const candidates = [candidate("c1"), candidate("c1")];
    const outcome = buildAdsSelectionResult({
      request: baseRequest(candidates),
      evaluatedCandidates: candidates,
      eligibilityResults: [
        eligibleDecision("c1"),
        rejectedDecision("c1", "geo_mismatch"),
      ],
    });

    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(outcome.issues.some((issue) => issue.includes("duplicate"))).toBe(
      true
    );
  });

  it("rejects invalid exclusion reasons", () => {
    const outcome = buildAdsSelectionResult(
      buildInput(
        ["c1"],
        [
          rejectedDecision(
            "c1",
            "not_a_real_reason" as AdsCandidateEligibilityDecision["exclusionReason"]
          ),
        ]
      )
    );

    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) =>
        issue.includes("not a valid exclusion reason")
      )
    ).toBe(true);
  });

  it("rejects inconsistent eligibility list lengths", () => {
    const evaluatedCandidates = [candidate("c1"), candidate("c2")];
    const outcome = buildAdsSelectionResult({
      request: baseRequest(evaluatedCandidates),
      evaluatedCandidates,
      eligibilityResults: [eligibleDecision("c1")],
    });

    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some((issue) =>
        issue.includes("inconsistent with evaluatedCandidates length")
      )
    ).toBe(true);
  });

  it("rejects inconsistent counts on malformed summaries", () => {
    const malformed: AdsSelectionResult = {
      contractVersion: ADS_SELECTION_RESULT_CONTRACT_VERSION,
      evaluatedCandidateCount: 2,
      eligibleCandidateCount: 1,
      rejectedCandidateCount: 1,
      rejectionSummary: {
        geo_mismatch: 2,
      },
      eligibleCandidates: [{ candidateId: "c1" }],
      rejectedCandidates: [{ candidateId: "c2", reason: "geo_mismatch" }],
      selectedCandidate: null,
      productionEnabled: false,
      readyForFutureSelection: true,
    };

    const validation = validateAdsSelectionResult(malformed);
    expect(validation.valid).toBe(false);
    if (validation.valid) return;
    expect(
      validation.issues.some((issue) =>
        issue.includes("inconsistent with rejectedCandidateCount")
      )
    ).toBe(true);
  });

  it("supports empty candidates", () => {
    const outcome = buildAdsSelectionResult({
      request: baseRequest([]),
      evaluatedCandidates: [],
      eligibilityResults: [],
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result).toEqual({
      contractVersion: ADS_SELECTION_RESULT_CONTRACT_VERSION,
      evaluatedCandidateCount: 0,
      eligibleCandidateCount: 0,
      rejectedCandidateCount: 0,
      rejectionSummary: {},
      eligibleCandidates: [],
      rejectedCandidates: [],
      selectedCandidate: null,
      productionEnabled: false,
      readyForFutureSelection: true,
    });
  });

  it("preserves input order for eligible and rejected references", () => {
    const outcome = buildAdsSelectionResult(
      buildInput(
        ["a", "b", "c", "d", "e"],
        [
          rejectedDecision("a", "policy_blocked"),
          eligibleDecision("b"),
          rejectedDecision("c", "creative_missing"),
          eligibleDecision("d"),
          rejectedDecision("e", "policy_blocked"),
        ]
      )
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.eligibleCandidates.map((c) => c.candidateId)).toEqual(
      ["b", "d"]
    );
    expect(outcome.result.rejectedCandidates.map((c) => c.candidateId)).toEqual(
      ["a", "c", "e"]
    );
  });

  it("does not mutate inputs", () => {
    const evaluatedCandidates = [candidate("c1"), candidate("c2")];
    const eligibilityResults = [
      eligibleDecision("c1"),
      rejectedDecision("c2", "audience_mismatch"),
    ];
    const request = baseRequest(evaluatedCandidates);
    const input: AdsSelectionResultInput = {
      request,
      evaluatedCandidates,
      eligibilityResults,
    };

    const before = structuredClone(input);
    const outcome = buildAdsSelectionResult(input);
    expect(outcome.valid).toBe(true);
    expect(input).toEqual(before);

    if (!outcome.valid) return;
    const mutableEligible = outcome.result
      .eligibleCandidates as AdsSelectionResult["eligibleCandidates"] &
      { push?: unknown };
    expect(() => {
      (mutableEligible as { candidateId: string }[]).push({
        candidateId: "hacked",
      });
    }).toThrow();
  });

  it("always sets selectedCandidate to null", () => {
    const singleEligible = buildAdsSelectionResult(
      buildInput(["only"], [eligibleDecision("only")])
    );
    expect(singleEligible.valid).toBe(true);
    if (!singleEligible.valid) return;
    expect(singleEligible.result.selectedCandidate).toBeNull();

    const manyEligible = buildAdsSelectionResult(
      buildInput(
        ["c1", "c2"],
        [eligibleDecision("c1"), eligibleDecision("c2")]
      )
    );
    expect(manyEligible.valid).toBe(true);
    if (!manyEligible.valid) return;
    expect(manyEligible.result.selectedCandidate).toBeNull();
  });

  it("always sets productionEnabled to false", () => {
    const outcome = buildAdsSelectionResult(
      buildInput(["c1"], [eligibleDecision("c1")])
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.productionEnabled).toBe(false);
  });

  it("always sets readyForFutureSelection to true", () => {
    const outcome = buildAdsSelectionResult(
      buildInput(["c1"], [rejectedDecision("c1", "delivery_disabled")])
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.readyForFutureSelection).toBe(true);
  });

  it("produces deterministic output for identical inputs", () => {
    const input = buildInput(
      ["c1", "c2", "c3"],
      [
        eligibleDecision("c1"),
        rejectedDecision("c2", "geo_mismatch"),
        rejectedDecision("c3", "geo_mismatch"),
      ]
    );

    const first = buildAdsSelectionResult(input);
    const second = buildAdsSelectionResult(structuredClone(input));
    expect(first).toEqual(second);
    expect(first.valid).toBe(true);
    if (!first.valid || !second.valid) return;
    expect(first.result).toEqual(second.result);
  });

  it("rejects eligibility results that reference missing candidates", () => {
    const evaluatedCandidates = [candidate("c1")];
    const outcome = buildAdsSelectionResult({
      request: baseRequest(evaluatedCandidates),
      evaluatedCandidates,
      eligibilityResults: [eligibleDecision("missing")],
    });

    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect(
      outcome.issues.some(
        (issue) =>
          issue.includes("missing candidateId") ||
          issue.includes("inconsistent")
      )
    ).toBe(true);
  });

  it("rejects unknown exclusion reasons in validated summaries", () => {
    const validation = validateAdsSelectionResult({
      contractVersion: ADS_SELECTION_RESULT_CONTRACT_VERSION,
      evaluatedCandidateCount: 1,
      eligibleCandidateCount: 0,
      rejectedCandidateCount: 1,
      rejectionSummary: {
        totally_unknown: 1,
      },
      eligibleCandidates: [],
      rejectedCandidates: [
        { candidateId: "c1", reason: "geo_mismatch" },
      ],
      selectedCandidate: null,
      productionEnabled: false,
      readyForFutureSelection: true,
    });

    expect(validation.valid).toBe(false);
    if (validation.valid) return;
    expect(
      validation.issues.some((issue) =>
        issue.includes("unknown exclusion reason")
      )
    ).toBe(true);
  });

  it("createEmptyAdsSelectionResult never selects and stays production-disabled", () => {
    const empty = createEmptyAdsSelectionResult(0);
    expect(empty.selectedCandidate).toBeNull();
    expect(empty.productionEnabled).toBe(false);
    expect(empty.readyForFutureSelection).toBe(true);
    expect(validateAdsSelectionResult(empty)).toEqual({ valid: true });
  });
});
