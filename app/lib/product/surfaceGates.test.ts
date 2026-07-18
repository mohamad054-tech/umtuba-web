import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  allowLiveCollabMocks,
  allowMessengerPreviewChrome,
  allowWatchDemoFallback,
  allowWatchPrototypePanels,
  isExperimentalRouteAvailable,
  isProductionRuntime,
  isSurfaceAllowed,
} from "./surfaceGates";

const ROOT = process.cwd();

describe("surfaceGates production policy", () => {
  const prod = { NODE_ENV: "production" };
  const dev = { NODE_ENV: "development" };

  it("treats production runtime correctly", () => {
    expect(isProductionRuntime(prod)).toBe(true);
    expect(isProductionRuntime(dev)).toBe(false);
  });

  it("gates experimental routes in production", () => {
    expect(isExperimentalRouteAvailable(prod)).toBe(false);
    expect(isExperimentalRouteAvailable(dev)).toBe(true);
    expect(isSurfaceAllowed("feed", prod)).toBe(false);
    expect(isSurfaceAllowed("city", prod)).toBe(false);
    expect(isSurfaceAllowed("journeyPro", prod)).toBe(false);
  });

  it("never allows watch demo fallback or prototype panels in production", () => {
    expect(allowWatchDemoFallback(prod)).toBe(false);
    expect(allowWatchPrototypePanels(prod)).toBe(false);
    expect(
      allowWatchDemoFallback({
        NODE_ENV: "production",
        NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS: "1",
      })
    ).toBe(false);
  });

  it("never allows live collab mocks in production", () => {
    expect(allowLiveCollabMocks(prod)).toBe(false);
    expect(
      allowLiveCollabMocks({
        NODE_ENV: "production",
        NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS: "1",
      })
    ).toBe(false);
  });

  it("allows unfinished previews in development by default", () => {
    expect(allowWatchDemoFallback(dev)).toBe(true);
    expect(allowWatchPrototypePanels(dev)).toBe(true);
    expect(allowLiveCollabMocks(dev)).toBe(true);
  });

  it("can disable development previews with explicit flag", () => {
    const source = {
      NODE_ENV: "development",
      NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS: "0",
    };
    expect(allowWatchDemoFallback(source)).toBe(false);
    expect(allowLiveCollabMocks(source)).toBe(false);
  });

  it("keeps messenger presence preview off by default (opt-in only)", () => {
    expect(allowMessengerPreviewChrome({ NODE_ENV: "development" })).toBe(
      false
    );
    expect(allowMessengerPreviewChrome({ NODE_ENV: "production" })).toBe(
      false
    );
    expect(
      allowMessengerPreviewChrome({
        NODE_ENV: "development",
        NEXT_PUBLIC_ALLOW_SURFACE_PREVIEWS: "1",
      })
    ).toBe(true);
    expect(isSurfaceAllowed("messengerPreviewChrome", { NODE_ENV: "development" })).toBe(
      false
    );
  });
});

describe("production source contracts", () => {
  it("does not seed mock collab items unconditionally in LiveRoomExperience", () => {
    const src = readFileSync(
      join(ROOT, "app/live/LiveRoomExperience.tsx"),
      "utf8"
    );
    expect(src).toMatch(/allowLiveCollabMocks\(\)/);
    expect(src).toMatch(/allowLiveCollabEntry\(\)/);
    expect(src).not.toMatch(
      /useState<LiveCollabSharedItem\[\]>\(MOCK_COLLAB_ITEMS\)/
    );
  });

  it("does not use demoVideos fallback in production watch page path", () => {
    const src = readFileSync(join(ROOT, "app/watch/page.tsx"), "utf8");
    expect(src).toMatch(/allowWatchDemoFallback\(\)/);
    expect(src).toMatch(/ProductEmptyState/);
    expect(src).toMatch(/demoAllowed/);
  });

  it("gates feed and journey-pro with notFound in production", () => {
    const feed = readFileSync(join(ROOT, "app/feed/page.tsx"), "utf8");
    const journey = readFileSync(join(ROOT, "app/journey-pro/page.tsx"), "utf8");
    expect(feed).toMatch(/notFound\(\)/);
    expect(feed).toMatch(/isExperimentalRouteAvailable/);
    expect(journey).toMatch(/notFound\(\)/);
    expect(journey).toMatch(/isExperimentalRouteAvailable/);
  });

  it("keeps city production path free of placeholder experience", () => {
    const city = readFileSync(
      join(ROOT, "app/city/[citySlug]/page.tsx"),
      "utf8"
    );
    expect(city).toMatch(/City experience is being prepared/);
    expect(city).toMatch(/isExperimentalRouteAvailable/);
  });

  it("does not point normal nav at gated labs", () => {
    const mobile = readFileSync(join(ROOT, "app/lib/nav/mobileNav.ts"), "utf8");
    const routes = readFileSync(join(ROOT, "app/lib/nav/routes.ts"), "utf8");
    const userMenu = readFileSync(
      join(ROOT, "app/lib/nav/userMenuItems.ts"),
      "utf8"
    );
    const watch = readFileSync(join(ROOT, "app/watch/WatchExperience.tsx"), "utf8");

    for (const src of [mobile, routes, userMenu, watch]) {
      expect(src).not.toMatch(/["']\/feed["']/);
      expect(src).not.toMatch(/["']\/journey-pro["']/);
      expect(src).not.toMatch(/href:\s*["']\/city/);
      expect(src).not.toMatch(/["']\/ai["']/);
      expect(src).not.toMatch(/["']\/uconnect["']/);
    }
  });
});
