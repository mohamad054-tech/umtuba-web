import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  UM_LIFE_ALIAS_PATH,
  UM_LIFE_BADGE_CAPABILITY,
  UM_LIFE_BADGE_LIVE_DATA,
  UM_LIFE_DESTINATION_HREF,
  UM_LIFE_ENTRY_LABEL,
  assertUmLifePrimaryEntry,
  isUmLifeNavDestination,
  resolveUmLifeActivityBadge,
  resolveUmLifeActivityBadgeCount,
} from "./umLifeHomeEntry";
import {
  APP_NAV_ITEMS,
  APP_ROUTES,
  isNavActive,
  isSocialHomePath,
} from "./routes";
import {
  MOBILE_PRIMARY_NAV_ITEMS,
  isMobilePrimaryNavActive,
} from "./mobileNav";
import { translate } from "../../../lib/i18n";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("UM Life Home Entry V1", () => {
  it("exposes a first-class UM Life entry on desktop and mobile-web", () => {
    expect(APP_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Watch",
      "UM Life",
      "Create",
      "Learning",
      "Store",
    ]);
    expect(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Watch",
      "UM Life",
      "Create",
      "Learning",
      "Store",
    ]);
    expect(() => assertUmLifePrimaryEntry()).not.toThrow();
  });

  it("lands UM Life on the authoritative social Home, not a second feed", () => {
    expect(UM_LIFE_DESTINATION_HREF).toBe("/");
    expect(UM_LIFE_ALIAS_PATH).toBe("/life");
    const desktop = APP_NAV_ITEMS.find((item) => item.label === UM_LIFE_ENTRY_LABEL);
    const mobile = MOBILE_PRIMARY_NAV_ITEMS.find((item) => item.id === "umLife");
    expect(desktop?.href).toBe(APP_ROUTES.home);
    expect(mobile?.href).toBe(APP_ROUTES.home);
    expect(APP_NAV_ITEMS.filter((item) => item.href === APP_ROUTES.home)).toHaveLength(
      1
    );
    expect(
      MOBILE_PRIMARY_NAV_ITEMS.filter((item) => item.href === APP_ROUTES.home)
    ).toHaveLength(1);
    expect(APP_NAV_ITEMS.some((item) => item.href === APP_ROUTES.life)).toBe(false);
    expect(MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.href === APP_ROUTES.life)).toBe(
      false
    );
  });

  it("treats / /discover /life as the same social Home active state", () => {
    expect(isSocialHomePath("/")).toBe(true);
    expect(isSocialHomePath("/discover")).toBe(true);
    expect(isSocialHomePath("/life")).toBe(true);
    expect(isSocialHomePath("/life?post=1")).toBe(true);
    expect(isSocialHomePath("/watch")).toBe(false);
    expect(isNavActive("/", APP_ROUTES.home)).toBe(true);
    expect(isNavActive("/discover", APP_ROUTES.home)).toBe(true);
    expect(isNavActive("/life", APP_ROUTES.home)).toBe(true);
    expect(isNavActive("/watch", APP_ROUTES.home)).toBe(false);
    expect(isMobilePrimaryNavActive("/", "umLife")).toBe(true);
    expect(isMobilePrimaryNavActive("/discover", "umLife")).toBe(true);
    expect(isMobilePrimaryNavActive("/life", "umLife")).toBe(true);
    expect(isMobilePrimaryNavActive("/watch", "umLife")).toBe(false);
    expect(isUmLifeNavDestination("/")).toBe(true);
  });

  it("aliases /life to the same Home experience without a new feed", () => {
    const lifePage = read("app/life/page.tsx");
    expect(lifePage).toMatch(/Compatible alias/);
    expect(lifePage).toMatch(/redirect/);
    expect(lifePage).toMatch(/APP_ROUTES\.home/);
    expect(lifePage).toMatch(/not a second social feed/);
    expect(lifePage).not.toMatch(/export default function HomePage/);
    const homePage = read("app/page.tsx");
    expect(homePage).toMatch(/HomeFeedLoader/);
  });

  it("uses an original UM Life icon and the UM Life brand label", () => {
    const icon = read("app/components/nav/UmLifeIcon.tsx");
    expect(icon).toMatch(/Original UMTUBA UM Life mark/);
    expect(icon).not.toMatch(/facebook|meta|whatsapp|infinity/i);
    expect(translate("en", "nav.umLife")).toBe("UM Life");
    expect(translate("ar", "nav.umLife")).toBe("UM Life");
    expect(translate("en", "nav.umLifeAria")).toMatch(/social home/i);
    expect(translate("ar", "nav.umLifeAria")).toMatch(/UM Life/);
  });

  it("prepares a badge slot without inventing live counts", () => {
    expect(UM_LIFE_BADGE_CAPABILITY).toBe("READY");
    expect(UM_LIFE_BADGE_LIVE_DATA).toBe(false);
    expect(resolveUmLifeActivityBadgeCount()).toBeNull();
    expect(resolveUmLifeActivityBadge()).toEqual({
      capability: "READY",
      liveData: false,
      count: null,
    });
    const mobileNav = read("app/components/AppMobileBottomNav.tsx");
    expect(mobileNav).toMatch(/resolveUmLifeActivityBadge/);
    expect(mobileNav).not.toMatch(/getUnreadNotificationCountAction/);
  });

  it("preserves Watch Create Learning Store and does not hide Profile or Messages", () => {
    const hrefs = APP_NAV_ITEMS.map((item) => item.href);
    expect(hrefs).toContain(APP_ROUTES.watch);
    expect(hrefs).toContain(APP_ROUTES.createVideo);
    expect(hrefs).toContain(APP_ROUTES.learning);
    expect(hrefs).toContain(APP_ROUTES.store);
    const mobile = read("app/lib/nav/userMenuItems.ts");
    expect(mobile).toMatch(/APP_ROUTES\.messages/);
    expect(mobile).toMatch(/APP_ROUTES\.profile|profileHref/);
    const circles = read("app/discover/components/HomeSectionCircles.tsx");
    expect(circles).toMatch(/APP_ROUTES\.messages/);
  });

  it("keeps five primary items to avoid overflow and uses 48px touch targets", () => {
    expect(MOBILE_PRIMARY_NAV_ITEMS).toHaveLength(5);
    expect(APP_NAV_ITEMS).toHaveLength(5);
    const bottom = read("app/components/AppMobileBottomNav.tsx");
    expect(bottom).toMatch(/min-h-12/);
    expect(bottom).toMatch(/watch-focus-ring/);
    const top = read("app/components/AppTopNav.tsx");
    expect(top).toMatch(/watch-focus-ring/);
    expect(top).toMatch(/nav\.umLifeAria/);
  });
});
