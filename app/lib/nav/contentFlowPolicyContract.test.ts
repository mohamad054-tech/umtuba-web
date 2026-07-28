import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTENT_FLOW_ALLOWED_SHORTCUTS,
  CONTENT_FLOW_PATHS,
  CONTENT_FLOW_PREFERRED_STEPS,
  CONTENT_FLOW_SURFACE_ROLES,
  assertContentFlowPolicyDecision,
  buildPreferredCreatorSpaceArticleHref,
} from "./contentFlowPolicyContract";
import {
  APP_ROUTES,
  buildCreatorProfileHref,
  buildPostNotificationHref,
} from "./routes";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Content-flow Policy Decision V1", () => {
  it("classifies Home as Discovery, Profile as Creator Hub, content as Destination", () => {
    expect(CONTENT_FLOW_SURFACE_ROLES.home).toBe("discovery-layer");
    expect(CONTENT_FLOW_SURFACE_ROLES.creatorSpace).toBe("creator-hub");
    expect(CONTENT_FLOW_SURFACE_ROLES.fullContent).toBe("destination");
    expect(CONTENT_FLOW_PATHS.home).toBe("/");
    expect(CONTENT_FLOW_PATHS.profileIndex).toBe("/profile");
    expect(CONTENT_FLOW_PATHS.articlesPrefix).toBe("/articles/");
    expect(CONTENT_FLOW_PREFERRED_STEPS).toEqual([
      "home-discovery",
      "creator-space",
      "content-destination",
    ]);
  });

  it("documents Preferred Flow via Creator Space article handoff", () => {
    const href = buildPreferredCreatorSpaceArticleHref({
      username: "Maya",
      articleId: "11111111-1111-4111-8111-111111111111",
    });
    expect(href).toBe(
      buildCreatorProfileHref({
        username: "Maya",
        articleId: "11111111-1111-4111-8111-111111111111",
      })
    );
    expect(href).toBe(
      "/profile/maya?article=11111111-1111-4111-8111-111111111111"
    );

    const profilePrompt = read(
      "app/profile/components/ProfileLinkedArticlePrompt.tsx"
    );
    expect(profilePrompt.length).toBeGreaterThan(0);
  });

  it("treats current Home direct shortcuts as Allowed Shortcuts (temporary)", () => {
    const ids = CONTENT_FLOW_ALLOWED_SHORTCUTS.map((s) => s.id);
    expect(ids).toContain("home-direct-article");
    expect(ids).toContain("discover-post-notification");
    expect(ids).toContain("watch-post-deep-link");

    // Existence of Home→article path is allowed; must not be removed here.
    const homeCard = read("app/discover/components/DiscoverVideoCard.tsx");
    expect(homeCard).toMatch(/articles|article/i);

    expect(buildPostNotificationHref({ postId: "99" })).toBe(
      "/discover?post=99"
    );
    expect(APP_ROUTES.watch).toBe("/watch");
  });

  it("records that Home funnel changes need separate Product GO + Home unlock", () => {
    const policy = read("app/lib/nav/contentFlowPolicyContract.ts");
    expect(policy).toMatch(/Product GO/);
    expect(policy).toMatch(/Home unlock|Home lock/i);
    expect(policy).toMatch(/no Home \/ CTA \/ route behavior changes/i);
    expect(policy).toMatch(/Do not change `buildPostNotificationHref`/);
    expect(() => assertContentFlowPolicyDecision()).not.toThrow();
  });

  it("does not rewrite Discover alias or invent new redirects in this phase", () => {
    const discover = read("app/discover/page.tsx");
    expect(discover).toMatch(/Compatible alias/);
    expect(discover).toMatch(/APP_ROUTES\.home/);
    expect(CONTENT_FLOW_PATHS.discoverAlias).toBe("/discover");
  });
});
