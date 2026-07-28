import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  detectTextDir,
  mapProjectionToContentCard,
  mapProjectionsToContentCards,
} from ".";
import type { ProfileProjectionCard } from "../services/profileProjectionService";

const ROOT = join(__dirname, "../../..");

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function projection(
  overrides: Partial<ProfileProjectionCard> = {}
): ProfileProjectionCard {
  return {
    registryId: "registry-1",
    kind: "article",
    sourceEntityId: "11111111-1111-4111-8111-111111111111",
    title: "Creator article",
    href: "/articles/11111111-1111-4111-8111-111111111111",
    publishedAt: "2026-07-01T00:00:00.000Z",
    discoveryPostId: 42,
    ownerUserId: "creator-1",
    contentKind: "article",
    summary: null,
    visibility: "public",
    publishState: "published",
    presentationVariant: "article",
    badges: ["linked_article"],
    ...overrides,
  };
}

const creator = {
  id: "creator-1",
  displayName: "Creator",
  username: "creator",
  avatarUrl: null,
};

describe("Content Card System V1", () => {
  it("maps linked article teasers to one article card with read CTA", () => {
    const card = mapProjectionToContentCard(projection(), { creator });

    expect(card?.kind).toBe("article");
    expect(card?.cta.verb).toBe("read_article");
    expect(card?.badges).toEqual(
      expect.arrayContaining(["linked_article", "generated_teaser"])
    );
    expect(card?.presentationVariant).toBe("article");
    expect(card?.preview.durationLabel).toBeNull();
  });

  it("maps independent videos to Watch cards", () => {
    const card = mapProjectionToContentCard(
      projection({
        registryId: "registry-video",
        kind: "video",
        contentKind: "video",
        sourceEntityId: "9",
        title: "Independent clip",
        href: "/watch?post=9",
        discoveryPostId: null,
        presentationVariant: "video",
        badges: ["independent_video"],
      }),
      { creator, durationByPostId: { 9: "01:12" } }
    );

    expect(card?.cta.verb).toBe("watch");
    expect(card?.preview.durationLabel).toBe("01:12");
    expect(card?.badges).toContain("independent_video");
  });

  it("skips duplicate registry IDs and unusable projection data", () => {
    const base = projection();
    expect(
      mapProjectionsToContentCards(
        [base, { ...base, title: "Duplicate" }, projection({ title: "" })],
        { creator }
      )
    ).toHaveLength(1);
    expect(
      mapProjectionToContentCard(projection({ title: "" }), { creator })
    ).toBeNull();
    expect(
      mapProjectionToContentCard(projection({ href: "" }), { creator })
    ).toBeNull();
  });

  it("detects RTL titles", () => {
    expect(detectTextDir("عنوان بالعربية")).toBe("rtl");
    expect(detectTextDir("English title")).toBe("ltr");
  });

  it("keeps Home isolated from content cards", () => {
    const home = read("app/page.tsx");
    const feedLoader = read("app/components/home/HomeFeedLoader.tsx");
    expect(home).not.toMatch(/content-cards|contentCardViewModel/);
    expect(feedLoader).not.toMatch(/content-cards|contentCardViewModel/);
  });

  it("uses ContentCard on Profile All with reduced-motion support", () => {
    const allPanel = read("app/profile/components/ProfileAllPanel.tsx");
    const card = read("app/components/content-cards/ContentCard.tsx");
    expect(allPanel).toMatch(/<ContentCard card=\{card\} showCreator=\{false\}/);
    expect(card).toMatch(/motion-reduce/);
  });

  it("retains creator profile panels and excludes future V1 tabs", () => {
    const experience = read("app/profile/ProfileExperience.tsx");
    const tabs = read("app/profile/components/ProfileTabs.tsx");
    expect(experience).toMatch(/ProfileLinkedArticlePrompt/);
    expect(experience).toMatch(/activeTab === "articles"/);
    expect(experience).toMatch(/activeTab === "videos"/);
    expect(experience).toMatch(/activeTab === "about"/);
    expect(tabs).not.toMatch(/\{ id: "courses"/);
    expect(tabs).not.toMatch(/\{ id: "products"/);
    expect(tabs).not.toMatch(/\{ id: "photos"/);
  });
});
