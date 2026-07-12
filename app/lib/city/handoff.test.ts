import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  CITY_HANDOFF_TTL_MS,
  clearCityHandoff,
  consumeCityHandoff,
  createCityHandoff,
  isCityHandoffExpired,
  isValidCityHandoff,
  writeCityHandoff,
  buildCityHref,
  shouldUseRouterBackForCity,
} from "./handoff";
import {
  resolveCityFromSlug,
  cityToSlug,
  findKnownCityBySlug,
} from "./resolveCity";
import {
  buildGlobeToCityHandoff,
  buildGlobeToCityStartOptions,
  getGlobeToCityPhaseOrder,
  resolveCityNavigationHref,
  shouldUnlockGlobeAfterMotionResult,
} from "../../components/globe-to-city/globeToCityMotion";
import {
  createMotionRegistry,
  createMotionRunner,
  resolveTimeline,
} from "../motion";
import { globeToCityTransition } from "../../motion/transitions/globe-to-city";

function createMemoryStorage() {
  const map = new Map<string, string>();

  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("city handoff validation and expiration", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      sessionStorage: createMemoryStorage(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates a well-formed city handoff", () => {
    const payload = createCityHandoff({
      city: "Istanbul",
      country: "Türkiye",
      lat: 41.0082,
      lng: 28.9784,
      source: { videoId: "v1", title: "Clip", authorName: "Lina" },
    });

    expect(isValidCityHandoff(payload)).toBe(true);
    expect(payload.citySlug).toBe("istanbul");
    expect(payload.watchHref).toBe("/watch?id=v1");
  });

  it("rejects invalid payloads", () => {
    expect(isValidCityHandoff(null)).toBe(false);
    expect(isValidCityHandoff({ version: 1, entry: "watch" })).toBe(false);
  });

  it("expires after TTL and consume clears storage", () => {
    const payload = createCityHandoff({
      city: "Berlin",
      country: "Germany",
      lat: 52.52,
      lng: 13.405,
    });

    expect(isCityHandoffExpired(payload, payload.startedAt + 10)).toBe(false);
    expect(
      isCityHandoffExpired(payload, payload.startedAt + CITY_HANDOFF_TTL_MS + 1)
    ).toBe(true);

    writeCityHandoff(payload);
    expect(consumeCityHandoff()?.city).toBe("Berlin");
    expect(consumeCityHandoff()).toBeNull();
    clearCityHandoff();
  });

  it("hides watch href when videoId is missing", () => {
    const payload = createCityHandoff({
      city: "Amman",
      country: "Jordan",
      lat: 31.95,
      lng: 35.91,
    });

    expect(payload.source.videoId).toBeNull();
    expect(payload.watchHref).toBeNull();
  });
});

describe("city resolution", () => {
  it("resolves known globe cities", () => {
    expect(cityToSlug("Jerusalem")).toBe("jerusalem");
    expect(findKnownCityBySlug("istanbul")?.name).toBe("Istanbul");
    const city = resolveCityFromSlug("berlin");
    expect(city.known).toBe(true);
    expect(city.name).toBe("Berlin");
    expect(city.country).toBe("Germany");
  });

  it("falls back safely for unknown slugs", () => {
    const city = resolveCityFromSlug("atlantis-deep");
    expect(city.known).toBe(false);
    expect(city.slug).toBe("atlantis-deep");
    expect(city.name).toContain("Atlantis");
    expect(city.country).toBe("Somewhere on Earth");
  });
});

describe("globe-to-city motion helpers", () => {
  it("uses reduced-motion phase path", () => {
    expect(getGlobeToCityPhaseOrder(true)).toEqual([
      "pause_globe",
      "fade_route",
      "navigate_city",
    ]);

    const timeline = resolveTimeline(globeToCityTransition, "reduced");
    expect(timeline.phases.map((phase) => phase.id)).toEqual([
      "pause_globe",
      "fade_route",
      "navigate_city",
    ]);
    expect(timeline.phases[1]?.durationMs).toBe(160);
  });

  it("builds navigation href and same-route fallback target", () => {
    const handoff = buildGlobeToCityHandoff({
      city: "Istanbul",
      country: "Türkiye",
      lat: 41,
      lng: 29,
      videoId: "v2",
    });

    const href = buildCityHref(handoff);
    expect(href).toContain("/city/istanbul");
    expect(href).toContain("from=globe");
    expect(resolveCityNavigationHref(handoff, "/city/istanbul")).toContain(
      "/city/istanbul"
    );
    expect(shouldUseRouterBackForCity(handoff)).toBe(true);
  });

  it("unlocks after failed or cancelled motion results", () => {
    expect(
      shouldUnlockGlobeAfterMotionResult({
        status: "failed",
        runId: "r1",
        transitionId: "globe-to-city",
        profile: "normal",
      })
    ).toBe(true);
    expect(
      shouldUnlockGlobeAfterMotionResult({
        status: "cancelled",
        runId: "r1",
        transitionId: "globe-to-city",
        profile: "normal",
      })
    ).toBe(true);
    expect(
      shouldUnlockGlobeAfterMotionResult({
        status: "completed",
        runId: "r1",
        transitionId: "globe-to-city",
        profile: "normal",
      })
    ).toBe(false);
  });

  it("runs the engine sequence and recovers unlock policy on failure", async () => {
    const registry = createMotionRegistry([globeToCityTransition]);
    let now = 0;
    let nextId = 1;
    let timers: { id: number; fireAt: number; fn: () => void }[] = [];

    const runner = createMotionRunner({
      registry,
      now: () => now,
      matchMedia: () => ({ matches: false }),
      createRunId: () => "city-run",
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

    const handoff = buildGlobeToCityHandoff({
      city: "Berlin",
      country: "Germany",
      lat: 52.52,
      lng: 13.405,
    });

    const pending = runner.startTransition(
      buildGlobeToCityStartOptions({
        handoff,
        profile: "normal",
        onComplete: () => undefined,
        onFail: () => undefined,
        onCancel: () => undefined,
      })
    );

    for (let step = 0; step < 80; step += 1) {
      now += 50;
      const due = timers
        .filter((timer) => timer.fireAt <= now)
        .sort((a, b) => a.fireAt - b.fireAt);
      timers = timers.filter((timer) => timer.fireAt > now);
      due.forEach((timer) => timer.fn());
    }

    const result = await pending;
    expect(result.status).toBe("completed");
    expect(phases).toEqual(getGlobeToCityPhaseOrder(false));

    const failRunner = createMotionRunner({
      registry,
      now: () => 0,
      matchMedia: () => ({ matches: false }),
      createRunId: () => "fail-run",
    });

    const failResult = await failRunner.startTransition({
      type: "unknown-transition",
      profile: "normal",
    });
    expect(shouldUnlockGlobeAfterMotionResult(failResult)).toBe(true);
  });
});
