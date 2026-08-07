import { describe, expect, it } from "vitest";
import { APP_NAV_ITEMS, APP_ROUTES, isNavActive } from "../../../app/lib/nav/routes";
import { MOBILE_PRIMARY_NAV_ITEMS } from "../../../app/lib/nav/mobileNav";
import { buildUserMenuGroups } from "../../../app/lib/nav/userMenuItems";
import { USER_MENU_CAPABILITIES_SIGNED_IN_BASE } from "../../../app/lib/nav/userMenuCapabilities";
import {
  DESKTOP_PRIMARY_NAV_HREFS,
  DESKTOP_PRIMARY_NAV_LABELS,
} from "../../../app/lib/nav/platformNavContract";
import { listDesktopMainNavLinks, listMobileMainNavLinks } from "./index";

describe("U1 Global Shell / Navigation Coherence", () => {
  it("desktop primary includes Home World Learning Store Live Messages", () => {
    expect(DESKTOP_PRIMARY_NAV_LABELS).toEqual([
      "Home",
      "World",
      "Learning",
      "Store",
      "Live",
      "Messages",
    ]);
    expect(listDesktopMainNavLinks().map((l) => l.href)).toEqual([
      ...DESKTOP_PRIMARY_NAV_HREFS,
    ]);
    expect(APP_NAV_ITEMS.map((i) => i.href)).toEqual([...DESKTOP_PRIMARY_NAV_HREFS]);
  });

  it("mobile primary preserved; Store/World discoverable via user menu", () => {
    expect(MOBILE_PRIMARY_NAV_ITEMS.map((i) => i.id)).toEqual([
      "home",
      "live",
      "messages",
      "profile",
    ]);
    expect(listMobileMainNavLinks().some((l) => l.href === APP_ROUTES.store)).toBe(false);
    expect(listMobileMainNavLinks().some((l) => l.href === APP_ROUTES.worldDiscovery)).toBe(false);
    const menu = buildUserMenuGroups("/profile/u", USER_MENU_CAPABILITIES_SIGNED_IN_BASE);
    const ids = menu.flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toContain("store");
    expect(ids).toContain("world");
    expect(ids).toContain("learning");
  });

  it("Home active state covers Discover alias; Store active under /store children", () => {
    expect(isNavActive("/discover", APP_ROUTES.home)).toBe(true);
    expect(isNavActive("/", APP_ROUTES.home)).toBe(true);
    expect(isNavActive("/store/cart", APP_ROUTES.store)).toBe(true);
    expect(isNavActive("/learning/catalog", APP_ROUTES.learning)).toBe(true);
    expect(isNavActive("/world/search", APP_ROUTES.worldDiscovery)).toBe(true);
    expect(isNavActive(null, APP_ROUTES.home)).toBe(false);
    expect(isNavActive(undefined, APP_ROUTES.store)).toBe(false);
  });

  it("canonical labels avoid Commerce/Map/Discover in primary chrome", () => {
    expect(DESKTOP_PRIMARY_NAV_LABELS).not.toContain("Commerce");
    expect(DESKTOP_PRIMARY_NAV_LABELS).not.toContain("Map");
    expect(DESKTOP_PRIMARY_NAV_LABELS).not.toContain("Discover");
  });
});
