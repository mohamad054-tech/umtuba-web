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
  HOME_CIRCLE_ENTRY_HREFS,
  MOBILE_PRIMARY_NAV_IDS,
  MOBILE_PRIMARY_NAV_LABELS,
} from "./platformNavContract";

describe("Mobile World Affordance Decision V2", () => {
  it("keeps World off desktop primary under UM Life Home Entry V1", () => {
    expect(
      APP_NAV_ITEMS.some(
        (item) =>
          item.label === MOBILE_WORLD_DESKTOP_LABEL ||
          item.href === APP_ROUTES.worldDiscovery
      )
    ).toBe(false);
    expect(MOBILE_WORLD_DESKTOP_HREF).toBe(APP_ROUTES.worldDiscovery);
  });

  it("keeps Mobile primary as Watch UM Life Create Learning Store without World", () => {
    expect(MOBILE_PRIMARY_NAV_IDS).toEqual([
      "watch",
      "umLife",
      "create",
      "learning",
      "store",
    ]);
    expect(MOBILE_PRIMARY_NAV_LABELS).toEqual([
      ...MOBILE_PRIMARY_WITHOUT_WORLD_LABELS,
    ]);
    expect(MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Watch",
      "UM Life",
      "Create",
      "Learning",
      "Store",
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

  it("allows Store and Watch on Mobile primary under this GO", () => {
    const hrefs = MOBILE_PRIMARY_NAV_ITEMS.map((item) => item.href);
    for (const excluded of MOBILE_PRIMARY_EXCLUDED_DOMAIN_HREFS) {
      expect(hrefs).not.toContain(excluded);
    }
    expect(hrefs).toContain(APP_ROUTES.store);
    expect(hrefs).toContain(APP_ROUTES.watch);
  });

  it("documents mobile World reachability via Home circles (layout unchanged)", () => {
    expect(HOME_CIRCLE_ENTRY_HREFS).toContain(APP_ROUTES.worldDiscovery);
    expect(() => assertMobileWorldAffordanceDecision()).not.toThrow();
  });
});
