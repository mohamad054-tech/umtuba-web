import { describe, expect, it } from "vitest";
import {
  createEmptyWatchSession,
  mergeWatchProgress,
} from "./recordWatchSignal";

describe("recordWatchSignal session helpers", () => {
  it("creates discover/watch sessions with ids", () => {
    const session = createEmptyWatchSession(42, "discover");
    expect(session.postId).toBe(42);
    expect(session.surface).toBe("discover");
    expect(session.sessionId.length).toBeGreaterThanOrEqual(8);
  });

  it("merges progress monotonically and tracks loops", () => {
    const base = createEmptyWatchSession(7, "watch");
    const mid = mergeWatchProgress(base, {
      currentTimeMs: 4000,
      durationMs: 10_000,
      completed: false,
      loopCount: 0,
    });
    expect(mid.watchPercent).toBe(40);
    const done = mergeWatchProgress(mid, {
      currentTimeMs: 2000,
      durationMs: 10_000,
      completed: true,
      loopCount: 2,
    });
    expect(done.watchDurationMs).toBe(4000);
    expect(done.watchPercent).toBe(40);
    expect(done.completed).toBe(true);
    expect(done.rewatchCount).toBe(2);
  });
});
