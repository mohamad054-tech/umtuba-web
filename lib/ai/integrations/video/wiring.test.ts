import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { resetPersonalizationFoundation } from "../../personalization/engine";
import { resetVideoSignalWiringDedupe } from "./signalDedupe";
import {
  mapWatchSignalToPersonalizationEvents,
  VIDEO_WIRING_AVAILABLE_EVENTS,
  VIDEO_WIRING_UNWIRED_EVENTS,
} from "./watchSignalMapping";
import {
  wireSocialEngagementToPersonalization,
  wireWatchSignalToPersonalization,
} from "./wiring";
import * as ingestMod from "./ingest";

beforeEach(() => {
  resetPersonalizationFoundation();
  resetVideoSignalWiringDedupe();
});

const baseWatch = {
  postId: 42,
  sessionId: "11111111-1111-4111-8111-111111111111",
  surface: "discover" as const,
  watchDurationMs: 5000,
  watchPercent: 55,
  completed: false,
  rewatchCount: 0,
  liked: false,
  saved: false,
  shared: false,
  commented: false,
  followAfterWatch: false,
};

describe("watch signal mapping", () => {
  it("maps available watch fields to personalization events", () => {
    const mapped = mapWatchSignalToPersonalizationEvents({
      ...baseWatch,
      completed: true,
      rewatchCount: 2,
      liked: true,
      saved: true,
      shared: true,
      commented: true,
      followAfterWatch: true,
      skippedEarly: false,
    });
    const events = mapped.map((m) => m.event);
    expect(events).toContain("view_start");
    expect(events).toContain("watch_progress");
    expect(events).toContain("completion");
    expect(events).toContain("replay");
    expect(events).toContain("like");
    expect(events).toContain("save");
    expect(events).toContain("share");
    expect(events).toContain("comment");
    expect(events).toContain("follow_creator");
    expect(events).not.toContain("hide");
    expect(events).not.toContain("report");
  });

  it("maps skip from skippedEarly and does not invent hide/report", () => {
    const mapped = mapWatchSignalToPersonalizationEvents({
      ...baseWatch,
      watchDurationMs: 100,
      watchPercent: 2,
      completed: false,
      skippedEarly: true,
    });
    expect(mapped.map((m) => m.event)).toContain("skip");
    expect(VIDEO_WIRING_UNWIRED_EVENTS).toEqual([
      "hide",
      "not_interested",
      "report",
    ]);
    expect(VIDEO_WIRING_AVAILABLE_EVENTS).toContain("impression");
  });

  it("does not emit replay without rewatch evidence", () => {
    const mapped = mapWatchSignalToPersonalizationEvents({
      ...baseWatch,
      rewatchCount: 0,
    });
    expect(mapped.map((m) => m.event)).not.toContain("replay");
  });

  it("clamps invalid progress via normalizeWatchSignal path", () => {
    const mapped = mapWatchSignalToPersonalizationEvents({
      ...baseWatch,
      watchPercent: 250,
      watchDurationMs: -10,
    });
    const progress = mapped.find((m) => m.event === "watch_progress");
    expect(progress?.raw.progressPercent).toBe(100);
    expect(progress?.raw.watchDurationMs).toBe(0);
  });
});

describe("wiring flag / identity / dedupe / isolation", () => {
  it("flag OFF is no-op", () => {
    const summary = wireWatchSignalToPersonalization({
      watchSignal: baseWatch,
      serverUserId: "user-1",
      enabled: false,
    });
    expect(summary.ingested).toBe(0);
    expect(summary.attempted).toBe(0);
  });

  it("requires server identity", () => {
    const summary = wireWatchSignalToPersonalization({
      watchSignal: baseWatch,
      serverUserId: null,
      enabled: true,
    });
    expect(summary.ingested).toBe(0);
    expect(summary.skipped).toBeGreaterThan(0);
  });

  it("ingests when flag ON with auth user", () => {
    const summary = wireWatchSignalToPersonalization({
      watchSignal: { ...baseWatch, completed: true },
      serverUserId: "user-1",
      enabled: true,
    });
    expect(summary.ingested).toBeGreaterThan(0);
  });

  it("suppresses duplicate watch session events", () => {
    const first = wireWatchSignalToPersonalization({
      watchSignal: baseWatch,
      serverUserId: "user-1",
      enabled: true,
    });
    const second = wireWatchSignalToPersonalization({
      watchSignal: baseWatch,
      serverUserId: "user-1",
      enabled: true,
    });
    expect(first.ingested).toBeGreaterThan(0);
    expect(second.ingested).toBe(0);
    expect(second.skipped).toBeGreaterThan(0);
  });

  it("social wiring uses server user and dedupes", () => {
    const a = wireSocialEngagementToPersonalization({
      event: "like",
      contentId: "99",
      serverUserId: "user-1",
      enabled: true,
    });
    const b = wireSocialEngagementToPersonalization({
      event: "like",
      contentId: "99",
      serverUserId: "user-1",
      enabled: true,
    });
    expect(a.ingested).toBe(1);
    expect(b.ingested).toBe(0);
  });

  it("ingest failure does not throw from wiring", () => {
    const spy = vi
      .spyOn(ingestMod, "ingestVideoRecommendationSignal")
      .mockImplementation(() => {
        throw new Error("boom");
      });
    expect(() =>
      wireWatchSignalToPersonalization({
        watchSignal: baseWatch,
        serverUserId: "user-1",
        enabled: true,
      })
    ).not.toThrow();
    spy.mockRestore();
  });

  it("feed loader still has no ranking wiring", () => {
    const feed = readFileSync(
      join(process.cwd(), "lib/supabase/videoPostsServer.ts"),
      "utf8"
    );
    expect(feed).not.toMatch(/wireWatchSignal|rankVideoCandidates/);
    expect(feed).toMatch(/created_at/);
  });

  it("recommendations action wires after success without ranking", () => {
    const src = readFileSync(
      join(process.cwd(), "app/actions/recommendations.ts"),
      "utf8"
    );
    expect(src).toMatch(/wireWatchSignalToPersonalization/);
    expect(src).not.toMatch(/rankVideoCandidatesForPersonalization/);
    expect(src).not.toMatch(/OPENAI|apiKey|providerId/i);
  });
});
