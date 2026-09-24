import { afterEach, describe, expect, it } from "vitest";
import {
  isFeedPlaybackSuppressed,
  isHifzPath,
  releaseFeedPlaybackSuppression,
  shouldPauseMediaOnPageHide,
  suppressFeedPlayback,
} from "./feedHiddenPlayback";

describe("feed hidden playback", () => {
  afterEach(() => {
    releaseFeedPlaybackSuppression();
  });

  it("keeps Quran audio pages playing when the screen locks", () => {
    expect(isHifzPath("/hifz")).toBe(true);
    expect(isHifzPath("/hifz/shams")).toBe(true);
    expect(shouldPauseMediaOnPageHide("/hifz/shams")).toBe(false);
  });

  it("pauses the feed and watch when the page hides", () => {
    expect(shouldPauseMediaOnPageHide("/")).toBe(true);
    expect(shouldPauseMediaOnPageHide("/watch")).toBe(true);
    expect(isHifzPath("/watch")).toBe(false);
  });

  it("does not resume by itself after the page was hidden", () => {
    expect(isFeedPlaybackSuppressed()).toBe(false);
    suppressFeedPlayback();
    expect(isFeedPlaybackSuppressed()).toBe(true);
    releaseFeedPlaybackSuppression();
    expect(isFeedPlaybackSuppressed()).toBe(false);
  });
});
