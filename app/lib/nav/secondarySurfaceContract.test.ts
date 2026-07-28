import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FORBIDDEN_OFFICIAL_CHROME_PATHS,
  LIVING_NAVIGATION_PROTOTYPE_IDS,
  SECONDARY_AND_EXPERIMENTAL_SURFACES,
  isForbiddenOfficialChromePath,
} from "./secondarySurfaceContract";
import { APP_NAV_ITEMS, APP_ROUTES } from "./routes";
import { MOBILE_PRIMARY_NAV_ITEMS } from "./mobileNav";
import { buildUserMenuGroups } from "./userMenuItems";
import { USER_MENU_CAPABILITIES_SIGNED_IN_BASE } from "./userMenuCapabilities";
import { LIVING_NAVIGATION_IDS } from "../../components/video/living-navigation/livingNavigationConfig";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Secondary Surface Cleanup V1", () => {
  it("classifies required secondary / legacy / experimental surfaces", () => {
    const ids = SECONDARY_AND_EXPERIMENTAL_SURFACES.map((s) => s.id);
    expect(ids).toEqual([
      "living-navigation",
      "feed",
      "journey-pro",
      "post-journey",
      "live-media-lab",
      "city-prototype",
    ]);
    expect(
      SECONDARY_AND_EXPERIMENTAL_SURFACES.find((s) => s.id === "feed")?.path
    ).toBe("/feed");
    expect(
      SECONDARY_AND_EXPERIMENTAL_SURFACES.find((s) => s.id === "journey-pro")
        ?.path
    ).toBe("/journey-pro");
    expect(
      SECONDARY_AND_EXPERIMENTAL_SURFACES.find((s) => s.id === "post-journey")
        ?.path
    ).toBe("/post-journey");
    expect(
      SECONDARY_AND_EXPERIMENTAL_SURFACES.find((s) => s.id === "live-media-lab")
        ?.path
    ).toBe("/live/media-lab");
    expect(
      SECONDARY_AND_EXPERIMENTAL_SURFACES.find((s) => s.id === "living-navigation")
        ?.kind
    ).toBe("prototype-overlay");
  });

  it("keeps Living Navigation ids as prototype overlays, not app chrome", () => {
    expect([...LIVING_NAVIGATION_PROTOTYPE_IDS]).toEqual([
      ...LIVING_NAVIGATION_IDS,
    ]);
    const config = read(
      "app/components/video/living-navigation/livingNavigationConfig.ts"
    );
    expect(config).toMatch(/Secondary Surface Cleanup V1|prototype/);
    expect(config).toMatch(/not Platform Navigation primary|not official chrome|prototype/);
  });

  it("excludes forbidden paths from desktop primary nav", () => {
    for (const item of APP_NAV_ITEMS) {
      expect(isForbiddenOfficialChromePath(item.href)).toBe(false);
    }
    const hrefs = APP_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).not.toContain("/feed");
    expect(hrefs).not.toContain("/journey-pro");
    expect(hrefs).not.toContain("/post-journey");
    expect(hrefs).not.toContain("/live/media-lab");
    expect(hrefs).not.toContain(APP_ROUTES.postJourney);
  });

  it("excludes forbidden paths from mobile primary nav", () => {
    for (const item of MOBILE_PRIMARY_NAV_ITEMS) {
      expect(isForbiddenOfficialChromePath(item.href)).toBe(false);
    }
    const hrefs = MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.href);
    for (const forbidden of FORBIDDEN_OFFICIAL_CHROME_PATHS) {
      expect(hrefs.some((href) => href === forbidden || href.startsWith(`${forbidden}/`))).toBe(
        false
      );
    }
  });

  it("excludes forbidden paths from UserMenu baseline", () => {
    const hrefs = buildUserMenuGroups(
      "/profile/contract_user",
      USER_MENU_CAPABILITIES_SIGNED_IN_BASE
    ).flatMap((group) => group.items.map((item) => item.href));
    for (const href of hrefs) {
      expect(isForbiddenOfficialChromePath(href)).toBe(false);
    }
    expect(hrefs).not.toContain("/feed");
    expect(hrefs).not.toContain("/journey-pro");
    expect(hrefs).not.toContain("/post-journey");
    expect(hrefs).not.toContain("/live/media-lab");
    expect(hrefs).not.toContain("/ai");
  });

  it("keeps official chrome source files free of secondary surface destinations", () => {
    for (const rel of [
      "app/components/AppTopNav.tsx",
      "app/components/AppMobileBottomNav.tsx",
      "app/lib/nav/userMenuItems.ts",
    ]) {
      const src = read(rel);
      expect(src).not.toMatch(/["']\/feed["']/);
      expect(src).not.toMatch(/["']\/journey-pro["']/);
      expect(src).not.toMatch(/["']\/post-journey["']/);
      expect(src).not.toMatch(/["']\/live\/media-lab["']/);
      expect(src).not.toMatch(/["']\/ai["']/);
      expect(src).not.toMatch(/["']\/uconnect["']/);
      expect(src).not.toMatch(/LivingNavigation|LIVING_NAVIGATION/);
    }

    // mobileNav may mention media-lab only to *hide* the bar — never as an item href.
    const mobileNav = read("app/lib/nav/mobileNav.ts");
    expect(mobileNav).not.toMatch(/["']\/feed["']/);
    expect(mobileNav).not.toMatch(/["']\/journey-pro["']/);
    expect(mobileNav).not.toMatch(/["']\/post-journey["']/);
    expect(mobileNav).not.toMatch(/["']\/ai["']/);
    expect(mobileNav).not.toMatch(/href:\s*["']\/live\/media-lab["']/);
    expect(MOBILE_PRIMARY_NAV_ITEMS.every((item) => item.href !== "/live/media-lab")).toBe(
      true
    );
  });

  it("documents that secondary routes remain present (not deleted)", () => {
    expect(read("app/feed/page.tsx")).toMatch(/isExperimentalRouteAvailable/);
    expect(read("app/journey-pro/page.tsx")).toMatch(/isExperimentalRouteAvailable/);
    expect(read("app/post-journey/page.tsx")).toMatch(/./);
    expect(read("app/live/media-lab/page.tsx")).toMatch(/./);
    expect(APP_ROUTES.postJourney).toBe("/post-journey");
  });
});
