import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_RANKING_CONTRACT_VERSION,
  ADS_RANKING_STRATEGY,
  ADS_RANKING_TIE_BREAK_RULES,
  compareAdsRankableCandidates,
  createEmptyAdsRankingResult,
  parseAdsRankingInput,
  rankAdsCandidates,
  validateAdsRankingResult,
  type AdsRankingResult,
} from "./ranking";
import {
  ADS_SCORING_CONTRACT_VERSION,
  type AdsRankingCandidateSignals,
} from "./scoring";

const SOURCE_PATH = path.join(__dirname, "ranking.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function signals(
  overrides: Partial<AdsRankingCandidateSignals> & { candidateId: string }
): AdsRankingCandidateSignals {
  return Object.freeze({
    candidateId: overrides.candidateId,
    placementCompatible: overrides.placementCompatible ?? true,
    creativeCompatible: overrides.creativeCompatible ?? true,
    policyEligible: overrides.policyEligible ?? true,
    deliveryEligible: overrides.deliveryEligible ?? true,
    qualityScore: overrides.qualityScore ?? 0.5,
    relevanceScore: overrides.relevanceScore ?? 0.5,
    freshnessScore: overrides.freshnessScore ?? 0.5,
  });
}

function expectKillSwitchesOff(result: AdsRankingResult): void {
  expect(result.productionEnabled).toBe(false);
  expect(result.deliveryEnabled).toBe(false);
  expect(result.executionEnabled).toBe(false);
}

describe("Ads Ranking Foundation V1", () => {
  it("exposes contract version, strategy, and reachable tie-break rules", () => {
    expect(ADS_RANKING_CONTRACT_VERSION).toBe("v1");
    expect(ADS_RANKING_STRATEGY).toBe("weighted_score_v1");
    expect([...ADS_RANKING_TIE_BREAK_RULES]).toEqual([
      "total_score_desc",
      "quality_score_desc",
      "relevance_score_desc",
      "candidate_id_asc",
    ]);
    expect(SOURCE).not.toMatch(/freshness_score_desc/);
  });

  it("ranks by total score and emits breakdowns, diagnostics, and metadata", () => {
    const outcome = rankAdsCandidates({
      candidates: [
        signals({
          candidateId: "low",
          qualityScore: 0.1,
          relevanceScore: 0.1,
          freshnessScore: 0.1,
        }),
        signals({
          candidateId: "high",
          qualityScore: 1,
          relevanceScore: 1,
          freshnessScore: 1,
        }),
        signals({
          candidateId: "mid",
          qualityScore: 0.5,
          relevanceScore: 0.5,
          freshnessScore: 0.5,
        }),
      ],
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(
      outcome.result.rankedCandidates.map((entry) => entry.candidateId)
    ).toEqual(["high", "mid", "low"]);
    expect(outcome.result.rankedCandidates.map((entry) => entry.rank)).toEqual([
      1, 2, 3,
    ]);
    expect(outcome.result.scoreBreakdowns).toHaveLength(3);
    expect(outcome.result.diagnostics.evaluatedCandidateCount).toBe(3);
    expect(outcome.result.diagnostics.rankedCandidateCount).toBe(3);
    expect(outcome.result.diagnostics.excludedCandidateCount).toBe(0);
    expect(outcome.result.metadata.scoringContractVersion).toBe(
      ADS_SCORING_CONTRACT_VERSION
    );
    expect(outcome.result.metadata.strategy).toBe(ADS_RANKING_STRATEGY);
    expect([...outcome.result.metadata.tieBreakRules]).toEqual([
      "total_score_desc",
      "quality_score_desc",
      "relevance_score_desc",
      "candidate_id_asc",
    ]);
    expectKillSwitchesOff(outcome.result);
    expect(validateAdsRankingResult(outcome.result).valid).toBe(true);
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.rankedCandidates)).toBe(true);
  });

  it("applies stable tie-breaks in documented reachable order", () => {
    // Equal totals (0.35), different quality → quality_score_desc.
    const qualityTie = rankAdsCandidates({
      candidates: [
        signals({
          candidateId: "low-quality",
          qualityScore: 0,
          relevanceScore: 1,
          freshnessScore: 0,
        }),
        signals({
          candidateId: "high-quality",
          qualityScore: 0.875,
          relevanceScore: 0,
          freshnessScore: 0,
        }),
      ],
    });
    expect(qualityTie.valid).toBe(true);
    if (!qualityTie.valid) return;
    expect(
      qualityTie.result.rankedCandidates.map((entry) => entry.candidateId)
    ).toEqual(["high-quality", "low-quality"]);
    expect(qualityTie.result.rankedCandidates[1].tieBreakRuleApplied).toBe(
      "quality_score_desc"
    );

    // Equal totals (0.55) and quality, different relevance → relevance_score_desc.
    const relevanceTie = rankAdsCandidates({
      candidates: [
        signals({
          candidateId: "low-relevance",
          qualityScore: 0.5,
          relevanceScore: 0.5,
          freshnessScore: 0.7,
        }),
        signals({
          candidateId: "high-relevance",
          qualityScore: 0.5,
          relevanceScore: 1,
          freshnessScore: 0,
        }),
      ],
    });
    expect(relevanceTie.valid).toBe(true);
    if (!relevanceTie.valid) return;
    expect(
      relevanceTie.result.rankedCandidates.map((entry) => entry.candidateId)
    ).toEqual(["high-relevance", "low-relevance"]);
    expect(relevanceTie.result.rankedCandidates[1].tieBreakRuleApplied).toBe(
      "relevance_score_desc"
    );

    // Fully identical continuous signals → candidate_id_asc.
    const idTie = rankAdsCandidates({
      candidates: [
        signals({
          candidateId: "zeta",
          qualityScore: 0.5,
          relevanceScore: 0.5,
          freshnessScore: 0.5,
        }),
        signals({
          candidateId: "alpha",
          qualityScore: 0.5,
          relevanceScore: 0.5,
          freshnessScore: 0.5,
        }),
      ],
    });
    expect(idTie.valid).toBe(true);
    if (!idTie.valid) return;
    expect(
      idTie.result.rankedCandidates.map((entry) => entry.candidateId)
    ).toEqual(["alpha", "zeta"]);
    expect(idTie.result.rankedCandidates[1].tieBreakRuleApplied).toBe(
      "candidate_id_asc"
    );
    expect(idTie.result.diagnostics.tieBreakEvents).toEqual([
      {
        leftCandidateId: "alpha",
        rightCandidateId: "zeta",
        rule: "candidate_id_asc",
      },
    ]);

    // Freshness remains in weighted total only (not a secondary tie-break).
    const freshnessViaTotal = rankAdsCandidates({
      candidates: [
        signals({
          candidateId: "older",
          qualityScore: 0.5,
          relevanceScore: 0.5,
          freshnessScore: 0.1,
        }),
        signals({
          candidateId: "newer",
          qualityScore: 0.5,
          relevanceScore: 0.5,
          freshnessScore: 0.9,
        }),
      ],
    });
    expect(freshnessViaTotal.valid).toBe(true);
    if (!freshnessViaTotal.valid) return;
    expect(
      freshnessViaTotal.result.rankedCandidates.map((entry) => entry.candidateId)
    ).toEqual(["newer", "older"]);
    expect(
      freshnessViaTotal.result.rankedCandidates[1].tieBreakRuleApplied
    ).toBe("total_score_desc");
  });

  it("ranks an empty candidates array with kill switches off", () => {
    const outcome = rankAdsCandidates({ candidates: [] });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.rankedCandidates).toEqual([]);
    expect(outcome.result.excludedCandidates).toEqual([]);
    expect(outcome.result.scoreBreakdowns).toEqual([]);
    expect(outcome.result.diagnostics.evaluatedCandidateCount).toBe(0);
    expect(outcome.result.diagnostics.rankedCandidateCount).toBe(0);
    expect(outcome.result.diagnostics.excludedCandidateCount).toBe(0);
    expectKillSwitchesOff(outcome.result);
  });

  it("ranks a single valid candidate at rank 1", () => {
    const outcome = rankAdsCandidates({
      candidates: [
        signals({
          candidateId: "only",
          qualityScore: 0.7,
          relevanceScore: 0.6,
          freshnessScore: 0.5,
        }),
      ],
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.rankedCandidates).toHaveLength(1);
    expect(outcome.result.rankedCandidates[0].candidateId).toBe("only");
    expect(outcome.result.rankedCandidates[0].rank).toBe(1);
    expect(outcome.result.rankedCandidates[0].tieBreakRuleApplied).toBeNull();
    expect(outcome.result.excludedCandidates).toEqual([]);
    expectKillSwitchesOff(outcome.result);
  });

  it("excludes gated candidates and keeps them out of rankedCandidates", () => {
    const outcome = rankAdsCandidates({
      candidates: [
        signals({
          candidateId: "ok",
          qualityScore: 0.2,
          relevanceScore: 0.2,
          freshnessScore: 0.2,
        }),
        signals({
          candidateId: "blocked-policy",
          policyEligible: false,
          qualityScore: 1,
          relevanceScore: 1,
          freshnessScore: 1,
        }),
        signals({
          candidateId: "blocked-placement",
          placementCompatible: false,
        }),
      ],
    });

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(
      outcome.result.rankedCandidates.map((entry) => entry.candidateId)
    ).toEqual(["ok"]);
    expect(outcome.result.excludedCandidates).toEqual([
      { candidateId: "blocked-policy", reason: "policy_ineligible" },
      { candidateId: "blocked-placement", reason: "placement_incompatible" },
    ]);
    expect(outcome.result.diagnostics.exclusionSummary).toEqual({
      policy_ineligible: 1,
      placement_incompatible: 1,
    });
  });

  it("excludes creative-incompatible candidates on the ranking path", () => {
    const outcome = rankAdsCandidates({
      candidates: [
        signals({
          candidateId: "blocked-creative",
          creativeCompatible: false,
          qualityScore: 1,
          relevanceScore: 1,
          freshnessScore: 1,
        }),
        signals({ candidateId: "ok", qualityScore: 0.1 }),
      ],
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(
      outcome.result.rankedCandidates.map((entry) => entry.candidateId)
    ).toEqual(["ok"]);
    expect(outcome.result.excludedCandidates).toEqual([
      {
        candidateId: "blocked-creative",
        reason: "creative_incompatible",
      },
    ]);
    expect(outcome.result.diagnostics.exclusionSummary).toEqual({
      creative_incompatible: 1,
    });
  });

  it("excludes delivery-ineligible candidates on the ranking path", () => {
    const outcome = rankAdsCandidates({
      candidates: [
        signals({
          candidateId: "blocked-delivery",
          deliveryEligible: false,
          qualityScore: 1,
          relevanceScore: 1,
          freshnessScore: 1,
        }),
        signals({ candidateId: "ok", qualityScore: 0.1 }),
      ],
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(
      outcome.result.rankedCandidates.map((entry) => entry.candidateId)
    ).toEqual(["ok"]);
    expect(outcome.result.excludedCandidates).toEqual([
      {
        candidateId: "blocked-delivery",
        reason: "delivery_ineligible",
      },
    ]);
    expect(outcome.result.diagnostics.exclusionSummary).toEqual({
      delivery_ineligible: 1,
    });
  });

  it("returns empty rankedCandidates when all candidates are hard-gated out", () => {
    const outcome = rankAdsCandidates({
      candidates: [
        signals({
          candidateId: "a",
          placementCompatible: false,
          qualityScore: 1,
        }),
        signals({
          candidateId: "b",
          creativeCompatible: false,
          qualityScore: 1,
        }),
        signals({
          candidateId: "c",
          deliveryEligible: false,
          qualityScore: 1,
        }),
      ],
    });
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.rankedCandidates).toEqual([]);
    expect(outcome.result.excludedCandidates).toEqual([
      { candidateId: "a", reason: "placement_incompatible" },
      { candidateId: "b", reason: "creative_incompatible" },
      { candidateId: "c", reason: "delivery_ineligible" },
    ]);
    expect(outcome.result.diagnostics.rankedCandidateCount).toBe(0);
    expect(outcome.result.diagnostics.excludedCandidateCount).toBe(3);
    expect(outcome.result.diagnostics.exclusionSummary).toEqual({
      placement_incompatible: 1,
      creative_incompatible: 1,
      delivery_ineligible: 1,
    });
    expectKillSwitchesOff(outcome.result);
  });

  it("rejects Infinity, NaN, negative, and above-max scores with no ranked output", () => {
    const cases = [
      { qualityScore: Number.POSITIVE_INFINITY },
      { relevanceScore: Number.NEGATIVE_INFINITY },
      { freshnessScore: Number.NaN },
      { qualityScore: -1 },
      { relevanceScore: 1.5 },
      { freshnessScore: 2 },
    ] as const;

    for (const override of cases) {
      const outcome = rankAdsCandidates({
        candidates: [
          {
            ...signals({ candidateId: "bad" }),
            ...override,
          },
        ],
      });
      expect(outcome.valid).toBe(false);
      if (outcome.valid) return;
      expect(outcome).not.toHaveProperty("result");
    }
  });

  it("does not mutate input candidates array or nested signal objects", () => {
    const first = Object.freeze({
      candidateId: "zeta",
      placementCompatible: true,
      creativeCompatible: true,
      policyEligible: true,
      deliveryEligible: true,
      qualityScore: 0.5,
      relevanceScore: 0.5,
      freshnessScore: 0.5,
    });
    const second = Object.freeze({
      candidateId: "alpha",
      placementCompatible: true,
      creativeCompatible: true,
      policyEligible: true,
      deliveryEligible: true,
      qualityScore: 0.5,
      relevanceScore: 0.5,
      freshnessScore: 0.5,
    });
    const candidates = Object.freeze([first, second]);
    const input = Object.freeze({ candidates });

    const before = structuredClone(input);
    const outcome = rankAdsCandidates(input);
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(input).toEqual(before);
    expect(candidates[0]).toBe(first);
    expect(candidates[1]).toBe(second);
    expect(candidates.map((entry) => entry.candidateId)).toEqual([
      "zeta",
      "alpha",
    ]);
    expect(
      outcome.result.rankedCandidates.map((entry) => entry.candidateId)
    ).toEqual(["alpha", "zeta"]);
  });

  it("is deterministic for identical inputs and immutable", () => {
    const input = {
      candidates: [
        signals({ candidateId: "c", qualityScore: 0.7 }),
        signals({ candidateId: "a", qualityScore: 0.7 }),
        signals({ candidateId: "b", qualityScore: 0.2, policyEligible: false }),
      ],
    };
    const first = rankAdsCandidates(input);
    const second = rankAdsCandidates(input);
    expect(first).toEqual(second);
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    expect(() => {
      (first.result as { productionEnabled: boolean }).productionEnabled = true;
    }).toThrow();
  });

  it("fails closed on unknown fields, invalid signals, and duplicates", () => {
    expect(
      rankAdsCandidates({
        candidates: [signals({ candidateId: "x" })],
        auctionEnabled: true,
      }).valid
    ).toBe(false);

    expect(
      rankAdsCandidates({
        candidates: [
          {
            ...signals({ candidateId: "x" }),
            relevanceScore: Number.NaN,
          },
        ],
      }).valid
    ).toBe(false);

    expect(
      rankAdsCandidates({
        candidates: [
          signals({ candidateId: "same" }),
          signals({ candidateId: "same" }),
        ],
      }).valid
    ).toBe(false);
  });

  it("creates an empty immutable result with kill switches off", () => {
    const empty = createEmptyAdsRankingResult();
    expect(empty.rankedCandidates).toEqual([]);
    expect(empty.diagnostics.evaluatedCandidateCount).toBe(0);
    expectKillSwitchesOff(empty);
    expect(validateAdsRankingResult(empty).valid).toBe(true);
  });

  it("parses ranking input into a fresh frozen candidates snapshot", () => {
    const parsed = parseAdsRankingInput({
      candidates: [signals({ candidateId: "p1" })],
    });
    expect(parsed.valid).toBe(true);
    if (!parsed.valid) return;
    expect(Object.isFrozen(parsed.input)).toBe(true);
    expect(Object.isFrozen(parsed.input.candidates)).toBe(true);
    expect(parsed.input.candidates[0].candidateId).toBe("p1");
  });

  it("exposes a total-order comparator for rankable candidates", () => {
    const left = {
      signals: signals({ candidateId: "left", qualityScore: 0.9 }),
      breakdown: {
        contractVersion: ADS_SCORING_CONTRACT_VERSION,
        candidateId: "left",
        components: [],
        totalScore: 0.8,
        rankable: true as const,
        exclusionReason: null,
        productionEnabled: false as const,
        deliveryEnabled: false as const,
        executionEnabled: false as const,
      },
      explanation: {
        contractVersion: ADS_SCORING_CONTRACT_VERSION,
        candidateId: "left",
        rankable: true as const,
        exclusionReason: null,
        gates: {
          placementCompatible: true,
          creativeCompatible: true,
          policyEligible: true,
          deliveryEligible: true,
        },
        components: [],
        totalScore: 0.8,
        summary: "left",
        productionEnabled: false as const,
        deliveryEnabled: false as const,
        executionEnabled: false as const,
      },
      inputIndex: 0,
    };
    const right = {
      ...left,
      signals: signals({ candidateId: "right", qualityScore: 0.1 }),
      breakdown: { ...left.breakdown, candidateId: "right", totalScore: 0.2 },
      explanation: {
        ...left.explanation,
        candidateId: "right",
        totalScore: 0.2,
      },
      inputIndex: 1,
    };

    const comparison = compareAdsRankableCandidates(left, right);
    expect(comparison.rule).toBe("total_score_desc");
    expect(comparison.order).toBeLessThan(0);
  });

  it("has no randomness, DB, network, or product imports", () => {
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|live|store|world|messenger|games|learning|search|notifications)(\/|["'])/i
    );
    expect(SOURCE).not.toMatch(/from ["']@supabase\//);
    expect(SOURCE).not.toMatch(
      /\bas AdsRankingCandidateSignals\b|\bas AdsRankingInput\b|exclusionReason!/
    );
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/executionEnabled: false/);
  });
});
