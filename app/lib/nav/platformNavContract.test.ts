import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  AUTH_DEFAULT_NEXT_PATH,
  DESKTOP_PRIMARY_NAV_HREFS,
  DESKTOP_PRIMARY_NAV_LABELS,
  DISCOVER_HOME_ALIAS,
  HOME_CIRCLE_ENTRY_HREFS,
  MOBILE_PRIMARY_NAV_IDS,
  MOBILE_PRIMARY_NAV_LABELS,
  PROFILE_INDEX_PATH,
  USER_MENU_GROUP_IDS,
  USER_MENU_ITEM_LABELS,
  assertDesktopPrimaryNavContract,
  assertMobilePrimaryNavContract,
  assertUserMenuContract,
} from "./platformNavContract";
import {
  APP_NAV_ITEMS,
  APP_ROUTES,
  buildPostNotificationHref,
  isNavActive,
} from "./routes";
import {
  MOBILE_PRIMARY_NAV_ITEMS,
  isMobilePrimaryNavActive,
} from "./mobileNav";
import { buildUserMenuGroups, listUserMenuHrefs } from "./userMenuItems";
import { getSafeRedirectPath } from "../../../lib/supabase/redirect";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Platform Navigation Contract Sync V1", () => {
  describe("desktop primary navigation", () => {
    it("freezes Home World Learning Live Messages without Discover label", () => {
      expect(APP_NAV_ITEMS.map((item) => item.label)).toEqual([
        ...DESKTOP_PRIMARY_NAV_LABELS,
      ]);
      expect(APP_NAV_ITEMS.map((item) => item.href)).toEqual([
        ...DESKTOP_PRIMARY_NAV_HREFS,
      ]);
      expect(APP_NAV_ITEMS.some((item) => item.label === "Discover")).toBe(
        false
      );
      expect(APP_NAV_ITEMS.some((item) => item.href === APP_ROUTES.discover)).toBe(
        false
      );
      expect(() => assertDesktopPrimaryNavContract()).not.toThrow();
    });
  });

  describe("mobile primary navigation", () => {
    it("freezes Home Live Messages Profile without Discover", () => {
      expect(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.id)).toEqual([
        ...MOBILE_PRIMARY_NAV_IDS,
      ]);
      expect(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.label)).toEqual([
        ...MOBILE_PRIMARY_NAV_LABELS,
      ]);
      expect(MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.label === "Discover")).toBe(
        false
      );
      expect(() => assertMobilePrimaryNavContract()).not.toThrow();
    });
  });

  describe("user menu structure", () => {
    it("freezes You + Account groups and labels", () => {
      const groups = buildUserMenuGroups("/profile/contract_user");
      expect(groups.map((group) => group.id)).toEqual([...USER_MENU_GROUP_IDS]);
      expect(groups.flatMap((group) => group.items.map((item) => item.label))).toEqual(
        [...USER_MENU_ITEM_LABELS]
      );
      expect(() => assertUserMenuContract()).not.toThrow();

      const hrefs = listUserMenuHrefs("/profile/contract_user");
      expect(hrefs).toContain(APP_ROUTES.store);
      expect(hrefs).toContain(APP_ROUTES.seller);
      expect(hrefs).not.toContain("/admin/ads");
      expect(hrefs).not.toContain("/admin/store");
      expect(hrefs).not.toContain("/learning/instructor");
    });
  });

  describe("Home circles entry ramps", () => {
    it("documents circle destinations without requiring Home layout edits", () => {
      expect(HOME_CIRCLE_ENTRY_HREFS).toEqual([
        APP_ROUTES.learning,
        APP_ROUTES.store,
        APP_ROUTES.games,
        APP_ROUTES.live,
        APP_ROUTES.worldDiscovery,
        APP_ROUTES.search,
        APP_ROUTES.messages,
        APP_ROUTES.createVideo,
      ]);
      const circles = read("app/discover/components/HomeSectionCircles.tsx");
      expect(circles).toMatch(/aria-label="Section shortcuts"/);
      // Order contract via APP_ROUTES keys (layout of HomeSectionCircles stays locked).
      const learningIdx = circles.indexOf("APP_ROUTES.learning");
      const storeIdx = circles.indexOf("APP_ROUTES.store");
      const gamesIdx = circles.indexOf("APP_ROUTES.games");
      const liveIdx = circles.indexOf("APP_ROUTES.live");
      const worldIdx = circles.indexOf("APP_ROUTES.worldDiscovery");
      const searchIdx = circles.indexOf("APP_ROUTES.search");
      const messagesIdx = circles.indexOf("APP_ROUTES.messages");
      const createIdx = circles.indexOf("APP_ROUTES.createVideo");
      expect(learningIdx).toBeGreaterThan(-1);
      expect(storeIdx).toBeGreaterThan(learningIdx);
      expect(gamesIdx).toBeGreaterThan(storeIdx);
      expect(liveIdx).toBeGreaterThan(gamesIdx);
      expect(worldIdx).toBeGreaterThan(liveIdx);
      expect(searchIdx).toBeGreaterThan(worldIdx);
      expect(messagesIdx).toBeGreaterThan(searchIdx);
      expect(createIdx).toBeGreaterThan(messagesIdx);
    });
  });

  describe("Discover Home alias", () => {
    it("keeps /discover as forever redirect to Home, not a primary label", () => {
      expect(DISCOVER_HOME_ALIAS).toBe("/discover");
      const discoverPage = read("app/discover/page.tsx");
      expect(discoverPage).toMatch(/Compatible alias/);
      expect(discoverPage).toMatch(/redirect/);
      expect(discoverPage).toMatch(/APP_ROUTES\.home/);
      expect(isNavActive("/discover", APP_ROUTES.home)).toBe(true);
      expect(isNavActive("/discover", APP_ROUTES.discover)).toBe(false);
      expect(isMobilePrimaryNavActive("/discover", "home")).toBe(true);
      expect(buildPostNotificationHref({ postId: "42" })).toBe(
        "/discover?post=42"
      );
    });
  });

  describe("profile resolver", () => {
    it("documents bare /profile login and owner redirect contract", () => {
      expect(PROFILE_INDEX_PATH).toBe("/profile");
      const profileIndex = read("app/profile/page.tsx");
      expect(profileIndex).toMatch(/Bare `\/profile`/);
      expect(profileIndex).toMatch(/APP_ROUTES\.login/);
      expect(profileIndex).toMatch(/encodeURIComponent\(APP_ROUTES\.profile\)/);
      expect(profileIndex).toMatch(/buildCreatorProfileHref/);
      expect(profileIndex).toMatch(/APP_ROUTES\.settings/);
    });
  });

  describe("auth ?next= behavior", () => {
    it("keeps default next as /discover (Home alias) and blocks open redirects", () => {
      // Contract via getSafeRedirectPath only — auth.ts wiring is unchanged/out of scope.
      expect(AUTH_DEFAULT_NEXT_PATH).toBe("/discover");
      expect(getSafeRedirectPath(null)).toBe("/discover");
      expect(getSafeRedirectPath(undefined)).toBe("/discover");
      expect(getSafeRedirectPath("")).toBe("/discover");
      expect(getSafeRedirectPath("/messages")).toBe("/messages");
      expect(getSafeRedirectPath("//evil.example")).toBe("/discover");
      expect(getSafeRedirectPath("https://evil.example")).toBe("/discover");
    });
  });

  describe("shell coherence boundary", () => {
    it("does not place Store Domain or Admin into primary chrome contracts", () => {
      expect(DESKTOP_PRIMARY_NAV_HREFS).not.toContain(APP_ROUTES.store);
      expect(DESKTOP_PRIMARY_NAV_HREFS).not.toContain(APP_ROUTES.seller);
      expect(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.href)).not.toContain(
        APP_ROUTES.store
      );
      const topNav = read("app/components/AppTopNav.tsx");
      const mobileNav = read("app/components/AppMobileBottomNav.tsx");
      expect(topNav).not.toMatch(/APP_ROUTES\.store/);
      expect(topNav).not.toMatch(/admin\/store/);
      expect(mobileNav).not.toMatch(/APP_ROUTES\.store/);
      expect(mobileNav).not.toMatch(/admin\/store/);
    });
  });
});
