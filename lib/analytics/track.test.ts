import { describe, expect, it } from "vitest";
import { ANALYTICS_EVENTS, type AnalyticsEventName } from "./track";
import { isAdminPath, isAnalyticsConfigured, readPosthogHost, readPosthogKey } from "./config";
import { firstTouchPersonProperties } from "./firstTouch";
import { browserSendsDoNotTrack } from "./consent";

describe("analytics catalog", () => {
  it("exposes the required event names", () => {
    const names: AnalyticsEventName[] = Object.values(ANALYTICS_EVENTS);
    expect(names).toEqual([
      "sign_up_started",
      "sign_up_completed",
      "login",
      "video_view",
      "video_like",
      "video_share",
      "comment_posted",
      "post_published",
      "game_started",
      "game_finished",
      "store_product_viewed",
      "learning_course_opened",
      "search_performed",
      "report_submitted",
    ]);
  });

  it("treats a missing key as disabled", () => {
    expect(isAnalyticsConfigured({})).toBe(false);
    expect(readPosthogKey({})).toBe("");
    expect(readPosthogHost({})).toBe("https://eu.i.posthog.com");
    expect(
      readPosthogHost({ NEXT_PUBLIC_POSTHOG_HOST: "https://eu.i.posthog.com" })
    ).toBe("https://eu.i.posthog.com");
  });

  it("skips admin paths", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/ads")).toBe(true);
    expect(isAdminPath("/games")).toBe(false);
  });

  it("maps first-touch fields without free text beyond UTM tokens", () => {
    expect(
      firstTouchPersonProperties({
        utm_source: "google",
        utm_medium: "cpc",
        utm_campaign: "launch",
        referrer: "https://news.example/path",
      })
    ).toEqual({
      utm_source_first: "google",
      utm_medium_first: "cpc",
      utm_campaign_first: "launch",
      referrer_first: "https://news.example/path",
    });
  });

  it("does not treat missing DNT as opted out in node tests", () => {
    expect(browserSendsDoNotTrack()).toBe(false);
  });
});
