import { describe, expect, it } from "vitest";
import {
  COUNTRY_MILESTONES,
  VIEW_MILESTONES,
  countryMilestonesReached,
  dedupeAiInsight,
  dedupeNearbyLive,
  dedupePostMilestoneCountries,
  dedupePostMilestoneViews,
  dedupePostReachedCountry,
  dedupePostTrendingCountry,
  dedupeRewardMilestoneUmPoints,
  dedupeUmPointsEarned,
  umPointsMilestonesReached,
  viewMilestonesReached,
} from "./dedupeKeys";

describe("dedupeKeys", () => {
  it("builds stable country reach keys (case-normalized)", () => {
    expect(dedupePostReachedCountry(42, "tr")).toBe(
      "post_reached_country:42:TR"
    );
    expect(dedupePostReachedCountry(42, "TR")).toBe(
      dedupePostReachedCountry(42, "tr")
    );
  });

  it("builds distinct keys per country / milestone / user", () => {
    expect(dedupePostTrendingCountry(1, "DE")).toBe(
      "post_trending_country:1:DE"
    );
    expect(dedupePostMilestoneViews(9, 1000)).toBe(
      "post_milestone:views:9:1000"
    );
    expect(dedupePostMilestoneCountries(9, 10)).toBe(
      "post_milestone:countries:9:10"
    );
    expect(dedupeUmPointsEarned("engagement:abc")).toBe(
      "um_points_earned:engagement:abc"
    );
    expect(dedupeRewardMilestoneUmPoints("user-1", 1000)).toBe(
      "reward_milestone:um_points:user-1:1000"
    );
    expect(dedupeNearbyLive("room-1", "user-2")).toBe(
      "nearby_live_started:room-1:user-2"
    );
    expect(dedupeAiInsight("user-3", "evening-peak")).toBe(
      "ai_creator_insight:user-3:evening-peak"
    );
  });

  it("never repeats the same view milestone once threshold is crossed", () => {
    expect(viewMilestonesReached(499)).toEqual([]);
    expect(viewMilestonesReached(500)).toEqual([500]);
    expect(viewMilestonesReached(1500)).toEqual([500, 1000]);
    expect(viewMilestonesReached(100_000)).toEqual([...VIEW_MILESTONES]);
  });

  it("emits country milestones only at configured thresholds", () => {
    expect(countryMilestonesReached(4)).toEqual([]);
    expect(countryMilestonesReached(5)).toEqual([5]);
    expect(countryMilestonesReached(25)).toEqual([...COUNTRY_MILESTONES]);
  });

  it("emits UM Points milestones without duplicates in the list", () => {
    const reached = umPointsMilestonesReached(10_000);
    expect(reached).toEqual([1000, 5000, 10_000]);
    expect(new Set(reached).size).toBe(reached.length);
  });
});
