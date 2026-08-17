import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_ROUTES } from "../../app/lib/nav/routes";
import { FOLLOWING_AUTHOR_ID_CAP } from "./followingFeed";

const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Following feed V1", () => {
  it("exposes /following as an authenticated product route", () => {
    expect(APP_ROUTES.following).toBe("/following");
    expect(read("app/following/page.tsx")).toMatch(/loadFollowingVideoFeedPage/);
    expect(read("app/following/page.tsx")).toMatch(/APP_ROUTES\.login/);
    expect(read("app/following/page.tsx")).toMatch(/FollowingExperience/);
  });

  it("loads from profile_follows and ready video posts only", () => {
    const src = read("lib/supabase/followingFeed.ts");
    expect(src).toMatch(/profile_follows/);
    expect(src).toMatch(/follower_id/);
    expect(src).toMatch(/following_id/);
    expect(src).toMatch(/\.eq\("post_type", "video"\)/);
    expect(src).toMatch(/\.eq\("media_status", "ready"\)/);
    expect(src).toMatch(/\.in\("user_id", authorIds\)/);
    expect(src).toMatch(/created_at.*ascending: false/);
    expect(src).not.toMatch(/RISING|rank_score|get_ranked_video_feed/);
    expect(FOLLOWING_AUTHOR_ID_CAP).toBeGreaterThan(0);
  });

  it("does not reuse Home Discover ranking or Rising language", () => {
    const ui = read("app/following/FollowingExperience.tsx");
    expect(ui).toMatch(/loadFollowingFeedPageAction/);
    expect(ui).toMatch(/following\.emptyTitle/);
    expect(ui).not.toMatch(/Rising/);
    expect(ui).not.toMatch(/trending/i);
  });

  it("keeps Following out of public index surfaces", () => {
    expect(read("lib/site/indexing.ts")).toMatch(/"\/following"/);
    expect(read("lib/env/supabaseAuthGate.ts")).toMatch(/"\/following"/);
    expect(read("lib/site/routeMetadata.ts")).toMatch(/path: "\/following"/);
    expect(read("lib/site/routeMetadata.ts")).toMatch(/followingMetadata/);
  });
});
