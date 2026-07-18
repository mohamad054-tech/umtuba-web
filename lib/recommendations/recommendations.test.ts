import { describe, expect, it } from "vitest";
import {
  applyDiversityAndExploration,
  assembleRecommendationPage,
  assertCreatorDiversity,
  buildCreatorQualityFromVideos,
  buildUserInterestProfile,
  computeDeterministicQualityScore,
  DEFAULT_DIVERSITY_POLICY,
  deriveSkippedEarly,
  emptyVideoQuality,
  explorationSlotCount,
  normalizeWatchSignal,
  RECOMMENDATION_MODEL_VERSION,
  RECOMMENDATION_SCORE_WEIGHTS,
  scoreRecommendationCandidate,
  scoreWatchSignalQuality,
  type RecommendationCandidate,
  type RecommendationScoreContext,
  type VideoQualitySignals,
} from "./index";

function candidate(
  postId: number,
  creatorId: string,
  overrides: Partial<RecommendationCandidate> = {}
): RecommendationCandidate {
  return {
    postId,
    creatorId,
    createdAt: "2026-07-18T12:00:00.000Z",
    likes: 10,
    saves: 4,
    shares: 2,
    comments: 1,
    views: 100,
    ...overrides,
  };
}

function baseContext(
  overrides: Partial<RecommendationScoreContext> = {}
): RecommendationScoreContext {
  return {
    viewerId: "viewer-1",
    interest: null,
    seenCreatorIds: new Set<string>(),
    videoQualityByPostId: new Map(),
    creatorQualityById: new Map(),
    nowMs: Date.parse("2026-07-18T12:00:00.000Z"),
    ...overrides,
  };
}

describe("watch signal normalization", () => {
  it("derives skipped_early from duration and percent", () => {
    expect(
      deriveSkippedEarly({
        watchPercent: 5,
        watchDurationMs: 800,
        completed: false,
      })
    ).toBe(true);

    expect(
      normalizeWatchSignal({
        postId: 1,
        sessionId: "session-abc-1",
        surface: "discover",
        watchDurationMs: 800,
        watchPercent: 5,
        completed: false,
        rewatchCount: 0,
        liked: false,
        saved: false,
        shared: false,
        commented: false,
        followAfterWatch: false,
      }).skippedEarly
    ).toBe(true);
  });

  it("scores completed high-engagement sessions above early skips", () => {
    const strong = scoreWatchSignalQuality({
      postId: 1,
      sessionId: "s1",
      surface: "watch",
      watchDurationMs: 20_000,
      watchPercent: 95,
      completed: true,
      rewatchCount: 1,
      liked: true,
      saved: true,
      shared: false,
      commented: false,
      followAfterWatch: true,
    });
    const weak = scoreWatchSignalQuality({
      postId: 2,
      sessionId: "s2",
      surface: "watch",
      watchDurationMs: 400,
      watchPercent: 3,
      completed: false,
      rewatchCount: 0,
      liked: false,
      saved: false,
      shared: false,
      commented: false,
      followAfterWatch: false,
      skippedEarly: true,
    });
    expect(strong).toBeGreaterThan(weak);
  });
});

describe("quality + interest models", () => {
  it("computes deterministic quality score matching weight mix", () => {
    const score = computeDeterministicQualityScore({
      avgWatchPercent: 80,
      completionRate: 0.7,
      rewatchRate: 0.2,
      likeRate: 0.3,
      saveRate: 0.2,
      shareRate: 0.1,
      commentRate: 0.1,
      followRate: 0.05,
      skipRate: 0.1,
    });
    expect(score).toBeGreaterThan(0.2);
    expect(score).toBeLessThan(1);
  });

  it("builds user interest creator affinity from signals", () => {
    const profile = buildUserInterestProfile({
      userId: "u1",
      signals: [
        {
          postId: 1,
          sessionId: "a",
          surface: "discover",
          watchDurationMs: 12_000,
          watchPercent: 90,
          completed: true,
          rewatchCount: 0,
          liked: true,
          saved: false,
          shared: false,
          commented: false,
          followAfterWatch: false,
          skippedEarly: false,
          creatorId: "creator-a",
        },
        {
          postId: 2,
          sessionId: "b",
          surface: "discover",
          watchDurationMs: 500,
          watchPercent: 4,
          completed: false,
          rewatchCount: 0,
          liked: false,
          saved: false,
          shared: false,
          commented: false,
          followAfterWatch: false,
          skippedEarly: true,
          creatorId: "creator-b",
        },
      ],
    });

    expect(profile.modelVersion).toBe(RECOMMENDATION_MODEL_VERSION);
    expect(profile.creatorAffinity["creator-a"]).toBeGreaterThan(
      profile.creatorAffinity["creator-b"]!
    );
    expect(profile.totalSignals).toBe(2);
  });

  it("aggregates creator quality from video signals", () => {
    const videos: VideoQualitySignals[] = [
      {
        ...emptyVideoQuality(1, "c1"),
        avgWatchPercent: 70,
        completionRate: 0.6,
        likeRate: 0.2,
        qualityScore: 0.4,
        totalWatches: 10,
      },
      {
        ...emptyVideoQuality(2, "c1"),
        avgWatchPercent: 50,
        completionRate: 0.4,
        likeRate: 0.1,
        qualityScore: 0.3,
        totalWatches: 5,
      },
    ];
    const creator = buildCreatorQualityFromVideos("c1", videos);
    expect(creator.videoCount).toBe(2);
    expect(creator.totalWatches).toBe(15);
    expect(creator.qualityScore).toBe(
      computeDeterministicQualityScore({
        avgWatchPercent: 60,
        completionRate: 0.5,
        rewatchRate: 0,
        likeRate: 0.15,
        saveRate: 0,
        shareRate: 0,
        commentRate: 0,
        followRate: 0,
        skipRate: 0,
      })
    );
  });
});

describe("recommendation score service", () => {
  it("exposes deterministic weights (no AI)", () => {
    const sumPositive =
      RECOMMENDATION_SCORE_WEIGHTS.watchQuality +
      RECOMMENDATION_SCORE_WEIGHTS.engagement +
      RECOMMENDATION_SCORE_WEIGHTS.creatorQuality +
      RECOMMENDATION_SCORE_WEIGHTS.videoQuality +
      RECOMMENDATION_SCORE_WEIGHTS.interestAffinity +
      RECOMMENDATION_SCORE_WEIGHTS.recency +
      RECOMMENDATION_SCORE_WEIGHTS.exploration;
    expect(sumPositive).toBeGreaterThan(0.9);
    expect(RECOMMENDATION_SCORE_WEIGHTS.skipPenalty).toBeGreaterThan(0);
  });

  it("boosts exploration creators the viewer has not seen", () => {
    const seen = scoreRecommendationCandidate(
      candidate(1, "known"),
      baseContext({ seenCreatorIds: new Set(["known"]) })
    );
    const fresh = scoreRecommendationCandidate(
      candidate(2, "new-creator"),
      baseContext({ seenCreatorIds: new Set(["known"]) })
    );
    expect(fresh.isExploration).toBe(true);
    expect(seen.isExploration).toBe(false);
    expect(fresh.breakdown.exploration).toBeGreaterThan(
      seen.breakdown.exploration
    );
  });
});

describe("diversity and exploration", () => {
  it("caps creator domination within a page", () => {
    const scored = Array.from({ length: 20 }, (_, i) => ({
      postId: i + 1,
      creatorId: i < 6 ? "dom-creator" : `c-${i}`,
      score: 1 - i * 0.01,
      breakdown: {
        watchQuality: 0,
        engagement: 0,
        creatorQuality: 0,
        videoQuality: 0,
        interestAffinity: 0,
        recency: 0,
        exploration: 0,
        skipPenalty: 0,
        total: 1 - i * 0.01,
      },
      isExploration: i >= 6,
    }));

    const page = applyDiversityAndExploration(scored, 8, {
      ...DEFAULT_DIVERSITY_POLICY,
      maxPerCreator: 2,
    });

    expect(page.length).toBe(8);
    expect(assertCreatorDiversity(page, 2)).toBe(true);
    const domCount = page.filter((p) => p.creatorId === "dom-creator").length;
    expect(domCount).toBeLessThanOrEqual(2);
  });

  it("reserves exploration slots for new creators", () => {
    expect(explorationSlotCount(10)).toBeGreaterThanOrEqual(1);

    const page = assembleRecommendationPage({
      pageSize: 10,
      context: baseContext({
        seenCreatorIds: new Set(["a", "b", "c"]),
      }),
      candidates: [
        ...[1, 2, 3, 4, 5, 6].map((id) =>
          candidate(id, "a", {
            createdAt: "2026-07-18T11:00:00.000Z",
            views: 1000,
            likes: 200,
          })
        ),
        candidate(100, "fresh-1", { views: 20, likes: 1 }),
        candidate(101, "fresh-2", { views: 20, likes: 1 }),
        candidate(102, "fresh-3", { views: 20, likes: 1 }),
      ],
      policy: {
        maxPerCreator: 2,
        explorationSlotFraction: 0.2,
        minExplorationSlots: 2,
      },
    });

    expect(page.explorationCount).toBeGreaterThanOrEqual(2);
    expect(page.uniqueCreators).toBeGreaterThan(1);
  });
});
