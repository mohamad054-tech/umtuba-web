import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  mergeNotificationPreferences,
  preferenceAllowsType,
} from "./preferences";

describe("notification preferences", () => {
  it("defaults nearby live to off", () => {
    expect(DEFAULT_NOTIFICATION_PREFERENCES.nearbyLiveEnabled).toBe(false);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.journeyEnabled).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.rewardsEnabled).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.aiInsightsEnabled).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFERENCES.socialEnabled).toBe(true);
  });

  it("merges partial prefs without flipping nearby default incorrectly", () => {
    const merged = mergeNotificationPreferences({
      journeyEnabled: false,
    });
    expect(merged.journeyEnabled).toBe(false);
    expect(merged.nearbyLiveEnabled).toBe(false);
  });

  it("gates notification types by preference category", () => {
    const offNearby = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      nearbyLiveEnabled: false,
    };
    expect(preferenceAllowsType(offNearby, "nearby_live_started")).toBe(false);
    expect(preferenceAllowsType(offNearby, "live_started")).toBe(true);

    const quiet = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      journeyEnabled: false,
      rewardsEnabled: false,
      aiInsightsEnabled: false,
      socialEnabled: false,
    };
    expect(preferenceAllowsType(quiet, "post_milestone")).toBe(false);
    expect(preferenceAllowsType(quiet, "um_points_earned")).toBe(false);
    expect(preferenceAllowsType(quiet, "ai_creator_insight")).toBe(false);
    expect(preferenceAllowsType(quiet, "follow")).toBe(false);
  });

  it("allows V1 types when social is enabled", () => {
    expect(
      preferenceAllowsType(DEFAULT_NOTIFICATION_PREFERENCES, "post_like")
    ).toBe(true);
    expect(
      preferenceAllowsType(DEFAULT_NOTIFICATION_PREFERENCES, "mention")
    ).toBe(true);
  });
});
