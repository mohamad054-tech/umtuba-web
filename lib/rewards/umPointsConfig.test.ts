import { describe, expect, it } from "vitest";
import {
  applyCategoryCap,
  applyDailyCap,
  isMeaningfulComment,
  isSelfInteraction,
  nextUmPointsMilestone,
  UM_POINTS_REWARDS,
  VIEW_MILESTONE_THRESHOLDS,
} from "./umPointsConfig";

describe("UM Points automation rules", () => {
  it("exposes configurable reward values in one place", () => {
    expect(UM_POINTS_REWARDS.verifiedWelcome).toBe(100);
    expect(UM_POINTS_REWARDS.dailyEarnCap).toBe(200);
    expect(UM_POINTS_REWARDS.meaningfulComment).toBe(5);
  });

  it("enforces daily earn caps", () => {
    expect(applyDailyCap(0, 50).awarded).toBe(50);
    expect(applyDailyCap(190, 50).awarded).toBe(10);
    expect(applyDailyCap(200, 50)).toEqual({
      awarded: 0,
      blocked: true,
      reason: "daily_cap",
    });
  });

  it("enforces category caps", () => {
    expect(applyCategoryCap(20, 5, 25).awarded).toBe(5);
    expect(applyCategoryCap(25, 5, 25).reason).toBe("category_cap");
  });

  it("blocks self-interaction rewards", () => {
    expect(isSelfInteraction("a", "a")).toBe(true);
    expect(isSelfInteraction("a", "b")).toBe(false);
    expect(isSelfInteraction(null, "b")).toBe(false);
  });

  it("requires meaningful comment length", () => {
    expect(isMeaningfulComment("short")).toBe(false);
    expect(isMeaningfulComment("x".repeat(20))).toBe(true);
  });

  it("tracks view milestone thresholds used by automation", () => {
    expect([...VIEW_MILESTONE_THRESHOLDS]).toEqual([500, 1000, 10000, 100000]);
    expect(nextUmPointsMilestone(0)).toBe(1000);
    expect(nextUmPointsMilestone(1000)).toBe(5000);
  });
});
