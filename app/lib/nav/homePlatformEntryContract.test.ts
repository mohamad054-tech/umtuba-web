import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROUTES } from "./routes";
import { HOME_CIRCLE_ENTRY_HREFS } from "./platformNavContract";
import {
  HOME_ARC_PORTAL_HREFS,
  HOME_COLLABORATION_ENTRY,
  HOME_SECTION_CIRCLE_ENTRIES,
  assertHomeCircleHrefContract,
  resolveHomeArcPortalHref,
} from "./homePlatformEntryContract";

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("U2 Home platform entry organization", () => {
  it("keeps DiscoverExperience as Home mount path", () => {
    const page = read("app/page.tsx");
    const loader = read("app/components/home/HomeFeedLoader.tsx");
    expect(page).toMatch(/HomeFeedLoader/);
    expect(loader).toMatch(/DiscoverExperience/);
    expect(page).not.toMatch(/HomeCircularArc/);
  });

  it("aligns section circles with HOME_CIRCLE_ENTRY_HREFS", () => {
    expect(assertHomeCircleHrefContract()).toBe(true);
    expect(HOME_SECTION_CIRCLE_ENTRIES.map((e) => e.href)).toEqual([
      ...HOME_CIRCLE_ENTRY_HREFS,
    ]);
  });

  it("wires Store Learning World Live Messages Games Search Create hrefs", () => {
    const byId = Object.fromEntries(
      HOME_SECTION_CIRCLE_ENTRIES.map((e) => [e.id, e.href])
    );
    expect(byId.store).toBe(APP_ROUTES.store);
    expect(byId.learning).toBe(APP_ROUTES.learning);
    expect(byId.world).toBe(APP_ROUTES.worldDiscovery);
    expect(byId.live).toBe(APP_ROUTES.live);
    expect(byId.messages).toBe(APP_ROUTES.messages);
    expect(byId.games).toBe(APP_ROUTES.games);
    expect(byId.search).toBe(APP_ROUTES.search);
    expect(byId.create).toBe(APP_ROUTES.createVideo);
  });

  it("maps arc portals to real platform hrefs", () => {
    expect(resolveHomeArcPortalHref("store")).toBe(APP_ROUTES.store);
    expect(resolveHomeArcPortalHref("learning")).toBe(APP_ROUTES.learning);
    expect(resolveHomeArcPortalHref("world")).toBe(APP_ROUTES.worldDiscovery);
    expect(resolveHomeArcPortalHref("live")).toBe(APP_ROUTES.live);
    expect(resolveHomeArcPortalHref("messages")).toBe(APP_ROUTES.messages);
    expect(resolveHomeArcPortalHref("games")).toBe(APP_ROUTES.games);
    expect(resolveHomeArcPortalHref("profile")).toBe(APP_ROUTES.profile);
    expect(HOME_ARC_PORTAL_HREFS.rewards).toBeUndefined();
  });

  it("defers Collaboration Home entry without /workspaces", () => {
    expect(HOME_COLLABORATION_ENTRY.status).toBe("DEFERRED_TO_LATER_WAVE");
    expect(HOME_COLLABORATION_ENTRY.href).toBeNull();
    expect(Object.values(HOME_ARC_PORTAL_HREFS)).not.toContain("/workspaces");
    expect(HOME_SECTION_CIRCLE_ENTRIES.map((e) => e.href)).not.toContain(
      "/workspaces"
    );
  });

  it("preserves arc flag fail-closed product unlock", () => {
    const flags = read(
      "app/components/home/circularArc/homeCircularArcFlags.ts"
    );
    expect(flags).toMatch(
      /HOME_CIRCULAR_ARC_FOUNDATION_ENABLED = false/
    );
  });

  it("HomeCircularArc uses Link for known portal hrefs", () => {
    const arc = read(
      "app/components/home/circularArc/HomeCircularArc.tsx"
    );
    expect(arc).toMatch(/resolveHomeArcPortalHref/);
    expect(arc).toMatch(/data-portal-href/);
    expect(arc).toMatch(/from "next\/link"/);
  });

  it("does not overload mobile bottom nav from Home contracts", () => {
    const mobile = read("app/lib/nav/mobileNav.ts");
    expect(mobile).not.toMatch(/worldDiscovery|\/store|\/learning/);
  });

  it("keeps /discover alias contract", () => {
    expect(APP_ROUTES.discover).toBe("/discover");
    expect(APP_ROUTES.home).toBe("/");
  });
});
