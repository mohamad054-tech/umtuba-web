import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

describe("Home JavaScript Optimization V1", () => {
  it("lazy-loads StoryRail, CommentsPanel, and messaging from DiscoverExperience", () => {
    const experience = read("app/discover/DiscoverExperience.tsx");
    expect(experience).toMatch(/from "next\/dynamic"/);
    expect(experience).toMatch(
      /dynamic\(\(\)\s*=>\s*import\("\.\.\/stories\/components\/StoryRail"\)/
    );
    expect(experience).toMatch(
      /dynamic\(\s*\(\)\s*=>\s*import\("\.\.\/components\/social\/CommentsPanel"\)/
    );
    expect(experience).toMatch(
      /dynamic\(\s*\(\)\s*=>\s*import\("\.\.\/components\/messaging\/StartDirectMessageButton"\)/
    );
    expect(experience).not.toMatch(/^import StoryRail from /m);
    expect(experience).not.toMatch(/^import CommentsPanel from /m);
    expect(experience).toMatch(/StoryRailFallback/);
    expect(experience).toMatch(/DeferredStoryRail/);
    expect(experience).toMatch(/requestIdleCallback/);
    expect(experience).toMatch(/aria-busy="true"/);
  });

  it("defers StoryViewer/StoryComposer and ShareMenu until interaction", () => {
    const rail = read("app/stories/components/StoryRail.tsx");
    expect(rail).toMatch(/dynamic\(\(\)\s*=>\s*import\("\.\/StoryComposer"\)/);
    expect(rail).toMatch(/dynamic\(\(\)\s*=>\s*import\("\.\/StoryViewer"\)/);
    expect(rail).toMatch(/composerOpen \? \(/);
    expect(rail).toMatch(/viewerOwnerId \? \(/);

    const actionRail = read("app/discover/components/DiscoverActionRail.tsx");
    expect(actionRail).toMatch(
      /dynamic\(\(\)\s*=>\s*import\("\.\.\/\.\.\/components\/social\/ShareMenu"\)/
    );
    expect(actionRail).toMatch(/shareMenuOpen \? \(/);

    const creator = read("app/discover/components/DiscoverCreatorInfo.tsx");
    expect(creator).toMatch(
      /dynamic\(\s*\(\)\s*=>\s*import\("\.\.\/\.\.\/components\/messaging\/StartDirectMessageButton"\)/
    );
  });

  it("keeps Home SSR shell via HomeFeedLoader → DiscoverExperience", () => {
    const page = read("app/page.tsx");
    const loader = read("app/components/home/HomeFeedLoader.tsx");
    expect(page).toMatch(/HomeFeedLoader/);
    expect(page).toMatch(/Suspense/);
    expect(loader).toMatch(/DiscoverExperience/);
    expect(loader).toMatch(/getDiscoverVideosServer/);
  });
});
