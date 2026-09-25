import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MESSAGE_CATALOGS } from "../../../lib/i18n/messages/catalogs";
import { SUPPORTED_LOCALES, translate } from "../../../lib/i18n";
import { mapVideoPostToDiscover } from "../../../lib/supabase/videoPosts";
import type { PublicPostDTO } from "../../../lib/supabase/videoPosts";
import { mapPublicPostToLifePost } from "../../life/lib/lifePosts";
import { discoverVideoToWatchVideo } from "../../watch/lib/mapWatchVideo";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function samplePost(overrides: Partial<PublicPostDTO> = {}): PublicPostDTO {
  return {
    id: 42,
    user_id: "11111111-1111-4111-8111-111111111111",
    content: "Hello",
    post_type: "video",
    author_name: "Lina",
    author_username: "lina.creates",
    author_avatar: "L",
    image_url: null,
    video_url: "https://cdn.example/v.mp4",
    article_id: null,
    likes: 3,
    comments: 1,
    shares: 0,
    saves: 2,
    views: 0,
    likedByMe: false,
    savedByMe: false,
    created_at: "2026-08-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("video view count — select and map", () => {
  it("selects views on the shared post column list", () => {
    const columns = read("lib/supabase/videoPosts.ts");
    const server = read("lib/supabase/videoPostsServer.ts");
    expect(columns).toMatch(/saves,\s+views,\s+created_at/);
    expect(server).toMatch(/postsSelectVisible\(postColumns\)/);
    expect(server).toMatch(/postsSelectVisible\(columns\)/);
  });

  it("maps views into Discover, Watch, and Life models without extra queries", () => {
    const post = samplePost({ views: 1200 });
    const discover = mapVideoPostToDiscover(post);
    expect(discover?.stats.views).toBe(1200);
    expect(discoverVideoToWatchVideo(discover!).stats.views).toBe(1200);
    expect(mapPublicPostToLifePost(post)?.views).toBe(1200);

    const zero = samplePost({ views: 0 });
    expect(mapVideoPostToDiscover(zero)?.stats.views).toBe(0);
    expect(mapPublicPostToLifePost(zero)?.views).toBe(0);
  });
});

describe("video view count — UI", () => {
  it("shows a small view count under the Home caption and keeps the Watch rail count", () => {
    const home = read("app/discover/components/DiscoverCaption.tsx");
    const rail = read("app/discover/components/DiscoverActionRail.tsx");
    const watch = read("app/components/video/VideoActionRail.tsx");
    const stat = read("app/components/video/VideoViewCountStat.tsx");

    expect(home).toMatch(/<VideoViewCountStat views=\{views\} variant="caption" \/>/);
    expect(rail).not.toMatch(/VideoViewCountStat/);
    expect(watch).toMatch(/<VideoViewCountStat views=\{displayStats\.views\} \/>/);
    expect(stat).not.toMatch(/<button/);
    expect(stat).toMatch(/video\.views\.label/);
    expect(stat).toMatch(/formatInteractionCount/);
  });

  it("shows view count on UM Life video cards only", () => {
    const bar = read("app/life/LifeEngagementBar.tsx");
    expect(bar).toMatch(/post\.type === "video"/);
    expect(bar).toMatch(/<VideoViewCountStat views=\{post\.views\} variant="life" \/>/);
  });

  it("updates the displayed count only when record_post_view counted", () => {
    const discover = read("app/discover/components/DiscoverVideoCard.tsx");
    const watch = read("app/watch/WatchExperience.tsx");
    expect(discover).toMatch(/result\.ok && result\.counted/);
    expect(discover).toMatch(/onStatsChange\?\.\(\{ views: result\.views \}\)/);
    expect(watch).toMatch(/!result\.ok \|\| !result\.counted/);
    expect(watch).toMatch(/views: result\.views/);
    expect(discover).not.toMatch(/from\("posts"\)[\s\S]*select/);
    expect(watch).not.toMatch(/from\("posts"\)[\s\S]*select/);
  });
});

describe("video view count — i18n", () => {
  it("localizes the view-count label in every locale", () => {
    expect(translate("en", "video.views.label", { values: { count: "0" } })).toBe(
      "0 views"
    );
    expect(translate("ar", "video.views.label", { values: { count: "0" } })).toBe(
      "0 مشاهدة"
    );
    expect(MESSAGE_CATALOGS.en["video.views.label"]).toBe("{count} views");
    expect(MESSAGE_CATALOGS.ar["video.views.label"]).toBe("{count} مشاهدة");

    const otherLocales = SUPPORTED_LOCALES.filter(
      (locale) => locale !== "en" && locale !== "ar"
    );
    for (const locale of otherLocales) {
      expect(MESSAGE_CATALOGS[locale]["video.views.label"]).toContain("{count}");
      expect(MESSAGE_CATALOGS[locale]["video.views.label"]).not.toBe(
        "{count} views"
      );
    }
  });
});
