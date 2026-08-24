import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  WATCH_PLAYBACK_NEIGHBOR_WINDOW,
  isPlayableHttpSrc,
  resolveHomeDiscoverMediaPreload,
  resolvePlaybackWindowIndexes,
  resolveWatchMediaPreload,
  resolveWatchSignIndexes,
  shouldAttachHomeDiscoverMediaSrc,
  shouldAttachWatchMediaSrc,
} from "./playbackFetchPolicy";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("playbackFetchPolicy", () => {
  it("keeps Watch sign/mount window at active ±1", () => {
    expect(WATCH_PLAYBACK_NEIGHBOR_WINDOW).toBe(1);
    expect(resolvePlaybackWindowIndexes(0, 12)).toEqual([0, 1]);
    expect(resolvePlaybackWindowIndexes(5, 12)).toEqual([4, 5, 6]);
    expect(resolvePlaybackWindowIndexes(11, 12)).toEqual([10, 11]);
    expect(shouldAttachWatchMediaSrc({ index: 2, activeIndex: 0, length: 12 })).toBe(
      false
    );
    expect(shouldAttachWatchMediaSrc({ index: 1, activeIndex: 0, length: 12 })).toBe(
      true
    );
  });

  it("signs only the Watch active window on the first page", () => {
    expect(
      resolveWatchSignIndexes({
        length: 12,
        focusIndex: 0,
        isContinuationPage: false,
      })
    ).toEqual([0, 1]);
    expect(
      resolveWatchSignIndexes({
        length: 12,
        focusIndex: 3,
        isContinuationPage: false,
      })
    ).toEqual([2, 3, 4]);
    expect(
      resolveWatchSignIndexes({
        length: 12,
        focusIndex: 0,
        isContinuationPage: true,
      })
    ).toEqual([]);
  });

  it("does not attach Home/Discover media except the active card", () => {
    expect(shouldAttachHomeDiscoverMediaSrc(false)).toBe(false);
    expect(shouldAttachHomeDiscoverMediaSrc(true)).toBe(true);
    expect(resolveHomeDiscoverMediaPreload(false)).toBe("none");
    expect(resolveHomeDiscoverMediaPreload(true)).toBe("none");
  });

  it("keeps Watch neighbor metadata preload and active auto", () => {
    expect(resolveWatchMediaPreload(true)).toBe("auto");
    expect(resolveWatchMediaPreload(false)).toBe("metadata");
  });

  it("treats only http(s) URLs as playable media", () => {
    expect(isPlayableHttpSrc("https://example.com/a.mp4")).toBe(true);
    expect(isPlayableHttpSrc("http://localhost/a.mp4")).toBe(true);
    expect(isPlayableHttpSrc("")).toBe(false);
    expect(isPlayableHttpSrc(null)).toBe(false);
    expect(isPlayableHttpSrc("/local/file.mp4")).toBe(false);
  });
});

describe("video egress source contracts", () => {
  it("does not give Watch ambient a second video src", () => {
    const ambient = read("app/components/video/WatchAmbientBackground.tsx");
    expect(ambient).not.toMatch(/<video[\s>]/);
    expect(ambient).not.toMatch(/src=\{video\.src\}/);
    expect(ambient).not.toMatch(/autoPlay/);

    const experience = read("app/watch/WatchExperience.tsx");
    expect(experience).toMatch(/<WatchAmbientBackground\s*\/>/);
    expect(experience).not.toMatch(/WatchAmbientBackground video=/);
  });

  it("does not metadata-preload Home/Discover or feed-card videos", () => {
    const discover = read("app/discover/components/DiscoverNativeVideo.tsx");
    expect(discover).toMatch(/shouldAttachHomeDiscoverMediaSrc/);
    expect(discover).toMatch(/resolveHomeDiscoverMediaPreload/);
    expect(discover).toMatch(/playActiveVideo/);
    expect(discover).not.toMatch(/preload="metadata"/);

    const card = read("app/components/ContentCard.tsx");
    expect(card).toMatch(/preload="none"/);
    expect(card).not.toMatch(/preload="metadata"/);
  });

  it("uses Watch sign-on-demand for the active window only", () => {
    const server = read("lib/supabase/videoPostsServer.ts");
    expect(server).toMatch(/signPolicy:\s*"active-window"/);
    expect(server).toMatch(/resolveWatchSignIndexes/);

    const attach = read("lib/supabase/videoPosts.ts");
    expect(attach).toMatch(/signIndexes/);
    expect(attach).toMatch(/post_type !== "video"/);

    const feed = read("app/components/video/VerticalVideoFeed.tsx");
    expect(feed).toMatch(/WATCH_PLAYBACK_NEIGHBOR_WINDOW/);
    expect(feed).toMatch(/refreshWatchPlaybackAction/);
    expect(feed).toMatch(/isPlayableHttpSrc/);
  });
});
