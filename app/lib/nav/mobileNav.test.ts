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
  it("renders the four primary destinations in order", () => {
    expect(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.id)).toEqual([
      "home",
      "live",
      "messages",
      "profile",
    ]);
    expect(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Home",
      "Live",
      "Messages",
      "Profile",
    ]);
    expect(MOBILE_PRIMARY_NAV_ITEMS[0]?.href).toBe(APP_ROUTES.home);
    expect(MOBILE_PRIMARY_NAV_ITEMS[1]?.href).toBe(APP_ROUTES.live);
    expect(MOBILE_PRIMARY_NAV_ITEMS[2]?.href).toBe(APP_ROUTES.messages);
    expect(MOBILE_PRIMARY_NAV_ITEMS[3]?.href).toBe(APP_ROUTES.profile);
  });
});

describe("isMobilePrimaryNavActive", () => {
  it("handles nested live and profile routes", () => {
    expect(isMobilePrimaryNavActive("/live", "live")).toBe(true);
    expect(
      isMobilePrimaryNavActive("/live/db60a16b-ae73-4923-a00f-da075a41821a", "live")
    ).toBe(true);
    expect(isMobilePrimaryNavActive("/profile/creator_one", "profile")).toBe(
      true
    );
    expect(isMobilePrimaryNavActive("/settings", "profile")).toBe(true);
    expect(isMobilePrimaryNavActive("/messages", "messages")).toBe(true);
    expect(isMobilePrimaryNavActive("/", "home")).toBe(true);
    expect(isMobilePrimaryNavActive("/discover", "home")).toBe(true);
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
      APP_ROUTES.home,
      APP_ROUTES.worldDiscovery,
      APP_ROUTES.learning,
      APP_ROUTES.live,
      APP_ROUTES.messages,
    ]);
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

  it("uses profile route for the Profile tab config href", () => {
    const profileItem = MOBILE_PRIMARY_NAV_ITEMS.find(
      (item) => item.id === "profile"
    );
    expect(profileItem?.href).toBe(APP_ROUTES.profile);
  });
});
