import { describe, expect, it, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildCanonicalHref,
  assertTrustedCanonicalHref,
  isAllowlistedCanonicalHref,
} from "./services/canonicalLinkService";
import {
  validateDiscoveryBinding,
  isPubliclyReadyDiscoveryPost,
} from "./services/discoveryBindingService";
import {
  normalizeVisibility,
  canViewerAccessContent,
  isPublicListingEligible,
  visibilityFromPublishState,
} from "./services/visibilityService";
import {
  emitContentHook,
  isBoundedHookPayload,
  subscribeContentHooks,
  type ContentHookEvent,
} from "./services/hookContracts";
import {
  registerContentAdapter,
  requireContentAdapter,
  listRegisteredContentKinds,
  getRegisteredAdapter,
} from "./runtime/adapterRuntime";
import { ensureBuiltinContentAdaptersRegistered } from "./runtime/registerBuiltinAdapters";
import { projectRegistryRowToCard } from "./services/profileProjectionService";
import { articleContentAdapter } from "./adapters/articleAdapter";
import { isIndependentVideoPost } from "./contentRegistry";

const ROOT = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Unified Content Services V2", () => {
  beforeEach(() => {
    ensureBuiltinContentAdaptersRegistered();
  });

  it("registers article and video adapters once via runtime", () => {
    ensureBuiltinContentAdaptersRegistered();
    expect(listRegisteredContentKinds().sort()).toEqual(["article", "video"]);
    expect(requireContentAdapter("article").ok).toBe(true);
    expect(requireContentAdapter("course").ok).toBe(false);
    expect(getRegisteredAdapter("live")).toBeNull();
    expect(() => registerContentAdapter(articleContentAdapter)).toThrow(
      /Duplicate/
    );
  });

  it("article and video adapters expose validateSource and use lifecycle/canonical services", () => {
    const article = read("lib/content/adapters/articleAdapter.ts");
    const video = read("lib/content/adapters/videoAdapter.ts");
    expect(article).toMatch(/syncContentLifecycle/);
    expect(article).toMatch(/buildCanonicalHref/);
    expect(article).toMatch(/validateSource/);
    expect(video).toMatch(/syncContentLifecycle/);
    expect(video).toMatch(/buildCanonicalHref/);
    expect(video).toMatch(/isIndependentVideoPost/);
  });

  it("canonical href is allowlisted and rejects untrusted paths", () => {
    const article = buildCanonicalHref(
      "article",
      "11111111-1111-4111-8111-111111111111"
    );
    expect(article.ok).toBe(true);
    if (article.ok) {
      expect(article.href).toBe(
        "/articles/11111111-1111-4111-8111-111111111111"
      );
      expect(isAllowlistedCanonicalHref(article.href)).toBe(true);
    }
    expect(buildCanonicalHref("video", "42").ok).toBe(true);
    expect(buildCanonicalHref("video", "nope").ok).toBe(false);
    expect(buildCanonicalHref("course" as never, "x").ok).toBe(false);
    expect(assertTrustedCanonicalHref("javascript:alert(1)").ok).toBe(false);
    expect(assertTrustedCanonicalHref("https://evil.example/").ok).toBe(false);
    expect(assertTrustedCanonicalHref("/articles/not-a-uuid").ok).toBe(false);
  });

  it("visibility service normalizes and fail-closes public access", () => {
    expect(normalizeVisibility("public")).toBe("public");
    expect(normalizeVisibility("followers")).toBe("private");
    expect(normalizeVisibility("weird")).toBe("private");
    expect(visibilityFromPublishState("published")).toBe("public");
    expect(
      isPublicListingEligible({
        visibility: "public",
        publishState: "published",
      })
    ).toBe(true);
    expect(
      canViewerAccessContent({
        visibility: "private",
        publishState: "unpublished",
        ownerUserId: "owner",
        viewerId: null,
      })
    ).toBe(false);
    expect(
      canViewerAccessContent({
        visibility: "private",
        publishState: "unpublished",
        ownerUserId: "owner",
        viewerId: "owner",
      })
    ).toBe(true);
  });

  it("discovery binding rejects owner mismatch and article teasers as videos", () => {
    const readyIndependent = {
      id: 9,
      user_id: "u1",
      article_id: null,
      post_type: "video",
      media_status: "ready",
      video_path: "u1/x.mp4",
    };
    expect(isPubliclyReadyDiscoveryPost(readyIndependent)).toBe(true);
    expect(
      validateDiscoveryBinding({
        contentKind: "video",
        sourceEntityId: "9",
        ownerUserId: "u1",
        post: readyIndependent,
      }).ok
    ).toBe(true);
    expect(
      validateDiscoveryBinding({
        contentKind: "video",
        sourceEntityId: "9",
        ownerUserId: "other",
        post: readyIndependent,
      }).ok
    ).toBe(false);
    expect(
      validateDiscoveryBinding({
        contentKind: "video",
        sourceEntityId: "9",
        ownerUserId: "u1",
        post: { ...readyIndependent, article_id: "art-1" },
      }).ok
    ).toBe(false);
    expect(
      validateDiscoveryBinding({
        contentKind: "article",
        sourceEntityId: "art-1",
        ownerUserId: "u1",
        post: {
          ...readyIndependent,
          article_id: "art-1",
        },
      }).ok
    ).toBe(true);
    expect(
      validateDiscoveryBinding({
        contentKind: "video",
        sourceEntityId: "9",
        ownerUserId: "u1",
        post: { ...readyIndependent, media_status: "processing" },
      }).ok
    ).toBe(false);
    expect(isIndependentVideoPost({ article_id: "art-1" })).toBe(false);
  });

  it("profile projection builds cards with badges without duplicating teasers", () => {
    const articleCard = projectRegistryRowToCard({
      id: "r1",
      content_kind: "article",
      source_entity_id: "11111111-1111-4111-8111-111111111111",
      owner_user_id: "u1",
      title: "Hello",
      canonical_href: "/articles/11111111-1111-4111-8111-111111111111",
      published_at: "2026-01-01T00:00:00Z",
      discovery_post_id: 7,
      visibility: "public",
      publish_state: "published",
    });
    expect(articleCard.contentKind).toBe("article");
    expect(articleCard.badges).toContain("linked_article");
    expect(articleCard.href).toMatch(/^\/articles\//);

    const videoCard = projectRegistryRowToCard({
      id: "r2",
      content_kind: "video",
      source_entity_id: "12",
      owner_user_id: "u1",
      title: "Clip",
      canonical_href: "/watch?post=12",
      published_at: "2026-01-02T00:00:00Z",
      discovery_post_id: 12,
      visibility: "public",
      publish_state: "published",
    });
    expect(videoCard.badges).toContain("independent_video");
  });

  it("hooks are typed, bounded, and do not carry article body", () => {
    const events: ContentHookEvent[] = [];
    const unsubscribe = subscribeContentHooks((event) => events.push(event));
    const event: ContentHookEvent = {
      type: "onContentPublished",
      contentKind: "article",
      sourceEntityId: "11111111-1111-4111-8111-111111111111",
      ownerUserId: "u1",
      registryId: "r1",
      at: new Date().toISOString(),
    };
    emitContentHook(event);
    unsubscribe();
    expect(events).toHaveLength(1);
    expect(isBoundedHookPayload(event)).toBe(true);
    expect(JSON.stringify(event)).not.toMatch(/\"body\"/);
  });

  it("worker still syncs article discovery through binding service", () => {
    const worker = read("scripts/media/articleTeaserWorker.ts");
    expect(worker).toMatch(/syncArticleDiscoveryPost/);
    const article = read("lib/content/adapters/articleAdapter.ts");
    expect(article).toMatch(/bindDiscoveryPost/);
  });

  it("profile All and deeplink surfaces remain intact", () => {
    const experience = read("app/profile/ProfileExperience.tsx");
    expect(experience).toMatch(/ProfileAllPanel/);
    expect(experience).toMatch(/ProfileLinkedArticlePrompt/);
    expect(experience).toMatch(/activeTab === \"articles\"/);
    expect(experience).toMatch(/activeTab === \"videos\"/);
    const panel = read("app/profile/components/ProfileAllPanel.tsx");
    expect(panel).toMatch(/dir=\{dir\}/);
    expect(existsSync(join(ROOT, "app/lib/nav/creatorProfileArticleDeeplink.test.ts"))).toBe(
      true
    );
  });

  it("Home feed loader remains video-first and untouched by content services", () => {
    const home = read("app/components/home/HomeFeedLoader.tsx");
    expect(home).toMatch(/getDiscoverVideosServer/);
    expect(home).not.toMatch(/content_registry|lifecycleService|profileProjection/);
  });

  it("does not require a new migration for V2 services layer", () => {
    expect(
      existsSync(
        join(ROOT, "supabase/migrations/20260868_unified_content_foundation_v1.sql")
      )
    ).toBe(true);
    expect(
      existsSync(
        join(ROOT, "supabase/migrations/20260869_unified_content_services_v2.sql")
      )
    ).toBe(false);
  });
});
