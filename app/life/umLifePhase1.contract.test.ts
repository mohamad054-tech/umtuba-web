import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  APP_NAV_ITEMS,
  APP_ROUTES,
  HOME_CIRCLE_ENTRY_HREFS,
  MOBILE_PRIMARY_NAV_ITEMS,
  buildCreatorProfileHref,
  buildLifeHref,
  buildLifePostHref,
} from "../lib/nav";
import { buildPostShareUrl } from "../lib/social/shareAndViews";
import { MESSAGE_CATALOGS } from "../../lib/i18n/messages/catalogs";
import { SUPPORTED_LOCALES, translate } from "../../lib/i18n";
import {
  isLifePostType,
  mapPublicPostToLifePost,
  type LifePost,
} from "./lib/lifePosts";
import type { PublicPostDTO } from "../../lib/supabase/videoPosts";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function samplePost(overrides: Partial<PublicPostDTO> = {}): PublicPostDTO {
  return {
    id: 42,
    user_id: "11111111-1111-4111-8111-111111111111",
    content: "Hello from UM Life",
    post_type: "text",
    author_name: "Lina",
    author_username: "lina.creates",
    author_avatar: "L",
    image_url: null,
    video_url: null,
    article_id: null,
    likes: 3,
    comments: 1,
    shares: 0,
    saves: 2,
    views: 10,
    likedByMe: false,
    savedByMe: false,
    created_at: "2026-08-20T10:00:00.000Z",
    ...overrides,
  };
}

describe("UM Life Phase 1 — routes and identity", () => {
  it("exposes /life feed and /life?post= focused canonical route", () => {
    expect(APP_ROUTES.life).toBe("/life");
    expect(APP_ROUTES.lifeCompose).toBe("/life/compose");
    expect(buildLifeHref()).toBe("/life");
    expect(buildLifeHref({ from: "profile" })).toBe("/life?from=profile");
    expect(buildLifePostHref(42)).toBe("/life?post=42");
    expect(buildLifePostHref(42)).not.toContain("username");
    expect(existsSync(join(ROOT, "app/life/page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/life/compose/page.tsx"))).toBe(true);
  });

  it("reuses one posts.id and does not create a second post or media row", () => {
    const mapped = mapPublicPostToLifePost(samplePost({ id: 99 }));
    expect(mapped?.id).toBe(99);
    expect(isLifePostType("text")).toBe(true);
    expect(isLifePostType("image")).toBe(true);
    expect(isLifePostType("video")).toBe(true);
    expect(isLifePostType("poll")).toBe(false);

    const lifeServer = read("lib/supabase/videoPostsServer.ts");
    expect(lifeServer).toMatch(/export async function getLifePostsServer/);
    expect(lifeServer).toMatch(/export async function getLifePostByIdServer/);
    expect(lifeServer).toMatch(/\.eq\("id", postId\)/);
    expect(lifeServer).not.toMatch(/insert\(/);
    expect(lifeServer).not.toMatch(/upload\(/);

    const compose = read("app/life/compose/page.tsx");
    expect(compose).toMatch(/Phase 1 navigation shell only/);
    expect(compose).not.toMatch(/createPost/);
    expect(compose).not.toMatch(/createVideoPost/);
    expect(compose).not.toMatch(/uploadPostImage/);

    const lifeUi = [
      read("app/life/page.tsx"),
      read("app/life/LifeExperience.tsx"),
      read("app/life/LifePostCard.tsx"),
      read("app/life/LifeEngagementBar.tsx"),
    ].join("\n");
    expect(lifeUi).not.toMatch(/createPost\(/);
    expect(lifeUi).not.toMatch(/from\("posts"\)[\s\S]*insert/);
  });

  it("portals the feed comments sheet to the visual viewport", () => {
    const bar = read("app/life/LifeEngagementBar.tsx");
    const card = read("app/life/LifePostCard.tsx");
    const panel = read("app/components/social/CommentsPanel.tsx");
    expect(card).toMatch(/commentsVariant=\{focused \? "inline" : "sheet"\}/);
    expect(bar).toMatch(/createPortal/);
    expect(bar).toMatch(/data-life-comments-sheet="viewport"/);
    expect(bar).toMatch(/visualViewport/);
    expect(bar).toMatch(/document\.body\.style\.overflow/);
    expect(bar).toMatch(/100dvh/);
    expect(bar).toMatch(/safe-area-inset-bottom/);
    expect(bar).not.toMatch(/absolute inset-0 z-20/);
    expect(bar).not.toMatch(/\b(left|right)\s*:/);
    expect(bar).not.toMatch(/Fold6|fold6/);
    expect(panel).toMatch(/min-h-0 flex-1 space-y-3 overflow-y-auto/);
    expect(panel).toMatch(/overscroll-contain/);
  });

  it("shares like comment share and save on the same post id", () => {
    const bar = read("app/life/LifeEngagementBar.tsx");
    expect(bar).toMatch(/toggleLikeAction\(post\.id\)/);
    expect(bar).toMatch(/toggleSaveAction\(post\.id\)/);
    expect(bar).toMatch(/recordShareAction\(post\.id\)/);
    expect(bar).toMatch(/CommentsPanel/);
    expect(bar).toMatch(/postId=\{post\.id\}/);
    expect(bar).toMatch(/surface: "life"/);
    expect(buildPostShareUrl(42, "life")).toContain("/life?post=42");
    expect(buildPostShareUrl(42, "watch")).toContain("/watch?post=42");
  });
});

describe("UM Life Phase 1 — navigation entries", () => {
  it("appends UM Life after Live and before World without reordering other circles", () => {
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
    const circles = read("app/discover/components/HomeSectionCircles.tsx");
    expect(circles).toMatch(/labelKey: "nav\.life"/);
    expect(circles).toMatch(/href: APP_ROUTES\.life/);
    expect(circles).toMatch(/aria-current=\{active \? "page" : undefined\}/);
    expect(circles).toMatch(/watch-focus-ring/);
    expect(circles).toMatch(/UmLifeCircleIcon/);
    expect(
      APP_NAV_ITEMS.some((item) => item.href === (APP_ROUTES.life as string))
    ).toBe(false);
    expect(
      MOBILE_PRIMARY_NAV_ITEMS.some((item) => item.href === APP_ROUTES.life)
    ).toBe(false);
  });

  it("Profile UM Life enters the full network, not an author filter", () => {
    const actions = read("app/profile/components/ProfileActions.tsx");
    expect(actions).toMatch(/buildLifeHref\(\{ from: "profile" \}\)/);
    expect(actions).toMatch(/t\("profile\.umLife"\)/);
    expect(actions).toMatch(/FollowButton/);
    expect(actions).toMatch(/StartDirectMessageButton/);
    expect(actions).toMatch(/editOwnerCta/);
    expect(actions).not.toMatch(/tab=posts/);
    expect(actions).not.toMatch(/username=\{profile\.username\}/);
    expect(buildLifeHref({ from: "profile" })).not.toContain("user=");
  });

  it("Watch keeps a 2-3 line excerpt and routes Read on UM Life to the same post id", () => {
    const overlay = read("app/components/video/VideoOverlay.tsx");
    expect(overlay).toMatch(/line-clamp-3/);
    expect(overlay).toMatch(/watch\.readOnUmLife/);
    expect(overlay).toMatch(/buildLifePostHref\(video\.postId\)/);
    expect(overlay).toMatch(/buildCreatorProfileHref/);
  });

  it("UM Life author opens rich Profile and can return to /life", () => {
    const card = read("app/life/LifePostCard.tsx");
    expect(card).toMatch(/buildCreatorProfileHref/);
    expect(card).toMatch(/life\.authorProfileAria/);
    expect(card).toMatch(/buildLifePostHref\(post\.id\)/);
    expect(buildCreatorProfileHref({ username: "lina.creates" })).toBe(
      "/profile/lina.creates"
    );
    const experience = read("app/life/LifeExperience.tsx");
    expect(experience).toMatch(/APP_ROUTES\.life/);
    expect(experience).toMatch(/life\.backToFeed/);
  });
});

describe("UM Life Phase 1 — feed, focused post, RTL, locales", () => {
  it("maps text image and video canonical posts without requiring video", () => {
    const text = mapPublicPostToLifePost(samplePost({ post_type: "text" }));
    const image = mapPublicPostToLifePost(
      samplePost({ post_type: "image", image_url: "https://img.example/a.jpg" })
    );
    const video = mapPublicPostToLifePost(
      samplePost({
        post_type: "video",
        video_url: "https://cdn.example/v.mp4",
        content: "",
      })
    );
    expect(text?.type).toBe("text");
    expect(text?.videoUrl).toBeNull();
    expect(image?.imageUrl).toBe("https://img.example/a.jpg");
    expect(video?.videoUrl).toBe("https://cdn.example/v.mp4");
    expect(video?.content).toBe("");
    expect(mapPublicPostToLifePost(samplePost({ post_type: "idea" }))).toBeNull();

    const card = read("app/life/LifePostCard.tsx");
    expect(card).toMatch(/whitespace-pre-wrap/);
    expect(card).toMatch(/focused/);
    expect(card).toMatch(/LifeEngagementBar/);
  });

  it("uses logical start/end classes and a 360-1440 readable column", () => {
    const files = [
      "app/life/LifeExperience.tsx",
      "app/life/LifePostCard.tsx",
      "app/life/LifeEngagementBar.tsx",
      "app/life/compose/page.tsx",
      "app/discover/components/HomeSectionCircles.tsx",
    ];
    for (const rel of files) {
      const source = read(rel);
      expect(source).not.toMatch(/\b(left|right)-\[/);
      expect(source).not.toMatch(/border-(left|right)-/);
      expect(source).not.toMatch(/ml-auto|mr-auto|pl-\d|pr-\d/);
    }
    const experience = read("app/life/LifeExperience.tsx");
    expect(experience).toMatch(/max-w-\[45rem\]/);
    expect(experience).toMatch(/min-w-0/);
    expect(experience).toMatch(/px-4/);
  });

  it("localizes Read on UM Life and UM Life labels in all 13 catalogs", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = MESSAGE_CATALOGS[locale];
      expect(catalog["nav.life"].length).toBeGreaterThan(0);
      expect(catalog["watch.readOnUmLife"].length).toBeGreaterThan(0);
      expect(catalog["profile.umLife"].length).toBeGreaterThan(0);
      expect(catalog["life.title"].length).toBeGreaterThan(0);
    }
    expect(translate("en", "watch.readOnUmLife")).toBe("Read on UM Life");
    expect(translate("ar", "watch.readOnUmLife")).toBe("اقرأ على UM Life");
    expect(translate("fr", "watch.readOnUmLife")).toBe("Lire sur UM Life");
    expect(translate("ja", "watch.readOnUmLife")).toBe("UM Life で読む");
    expect(translate("ko", "watch.readOnUmLife")).toBe("UM Life에서 읽기");
    expect(translate("zh-CN", "watch.readOnUmLife")).toBe("在 UM Life 阅读");
    expect(translate("de", "watch.readOnUmLife")).not.toBe(
      translate("en", "watch.readOnUmLife")
    );
    expect(translate("hi", "watch.readOnUmLife")).not.toBe(
      translate("en", "watch.readOnUmLife")
    );
  });

  it("keeps Home Watch Create and recovered Profile modules except authorized CTAs", () => {
    const home = read("app/page.tsx");
    expect(home).toMatch(/HomeFeedLoader/);
    expect(home).not.toMatch(/LifeExperience/);

    const createVideo = read("app/create/video/page.tsx");
    expect(createVideo).toMatch(/CreateVideo/);

    const profile = read("app/profile/ProfileExperience.tsx");
    expect(profile).toMatch(/ProfileActions/);
    expect(profile).toMatch(/ProfileTabs/);

    const watchPage = read("app/watch/page.tsx");
    expect(watchPage).toMatch(/WatchExperience/);
    expect(watchPage).toMatch(/getWatchVideosPageServer/);

    const overlay = read("app/components/video/VideoOverlay.tsx");
    expect(overlay).toMatch(/line-clamp-3/);
    expect(overlay).toMatch(/watch\.readOnUmLife/);
  });
});

describe("UM Life Phase 1 — engagement identity helper", () => {
  it("preserves the same LifePost id across patches", () => {
    const post = mapPublicPostToLifePost(samplePost({ id: 7 })) as LifePost;
    const patched: LifePost = { ...post, likedByMe: true, likes: post.likes + 1 };
    expect(patched.id).toBe(7);
    expect(patched.id).toBe(post.id);
  });
});
