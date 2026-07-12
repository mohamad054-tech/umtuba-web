import { describe, expect, it } from "vitest";
import {
  createMotionRegistry,
  createMotionRunner,
  resolveTimeline,
} from "../../lib/motion";
import {
  getArrivalPhaseOrder,
  isArrivalCardPhase,
  resolveGlobeDestination,
  resolveTravelEndpoints,
  shouldDrawTravelPath,
} from "./handoffArrival";
import {
  postJourneyArrivalSameOriginTransition,
  postJourneyArrivalTransition,
  resolvePostJourneyArrivalTransitionId,
} from "../../motion/transitions/post-journey-arrival";
import type { JourneyHandoffPayload } from "../../lib/journey/handoff";

function makeHandoff(
  city: string,
  country: string,
  matched = true
): JourneyHandoffPayload {
  return {
    version: 1,
    videoId: "v1",
    title: "Demo clip",
    authorName: "Creator",
    location: {
      city,
      country,
      lat: 0,
      lng: 0,
      matchedJourneyCity: matched,
    },
    originRect: null,
    startedAt: Date.now(),
    expiresAt: Date.now() + 120_000,
    entry: "watch",
  };
}

describe("handoffArrival destination resolution", () => {
  it("maps known globe cities", () => {
    const result = resolveGlobeDestination(
      makeHandoff("Istanbul", "Türkiye")
    );
    expect(result.city.name).toBe("Istanbul");
    expect(result.index).toBe(2);
    expect(result.usedFallback).toBe(false);
  });

  it("falls back safely for unknown cities", () => {
    const result = resolveGlobeDestination(
      makeHandoff("Atlantis", "Ocean", false)
    );
    expect(result.city.name).toBe("Jerusalem");
    expect(result.index).toBe(0);
    expect(result.matched).toBe(false);
    expect(result.usedFallback).toBe(true);
  });

  it("falls back safely for null/invalid handoff", () => {
    expect(resolveGlobeDestination(null).city.name).toBe("Jerusalem");
    expect(resolveGlobeDestination(undefined).usedFallback).toBe(true);
  });
});

describe("handoffArrival same-origin travel", () => {
  it("treats Jerusalem (index 0) as same-origin with no path", () => {
    const endpoints = resolveTravelEndpoints(0);
    expect(endpoints.sameOrigin).toBe(true);
    expect(shouldDrawTravelPath(0)).toBe(false);
  });

  it("draws a real inbound segment for later destinations", () => {
    expect(resolveTravelEndpoints(1)).toEqual({
      fromIndex: 0,
      toIndex: 1,
      sameOrigin: false,
    });
    expect(shouldDrawTravelPath(2)).toBe(true);
  });

  it("picks the same-origin transition id when needed", () => {
    expect(resolvePostJourneyArrivalTransitionId(true)).toBe(
      "post-journey-arrival-same-origin"
    );
    expect(resolvePostJourneyArrivalTransitionId(false)).toBe(
      "post-journey-arrival"
    );
  });
});

describe("handoffArrival phase ordering", () => {
  it("orders travel arrival as fade → camera → path → pulse → card → focus_hold", () => {
    expect(getArrivalPhaseOrder({ sameOrigin: false })).toEqual([
      "fade",
      "camera",
      "path",
      "pulse",
      "card",
      "focus_hold",
    ]);

    const timeline = resolveTimeline(postJourneyArrivalTransition, "normal");
    expect(timeline.phases.map((phase) => phase.id)).toEqual(
      getArrivalPhaseOrder({ sameOrigin: false })
    );
  });

  it("omits path for same-origin arrivals", () => {
    expect(getArrivalPhaseOrder({ sameOrigin: true })).toEqual([
      "fade",
      "camera",
      "pulse",
      "card",
      "focus_hold",
    ]);

    const timeline = resolveTimeline(
      postJourneyArrivalSameOriginTransition,
      "normal"
    );
    expect(timeline.phases.map((phase) => phase.id)).toEqual(
      getArrivalPhaseOrder({ sameOrigin: true })
    );
  });

  it("omits path under reduced motion and keeps short durations", () => {
    expect(getArrivalPhaseOrder({ sameOrigin: false, reduced: true })).toEqual([
      "fade",
      "camera",
      "pulse",
      "card",
      "focus_hold",
    ]);

    const timeline = resolveTimeline(postJourneyArrivalTransition, "reduced");
    expect(timeline.phases.map((phase) => phase.id)).toEqual([
      "fade",
      "camera",
      "pulse",
      "card",
      "focus_hold",
    ]);
    expect(timeline.phases[0]?.durationMs).toBe(160);
    expect(timeline.phases[1]?.durationMs).toBe(80);
  });

  it("reveals the destination card only after pulse", () => {
    expect(isArrivalCardPhase("pulse")).toBe(false);
    expect(isArrivalCardPhase("card")).toBe(true);
    expect(isArrivalCardPhase("focus_hold")).toBe(true);
    expect(isArrivalCardPhase("complete")).toBe(true);
  });

  it("runs the full engine sequence in order", async () => {
    const registry = createMotionRegistry([
      postJourneyArrivalTransition,
      postJourneyArrivalSameOriginTransition,
    ]);
    let now = 0;
    let nextId = 1;
    let timers: { id: number; fireAt: number; fn: () => void }[] = [];

    const runner = createMotionRunner({
      registry,
      now: () => now,
      matchMedia: () => ({ matches: false }),
      createRunId: () => "arrival-run",
      setTimeoutFn: (fn, delay) => {
        const id = nextId++;
        timers.push({ id, fireAt: now + delay, fn });
        return id;
      },
      clearTimeoutFn: (id) => {
        timers = timers.filter((timer) => timer.id !== id);
      },
    });

    const phases: string[] = [];
    runner.subscribe((event) => {
      if (event.type === "phase:start") {
        phases.push(event.phaseId);
      }
    });

    const pending = runner.startTransition({
      type: "post-journey-arrival",
      profile: "normal",
    });

    for (let step = 0; step < 40; step += 1) {
      now += 200;
      const due = timers.filter((timer) => timer.fireAt <= now);
      timers = timers.filter((timer) => timer.fireAt > now);
      due.forEach((timer) => timer.fn());
    }

    const result = await pending;
    expect(result.status).toBe("completed");
    expect(phases).toEqual(getArrivalPhaseOrder({ sameOrigin: false }));
  });
});
