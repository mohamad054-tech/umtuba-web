import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HOME_LOCK_ACTIVE,
  HOME_LOCK_INVARIANTS,
  HOME_LOCK_OWNED_PATHS,
  HOME_LOCK_RELATED_SHARED_PATHS,
  HOME_LOCKED_SURFACES,
  assertHomeReadinessGuardrails,
} from "./homeReadinessGuardrails";
import { HOME_CIRCLE_ENTRY_HREFS } from "./platformNavContract";
import { CONTENT_FLOW_PREFERRED_STEPS } from "./contentFlowPolicyContract";
import { APP_ROUTES } from "./routes";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Home Readiness Guardrails V1", () => {
  it("keeps Home lock active and lists protected surfaces", () => {
    expect(HOME_LOCK_ACTIVE).toBe(true);
    expect([...HOME_LOCKED_SURFACES]).toEqual([
      "feed",
      "swipe",
      "ranking",
      "player",
      "circles-layout",
      "engagement",
      "home-shell",
    ]);
    expect(HOME_LOCK_INVARIANTS.length).toBeGreaterThanOrEqual(4);
    expect(() => assertHomeReadinessGuardrails()).not.toThrow();
  });

  it("inventories Home-owned lock paths and requires they exist", () => {
    expect(HOME_LOCK_OWNED_PATHS).toContain("app/page.tsx");
    expect(HOME_LOCK_OWNED_PATHS).toContain(
      "app/components/home/HomeFeedLoader.tsx"
    );
    expect(HOME_LOCK_OWNED_PATHS).toContain(
      "app/discover/components/HomeSectionCircles.tsx"
    );
    expect(HOME_LOCK_OWNED_PATHS).toContain(
      "app/discover/components/DiscoverNativeVideo.tsx"
    );
    expect(HOME_LOCK_OWNED_PATHS).toContain(
      "app/discover/components/DiscoverActionRail.tsx"
    );
    for (const rel of HOME_LOCK_OWNED_PATHS) {
      expect(existsSync(join(ROOT, rel))).toBe(true);
    }
    for (const rel of HOME_LOCK_RELATED_SHARED_PATHS) {
      expect(existsSync(join(ROOT, rel))).toBe(true);
    }
  });

  it("preserves Home shell wiring without requiring behavior edits", () => {
    const home = read("app/page.tsx");
    expect(home).toMatch(/HomeFeedLoader/);
    expect(home).not.toMatch(/LandingHero/);

    const loader = read("app/components/home/HomeFeedLoader.tsx");
    expect(loader).toMatch(/DiscoverExperience/);
    expect(loader).toMatch(/getDiscoverVideosServer/);

    const shell = read("app/discover/components/DiscoverShell.tsx");
    expect(shell).toMatch(/HomeSectionCircles/);
    expect(shell).toMatch(/title=\{t\("nav\.home"\)\}/);

    const experience = read("app/discover/DiscoverExperience.tsx");
    expect(experience).toMatch(/DiscoverFeed|feedPagination/);
  });

  it("keeps Discover forever alias and Home circle destination contract", () => {
    const discover = read("app/discover/page.tsx");
    expect(discover).toMatch(/Compatible alias/);
    expect(discover).toMatch(/APP_ROUTES\.home/);
    expect(APP_ROUTES.discover).toBe("/discover");
    expect(APP_ROUTES.home).toBe("/");

    expect(HOME_CIRCLE_ENTRY_HREFS).toEqual([
      APP_ROUTES.learning,
      APP_ROUTES.store,
      APP_ROUTES.games,
      APP_ROUTES.live,
      APP_ROUTES.life,
      APP_ROUTES.worldDiscovery,
      APP_ROUTES.search,
      APP_ROUTES.messages,
      APP_ROUTES.create,
    ]);
  });

  it("documents Preferred Flow without implementing Home funnel changes", () => {
    expect(CONTENT_FLOW_PREFERRED_STEPS).toEqual([
      "home-discovery",
      "creator-space",
      "content-destination",
    ]);
    const policy = read("app/lib/nav/contentFlowPolicyContract.ts");
    expect(policy).toMatch(/Architectural policy only/);
    expect(policy).toMatch(/Product GO/);

    const guardrails = read("app/lib/nav/homeReadinessGuardrails.ts");
    expect(guardrails).toMatch(/HOME_LOCK_ACTIVE/);
    expect(guardrails).toMatch(/Product GO/);
    expect(guardrails).toMatch(/without changing Home behavior/);
  });
});
