import { describe, expect, it } from "vitest";
import {
  ACTIVITY_TIERS,
  buildActivityTierProgress,
  buildActivityTierRealtimeTopic,
  computeReversalDelta,
  computeTierProgressPercent,
  createActivityTierRealtimeInstanceId,
  evaluateActivityScoreAward,
  getNextActivityTier,
  resolveTierFromScore,
  sanitizeActivityTierProgressForClient,
  suggestedPointsForCategory,
} from "./index";

describe("activity tiers config", () => {
  it("exposes progressive thresholds and display labels", () => {
    expect(ACTIVITY_TIERS.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < ACTIVITY_TIERS.length; i += 1) {
      expect(ACTIVITY_TIERS[i]!.threshold).toBeGreaterThan(
        ACTIVITY_TIERS[i - 1]!.threshold
      );
      expect(ACTIVITY_TIERS[i]!.rank).toBeGreaterThan(ACTIVITY_TIERS[i - 1]!.rank);
    }
    expect(ACTIVITY_TIERS[0]!.displayLabel).toBeTruthy();
    expect(ACTIVITY_TIERS[0]!.icon).toBeTruthy();
  });
});

describe("resolveTierFromScore", () => {
  it("maps scores onto configured tiers", () => {
    expect(resolveTierFromScore(0).id).toBe("spark");
    expect(resolveTierFromScore(249).id).toBe("spark");
    expect(resolveTierFromScore(250).id).toBe("rising");
    expect(resolveTierFromScore(1000).id).toBe("creator");
    expect(resolveTierFromScore(25_000).id).toBe("icon");
  });
});

describe("progress toward next tier", () => {
  it("computes band progress and points remaining", () => {
    const progress = buildActivityTierProgress({ score: 500 });
    expect(progress.tierId).toBe("rising");
    expect(progress.nextTier?.id).toBe("creator");
    expect(progress.pointsToNext).toBe(500);
    expect(progress.progressPercent).toBe(
      computeTierProgressPercent(500, progress.tier, progress.nextTier)
    );
  });

  it("returns 100% at max tier", () => {
    const progress = buildActivityTierProgress({ score: 30_000 });
    expect(progress.nextTier).toBeNull();
    expect(progress.progressPercent).toBe(100);
    expect(getNextActivityTier("icon")).toBeNull();
  });

  it("strips English catalog copy before client serialization", () => {
    const progress = sanitizeActivityTierProgressForClient(
      buildActivityTierProgress({ score: 517 })
    );
    const serialized = JSON.stringify(progress);
    expect(progress.tierId).toBe("rising");
    expect(serialized).not.toContain("Rising Creator");
    expect(serialized).not.toContain("Building authentic");
    expect(progress.tier.displayTitle).toBe("");
    expect(progress.nextTier?.displayTitle).toBe("");
  });
});

describe("anti-abuse scoring", () => {
  it("blocks self-interactions", () => {
    const result = evaluateActivityScoreAward({
      request: {
        category: "helpful_comments",
        points: 8,
        reason: "comment",
        dedupeKey: "c1",
        actorUserId: "u1",
        recipientUserId: "u1",
      },
      earnedTodayTotal: 0,
      earnedTodayInCategory: 0,
      primaryEarnedToday: 0,
    });
    expect(result.blocked).toBe(true);
    expect(result.reason).toBe("self_interaction");
  });

  it("gates screen-time until primary activity exists", () => {
    const blocked = evaluateActivityScoreAward({
      request: {
        category: "screen_time_secondary",
        points: 5,
        reason: "watch",
        dedupeKey: "w1",
        recipientUserId: "u1",
        actorUserId: null,
        systemGrant: true,
      },
      earnedTodayTotal: 0,
      earnedTodayInCategory: 0,
      primaryEarnedToday: 0,
    });
    expect(blocked.reason).toBe("screen_time_gate");

    const allowed = evaluateActivityScoreAward({
      request: {
        category: "screen_time_secondary",
        points: 5,
        reason: "watch",
        dedupeKey: "w2",
        recipientUserId: "u1",
        systemGrant: true,
      },
      earnedTodayTotal: 20,
      earnedTodayInCategory: 0,
      primaryEarnedToday: 20,
    });
    expect(allowed.blocked).toBe(false);
    expect(allowed.awarded).toBe(5);
  });

  it("enforces daily caps", () => {
    const result = evaluateActivityScoreAward({
      request: {
        category: "quality_posts",
        points: 40,
        reason: "post",
        dedupeKey: "p1",
        recipientUserId: "u1",
        systemGrant: true,
      },
      earnedTodayTotal: 400,
      earnedTodayInCategory: 0,
      primaryEarnedToday: 400,
    });
    expect(result.reason).toBe("daily_cap");
  });

  it("supports reversing fraudulent awards without going negative", () => {
    expect(computeReversalDelta(50, 30)).toBe(-30);
    expect(computeReversalDelta(50, 80)).toBe(-50);
    expect(computeReversalDelta(0, 10)).toBe(0);
  });
});

describe("category weights", () => {
  it("weights primary activity far above screen time", () => {
    expect(suggestedPointsForCategory("quality_posts")).toBeGreaterThan(
      suggestedPointsForCategory("screen_time_secondary") * 10
    );
  });

  it("mirrors configured event points for quality posts", async () => {
    const { ACTIVITY_SCORE_EVENT_POINTS } = await import("./tiers");
    expect(ACTIVITY_SCORE_EVENT_POINTS.qualityPost).toBe(40);
    expect(ACTIVITY_SCORE_EVENT_POINTS.screenTimeUnit).toBe(1);
  });
});

describe("activity-tier realtime topics", () => {
  it("builds unique topics per subscription instance", () => {
    const a = createActivityTierRealtimeInstanceId();
    const b = createActivityTierRealtimeInstanceId();
    expect(a).not.toBe(b);
    expect(buildActivityTierRealtimeTopic("user-1", a)).toBe(
      `activity-tier:user-1:${a}`
    );
    expect(buildActivityTierRealtimeTopic("user-1", a)).not.toBe(
      buildActivityTierRealtimeTopic("user-1", b)
    );
  });

  it("rejects empty ids", () => {
    expect(() => buildActivityTierRealtimeTopic("", "x")).toThrow(/required/i);
    expect(() => buildActivityTierRealtimeTopic("u", "  ")).toThrow(/required/i);
  });
});
