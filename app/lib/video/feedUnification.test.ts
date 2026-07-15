import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  FEED_VIEW_DEDUPE_WINDOW_HOURS,
  VIDEO_FEED_PAGE_SIZE,
} from "./feedPolicy";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("canonical video feed architecture", () => {
  it("uses one shared server loader for Discover and Watch", () => {
    const server = read("lib/supabase/videoPostsServer.ts");
    expect(server).toMatch(/export async function loadCanonicalVideoFeedPage/);
    expect(server).toMatch(/getDiscoverVideosServer/);
    expect(server).toMatch(/getWatchVideosPageServer/);
    expect(server).toMatch(/loadViewerFollowingSet/);
    expect(server).toMatch(/applyFollowingToDiscoverVideos/);
    // Both routes go through the canonical page helper.
    expect(server).toMatch(
      /getDiscoverVideosServer[\s\S]*loadCanonicalVideoFeedPage/
    );
    expect(server).toMatch(
      /getWatchVideosPageServer[\s\S]*loadCanonicalVideoFeedPage/
    );
  });

  it("maps follow state into Watch author", () => {
    const mapper = read("app/watch/lib/mapWatchVideo.ts");
    const overlay = read("app/components/video/VideoOverlay.tsx");
    expect(mapper).toMatch(/isFollowing:\s*Boolean\(video\.creator\.isFollowing\)/);
    expect(overlay).toMatch(/FollowButton/);
    expect(overlay).toMatch(/APP_ROUTES\.watch/);
    expect(overlay).toMatch(/initialFollowing/);
  });

  it("shares view recording helper and documents 6h server window", () => {
    expect(FEED_VIEW_DEDUPE_WINDOW_HOURS).toBe(6);
    expect(VIDEO_FEED_PAGE_SIZE).toBe(12);
    const helper = read("app/lib/video/recordFeedView.ts");
    const discoverCard = read("app/discover/components/DiscoverVideoCard.tsx");
    const watchExp = read("app/watch/WatchExperience.tsx");
    expect(helper).toMatch(/recordViewAction/);
    expect(discoverCard).toMatch(/recordFeedViewOnce/);
    expect(watchExp).toMatch(/recordFeedViewOnce/);
  });

  it("never uses demo fallback in production Watch path", () => {
    const page = read("app/watch/page.tsx");
    const gates = read("app/lib/product/surfaceGates.ts");
    expect(page).toMatch(/allowWatchDemoFallback/);
    expect(gates).toMatch(/never in production/i);
    expect(page).toMatch(/ProductEmptyState/);
  });

  it("preserves auth return routes for Discover and Watch", () => {
    const discoverRail = read("app/discover/components/DiscoverActionRail.tsx");
    const watchRail = read("app/components/video/VideoActionRail.tsx");
    const discoverCreator = read(
      "app/discover/components/DiscoverCreatorInfo.tsx"
    );
    const routes = read("app/lib/nav/routes.ts");
    expect(routes).toMatch(/watch:\s*["']\/watch["']/);
    expect(discoverRail).toMatch(/returnPath/);
    expect(discoverRail).toMatch(/APP_ROUTES\.discover/);
    expect(discoverCreator).toMatch(/APP_ROUTES\.discover/);
    expect(discoverCreator).toMatch(/\?post=/);
    expect(watchRail).toMatch(/returnPath/);
    expect(watchRail).toMatch(/APP_ROUTES\.watch/);
  });

  it("does not reintroduce gated prototype panels outside surfaceGates", () => {
    const overlay = read("app/components/video/VideoOverlay.tsx");
    expect(overlay).toMatch(/allowWatchPrototypePanels/);
    expect(overlay).not.toMatch(/UConnect/);
  });

  it("keeps Discover and Watch as separate routes (no forced redirect)", () => {
    const watchPage = read("app/watch/page.tsx");
    const discoverPage = read("app/discover/page.tsx");
    expect(watchPage).not.toMatch(/redirect\(APP_ROUTES\.discover\)/);
    expect(discoverPage).toMatch(/getDiscoverVideosServer/);
    expect(watchPage).toMatch(/getWatchVideosPageServer/);
  });
});
