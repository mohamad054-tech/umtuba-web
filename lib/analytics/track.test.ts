import { readFileSync } from "node:fs";
import { join } from "node:path";
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
    const prevKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const prevHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
    try {
      expect(isAnalyticsConfigured()).toBe(false);
      expect(readPosthogKey()).toBe("");
      expect(readPosthogHost()).toBe("https://eu.i.posthog.com");
    } finally {
      if (prevKey === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
      else process.env.NEXT_PUBLIC_POSTHOG_KEY = prevKey;
      if (prevHost === undefined) delete process.env.NEXT_PUBLIC_POSTHOG_HOST;
      else process.env.NEXT_PUBLIC_POSTHOG_HOST = prevHost;
    }
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

describe("PostHog env inlining contract", () => {
  it("reads NEXT_PUBLIC_POSTHOG_* as literals, not computed keys", () => {
    const root = join(process.cwd());
    const config = readFileSync(join(root, "lib/analytics/config.ts"), "utf8");
    const client = readFileSync(join(root, "lib/analytics/client.ts"), "utf8");
    const provider = readFileSync(
      join(root, "app/components/analytics/PostHogProvider.tsx"),
      "utf8"
    );
    const consent = readFileSync(join(root, "lib/analytics/consent.ts"), "utf8");

    expect(config).toMatch(/process\.env\.NEXT_PUBLIC_POSTHOG_KEY/);
    expect(config).toMatch(/process\.env\.NEXT_PUBLIC_POSTHOG_HOST/);
    expect(client).toMatch(/process\.env\.NEXT_PUBLIC_POSTHOG_KEY/);
    expect(client).toMatch(/process\.env\.NEXT_PUBLIC_POSTHOG_HOST/);

    for (const source of [config, client, provider, consent]) {
      expect(source).not.toMatch(/process\.env\s*\[/);
    }
  });

  it("localises the consent banner through i18n keys", () => {
    const banner = readFileSync(
      join(process.cwd(), "app/components/analytics/AnalyticsConsentBanner.tsx"),
      "utf8"
    );
    expect(banner).toMatch(/analytics\.consent\.body/);
    expect(banner).toMatch(/useTranslation/);
    expect(banner).toMatch(/dir=\{direction\}/);
    expect(banner).not.toMatch(/const COPY/);
  });
});
