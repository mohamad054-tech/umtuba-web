import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(rel: string) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

describe("feed audio persistence contract", () => {
  it("persists unmute from Watch toggle and reapplies it on each clip", () => {
    const feed = read("app/components/video/VerticalVideoFeed.tsx");
    expect(feed).toMatch(/writeFeedUnmutedPreference\(!nextMuted\)/);
    expect(feed).toMatch(/setMuted\(preferredFeedMuted\(\)\)/);
    expect(feed).toMatch(/muteAppliedVideoId/);
    expect(feed).toMatch(/activeVideo\?\.id/);
  });

  it("does not persist autoplay rejection as the viewer mute choice", () => {
    const feed = read("app/components/video/VerticalVideoFeed.tsx");
    const autoplayHandler = feed.slice(
      feed.indexOf("const handleAutoplayMuted"),
      feed.indexOf("useEffect", feed.indexOf("const handleAutoplayMuted"))
    );
    expect(autoplayHandler).toMatch(/setMuted\(true\)/);
    expect(autoplayHandler).not.toMatch(/writeFeedUnmutedPreference/);
  });

  it("starts Home/Discover clips from the shared preference", () => {
    const discover = read("app/discover/components/DiscoverNativeVideo.tsx");
    expect(discover).toMatch(/preferredFeedMuted\(\)/);
    expect(discover).toMatch(/playActiveVideo\(video, nextMuted\)/);
    expect(discover).toMatch(/muted=\{muted\}/);
    expect(discover).not.toMatch(/playActiveVideo\(video, true\)/);
  });
});
