import { describe, expect, it } from "vitest";
import { buildHomeFeedItems, feedIndexForVideo } from "../../discover/feedWithGameBreaks";
import { visibleDiscoverFeedLink } from "../../discover/discoverFeedLink";
import type { DiscoverVideo } from "../../discover/types";

function video(id: string): DiscoverVideo {
  return {
    id,
    src: "https://cdn.example/v.mp4",
    title: "t",
    caption: "c",
    hashtags: [],
    location: { city: "UMTUBA", country: "Worldwide" },
    creator: { id: null, name: "A", username: "@a", avatar: "A" },
    stats: { likes: 0, comments: 0, shares: 0, saves: 0, views: 0 },
    likedByMe: false,
    savedByMe: false,
  };
}

describe("home feed game breaks", () => {
  it("inserts one artwork game after every 12 videos and skips it for video indexes", () => {
    const videos = Array.from({ length: 13 }, (_, index) => video(String(index + 1)));
    const items = buildHomeFeedItems(videos);
    expect(items).toHaveLength(14);
    expect(items[11]?.kind).toBe("video");
    expect(items[12]?.kind).toBe("game");
    expect(items[13]?.kind).toBe("video");
    if (items[12]?.kind === "game" && items[13]?.kind === "video") {
      expect(items[12].slug).toBe("sudoku");
      expect(items[13].videoIndex).toBe(12);
    }
    expect(feedIndexForVideo(12)).toBe(13);
    expect(feedIndexForVideo(0)).toBe(0);
  });
});

describe("home link chip", () => {
  it("stays hidden for missing data and the placeholder city", () => {
    expect(visibleDiscoverFeedLink(null)).toBeNull();
    expect(visibleDiscoverFeedLink({ kind: "place", city: "UMTUBA" })).toBeNull();
    expect(visibleDiscoverFeedLink({ kind: "course", title: " ", href: "/learning" })).toBeNull();
    expect(visibleDiscoverFeedLink({ kind: "place", city: "عمّان" })?.kind).toBe("place");
  });
});
