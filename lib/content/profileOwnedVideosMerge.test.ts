import { describe, expect, it } from "vitest";
import type { ContentCardViewModel } from "./cards";
import { isImagePreviewSrc } from "./cards";
import { mergeOwnedVideosIntoProfileCards } from "../../app/profile/lib/mergeOwnedVideosIntoProfileCards";

const creator = {
  id: "11111111-1111-4111-8111-111111111111",
  displayName: "Owner",
  username: "owner",
  avatarUrl: null,
};

function videoCard(postId: number): ContentCardViewModel {
  return {
    id: `reg-${postId}`,
    registryId: `reg-${postId}`,
    kind: "video",
    sourceEntityId: String(postId),
    creator,
    title: `Clip ${postId}`,
    summary: null,
    canonicalHref: `/watch?post=${postId}`,
    publishedAt: "2026-07-01T00:00:00.000Z",
    visibility: "public",
    publishState: "published",
    preview: {
      recipe: "gradient",
      aspect: "9:16",
      alt: `Clip ${postId}`,
    },
    discoveryPostId: postId,
    discoveryMode: "native_video",
    hasGeneratedTeaser: false,
    featured: false,
    pinned: false,
    badges: ["independent_video"],
    cta: { verb: "watch", label: "Watch", href: `/watch?post=${postId}` },
    presentationVariant: "video",
    layoutVariant: "profile",
  };
}

describe("mergeOwnedVideosIntoProfileCards", () => {
  it("adds ready owned videos missing from the registry All tab", () => {
    const merged = mergeOwnedVideosIntoProfileCards(
      [videoCard(10)],
      [
        {
          postId: 10,
          title: "Already indexed",
          views: 1,
          likes: 0,
          previewUrl: "https://cdn.example/a.mp4",
          thumbnailUrl: "https://cdn.example/a.jpg",
          href: "/watch?post=10",
          createdAt: "2026-07-01T00:00:00.000Z",
        },
        {
          postId: 11,
          title: "Missing from registry",
          views: 2,
          likes: 1,
          previewUrl: "https://cdn.example/b.mp4",
          thumbnailUrl: "https://cdn.example/b.jpg",
          href: "/watch?post=11",
          createdAt: "2026-07-02T00:00:00.000Z",
        },
      ],
      creator
    );

    expect(merged.map((card) => card.discoveryPostId)).toEqual([10, 11]);
    expect(merged[1]?.canonicalHref).toBe("/watch?post=11");
    expect(merged[1]?.preview.src).toBe("https://cdn.example/b.jpg");
  });

  it("does not put video playback URLs into image previews", () => {
    expect(isImagePreviewSrc("https://cdn.example/clip.mp4")).toBe(false);
    expect(isImagePreviewSrc("https://cdn.example/thumbs/clip.jpg?token=1")).toBe(
      true
    );
    expect(isImagePreviewSrc(null)).toBe(false);
  });
});
