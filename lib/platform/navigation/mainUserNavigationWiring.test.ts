import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS, APP_ROUTES, isNavActive } from "../../../app/lib/nav/routes";
import {
  MOBILE_PRIMARY_NAV_ITEMS,
  isMobilePrimaryNavActive,
} from "../../../app/lib/nav/mobileNav";
import { buildUserMenuGroups } from "../../../app/lib/nav/userMenuItems";
import {
  USER_MENU_CAPABILITIES_NONE,
  USER_MENU_CAPABILITIES_SIGNED_IN_BASE,
} from "../../../app/lib/nav/userMenuCapabilities";
import { getPageById, getPageByPath } from "../pageRegistry";
import {
  assertChromeLinksMatchRegistry,
  buildChromeUserMenuGroups,
  isPresentationEnabled,
  listDesktopMainNavLinks,
  listMobileMainNavLinks,
} from "./index";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("UMTUBA Main & User Navigation Wiring V1", () => {
  it("main navigation paths come from registry", () => {
    const links = listDesktopMainNavLinks();
    expect(links.map((l) => l.href)).toEqual([
      "/",
      "/world",
      "/learning",
      "/live",
      "/messages",
    ]);
    assertChromeLinksMatchRegistry(links);
    for (const link of links) {
      expect(getPageById(link.pageId)?.path).toBe(link.href);
      expect(link.href.startsWith("/admin")).toBe(false);
    }
    expect(APP_NAV_ITEMS.map((i) => i.href)).toEqual(links.map((l) => l.href));
    expect(APP_NAV_ITEMS.map((i) => i.label)).toEqual(links.map((l) => l.label));
  });

  it("mobile and desktop use the same route truth for shared tabs", () => {
    const desktop = listDesktopMainNavLinks();
    const mobile = listMobileMainNavLinks();
    assertChromeLinksMatchRegistry(mobile);

    for (const id of ["home", "live", "messages"] as const) {
      const d = desktop.find((l) => l.chromeId === id);
      const m = mobile.find((l) => l.chromeId === id);
      expect(d?.href).toBe(m?.href);
      expect(d?.pageId).toBe(m?.pageId);
    }

    expect(mobile.map((l) => l.chromeId)).toEqual([
      "home",
      "live",
      "messages",
      "profile",
    ]);
    expect(mobile.some((l) => l.href === "/world")).toBe(false);
    expect(MOBILE_PRIMARY_NAV_ITEMS.map((i) => i.href)).toEqual(
      mobile.map((l) => l.href)
    );
  });

  it("user navigation paths come from registry", () => {
    const groups = buildChromeUserMenuGroups("/profile/contract_user", {
      showCreate: true,
      showAdvertise: true,
    });
    const flat = groups.flatMap((g) => g.items);
    for (const item of flat) {
      if (item.chromeId === "profile") {
        expect(item.pageId).toBe("profile");
        expect(getPageById("profile")).toBeTruthy();
        continue;
      }
      expect(getPageById(item.pageId)?.path).toBe(item.href);
    }
  });

  it("guest and authenticated menus remain distinct", () => {
    const signedIn = buildUserMenuGroups(
      "/profile/alice",
      USER_MENU_CAPABILITIES_SIGNED_IN_BASE
    );
    const locked = buildUserMenuGroups(
      "/profile/alice",
      USER_MENU_CAPABILITIES_NONE
    );

    expect(signedIn.flatMap((g) => g.items.map((i) => i.id))).toContain(
      "create"
    );
    expect(signedIn.flatMap((g) => g.items.map((i) => i.id))).toContain(
      "advertise"
    );
    expect(locked.flatMap((g) => g.items.map((i) => i.id))).not.toContain(
      "create"
    );
    expect(locked.flatMap((g) => g.items.map((i) => i.id))).not.toContain(
      "advertise"
    );
    // Guest UserMenu UI uses Sign in action — not a registry page list.
    expect(read("app/components/UserMenu.tsx")).toMatch(/Sign in/);
    expect(read("app/components/UserMenu.tsx")).toMatch(/signOut/);
  });

  it("admin pages excluded from standard user menu unless capability on", () => {
    const withoutAdmin = buildUserMenuGroups(
      "/profile/alice",
      USER_MENU_CAPABILITIES_SIGNED_IN_BASE
    );
    expect(
      withoutAdmin.flatMap((g) => g.items.map((i) => i.href))
    ).not.toContain(APP_ROUTES.adminAds);

    const withAdmin = buildUserMenuGroups("/profile/alice", {
      ...USER_MENU_CAPABILITIES_SIGNED_IN_BASE,
      showAdmin: true,
    });
    expect(withAdmin.flatMap((g) => g.items.map((i) => i.href))).toContain(
      APP_ROUTES.adminAds
    );
    expect(getPageByPath(APP_ROUTES.adminAds)?.adminOnly).toBe(true);
  });

  it("feature-flagged routes remain hidden when disabled", () => {
    const sample = {
      chromeId: "world",
      pageId: "world",
      label: "World",
      featureFlag: "chrome.world",
    };
    expect(isPresentationEnabled(sample, { "chrome.world": false })).toBe(
      false
    );
    expect(isPresentationEnabled(sample, { "chrome.world": true })).toBe(true);
    expect(isPresentationEnabled(sample, {})).toBe(true);
  });

  it("icons/labels remain presentation-only metadata", () => {
    const presentation = read("lib/platform/navigation/presentation.ts");
    expect(presentation).toMatch(/label: "Home"/);
    expect(presentation).not.toMatch(/path:\s*["']\//);
    expect(presentation).not.toMatch(/href:\s*["']\//);
  });

  it("logout/action entries are not treated as pages", () => {
    const groups = buildUserMenuGroups(
      "/profile/alice",
      USER_MENU_CAPABILITIES_SIGNED_IN_BASE
    );
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).not.toContain("sign-out");
    expect(ids).not.toContain("logout");
    expect(ids).not.toContain("switch-account");
    const menu = read("app/components/UserMenu.tsx");
    expect(menu).toMatch(/Sign out/);
  });

  it("active state works for static and dynamic routes", () => {
    expect(isNavActive("/", "/")).toBe(true);
    expect(isNavActive("/discover", "/")).toBe(true);
    expect(isNavActive("/world/city/x", "/world")).toBe(true);
    expect(isNavActive("/learning/courses/1", "/learning")).toBe(true);
    expect(isMobilePrimaryNavActive("/live/room-1", "live")).toBe(true);
    expect(isMobilePrimaryNavActive("/profile/alice", "profile")).toBe(true);
    expect(isMobilePrimaryNavActive("/settings", "profile")).toBe(true);
  });

  it("no duplicated hardcoded primary path arrays remain in migrated surfaces", () => {
    const routes = read("app/lib/nav/routes.ts");
    const mobile = read("app/lib/nav/mobileNav.ts");
    const userMenu = read("app/lib/nav/userMenuItems.ts");

    expect(routes).toMatch(/listDesktopMainNavLinks/);
    expect(routes).not.toMatch(
      /APP_NAV_ITEMS: AppNavItem\[\] = \[\s*\{\s*label: "Home"/
    );
    expect(mobile).toMatch(/listMobileMainNavLinks/);
    expect(mobile).not.toMatch(
      /MOBILE_PRIMARY_NAV_ITEMS: MobilePrimaryNavItem\[\] = \[\s*\{\s*id: "home"/
    );
    expect(userMenu).toMatch(/buildChromeUserMenuGroups/);
    expect(userMenu).not.toMatch(/APP_ROUTES\.saved/);
    expect(userMenu).not.toMatch(/INSTRUCTOR_HUB_HREF/);
  });
});
