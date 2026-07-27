import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildArticleHref,
  buildCreatorProfileHref,
  isUuid,
} from "./routes";

const ROOT = process.cwd();
const SAMPLE_ARTICLE = "11111111-1111-4111-8111-111111111111";

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("Creator profile article deeplink V1", () => {
  it("buildCreatorProfileHref passes article query only for valid UUIDs", () => {
    expect(buildCreatorProfileHref({ username: "@Creator" })).toBe(
      "/profile/creator"
    );
    expect(
      buildCreatorProfileHref({
        username: "Creator",
        articleId: SAMPLE_ARTICLE,
      })
    ).toBe(`/profile/creator?article=${SAMPLE_ARTICLE}`);
    expect(
      buildCreatorProfileHref({
        username: "Creator",
        articleId: "not-a-uuid",
      })
    ).toBe("/profile/creator");
    expect(isUuid(SAMPLE_ARTICLE)).toBe(true);
    expect(buildArticleHref(SAMPLE_ARTICLE)).toBe(
      `/articles/${SAMPLE_ARTICLE}`
    );
  });

  it("Discover creator avatar uses article-aware profile href", () => {
    const src = read("app/discover/components/DiscoverCreatorInfo.tsx");
    expect(src).toMatch(/articleId/);
    expect(src).toMatch(/buildCreatorProfileHref/);
  });

  it("Watch overlay forwards articleId into profile href", () => {
    const overlay = read("app/components/video/VideoOverlay.tsx");
    expect(overlay).toMatch(/articleId:\s*video\.articleId/);
    expect(overlay).toMatch(/Linked article/);
  });

  it("Profile shows linked-article prompt only from ?article=", () => {
    const experience = read("app/profile/ProfileExperience.tsx");
    expect(experience).toMatch(/ProfileLinkedArticlePrompt/);
    expect(experience).toMatch(/searchParams\.get\("article"\)/);
    expect(experience).toMatch(/showLinkedArticlePrompt/);
    expect(
      existsSync(
        join(ROOT, "app/profile/components/ProfileLinkedArticlePrompt.tsx")
      )
    ).toBe(true);
    const prompt = read(
      "app/profile/components/ProfileLinkedArticlePrompt.tsx"
    );
    expect(prompt).toMatch(/Read article now/);
    expect(prompt).toMatch(/Browse profile/);
    expect(prompt).toMatch(/buildArticleHref/);
  });

  it("does not reintroduce LandingHero on home or rewrite feed chrome", () => {
    const home = read("app/page.tsx");
    expect(home).toMatch(/HomeFeedLoader/);
    expect(home).not.toMatch(/LandingHero/);
    const card = read("app/discover/components/DiscoverVideoCard.tsx");
    expect(card).toMatch(/DiscoverCreatorInfo/);
    expect(card).toMatch(/DiscoverCaption/);
    expect(card).toMatch(/DiscoverActionRail/);
  });

  it("reuses articles foundation without duplicate migration", () => {
    const foundation = read("lib/articles/articlesFoundation.ts");
    expect(foundation).toMatch(/publish_my_article/);
    expect(foundation).toMatch(/20260865_articles_teaser_foundation_v1/);
    expect(
      existsSync(
        join(
          ROOT,
          "supabase/migrations/20260865_articles_teaser_foundation_v1.sql"
        )
      )
    ).toBe(true);
  });
});
