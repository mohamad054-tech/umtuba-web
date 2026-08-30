import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS,
  MOBILE_BOTTOM_NAV_MAX_CLASS,
  MOBILE_PRIMARY_NAV_ITEMS,
  isMobilePrimaryNavActive,
  resolveMobileProfileHref,
  shouldShowMobileBottomNav,
} from "./mobileNav";
import { APP_NAV_ITEMS, APP_ROUTES } from "./routes";

describe("MOBILE_PRIMARY_NAV_ITEMS", () => {
  it("renders the five first-class destinations in order", () => {
    expect(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.id)).toEqual([
      "watch",
      "umLife",
      "create",
      "learning",
      "store",
    ]);
    expect(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Watch",
      "UM Life",
      "Create",
      "Learning",
      "Store",
    ]);
    expect(MOBILE_PRIMARY_NAV_ITEMS[0]?.href).toBe(APP_ROUTES.watch);
    expect(MOBILE_PRIMARY_NAV_ITEMS[1]?.href).toBe(APP_ROUTES.home);
    expect(MOBILE_PRIMARY_NAV_ITEMS[2]?.href).toBe(APP_ROUTES.createVideo);
    expect(MOBILE_PRIMARY_NAV_ITEMS[3]?.href).toBe(APP_ROUTES.learning);
    expect(MOBILE_PRIMARY_NAV_ITEMS[4]?.href).toBe(APP_ROUTES.store);
  });
});

describe("isMobilePrimaryNavActive", () => {
  it("handles nested watch, create, learning, and store routes", () => {
    expect(isMobilePrimaryNavActive("/watch", "watch")).toBe(true);
    expect(isMobilePrimaryNavActive("/watch?post=1", "watch")).toBe(true);
    expect(isMobilePrimaryNavActive("/create/video", "create")).toBe(true);
    expect(isMobilePrimaryNavActive("/create/article", "create")).toBe(true);
    expect(isMobilePrimaryNavActive("/learning", "learning")).toBe(true);
    expect(isMobilePrimaryNavActive("/learning/courses", "learning")).toBe(true);
    expect(isMobilePrimaryNavActive("/store", "store")).toBe(true);
    expect(isMobilePrimaryNavActive("/store/cart", "store")).toBe(true);
    expect(isMobilePrimaryNavActive("/", "umLife")).toBe(true);
    expect(isMobilePrimaryNavActive("/discover", "umLife")).toBe(true);
    expect(isMobilePrimaryNavActive("/life", "umLife")).toBe(true);
    expect(isMobilePrimaryNavActive("/watch", "umLife")).toBe(false);
  });
});

describe("shouldShowMobileBottomNav", () => {
  it("shows on primary surfaces and hides on cinematic/auth routes", () => {
    expect(shouldShowMobileBottomNav("/")).toBe(true);
    expect(shouldShowMobileBottomNav("/discover")).toBe(true);
    expect(shouldShowMobileBottomNav("/live")).toBe(true);
    expect(shouldShowMobileBottomNav("/messages")).toBe(true);
    expect(shouldShowMobileBottomNav("/profile/alice")).toBe(true);
    expect(shouldShowMobileBottomNav("/rewards")).toBe(true);

    expect(shouldShowMobileBottomNav("/login")).toBe(false);
    expect(shouldShowMobileBottomNav("/signup")).toBe(false);
    expect(shouldShowMobileBottomNav("/register")).toBe(false);
    expect(shouldShowMobileBottomNav("/forgot-password")).toBe(false);
    expect(shouldShowMobileBottomNav("/auth/update-password")).toBe(false);
    expect(shouldShowMobileBottomNav("/live/media-lab")).toBe(false);
    expect(
      shouldShowMobileBottomNav("/live/db60a16b-ae73-4923-a00f-da075a41821a")
    ).toBe(false);
  });
});

describe("desktop vs mobile nav contracts", () => {
  it("keeps desktop primary links available via AppTopNav items", () => {
    expect(APP_NAV_ITEMS.map((item) => item.href)).toEqual([
      APP_ROUTES.watch,
      APP_ROUTES.home,
      APP_ROUTES.createVideo,
      APP_ROUTES.learning,
      APP_ROUTES.store,
    ]);
  });

  it("keeps World off primary chrome (UM Life Home Entry V1)", () => {
    expect(APP_NAV_ITEMS.some((item) => item.label === "World")).toBe(false);
    expect(
      MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.label === "World")
    ).toBe(false);
    expect(
      MOBILE_PRIMARY_NAV_ITEMS.some(
        (item) => item.href === APP_ROUTES.worldDiscovery
      )
    ).toBe(false);
    expect(
      MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.href === APP_ROUTES.store)
    ).toBe(true);
    expect(
      MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.href === APP_ROUTES.watch)
    ).toBe(true);
  });

  it("scopes mobile bottom nav to below-sm via class contract", () => {
    expect(MOBILE_BOTTOM_NAV_MAX_CLASS).toBe("sm:hidden");
    expect(MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS).toContain(
      "--app-mobile-bottom-nav-offset"
    );
  });
});

describe("resolveMobileProfileHref", () => {
  it("links signed-in users to their profile and others to login", () => {
    expect(resolveMobileProfileHref("Creator_One")).toBe("/profile/creator_one");
    expect(resolveMobileProfileHref(null, { signedIn: true })).toBe(
      APP_ROUTES.profile
    );
    expect(resolveMobileProfileHref(null)).toContain("/login?");
    expect(resolveMobileProfileHref(null)).toContain(
      encodeURIComponent(APP_ROUTES.profile)
    );
  });
});

describe("dead future routes", () => {
  it("does not link mobile or top nav to missing product routes", () => {
    const mobileNav = readFileSync(
      join(process.cwd(), "app/lib/nav/mobileNav.ts"),
      "utf8"
    );
    const topNav = readFileSync(
      join(process.cwd(), "app/components/AppTopNav.tsx"),
      "utf8"
    );
    const userMenu = readFileSync(
      join(process.cwd(), "app/lib/nav/userMenuItems.ts"),
      "utf8"
    );

    for (const src of [mobileNav, topNav, userMenu]) {
      expect(src).not.toMatch(/href:\s*["']\/ai["']/);
      expect(src).not.toMatch(/["']\/ideas["']/);
      expect(src).not.toMatch(/["']\/opportunities["']/);
      expect(src).not.toMatch(/["']\/uconnect["']/);
    }
  });

  it("keeps profile resolver for account chrome even without a Profile tab", () => {
    expect(resolveMobileProfileHref("Creator_One")).toBe("/profile/creator_one");
    expect(
      MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.id === ("profile" as never))
    ).toBe(false);
  });
});
