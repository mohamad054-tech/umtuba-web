import { describe, expect, it } from "vitest";
import { buildFeedPostUrl } from "./syncFeedPostUrl";

describe("buildFeedPostUrl", () => {
  it("points the address at the video now playing", () => {
    expect(buildFeedPostUrl("https://umtuba.com/watch?post=4&hl=ar", 9)).toBe(
      "/watch?post=9&hl=ar"
    );
  });

  it("drops the legacy id query so it cannot pull the first video back", () => {
    expect(buildFeedPostUrl("https://umtuba.com/watch?id=4", 9)).toBe(
      "/watch?post=9"
    );
  });
});
