import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ContentCardViewModel } from "./cards";
import {
  applyProfileAllTimelineContract,
  dedupeCardsByRegistryId,
  excludeProvenTeaserVideos,
  isProvenTeaserVideoCard,
} from "../../app/profile/lib/profileAllTimelineContract";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function card(
  partial: Partial<ContentCardViewModel> &
    Pick<ContentCardViewModel, "id" | "registryId" | "title" | "kind">
): ContentCardViewModel {
  return {
    sourceEntityId: partial.sourceEntityId ?? partial.id,
    creator: {
      id: "creator-1",
      displayName: "Creator",
      username: "creator",
      avatarUrl: null,
    },
    summary: null,
    canonicalHref: partial.canonicalHref ?? `/x/${partial.id}`,
    publishedAt: partial.publishedAt ?? "2026-07-01T00:00:00.000Z",
    visibility: "public",
    publishState: "published",
    preview: {
      recipe: "gradient",
      aspect: "16:9",
      alt: partial.title,
      gradientClass: "from-sky-700 to-[#0b1024]",
    },
    discoveryPostId: partial.discoveryPostId ?? null,
    discoveryMode: partial.discoveryMode ?? "none",
    hasGeneratedTeaser: partial.hasGeneratedTeaser ?? false,
    featured: false,
    pinned: false,
    badges: partial.badges ?? [],
    cta: {
      verb: partial.kind === "article" ? "read_article" : "watch",
      label: partial.kind === "article" ? "Read" : "Watch",
      href: partial.canonicalHref ?? `/x/${partial.id}`,
    },
    presentationVariant: partial.kind === "article" ? "article" : "video",
    layoutVariant: "profile",
    ...partial,
  };
}

describe("All Timeline Contract V1 — helpers", () => {
  it("dedupes by registryId while preserving first-seen order", () => {
    const a = card({
      id: "1",
      registryId: "r-a",
      kind: "article",
      title: "A",
      publishedAt: "2026-07-03T00:00:00.000Z",
    });
    const b = card({
      id: "2",
      registryId: "r-b",
      kind: "video",
      title: "B",
      publishedAt: "2026-07-02T00:00:00.000Z",
      badges: ["independent_video"],
    });
    const dup = card({
      id: "1b",
      registryId: "r-a",
      kind: "article",
      title: "A duplicate",
    });
    const out = dedupeCardsByRegistryId([a, b, dup]);
    expect(out.map((c) => c.registryId)).toEqual(["r-a", "r-b"]);
    expect(out[0]?.title).toBe("A");
  });

  it("keeps article+discovery as a single article and drops proven teaser video", () => {
    const article = card({
      id: "art",
      registryId: "r-art",
      kind: "article",
      title: "Story",
      discoveryPostId: 42,
      discoveryMode: "teaser_bound",
      hasGeneratedTeaser: true,
      badges: ["linked_article", "generated_teaser"],
      canonicalHref: "/articles/art",
    });
    const teaserAsVideo = card({
      id: "42",
      registryId: "r-teaser-video",
      kind: "video",
      title: "Teaser clip",
      sourceEntityId: "42",
      discoveryPostId: 42,
      badges: ["independent_video"],
      canonicalHref: "/watch?post=42",
    });
    const independent = card({
      id: "99",
      registryId: "r-vid",
      kind: "video",
      title: "Independent",
      sourceEntityId: "99",
      discoveryPostId: 99,
      badges: ["independent_video"],
      canonicalHref: "/watch?post=99",
    });

    expect(isProvenTeaserVideoCard(teaserAsVideo, [article])).toBe(true);
    expect(isProvenTeaserVideoCard(independent, [article])).toBe(false);

    const filtered = excludeProvenTeaserVideos([
      article,
      teaserAsVideo,
      independent,
    ]);
    expect(filtered.map((c) => c.registryId)).toEqual(["r-art", "r-vid"]);
  });

  it("does not drop a video without explicit teaser evidence", () => {
    const lonelyVideo = card({
      id: "7",
      registryId: "r-lonely",
      kind: "video",
      title: "Clip",
      sourceEntityId: "7",
      badges: ["independent_video"],
    });
    expect(isProvenTeaserVideoCard(lonelyVideo, [])).toBe(false);
    expect(excludeProvenTeaserVideos([lonelyVideo])).toHaveLength(1);
  });

  it("excludes proven teasers via explicit badges/mode on the video card", () => {
    const badged = card({
      id: "8",
      registryId: "r-badged",
      kind: "video",
      title: "Badged teaser",
      badges: ["generated_teaser"],
    });
    expect(isProvenTeaserVideoCard(badged, [])).toBe(true);
  });

  it("preserves projection ordering through the full contract", () => {
    const newer = card({
      id: "n",
      registryId: "r-new",
      kind: "article",
      title: "Newer",
      publishedAt: "2026-07-10T00:00:00.000Z",
    });
    const older = card({
      id: "o",
      registryId: "r-old",
      kind: "video",
      title: "Older",
      publishedAt: "2026-07-01T00:00:00.000Z",
      badges: ["independent_video"],
    });
    const { chronology } = applyProfileAllTimelineContract({
      cards: [newer, older],
    });
    expect(chronology.map((c) => c.registryId)).toEqual(["r-new", "r-old"]);
  });

  it("keeps pinned out of chronology", () => {
    const pinnedCard = card({
      id: "p1",
      registryId: "r-pin",
      kind: "article",
      title: "Pinned",
      pinned: true,
      badges: ["pinned"],
    });
    const other = card({
      id: "c1",
      registryId: "r-c",
      kind: "video",
      title: "Other",
      badges: ["independent_video"],
    });
    const result = applyProfileAllTimelineContract({
      cards: [pinnedCard, other],
      pinned: [pinnedCard],
    });
    expect(result.showPinnedRail).toBe(true);
    expect(result.pinned.map((c) => c.registryId)).toEqual(["r-pin"]);
    expect(result.chronology.map((c) => c.registryId)).toEqual(["r-c"]);
  });

  it("yields empty chronology and no rail when there are no cards", () => {
    const result = applyProfileAllTimelineContract({ cards: [] });
    expect(result.showPinnedRail).toBe(false);
    expect(result.pinned).toEqual([]);
    expect(result.chronology).toEqual([]);
  });
});

describe("All Timeline Contract V1 — panel wiring", () => {
  it("applies contract helper and single-column readable density", () => {
    const panel = read("app/profile/components/ProfileAllPanel.tsx");
    const helper = read("app/profile/lib/profileAllTimelineContract.ts");

    expect(helper).toMatch(/export function applyProfileAllTimelineContract/);
    expect(helper).toMatch(/isProvenTeaserVideoCard/);
    expect(helper).toMatch(/dedupeCardsByRegistryId/);
    expect(panel).toMatch(/applyProfileAllTimelineContract/);
    expect(panel).toMatch(/max-w-\[45rem\]/);
    expect(panel).not.toMatch(/sm:grid-cols-2/);
    expect(panel).toMatch(
      /Articles and independent videos will appear here in one timeline/
    );
    expect(
      existsSync(join(ROOT, "app/profile/lib/profileAllTimelineContract.ts"))
    ).toBe(true);
  });

  it("does not touch Home, Arc, Discover, Watch, Photos Lightbox, or kinds expansion", () => {
    const helper = read("app/profile/lib/profileAllTimelineContract.ts");
    const panel = read("app/profile/components/ProfileAllPanel.tsx");
    const combined = `${helper}\n${panel}`;

    expect(combined).not.toMatch(
      /DiscoverExperience|HomeFeed|shouldMountHomeCircularArc|HomeCircularArc/
    );
    expect(combined).not.toMatch(/ProfilePhotosLightbox|CONTENT_KINDS/);
    expect(combined).not.toMatch(/supabase\/migrations|\.insert\(/);
    expect(combined).not.toMatch(/ProfileShell|ProfileTabs|ProfileHeader/);
  });
});
