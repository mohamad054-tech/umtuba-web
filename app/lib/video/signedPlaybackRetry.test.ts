import { describe, expect, it } from "vitest";
import {
  PLAYBACK_EXPIRED_MESSAGE,
  PLAYBACK_UNAVAILABLE_MESSAGE,
  playbackStatusAfterRemintFailure,
  shouldAutoRemintPlayback,
} from "./signedPlaybackRetry";

describe("signedPlaybackRetry", () => {
  it("allows exactly one auto remint when a post id exists", () => {
    expect(
      shouldAutoRemintPlayback({
        hasPostId: true,
        autoRemintAttempted: false,
      })
    ).toBe(true);
    expect(
      shouldAutoRemintPlayback({
        hasPostId: true,
        autoRemintAttempted: true,
      })
    ).toBe(false);
    expect(
      shouldAutoRemintPlayback({
        hasPostId: false,
        autoRemintAttempted: false,
      })
    ).toBe(false);
  });

  it("maps remint failure to deleted vs expired without technical detail", () => {
    expect(playbackStatusAfterRemintFailure(true)).toBe("deleted");
    expect(playbackStatusAfterRemintFailure(false)).toBe("expired");
    expect(PLAYBACK_EXPIRED_MESSAGE).not.toMatch(/signed|token|jwt|sql/i);
    expect(PLAYBACK_UNAVAILABLE_MESSAGE).not.toMatch(/signed|token|jwt|sql/i);
  });
});
