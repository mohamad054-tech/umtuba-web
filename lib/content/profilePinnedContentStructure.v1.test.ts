import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  excludePinnedFromChronology,
  normalizePinnedContentCards,
  partitionProfileAllContent,
  PROFILE_PINNED_SOFT_CAP,
  resolvePinnedContentCards,
  shouldShowPinnedRail,
} from "../../app/profile/lib/profilePinnedContentStructure";
import type { ContentCardViewModel } from "./cards";

const ROOT = process.cwd();

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function card(
  partial: Partial<ContentCardViewModel> &
    Pick<ContentCardViewModel, "id" | "registryId" | "title">
): ContentCardViewModel {
  return {
    kind: "article",
    sourceEntityId: partial.id,
    creator: {
      id: "c1",
      displayName: "Creator",
      username: "creator",
      avatarUrl: null,
    },
    summary: null,
    canonicalHref: `/articles/${partial.id}`,
    publishedAt: "2026-01-01T00:00:00.000Z",
    visibility: "public",
    preview: {
      recipe: "gradient",
      aspect: "16:9",
      alt: partial.title,
      gradientClass: "from-[#101828] to-[#081018]",
    },
    discoveryPostId: null,
    discoveryMode: "none",
    hasGeneratedTeaser: false,
    badges: [],
    cta: {
      verb: "read_article",
      label: "Read article",
      href: `/articles/${partial.id}`,
    },
    presentationVariant: "article",
    ...partial,
  };
}

describe("Pinned Content Structure V1", () => {
  it("soft-caps pins at 3 and hides empty rails", () => {
    expect(PROFILE_PINNED_SOFT_CAP).toBe(3);
    expect(shouldShowPinnedRail([])).toBe(false);

    const normalized = normalizePinnedContentCards([
      card({ id: "1", registryId: "r1", title: "A" }),
      card({ id: "2", registryId: "r2", title: "B" }),
      card({ id: "3", registryId: "r3", title: "C" }),
      card({ id: "4", registryId: "r4", title: "D" }),
      card({ id: "1-dup", registryId: "r1", title: "A dup" }),
    ]);

    expect(normalized).toHaveLength(3);
    expect(normalized.map((c) => c.registryId)).toEqual(["r1", "r2", "r3"]);
    expect(normalized.every((c) => c.pinned === true)).toBe(true);
    expect(normalized.every((c) => c.badges.includes("pinned"))).toBe(true);
    expect(shouldShowPinnedRail(normalized)).toBe(true);
  });

  it("prefers explicit pins, then cards marked pinned", () => {
    const timeline = [
      card({ id: "a", registryId: "ra", title: "A", pinned: true }),
      card({ id: "b", registryId: "rb", title: "B" }),
    ];
    const explicit = [
      card({ id: "x", registryId: "rx", title: "Pinned X" }),
    ];

    expect(
      resolvePinnedContentCards({ pinned: explicit, cards: timeline }).map(
        (c) => c.registryId
      )
    ).toEqual(["rx"]);

    expect(
      resolvePinnedContentCards({ pinned: [], cards: timeline }).map(
        (c) => c.registryId
      )
    ).toEqual(["ra"]);
  });

  it("excludes pinned items from All chronology", () => {
    const pinned = [
      card({ id: "1", registryId: "r1", title: "Pinned" }),
    ];
    const cards = [
      card({ id: "1", registryId: "r1", title: "Pinned" }),
      card({ id: "2", registryId: "r2", title: "Chrono" }),
    ];

    const chronology = excludePinnedFromChronology(cards, pinned);
    expect(chronology.map((c) => c.registryId)).toEqual(["r2"]);

    const partition = partitionProfileAllContent({
      cards,
      pinned,
    });
    expect(partition.showPinnedRail).toBe(true);
    expect(partition.pinned).toHaveLength(1);
    expect(partition.chronology).toHaveLength(1);
    expect(partition.chronology[0]?.registryId).toBe("r2");
  });

  it("wires All panel + rail without migrations or pin backends", () => {
    const allPanel = read("app/profile/components/ProfileAllPanel.tsx");
    const rail = read("app/profile/components/ProfilePinnedRail.tsx");
    const structure = read("app/profile/lib/profilePinnedContentStructure.ts");
    const contract = read("app/profile/lib/profileAllTimelineContract.ts");
    const experience = read("app/profile/ProfileExperience.tsx");
    const page = read("app/profile/[username]/page.tsx");

    expect(allPanel).toMatch(/applyProfileAllTimelineContract/);
    expect(contract).toMatch(/partitionProfileAllContent/);
    expect(allPanel).toMatch(/ProfilePinnedRail/);
    expect(allPanel).toMatch(/pinnedCards/);
    expect(rail).toMatch(/Pinned/);
    expect(rail).toMatch(/ContentCard/);
    expect(structure).toMatch(/PROFILE_PINNED_SOFT_CAP/);
    expect(structure).toMatch(/excludePinnedFromChronology/);
    expect(experience).toMatch(/pinnedCards=\{profile\.pinnedContentCards\}/);
    expect(page).not.toMatch(/pinned_content|create_pinned|pin_content/);
    expect(structure).not.toMatch(/\.from\(|\.insert\(|supabase\/migrations/);
    expect(structure).toMatch(/no migration/);
    expect(
      existsSync(join(ROOT, "app/profile/lib/profilePinnedContentStructure.ts"))
    ).toBe(true);
    expect(
      existsSync(join(ROOT, "app/profile/components/ProfilePinnedRail.tsx"))
    ).toBe(true);
  });

  it("does not touch Home feed, Watch player, or catalog UIs", () => {
    const structure = read("app/profile/lib/profilePinnedContentStructure.ts");
    const allPanel = read("app/profile/components/ProfileAllPanel.tsx");
    const rail = read("app/profile/components/ProfilePinnedRail.tsx");

    expect(structure).not.toMatch(/DiscoverExperience|HomeFeed|swipe/);
    expect(allPanel).not.toMatch(/DiscoverExperience|HomeFeed/);
    expect(rail).not.toMatch(/ProfileCoursesPanel|ProfileProductsPanel/);
  });
});
