import { describe, expect, it } from "vitest";
import {
  buildAiInsightHref,
  buildPostJourneyHref,
  buildPostNotificationHref,
  buildRewardsHref,
  findIndexByPostId,
} from "../../lib/nav/routes";
import {
  COUNTRY_MILESTONES,
  VIEW_MILESTONES,
  dedupePostMilestoneCountries,
  dedupePostMilestoneViews,
  dedupePostReachedCountry,
  dedupeUmPointsEarned,
} from "./dedupeKeys";
import { preferenceAllowsType } from "./preferences";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../../../lib/supabase/notifications";

describe("notification deep-link builders", () => {
  it("builds discover post focus links", () => {
    expect(buildPostNotificationHref({ postId: 42 })).toBe(
      "/discover?post=42"
    );
    expect(
      buildPostNotificationHref({ postId: 42, commentId: 9 })
    ).toBe("/discover?post=42&comment=9");
  });

  it("builds journey / rewards / insights destinations", () => {
    expect(buildPostJourneyHref(7)).toBe("/post-journey?postId=7");
    expect(buildRewardsHref()).toBe("/rewards");
    expect(buildAiInsightHref()).toBe("/creator/insights");
  });

  it("finds discover index by post id", () => {
    const items = [{ id: "10" }, { id: "20" }, { id: "30" }];
    expect(findIndexByPostId(items, "20")).toBe(1);
    expect(findIndexByPostId(items, "99")).toBe(-1);
    expect(findIndexByPostId(items, null)).toBe(-1);
  });
});

describe("automation dedupe key contracts", () => {
  it("keeps view and country milestone keys stable", () => {
    expect(dedupePostMilestoneViews(3, 1000)).toBe(
      "post_milestone:views:3:1000"
    );
    expect(dedupePostMilestoneCountries(3, 10)).toBe(
      "post_milestone:countries:3:10"
    );
    expect(dedupePostReachedCountry(3, "tr")).toBe(
      "post_reached_country:3:TR"
    );
    expect(VIEW_MILESTONES).toContain(500);
    expect(COUNTRY_MILESTONES).toEqual([5, 10, 25]);
  });

  it("dedupes ledger awards by client key", () => {
    expect(dedupeUmPointsEarned("verified_welcome:u1")).toBe(
      "um_points_earned:verified_welcome:u1"
    );
  });
});

describe("preference gating still applies to automated types", () => {
  it("respects journey / rewards / nearby defaults", () => {
    expect(
      preferenceAllowsType(
        DEFAULT_NOTIFICATION_PREFERENCES,
        "post_reached_country"
      )
    ).toBe(true);
    expect(
      preferenceAllowsType(
        { ...DEFAULT_NOTIFICATION_PREFERENCES, journeyEnabled: false },
        "post_milestone"
      )
    ).toBe(false);
    expect(
      preferenceAllowsType(
        DEFAULT_NOTIFICATION_PREFERENCES,
        "nearby_live_started"
      )
    ).toBe(false);
  });
});
