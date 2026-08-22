import { describe, expect, it, vi } from "vitest";
import { playActiveVideo } from "./playActiveVideo";

function fakeVideo(options: {
  play: () => Promise<void>;
  muted?: boolean;
}) {
  return {
    muted: options.muted ?? false,
    play: options.play,
  };
}

describe("playActiveVideo", () => {
  it("plays with the requested mute flag", async () => {
    const video = fakeVideo({ play: vi.fn().mockResolvedValue(undefined) });
    await expect(playActiveVideo(video, true)).resolves.toBe("played");
    expect(video.muted).toBe(true);
    expect(video.play).toHaveBeenCalledTimes(1);
  });

  it("falls back to muted autoplay when unmuted play is blocked", async () => {
    const play = vi
      .fn()
      .mockRejectedValueOnce(new Error("NotAllowedError"))
      .mockResolvedValueOnce(undefined);
    const video = fakeVideo({ play, muted: false });
    await expect(playActiveVideo(video, false)).resolves.toBe("muted_fallback");
    expect(video.muted).toBe(true);
    expect(play).toHaveBeenCalledTimes(2);
  });

  it("reports blocked when even muted autoplay fails", async () => {
    const video = fakeVideo({
      play: vi.fn().mockRejectedValue(new Error("NotAllowedError")),
    });
    await expect(playActiveVideo(video, true)).resolves.toBe("blocked");
    expect(video.muted).toBe(true);
  });
});
