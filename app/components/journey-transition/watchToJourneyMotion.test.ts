import { describe, expect, it, vi } from "vitest";
import {
  createMotionRegistry,
  createMotionRunner,
  resolveTimeline,
  type MotionTransitionResult,
} from "../../lib/motion";
import { watchToJourneyTransition } from "../../motion/transitions/watch-to-journey";
import {
  buildWatchToJourneyStartOptions,
  getWatchToJourneyHardFallbackMs,
  mapEnginePhaseToOverlayPhase,
  resolveWatchToJourneyProfile,
  shouldUnlockWatchAfterMotionResult,
} from "./watchToJourneyMotion";
import type { JourneyHandoffPayload } from "../../lib/journey/handoff";

const sampleHandoff: JourneyHandoffPayload = {
  version: 1,
  videoId: "v1",
  title: "Bloom in motion",
  authorName: "Lina Haddad",
  location: {
    city: "Jerusalem",
    country: "Palestine",
    lat: 31.7683,
    lng: 35.2137,
    matchedJourneyCity: true,
  },
  originRect: null,
  startedAt: Date.now(),
  expiresAt: Date.now() + 120_000,
  entry: "watch",
};

describe("watch-to-journey motion adapter", () => {
  it("maps engine phases to overlay phases", () => {
    expect(mapEnginePhaseToOverlayPhase("zoom_out_stage")).toBe(
      "zoom_out_stage"
    );
    expect(mapEnginePhaseToOverlayPhase("unknown")).toBe("fade_ui");
  });

  it("resolves reduced-motion profile from OS preference", () => {
    expect(
      resolveWatchToJourneyProfile(() => ({ matches: true }))
    ).toBe("reduced");
    expect(
      resolveWatchToJourneyProfile(() => ({ matches: false }))
    ).toBe("normal");
  });

  it("uses reduced phase set and durations for parity", () => {
    const timeline = resolveTimeline(watchToJourneyTransition, "reduced");
    expect(timeline.phases.map((phase) => phase.id)).toEqual([
      "pause_video",
      "fade_ui",
      "navigate_handoff",
    ]);
    expect(timeline.phases.map((phase) => phase.durationMs)).toEqual([
      40, 180, 40,
    ]);
  });

  it("completes a successful watch-to-journey engine transition", async () => {
    const registry = createMotionRegistry([watchToJourneyTransition]);
    let now = 0;
    let nextId = 1;
    let timers: { id: number; fireAt: number; fn: () => void }[] = [];

    const runner = createMotionRunner({
      registry,
      now: () => now,
      matchMedia: () => ({ matches: false }),
      createRunId: () => "run-success",
      setTimeoutFn: (fn, delay) => {
        const id = nextId++;
        timers.push({ id, fireAt: now + delay, fn });
        return id;
      },
      clearTimeoutFn: (id) => {
        timers = timers.filter((timer) => timer.id !== id);
      },
    });

    const onComplete = vi.fn();
    const pending = runner.startTransition(
      buildWatchToJourneyStartOptions({
        handoff: sampleHandoff,
        profile: "normal",
        onComplete,
        onFail: vi.fn(),
        onCancel: vi.fn(),
      })
    );

    const flush = (ms: number) => {
      const target = now + ms;
      while (true) {
        const due = timers
          .filter((timer) => timer.fireAt <= target)
          .sort((a, b) => a.fireAt - b.fireAt);
        if (!due.length) {
          now = target;
          break;
        }
        const next = due[0];
        timers = timers.filter((timer) => timer.id !== next.id);
        now = next.fireAt;
        next.fn();
      }
    };

    flush(5000);
    const result = await pending;
    expect(result.status).toBe("completed");
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("rejects concurrent watch-to-journey starts", async () => {
    const registry = createMotionRegistry([watchToJourneyTransition]);
    const runner = createMotionRunner({
      registry,
      matchMedia: () => ({ matches: false }),
      setTimeoutFn: () => 1,
      clearTimeoutFn: () => undefined,
    });

    void runner.startTransition(
      buildWatchToJourneyStartOptions({
        handoff: sampleHandoff,
        profile: "normal",
        onComplete: vi.fn(),
        onFail: vi.fn(),
        onCancel: vi.fn(),
      })
    );

    const second = await runner.startTransition(
      buildWatchToJourneyStartOptions({
        handoff: sampleHandoff,
        profile: "normal",
        onComplete: vi.fn(),
        onFail: vi.fn(),
        onCancel: vi.fn(),
      })
    );

    expect(second.status).toBe("failed");
    expect(second.error?.code).toBe("CONCURRENT_REJECTED");
    expect(shouldUnlockWatchAfterMotionResult(second)).toBe(true);
    runner.cancel();
  });

  it("treats navigation completion callback as success path", () => {
    const navigated: string[] = [];
    const options = buildWatchToJourneyStartOptions({
      handoff: sampleHandoff,
      profile: "normal",
      onComplete: () => navigated.push("go"),
      onFail: vi.fn(),
      onCancel: vi.fn(),
    });

    options.onComplete?.();
    expect(navigated).toEqual(["go"]);
  });

  it("unlocks watch UI after failure or cancel results", () => {
    const failed: MotionTransitionResult = {
      status: "failed",
      runId: "r1",
      transitionId: "watch-to-journey",
      profile: "normal",
    };
    const cancelled: MotionTransitionResult = {
      status: "cancelled",
      runId: "r2",
      transitionId: "watch-to-journey",
      profile: "normal",
    };
    const completed: MotionTransitionResult = {
      status: "completed",
      runId: "r3",
      transitionId: "watch-to-journey",
      profile: "normal",
    };

    expect(shouldUnlockWatchAfterMotionResult(failed)).toBe(true);
    expect(shouldUnlockWatchAfterMotionResult(cancelled)).toBe(true);
    expect(shouldUnlockWatchAfterMotionResult(completed)).toBe(false);
  });

  it("keeps hard fallback bounds aligned with reduced and normal paths", () => {
    expect(getWatchToJourneyHardFallbackMs(true)).toBe(40 + 180 + 40 + 400);
    expect(getWatchToJourneyHardFallbackMs(false)).toBe(
      80 + 320 + 520 + 480 + 40 + 400
    );
  });
});
