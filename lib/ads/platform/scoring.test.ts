import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_CANDIDATE_SCORE_BREAKDOWN_ALLOWED_FIELDS,
  ADS_RANKING_CANDIDATE_SIGNALS_ALLOWED_FIELDS,
  ADS_SCORING_CONTRACT_VERSION,
  ADS_SCORING_EXCLUSION_REASONS,
  ADS_SCORING_WEIGHTS,
  explainAdsCandidateScore,
  parseAdsRankingCandidateSignals,
  roundAdsScore,
  scoreAdsCandidate,
  scoreAdsCandidates,
  validateAdsCandidateScoreBreakdown,
  validateAdsCandidateScoreExplanation,
  validateAdsRankingCandidateSignals,
  type AdsRankingCandidateSignals,
} from "./scoring";

const SOURCE_PATH = path.join(__dirname, "scoring.ts");
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

describe("Ads Scoring Foundation V1", () => {
  it("exposes contract version, weights, and allowed fields", () => {
    expect(ADS_SCORING_CONTRACT_VERSION).toBe("v1");
    expect(ADS_SCORING_WEIGHTS.quality).toBe(0.4);
    expect(ADS_SCORING_WEIGHTS.relevance).toBe(0.35);
    expect(ADS_SCORING_WEIGHTS.freshness).toBe(0.25);
    expect(
      roundAdsScore(
        ADS_SCORING_WEIGHTS.quality +
          ADS_SCORING_WEIGHTS.relevance +
          ADS_SCORING_WEIGHTS.freshness
      )
    ).toBe(1);
    expect([...ADS_RANKING_CANDIDATE_SIGNALS_ALLOWED_FIELDS]).toContain(
      "placementCompatible"
    );
    expect([...ADS_CANDIDATE_SCORE_BREAKDOWN_ALLOWED_FIELDS]).toContain(
      "executionEnabled"
    );
    expect([...ADS_SCORING_EXCLUSION_REASONS]).toEqual([
      "placement_incompatible",
      "creative_incompatible",
      "policy_ineligible",
      "delivery_ineligible",
    ]);
  });

  it("scores a rankable candidate with deterministic weighted breakdown", () => {
    const outcome = scoreAdsCandidate(
      signals({
        candidateId: "c1",
        qualityScore: 1,
        relevanceScore: 0.5,
        freshnessScore: 0,
      })
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    const expected = roundAdsScore(1 * 0.4 + 0.5 * 0.35 + 0 * 0.25);
    expect(outcome.breakdown.rankable).toBe(true);
    expect(outcome.breakdown.exclusionReason).toBeNull();
    expect(outcome.breakdown.totalScore).toBe(expected);
    expect(outcome.breakdown.components.map((c) => c.componentId)).toEqual([
      "quality",
      "relevance",
      "freshness",
    ]);
    expect(outcome.breakdown.productionEnabled).toBe(false);
    expect(outcome.breakdown.deliveryEnabled).toBe(false);
    expect(outcome.breakdown.executionEnabled).toBe(false);
    expect(Object.isFrozen(outcome.breakdown)).toBe(true);
    expect(Object.isFrozen(outcome.breakdown.components)).toBe(true);
  });

  it("excludes non-rankable candidates with first-match gate order", () => {
    const cases: Array<{
      override: Partial<AdsRankingCandidateSignals>;
      reason: (typeof ADS_SCORING_EXCLUSION_REASONS)[number];
    }> = [
      {
        override: { placementCompatible: false, creativeCompatible: false },
        reason: "placement_incompatible",
      },
      {
        override: { creativeCompatible: false, policyEligible: false },
        reason: "creative_incompatible",
      },
      {
        override: { policyEligible: false, deliveryEligible: false },
        reason: "policy_ineligible",
      },
      {
        override: { deliveryEligible: false },
        reason: "delivery_ineligible",
      },
    ];

    for (const testCase of cases) {
      const outcome = scoreAdsCandidate(
        signals({ candidateId: "gated", ...testCase.override })
      );
      expect(outcome.valid).toBe(true);
      if (!outcome.valid) return;
      expect(outcome.breakdown.rankable).toBe(false);
      expect(outcome.breakdown.exclusionReason).toBe(testCase.reason);
      expect(outcome.breakdown.totalScore).toBe(0);
      expect(outcome.breakdown.components).toEqual([]);
    }
  });

  it("rejects Infinity, NaN, negative, and above-maximum scores on all continuous fields", () => {
    const fields = [
      "qualityScore",
      "relevanceScore",
      "freshnessScore",
    ] as const;
    const invalidValues = [
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NaN,
      -0.01,
      1.01,
    ];

    for (const field of fields) {
      for (const value of invalidValues) {
        const outcome = scoreAdsCandidate({
          ...signals({ candidateId: "bad" }),
          [field]: value,
        });
        expect(outcome.valid).toBe(false);
        if (outcome.valid) return;
        expect(outcome.issues.some((issue) => issue.includes(field))).toBe(
          true
        );

        const parsed = parseAdsRankingCandidateSignals({
          ...signals({ candidateId: "bad" }),
          [field]: value,
        });
        expect(parsed.valid).toBe(false);
      }
    }
  });

  it("produces identical results for identical inputs", () => {
    const input = signals({
      candidateId: "stable",
      qualityScore: 0.33,
      relevanceScore: 0.66,
      freshnessScore: 0.99,
    });
    const first = scoreAdsCandidate(input);
    const second = scoreAdsCandidate(input);
    expect(first).toEqual(second);

    const batchA = scoreAdsCandidates([
      signals({ candidateId: "a", qualityScore: 0.1 }),
      signals({ candidateId: "b", qualityScore: 0.9 }),
    ]);
    const batchB = scoreAdsCandidates([
      signals({ candidateId: "a", qualityScore: 0.1 }),
      signals({ candidateId: "b", qualityScore: 0.9 }),
    ]);
    expect(batchA).toEqual(batchB);
  });

  it("explains candidate scores with gates and summary", () => {
    const outcome = explainAdsCandidateScore(
      signals({
        candidateId: "explain-me",
        qualityScore: 0.8,
        relevanceScore: 0.6,
        freshnessScore: 0.4,
      })
    );
    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.explanation.gates.placementCompatible).toBe(true);
    expect(outcome.explanation.summary).toContain("candidate=explain-me");
    expect(outcome.explanation.summary).toContain("rankable=true");
    expect(outcome.explanation.productionEnabled).toBe(false);
    expect(
      validateAdsCandidateScoreExplanation(outcome.explanation).valid
    ).toBe(true);
  });

  it("fails closed on unknown fields and duplicates", () => {
    expect(
      validateAdsRankingCandidateSignals({
        ...signals({ candidateId: "x" }),
        auctionBid: 1,
      }).valid
    ).toBe(false);

    expect(
      scoreAdsCandidates([
        signals({ candidateId: "dup" }),
        signals({ candidateId: "dup" }),
      ]).valid
    ).toBe(false);
  });

  it("parses signals into a fresh frozen object without casts on the happy path", () => {
    const parsed = parseAdsRankingCandidateSignals(
      signals({ candidateId: "parsed", qualityScore: 0.25 })
    );
    expect(parsed.valid).toBe(true);
    if (!parsed.valid) return;
    expect(Object.isFrozen(parsed.signals)).toBe(true);
    expect(parsed.signals.candidateId).toBe("parsed");
    expect(parsed.signals.qualityScore).toBe(0.25);
  });

  it("validates score breakdown shape and kill switches", () => {
    const scored = scoreAdsCandidate(signals({ candidateId: "ok" }));
    expect(scored.valid).toBe(true);
    if (!scored.valid) return;

    expect(validateAdsCandidateScoreBreakdown(scored.breakdown).valid).toBe(
      true
    );
    expect(
      validateAdsCandidateScoreBreakdown({
        ...scored.breakdown,
        productionEnabled: true,
      }).valid
    ).toBe(false);
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
      /\bas AdsRankingCandidateSignals\b|\bas AdsRankingInput\b/
    );
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/executionEnabled: false/);
  });
});
