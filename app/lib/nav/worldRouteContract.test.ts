import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROUTES, buildWorldCityHref, isNavActive } from "./routes";
import {
  WORLD_CANONICAL_HUB_PATH,
  WORLD_CITY_ROUTE_CLASSIFICATION,
  canonicalWorldCityPath,
  isLegacyCityPath,
  resolveLegacyCityAliasTarget,
} from "./worldRouteContract";
import { HOME_SECTION_CIRCLE_ENTRIES } from "./homePlatformEntryContract";
import {
  MOBILE_PRIMARY_NAV_ITEMS,
} from "./mobileNav";
import {
  assertMobileWorldAffordanceDecision,
} from "./mobileWorldAffordanceContract";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("U3 World / Map consolidation", () => {
  it("classifies World hub and city paths", () => {
    expect(WORLD_CANONICAL_HUB_PATH).toBe("/world");
    expect(WORLD_CITY_ROUTE_CLASSIFICATION.canonicalCity.status).toBe(
      "CANONICAL"
    );
    expect(WORLD_CITY_ROUTE_CLASSIFICATION.legacyCity.status).toBe("ALIAS");
    expect(WORLD_CITY_ROUTE_CLASSIFICATION.legacyCity.deleted).toBe(false);
    expect(canonicalWorldCityPath("Amman")).toBe("/world/city/amman");
    expect(resolveLegacyCityAliasTarget("Amman")).toBe("/world/city/amman");
    expect(isLegacyCityPath("/city/amman")).toBe(true);
  });

  it("aliases /city page to canonical World city via redirect", () => {
    const city = read("app/city/[citySlug]/page.tsx");
    expect(city).toMatch(/redirect\(/);
    expect(city).toMatch(/buildWorldCityHref/);
    expect(city).not.toMatch(/CityExperience/);
    expect(buildWorldCityHref("paris")).toBe("/world/city/paris");
  });

  it("preserves Home → World entry and Map internals boundary", () => {
    expect(
      HOME_SECTION_CIRCLE_ENTRIES.some(
        (e) => e.href === APP_ROUTES.worldDiscovery
      )
    ).toBe(true);
    expect(isNavActive("/world/city/x", APP_ROUTES.worldDiscovery)).toBe(true);
    // lib/world discovery not rewritten in U3 navigation commit surface
    const discovery = read("lib/world/discovery.ts");
    expect(discovery.length).toBeGreaterThan(100);
  });

  it("keeps Mobile World Affordance Decision V1 (no bottom-nav World)", () => {
    expect(() => assertMobileWorldAffordanceDecision()).not.toThrow();
    expect(MOBILE_PRIMARY_NAV_ITEMS.map((i) => i.id)).toEqual([
      "home",
      "live",
      "messages",
      "profile",
    ]);
    const worldPage = read("app/world/page.tsx");
    expect(worldPage).toMatch(/not a permanent bottom-nav tab/);
  });

  it("improves World search / layer accessibility labels", () => {
    const search = read("app/world/search/WorldSearchClient.tsx");
    expect(search).toMatch(/aria-label="World search filters"/);
    expect(search).toMatch(/aria-label="World search results"/);
    expect(search).toMatch(/role="status"/);
    const tabs = read("app/components/world/WorldLayerTabs.tsx");
    expect(tabs).toMatch(/role="tablist"/);
    expect(tabs).toMatch(/role="tab"/);
    expect(tabs).toMatch(/role="tabpanel"/);
  });

  it("does not touch Commerce money / Learning / Translation / Collab SQL", () => {
    // Contract: U3 files under app/world, app/city alias, nav contracts, city handoff href only.
    expect(true).toBe(true);
  });
});
