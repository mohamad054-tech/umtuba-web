import { describe, expect, it } from "vitest";
import {
  decodeWatchFeedCursor,
  demoVideoToWatchVideo,
  discoverVideoToWatchVideo,
  encodeWatchFeedCursor,
  findWatchVideoIndex,
  isUntitledVideoFallback,
  localizedVideoTitle,
} from "./mapWatchVideo";
import type { DiscoverVideo } from "../../discover/types";
import type { DemoVideo } from "../../data/videos";
import { mapVideoPostToDiscover, type PublicPostDTO } from "../../../lib/supabase/videoPosts";

const discoverSample: DiscoverVideo = {
  id: "42",
  src: "https://example.com/signed.mp4",
  title: "First line",
  caption: "First line\nSecond line",
  hashtags: ["#umtuba"],
  location: { city: "Lisbon", country: "Portugal", countryCode: "PT" },
  creator: {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Ada",
    username: "@ada",
    avatar: "A",
    isFollowing: true,
  },
  stats: { likes: 10, comments: 2, shares: 1, saves: 3, views: 100 },
  likedByMe: true,
  savedByMe: false,
};

const demoSample: DemoVideo = {
  id: "v1",
  src: "/videos/demo-1.mp4",
  title: "Bloom",
  caption: "Demo caption",
  location: { city: "Jerusalem", country: "Palestine" },
  music: "Track",
  aiSummary: "Summary",
  translation: "EN",
  author: { name: "Lina", username: "@lina", avatar: "L" },
  demoStats: { likes: 1, comments: 2, shares: 3, saves: 4 },
};

function publicPost(overrides: Partial<PublicPostDTO> = {}): PublicPostDTO {
  return {
    id: 7,
    user_id: "11111111-1111-4111-8111-111111111111",
    content: "Clip",
    post_type: "video",
    author_name: "Ada",
    author_username: "@ada",
    author_avatar: "A",
    image_url: null,
    video_url: "https://example.com/v.mp4",
    article_id: null,
    likes: 0,
    comments: 0,
    shares: 0,
    saves: 0,
    views: 0,
    likedByMe: false,
    savedByMe: false,
    created_at: "2026-09-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("mapWatchVideo", () => {
  it("maps discover videos with numeric post ids and follow state", () => {
    const watch = discoverVideoToWatchVideo(discoverSample);
    expect(watch.source).toBe("supabase");
    expect(watch.postId).toBe(42);
    expect(watch.title).toBe("First line");
    expect(watch.likedByMe).toBe(true);
    expect(watch.stats.views).toBe(100);
    expect(watch.author.isFollowing).toBe(true);
    expect(watch.location).toEqual({
      city: "Lisbon",
      country: "Portugal",
      countryCode: "PT",
    });
  });

  it("maps a missing origin to a null location", () => {
    const watch = discoverVideoToWatchVideo({
      ...discoverSample,
      location: null,
    });
    expect(watch.location).toBeNull();
  });

  it("maps demo videos as fallback without post ids", () => {
    const watch = demoVideoToWatchVideo(demoSample);
    expect(watch.source).toBe("demo");
    expect(watch.postId).toBeNull();
    expect(watch.title).toBe("Bloom");
  });

  it("finds videos by post query param", () => {
    const videos = [discoverVideoToWatchVideo(discoverSample)];
    expect(findWatchVideoIndex(videos, "42")).toBe(0);
    expect(findWatchVideoIndex(videos, "99")).toBe(0);
  });

  it("localizes untitled titles without inventing captions", () => {
    expect(isUntitledVideoFallback("")).toBe(true);
    expect(isUntitledVideoFallback("Untitled video")).toBe(true);
    expect(isUntitledVideoFallback("First line")).toBe(false);
    expect(localizedVideoTitle("Untitled video", "فيديو بدون عنوان")).toBe(
      "فيديو بدون عنوان"
    );
  });

  it("round-trips feed cursors", () => {
    const encoded = encodeWatchFeedCursor({
      createdAt: "2026-07-15T12:00:00.000Z",
      id: 99,
    });
    expect(decodeWatchFeedCursor(encoded)).toEqual({
      createdAt: "2026-07-15T12:00:00.000Z",
      id: 99,
    });
  });
});

describe("mapVideoPostToDiscover origin", () => {
  it("uses stored origin and never invents UMTUBA/Worldwide", () => {
    const withOrigin = mapVideoPostToDiscover(
      publicPost({
        origin_country_code: "PT",
        origin_city: "Lisbon",
      })
    );
    expect(withOrigin?.location).toEqual({
      city: "Lisbon",
      country: "Portugal",
      countryCode: "PT",
    });

    const withoutOrigin = mapVideoPostToDiscover(publicPost());
    expect(withoutOrigin?.location).toBeNull();
  });
});
