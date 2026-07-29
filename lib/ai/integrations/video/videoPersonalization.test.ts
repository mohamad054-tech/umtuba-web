import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { AiPersonalizationEngine } from "../../personalization/engine";
import { resetPersonalizationFoundation } from "../../personalization/engine";
import { toVideoRecommendationCandidates } from "./candidateAdapter";
import { toVideoContentProfile } from "./contentProfileAdapter";
import { isVideoPersonalizationIntegrationEnabled } from "./featureFlag";
import { ingestVideoRecommendationSignal } from "./ingest";
import { rankVideoCandidatesForPersonalization } from "./rankingBoundary";
import {
  deriveVideoSignalStrength,
  validateVideoRecommendationSignalInput,
} from "./signalContract";
import {
  VIDEO_RECOMMENDATION_SIGNAL_EVENTS,
  VIDEO_SIGNAL_FORBIDDEN_CLIENT_KEYS,
} from "./types";

beforeEach(() => {
  resetPersonalizationFoundation();
});

function makeEngine() {
  return new AiPersonalizationEngine();
}

describe("feature flag", () => {
  it("is disabled by default", () => {
    expect(isVideoPersonalizationIntegrationEnabled({ env: {} })).toBe(false);
  });

  it("enables only for 1/true", () => {
    expect(
      isVideoPersonalizationIntegrationEnabled({
        env: { UMTUBA_AI_VIDEO_PERSONALIZATION: "1" },
      })
    ).toBe(true);
    expect(
      isVideoPersonalizationIntegrationEnabled({
        env: { UMTUBA_AI_VIDEO_PERSONALIZATION: "true" },
      })
    ).toBe(true);
    expect(
      isVideoPersonalizationIntegrationEnabled({
        env: { UMTUBA_AI_VIDEO_PERSONALIZATION: "yes" },
      })
    ).toBe(false);
  });
});

describe("video signal contract", () => {
  it("accepts every allowlisted signal", () => {
    for (const event of VIDEO_RECOMMENDATION_SIGNAL_EVENTS) {
      const accepted = validateVideoRecommendationSignalInput({
        serverUserId: "user-1",
        raw: {
          event,
          contentId: "post-1",
          progressPercent: event === "watch_progress" ? 40 : undefined,
          surface: "discover",
        },
      });
      expect(accepted.event).toBe(event);
      expect(accepted.userId).toBe("user-1");
      expect(accepted.strength).toBeGreaterThan(0);
      expect(accepted.strength).toBeLessThanOrEqual(1);
    }
  });

  it("rejects unknown signals and forbidden client fields", () => {
    expect(() =>
      validateVideoRecommendationSignalInput({
        serverUserId: "user-1",
        raw: { event: "double_tap_secret", contentId: "p1" },
      })
    ).toThrow(/Unknown video recommendation signal/i);

    for (const key of VIDEO_SIGNAL_FORBIDDEN_CLIENT_KEYS.slice(0, 4)) {
      expect(() =>
        validateVideoRecommendationSignalInput({
          serverUserId: "user-1",
          raw: { event: "like", contentId: "p1", [key]: "x" },
        })
      ).toThrow(/Forbidden client field/i);
    }
  });

  it("requires server-owned user identity", () => {
    expect(() =>
      validateVideoRecommendationSignalInput({
        serverUserId: null,
        raw: { event: "like", contentId: "p1" },
      })
    ).toThrow(/Authentication required/i);
  });

  it("rejects invalid progress and duration", () => {
    expect(() =>
      validateVideoRecommendationSignalInput({
        serverUserId: "u1",
        raw: { event: "watch_progress", contentId: "p1", progressPercent: 140 },
      })
    ).toThrow(/progressPercent/i);

    expect(() =>
      validateVideoRecommendationSignalInput({
        serverUserId: "u1",
        raw: {
          event: "view_start",
          contentId: "p1",
          watchDurationMs: 10_000,
          mediaDurationMs: 1_000,
        },
      })
    ).toThrow(/watchDurationMs exceeds/i);
  });

  it("keeps negative signal strengths bounded", () => {
    expect(deriveVideoSignalStrength("skip", null)).toBeLessThan(0.2);
    expect(deriveVideoSignalStrength("not_interested", null)).toBeLessThan(0.3);
    expect(deriveVideoSignalStrength("like", null)).toBeLessThan(0.5);
  });
});

describe("content + candidate adapters", () => {
  it("maps only provided video metadata", () => {
    const profile = toVideoContentProfile({
      contentId: "42",
      creatorId: "creator-9",
      createdAt: new Date().toISOString(),
      mediaDurationMs: 15000,
      mediaStatus: "ready",
      topicIds: ["travel", "food"],
      language: null,
    });
    expect(profile.contentType).toBe("video");
    expect(profile.creatorId).toBe("creator-9");
    expect(profile.topicIds).toEqual(["food", "travel"]);
    expect(profile.metadata.language).toBeUndefined();
    expect(profile.metadata.mediaDurationMs).toBe(15000);
  });

  it("maps candidates deterministically", () => {
    const a = toVideoRecommendationCandidates([
      { contentId: "b" },
      { contentId: "a" },
    ]);
    const b = toVideoRecommendationCandidates([
      { contentId: "b" },
      { contentId: "a" },
    ]);
    expect(a.map((c) => c.contentId)).toEqual(b.map((c) => c.contentId));
    expect(a[0]?.baseScore).toBeGreaterThan(a[1]!.baseScore);
  });
});

describe("ranking boundary + ingest", () => {
  it("passthrough when disabled — no production behavior change", async () => {
    const engine = makeEngine();
    const result = await rankVideoCandidatesForPersonalization(
      {
        userId: "u1",
        surface: "video_feed",
        candidates: [{ contentId: "1" }, { contentId: "2" }],
        originalOrder: ["1", "2"],
      },
      { engine, enabled: false }
    );
    expect(result.mode).toBe("passthrough");
    expect(result.contentIds).toEqual(["1", "2"]);
    expect(result.reason).toBe("integration_disabled");
  });

  it("fallback when profile/content missing", async () => {
    const engine = makeEngine();
    const missingUser = await rankVideoCandidatesForPersonalization(
      {
        userId: "ghost",
        surface: "discover",
        candidates: [{ contentId: "1" }],
        originalOrder: ["1"],
      },
      { engine, enabled: true }
    );
    expect(missingUser.mode).toBe("passthrough");
    expect(missingUser.reason).toBe("missing_interest_profile");
  });

  it("ranks deterministically when enabled with profiles", async () => {
    const engine = makeEngine();
    engine.userStore.create({
      userId: "u1",
      surfaces: ["video_feed"],
      interests: [{ topicId: "travel", weight: 1 }],
    });
    const meta = [
      {
        contentId: "v-travel",
        creatorId: "c1",
        createdAt: new Date().toISOString(),
        mediaDurationMs: 10000,
        mediaStatus: "ready",
        topicIds: ["travel"],
      },
      {
        contentId: "v-other",
        creatorId: "c2",
        createdAt: new Date().toISOString(),
        mediaDurationMs: 10000,
        mediaStatus: "ready",
        topicIds: ["sports"],
      },
    ];
    const request = {
      userId: "u1",
      surface: "video_feed" as const,
      candidates: [{ contentId: "v-other" }, { contentId: "v-travel" }],
      originalOrder: ["v-other", "v-travel"],
    };
    const first = await rankVideoCandidatesForPersonalization(request, {
      engine,
      enabled: true,
      contentMetadata: meta,
    });
    const second = await rankVideoCandidatesForPersonalization(request, {
      engine,
      enabled: true,
      contentMetadata: meta,
    });
    expect(first.mode).toBe("personalized");
    expect(first.contentIds).toEqual(second.contentIds);
    expect(first.contentIds[0]).toBe("v-travel");
  });

  it("applies diversity penalties across same creator", async () => {
    const engine = makeEngine();
    engine.userStore.create({
      userId: "u1",
      surfaces: ["discover"],
      interests: [{ topicId: "music", weight: 1 }],
    });
    const meta = [
      {
        contentId: "a",
        creatorId: "same",
        createdAt: new Date().toISOString(),
        mediaDurationMs: 5000,
        mediaStatus: "ready",
        topicIds: ["music"],
      },
      {
        contentId: "b",
        creatorId: "same",
        createdAt: new Date().toISOString(),
        mediaDurationMs: 5000,
        mediaStatus: "ready",
        topicIds: ["music"],
      },
    ];
    const result = await rankVideoCandidatesForPersonalization(
      {
        userId: "u1",
        surface: "discover",
        candidates: [
          { contentId: "a", baseScore: 0.9 },
          { contentId: "b", baseScore: 0.9 },
        ],
        originalOrder: ["a", "b"],
      },
      { engine, enabled: true, contentMetadata: meta }
    );
    expect(result.mode).toBe("personalized");
    expect(result.contentIds).toHaveLength(2);
  });

  it("ingest skips when disabled and ingests when enabled", () => {
    const engine = makeEngine();
    const skipped = ingestVideoRecommendationSignal({
      engine,
      serverUserId: "u1",
      enabled: false,
      raw: { event: "like", contentId: "p1" },
    });
    expect(skipped.ok).toBe(true);
    if (skipped.ok) expect(skipped.status).toBe("skipped");

    const ingested = ingestVideoRecommendationSignal({
      engine,
      serverUserId: "u1",
      enabled: true,
      raw: { event: "completion", contentId: "p1", surface: "watch" as never },
    });
    // surface "watch" is invalid — should fail closed
    expect(ingested.ok).toBe(false);

    const ok = ingestVideoRecommendationSignal({
      engine,
      serverUserId: "u1",
      enabled: true,
      raw: { event: "completion", contentId: "p1", surface: "video_feed" },
    });
    expect(ok.ok).toBe(true);
    if (ok.ok && ok.status === "ingested") {
      expect(ok.signal.userId).toBe("u1");
    }
  });

  it("does not leak provider internals in public video integration index", () => {
    const src = readFileSync(
      join(process.cwd(), "lib/ai/integrations/video/index.ts"),
      "utf8"
    );
    expect(src).not.toMatch(/OPENAI|apiKey|providerId|systemInstructions/i);
  });

  it("production feed loader does not import video personalization integration", () => {
    const feed = readFileSync(
      join(process.cwd(), "lib/supabase/videoPostsServer.ts"),
      "utf8"
    );
    expect(feed).not.toMatch(/integrations\/video|rankVideoCandidates/);
    expect(feed).toMatch(/created_at/);
  });
});
