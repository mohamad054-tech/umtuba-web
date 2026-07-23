import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADS_AUCTION_CONTRACT_VERSION,
  ADS_AUCTION_MAX_CANDIDATES,
  ADS_AUCTION_NO_WINNER_REASONS,
  ADS_AUCTION_SELECTION_RULE,
  ADS_AUCTION_STRATEGY,
  ADS_AUCTION_TIE_BREAK_RULES,
  compareAdsAuctionableCandidates,
  createEmptyAdsAuctionResult,
  parseAdsAuctionInput,
  runAdsAuction,
  validateAdsAuctionResult,
  type AdsAuctionEligibilityEntry,
  type AdsAuctionRankedCandidate,
  type AdsAuctionRankingMetadata,
  type AdsAuctionResult,
} from "./auction";
import {
  ADS_RANKING_CONTRACT_VERSION,
  ADS_RANKING_STRATEGY,
  ADS_RANKING_TIE_BREAK_RULES,
} from "./ranking";
import {
  ADS_SCORING_CONTRACT_VERSION,
  ADS_SCORING_WEIGHTS,
} from "./scoring";

const SOURCE_PATH = path.join(__dirname, "auction.ts");
const SOURCE = readFileSync(SOURCE_PATH, "utf8");

function rankingMetadata(
  overrides: Partial<AdsAuctionRankingMetadata> = {}
): AdsAuctionRankingMetadata {
  return Object.freeze({
    contractVersion: overrides.contractVersion ?? ADS_RANKING_CONTRACT_VERSION,
    scoringContractVersion:
      overrides.scoringContractVersion ?? ADS_SCORING_CONTRACT_VERSION,
    strategy: overrides.strategy ?? ADS_RANKING_STRATEGY,
    weights: overrides.weights ?? ADS_SCORING_WEIGHTS,
    tieBreakRules: overrides.tieBreakRules ?? ADS_RANKING_TIE_BREAK_RULES,
  });
}

function ranked(
  overrides: Partial<AdsAuctionRankedCandidate> & { candidateId: string }
): AdsAuctionRankedCandidate {
  return Object.freeze({
    candidateId: overrides.candidateId,
    rank: overrides.rank ?? 1,
    totalScore: overrides.totalScore ?? 0.5,
  });
}

function eligibility(
  candidateId: string,
  eligible: boolean
): AdsAuctionEligibilityEntry {
  return Object.freeze({ candidateId, eligible });
}

function auctionInput(options: {
  rankedCandidates: AdsAuctionRankedCandidate[];
  eligibilityState: AdsAuctionEligibilityEntry[];
  rankingMetadata?: AdsAuctionRankingMetadata;
}) {
  return Object.freeze({
    rankedCandidates: Object.freeze([...options.rankedCandidates]),
    rankingMetadata: options.rankingMetadata ?? rankingMetadata(),
    eligibilityState: Object.freeze([...options.eligibilityState]),
  });
}

function expectKillSwitchesOff(result: AdsAuctionResult): void {
  expect(result.productionEnabled).toBe(false);
  expect(result.deliveryEnabled).toBe(false);
  expect(result.executionEnabled).toBe(false);
}

describe("Ads Auction Foundation V1", () => {
  it("exposes contract version, strategy, and reachable tie-break rules", () => {
    expect(ADS_AUCTION_CONTRACT_VERSION).toBe("v1");
    expect(ADS_AUCTION_STRATEGY).toBe("deterministic_first_eligible_rank_v1");
    expect(ADS_AUCTION_SELECTION_RULE).toBe("first_eligible_by_rank_v1");
    expect([...ADS_AUCTION_TIE_BREAK_RULES]).toEqual([
      "rank_asc",
      "total_score_desc",
      "candidate_id_asc",
    ]);
    expect([...ADS_AUCTION_NO_WINNER_REASONS]).toEqual([
      "no_ranked_candidates",
      "no_eligible_candidates",
    ]);
    expect(ADS_AUCTION_MAX_CANDIDATES).toBe(256);
  });

  it("has no bidding, billing, randomness, clock, or product imports", () => {
    expect(SOURCE).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    expect(SOURCE).not.toMatch(/from ["']@\//);
    expect(SOURCE).not.toMatch(/from ["']\.\.\//);
    expect(SOURCE).not.toMatch(/from ["'][^"']*supabase[^"']*["']/i);
    expect(SOURCE).not.toMatch(
      /from ["'][^"']*\/(watch|discover|learning|store|world|messages|live)\//i
    );
    expect(SOURCE).not.toMatch(
      /\bbidAmount\b|\bclearingPrice\b|\bsecondPrice\b|\bpostJournal\b|\bchargeCard\b|\bueos_post/i
    );
    expect(SOURCE).not.toMatch(/inputIndex/);
    expect(SOURCE).toMatch(/productionEnabled: false/);
    expect(SOURCE).toMatch(/deliveryEnabled: false/);
    expect(SOURCE).toMatch(/executionEnabled: false/);
  });

  it("selects the highest-ranked eligible candidate as winner", () => {
    const outcome = runAdsAuction(
      auctionInput({
        rankedCandidates: [
          ranked({ candidateId: "a", rank: 1, totalScore: 0.9 }),
          ranked({ candidateId: "b", rank: 2, totalScore: 0.8 }),
          ranked({ candidateId: "c", rank: 3, totalScore: 0.7 }),
        ],
        eligibilityState: [
          eligibility("a", true),
          eligibility("b", true),
          eligibility("c", false),
        ],
      })
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;

    expect(outcome.result.auctionWinner).toEqual({
      candidateId: "a",
      rank: 1,
      totalScore: 0.9,
      selectionRule: ADS_AUCTION_SELECTION_RULE,
      tieBreakRuleApplied: "rank_asc",
    });
    expect(outcome.result.auctionDiagnostics.evaluatedCandidateCount).toBe(3);
    expect(outcome.result.auctionDiagnostics.eligibleCandidateCount).toBe(2);
    expect(outcome.result.auctionDiagnostics.ineligibleCandidateCount).toBe(1);
    expect(outcome.result.auctionDiagnostics.winnerSelected).toBe(true);
    expect(outcome.result.auctionDiagnostics.noWinnerReason).toBeNull();
    expect(outcome.result.auctionMetadata.strategy).toBe(ADS_AUCTION_STRATEGY);
    expect(outcome.result.auctionMetadata.rankingContractVersion).toBe(
      ADS_RANKING_CONTRACT_VERSION
    );
    expectKillSwitchesOff(outcome.result);
    expect(validateAdsAuctionResult(outcome.result).valid).toBe(true);
    expect(Object.isFrozen(outcome.result)).toBe(true);
    expect(Object.isFrozen(outcome.result.auctionDiagnostics)).toBe(true);
    expect(Object.isFrozen(outcome.result.auctionMetadata)).toBe(true);
  });

  it("skips ineligible higher ranks and picks the next eligible", () => {
    const outcome = runAdsAuction(
      auctionInput({
        rankedCandidates: [
          ranked({ candidateId: "top", rank: 1, totalScore: 1 }),
          ranked({ candidateId: "mid", rank: 2, totalScore: 0.5 }),
          ranked({ candidateId: "low", rank: 3, totalScore: 0.1 }),
        ],
        eligibilityState: [
          eligibility("top", false),
          eligibility("mid", true),
          eligibility("low", true),
        ],
      })
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.auctionWinner?.candidateId).toBe("mid");
    expect(outcome.result.auctionWinner?.rank).toBe(2);
    expect(outcome.result.auctionWinner?.tieBreakRuleApplied).toBe("rank_asc");
  });

  /**
   * Defensive comparator coverage only.
   * runAdsAuction requires unique ranks (permutation of 1..n) and therefore
   * never permits duplicate ranks into winner selection. Same-rank
   * totalScore / candidateId branches are unreachable after input integrity
   * validation — they exist so the comparator remains total-ordered if
   * invoked directly, not because the auction allows colliding ranks.
   */
  it("defensive comparator: totalScore and candidateId when ranks collide (unreachable after unique-rank validation)", () => {
    const scoreTie = compareAdsAuctionableCandidates(
      {
        candidate: ranked({ candidateId: "left", rank: 1, totalScore: 0.9 }),
      },
      {
        candidate: ranked({ candidateId: "right", rank: 1, totalScore: 0.2 }),
      }
    );
    expect(scoreTie.rule).toBe("total_score_desc");
    expect(scoreTie.order).toBeLessThan(0);

    const idTie = compareAdsAuctionableCandidates(
      {
        candidate: ranked({ candidateId: "zeta", rank: 1, totalScore: 0.5 }),
      },
      {
        candidate: ranked({ candidateId: "alpha", rank: 1, totalScore: 0.5 }),
      }
    );
    expect(idTie.rule).toBe("candidate_id_asc");
    expect(idTie.order).toBeGreaterThan(0);

    const ambiguous = compareAdsAuctionableCandidates(
      {
        candidate: ranked({ candidateId: "same", rank: 1, totalScore: 0.5 }),
      },
      {
        candidate: ranked({ candidateId: "same", rank: 1, totalScore: 0.5 }),
      }
    );
    expect(ambiguous.order).toBe(0);
    expect(ambiguous.rule).toBe("candidate_id_asc");
  });

  it("accepts a valid fractional totalScore within [0, 1]", () => {
    const outcome = runAdsAuction(
      auctionInput({
        rankedCandidates: [
          ranked({ candidateId: "frac", rank: 1, totalScore: 0.37 }),
        ],
        eligibilityState: [eligibility("frac", true)],
      })
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.auctionWinner?.totalScore).toBe(0.37);
    expectKillSwitchesOff(outcome.result);
  });

  it("fails closed on invalid rank numbers (NaN, Infinity, negative, zero, fractional)", () => {
    const baseEligibility = [eligibility("a", true)];
    const cases: unknown[] = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -1,
      0,
      1.5,
    ];

    for (const rank of cases) {
      const outcome = runAdsAuction({
        rankedCandidates: [
          {
            candidateId: "a",
            rank,
            totalScore: 0.5,
          },
        ],
        rankingMetadata: rankingMetadata(),
        eligibilityState: baseEligibility,
      });
      expect(outcome.valid).toBe(false);
      if (outcome.valid) return;
      expect("result" in outcome).toBe(false);
    }
  });

  it("fails closed on invalid totalScore numbers (NaN, Infinity, negative, above 1)", () => {
    const cases: unknown[] = [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -0.1,
      1.01,
    ];

    for (const totalScore of cases) {
      const outcome = runAdsAuction({
        rankedCandidates: [
          {
            candidateId: "a",
            rank: 1,
            totalScore,
          },
        ],
        rankingMetadata: rankingMetadata(),
        eligibilityState: [eligibility("a", true)],
      });
      expect(outcome.valid).toBe(false);
      if (outcome.valid) return;
      expect("result" in outcome).toBe(false);
    }
  });

  it("fails closed on duplicate ranks with no winner and no input-order fallback", () => {
    const outcome = runAdsAuction(
      auctionInput({
        rankedCandidates: [
          ranked({ candidateId: "A", rank: 1, totalScore: 0.9 }),
          ranked({ candidateId: "B", rank: 1, totalScore: 0.8 }),
        ],
        eligibilityState: [eligibility("A", true), eligibility("B", true)],
      })
    );

    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect("result" in outcome).toBe(false);
    expect(outcome.issues.some((issue) => /rank/i.test(issue))).toBe(true);
    expect(SOURCE).not.toMatch(/inputIndex/);
  });

  it("rejects top-level auctionWinner injection as an unknown field", () => {
    const outcome = runAdsAuction({
      rankedCandidates: [ranked({ candidateId: "a", rank: 1, totalScore: 0.5 })],
      rankingMetadata: rankingMetadata(),
      eligibilityState: [eligibility("a", true)],
      auctionWinner: {
        candidateId: "injected",
        rank: 1,
        totalScore: 1,
        selectionRule: ADS_AUCTION_SELECTION_RULE,
        tieBreakRuleApplied: null,
      },
    });

    expect(outcome.valid).toBe(false);
    if (outcome.valid) return;
    expect("result" in outcome).toBe(false);
    expect(
      outcome.issues.some((issue) =>
        issue.includes('unknown field "auctionWinner"')
      )
    ).toBe(true);
  });

  it("returns no winner when all candidates are ineligible", () => {
    const outcome = runAdsAuction(
      auctionInput({
        rankedCandidates: [
          ranked({ candidateId: "a", rank: 1 }),
          ranked({ candidateId: "b", rank: 2 }),
        ],
        eligibilityState: [eligibility("a", false), eligibility("b", false)],
      })
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.auctionWinner).toBeNull();
    expect(outcome.result.auctionDiagnostics.winnerSelected).toBe(false);
    expect(outcome.result.auctionDiagnostics.noWinnerReason).toBe(
      "no_eligible_candidates"
    );
    expect(outcome.result.auctionDiagnostics.eligibleCandidateCount).toBe(0);
    expect(outcome.result.auctionDiagnostics.ineligibleCandidateCount).toBe(2);
    expectKillSwitchesOff(outcome.result);
  });

  it("returns no winner for empty ranked candidates", () => {
    const outcome = runAdsAuction(
      auctionInput({
        rankedCandidates: [],
        eligibilityState: [],
      })
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.auctionWinner).toBeNull();
    expect(outcome.result.auctionDiagnostics.noWinnerReason).toBe(
      "no_ranked_candidates"
    );
    expect(outcome.result.auctionDiagnostics.evaluatedCandidateCount).toBe(0);
  });

  it("sets null tieBreakRuleApplied for a sole eligible winner", () => {
    const outcome = runAdsAuction(
      auctionInput({
        rankedCandidates: [
          ranked({ candidateId: "only", rank: 1, totalScore: 0.4 }),
          ranked({ candidateId: "blocked", rank: 2, totalScore: 0.9 }),
        ],
        eligibilityState: [
          eligibility("only", true),
          eligibility("blocked", false),
        ],
      })
    );

    expect(outcome.valid).toBe(true);
    if (!outcome.valid) return;
    expect(outcome.result.auctionWinner?.candidateId).toBe("only");
    expect(outcome.result.auctionWinner?.tieBreakRuleApplied).toBeNull();
    expect(outcome.result.auctionDiagnostics.tieBreakEvents).toEqual([]);
  });

  it("is deterministic and does not mutate input", () => {
    const rankedCandidates = Object.freeze([
      ranked({ candidateId: "b", rank: 2, totalScore: 0.4 }),
      ranked({ candidateId: "a", rank: 1, totalScore: 0.8 }),
    ]);
    const eligibilityState = Object.freeze([
      eligibility("a", true),
      eligibility("b", true),
    ]);
    const input = Object.freeze({
      rankedCandidates,
      rankingMetadata: rankingMetadata(),
      eligibilityState,
    });
    const before = structuredClone(input);

    const first = runAdsAuction(input);
    const second = runAdsAuction(input);

    expect(first).toEqual(second);
    expect(input).toEqual(before);
    expect(rankedCandidates.map((entry) => entry.candidateId)).toEqual([
      "b",
      "a",
    ]);
    expect(first.valid).toBe(true);
    if (!first.valid) return;
    expect(first.result.auctionWinner?.candidateId).toBe("a");
    expect(() => {
      (first.result as { productionEnabled: boolean }).productionEnabled = true;
    }).toThrow();
  });

  it("fails closed on unknown fields, bad ranks, and eligibility mismatches", () => {
    expect(
      runAdsAuction({
        rankedCandidates: [ranked({ candidateId: "a", rank: 1 })],
        rankingMetadata: rankingMetadata(),
        eligibilityState: [eligibility("a", true)],
        bidAmount: 10,
      }).valid
    ).toBe(false);

    expect(
      runAdsAuction(
        auctionInput({
          rankedCandidates: [
            ranked({ candidateId: "a", rank: 1 }),
            ranked({ candidateId: "b", rank: 3 }),
          ],
          eligibilityState: [eligibility("a", true), eligibility("b", true)],
        })
      ).valid
    ).toBe(false);

    expect(
      runAdsAuction(
        auctionInput({
          rankedCandidates: [ranked({ candidateId: "a", rank: 1 })],
          eligibilityState: [eligibility("a", true), eligibility("ghost", true)],
        })
      ).valid
    ).toBe(false);

    expect(
      runAdsAuction(
        auctionInput({
          rankedCandidates: [
            ranked({ candidateId: "a", rank: 1 }),
            ranked({ candidateId: "b", rank: 2 }),
          ],
          eligibilityState: [eligibility("a", true)],
        })
      ).valid
    ).toBe(false);

    expect(
      runAdsAuction(
        auctionInput({
          rankedCandidates: [
            ranked({ candidateId: "same", rank: 1 }),
            ranked({ candidateId: "same", rank: 2 }),
          ],
          eligibilityState: [
            eligibility("same", true),
            eligibility("other", true),
          ],
        })
      ).valid
    ).toBe(false);

    expect(
      runAdsAuction({
        rankedCandidates: [ranked({ candidateId: "a", rank: 1 })],
        rankingMetadata: rankingMetadata({
          strategy: "weighted_score_v1" as typeof ADS_RANKING_STRATEGY,
        }),
        eligibilityState: [
          {
            candidateId: "a",
            eligible: true,
            reason: "extra",
          },
        ],
      }).valid
    ).toBe(false);
  });

  it("fails closed on invalid ranking metadata provenance", () => {
    expect(
      runAdsAuction(
        auctionInput({
          rankedCandidates: [ranked({ candidateId: "a", rank: 1 })],
          eligibilityState: [eligibility("a", true)],
          rankingMetadata: rankingMetadata({
            contractVersion: "v0" as typeof ADS_RANKING_CONTRACT_VERSION,
          }),
        })
      ).valid
    ).toBe(false);

    expect(
      runAdsAuction({
        rankedCandidates: [ranked({ candidateId: "a", rank: 1 })],
        rankingMetadata: {
          ...rankingMetadata(),
          auctionEnabled: true,
        },
        eligibilityState: [eligibility("a", true)],
      }).valid
    ).toBe(false);
  });

  it("parses auction input into a fresh frozen snapshot", () => {
    const parsed = parseAdsAuctionInput(
      auctionInput({
        rankedCandidates: [ranked({ candidateId: "p1", rank: 1 })],
        eligibilityState: [eligibility("p1", true)],
      })
    );
    expect(parsed.valid).toBe(true);
    if (!parsed.valid) return;
    expect(Object.isFrozen(parsed.input)).toBe(true);
    expect(Object.isFrozen(parsed.input.rankedCandidates)).toBe(true);
    expect(Object.isFrozen(parsed.input.eligibilityState)).toBe(true);
    expect(Object.isFrozen(parsed.input.rankingMetadata)).toBe(true);
  });

  it("creates an empty immutable result with kill switches off", () => {
    const empty = createEmptyAdsAuctionResult();
    expect(empty.auctionWinner).toBeNull();
    expect(empty.auctionDiagnostics.noWinnerReason).toBe(
      "no_ranked_candidates"
    );
    expectKillSwitchesOff(empty);
    expect(validateAdsAuctionResult(empty).valid).toBe(true);
  });

  it("rejects invalid result shapes via validateAdsAuctionResult", () => {
    const empty = createEmptyAdsAuctionResult();
    expect(
      validateAdsAuctionResult({
        ...empty,
        productionEnabled: true,
      }).valid
    ).toBe(false);
    expect(
      validateAdsAuctionResult({
        ...empty,
        auctionWinner: {
          candidateId: "x",
          rank: 1,
          totalScore: 0.5,
          selectionRule: ADS_AUCTION_SELECTION_RULE,
          tieBreakRuleApplied: null,
        },
      }).valid
    ).toBe(false);
  });
});
