import { describe, expect, it } from "vitest";
import {
  MOBILE_PRIMARY_EXCLUDED_DOMAIN_HREFS,
  MOBILE_PRIMARY_WITHOUT_WORLD_LABELS,
  MOBILE_WORLD_DESKTOP_HREF,
  MOBILE_WORLD_DESKTOP_LABEL,
  assertMobileWorldAffordanceDecision,
} from "./mobileWorldAffordanceContract";
import { APP_NAV_ITEMS, APP_ROUTES } from "./routes";
import { MOBILE_PRIMARY_NAV_ITEMS } from "./mobileNav";
import {
  DESKTOP_PRIMARY_NAV_HREFS,
  DESKTOP_PRIMARY_NAV_LABELS,
  HOME_CIRCLE_ENTRY_HREFS,
  MOBILE_PRIMARY_NAV_IDS,
  MOBILE_PRIMARY_NAV_LABELS,
} from "./platformNavContract";

describe("Mobile World Affordance Decision V1", () => {
  it("keeps World on desktop primary only", () => {
    expect(DESKTOP_PRIMARY_NAV_LABELS).toContain(MOBILE_WORLD_DESKTOP_LABEL);
    expect(DESKTOP_PRIMARY_NAV_HREFS).toContain(MOBILE_WORLD_DESKTOP_HREF);
    expect(
      APP_NAV_ITEMS.some(
        (item) =>
          item.label === "World" && item.href === APP_ROUTES.worldDiscovery
      )
    ).toBe(true);
  });

  it("keeps Mobile primary as Home Live Messages Profile without World", () => {
    expect(MOBILE_PRIMARY_NAV_IDS).toEqual([
      "home",
      "umLife",
      "live",
      "messages",
      "profile",
    ]);
    expect(MOBILE_PRIMARY_NAV_LABELS).toEqual([
      ...MOBILE_PRIMARY_WITHOUT_WORLD_LABELS,
    ]);
    expect(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Home",
      "UM Life",
      "Live",
      "Messages",
      "Profile",
    ]);
    expect(MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.label === "World")).toBe(
      false
    );
    expect(
      MOBILE_PRIMARY_NAV_ITEMS.some(
        (item) => item.href === APP_ROUTES.worldDiscovery
      )
    ).toBe(false);
  });

  it("does not add Store or Watch to Mobile primary under this decision", () => {
    const hrefs = MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.href);
    for (const excluded of MOBILE_PRIMARY_EXCLUDED_DOMAIN_HREFS) {
      expect(hrefs).not.toContain(excluded);
    }
    expect(hrefs).not.toContain(APP_ROUTES.store);
    expect(hrefs).not.toContain(APP_ROUTES.watch);
  });

  it("documents mobile World reachability via Home circles (layout unchanged)", () => {
    expect(HOME_CIRCLE_ENTRY_HREFS).toContain(APP_ROUTES.worldDiscovery);
    expect(() => assertMobileWorldAffordanceDecision()).not.toThrow();
  });
});
