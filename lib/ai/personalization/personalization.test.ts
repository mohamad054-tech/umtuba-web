import { beforeEach, describe, expect, it } from "vitest";
import { AiPlatformError } from "../contracts/errors";
import { AiCandidateSourceRegistry } from "./candidateSources";
import { AiContentProfileStore } from "./contentProfile";
import { diversityContractSummary, computeDiversityPenalties } from "./diversity";
import {
  AiPersonalizationEngine,
  resetPersonalizationFoundation,
} from "./engine";
import { rankCandidates, scoreCandidate } from "./scoring";
import { validateRecommendationSignal } from "./signals";
import {
  AI_CANDIDATE_SOURCE_IDS,
  AI_RECOMMENDATION_SIGNAL_TYPES,
  createNoopPersonalizationExtensionHooks,
} from "./types";
import { AiUserInterestProfileStore } from "./userInterestProfile";

beforeEach(() => {
  resetPersonalizationFoundation();
});

describe("User Interest Profile Foundation", () => {
  it("creates an interest profile", () => {
    const store = new AiUserInterestProfileStore();
    const profile = store.create({
      userId: "user-1",
      surfaces: ["learning", "commerce"],
      interests: [
        { topicId: "ai", weight: 0.9 },
        { topicId: "design", weight: 0.4 },
      ],
    });
    expect(profile.userId).toBe("user-1");
    expect(profile.interests).toHaveLength(2);
    expect(store.require("user-1").interests[0]?.topicId).toBe("ai");
  });

  it("fail-closed on duplicate profile and invalid weights", () => {
    const store = new AiUserInterestProfileStore();
    store.create({ userId: "user-1" });
    expect(() => store.create({ userId: "user-1" })).toThrow(/already exists/i);
    expect(() =>
      store.create({
        userId: "user-2",
        interests: [{ topicId: "x", weight: 1.5 }],
      })
    ).toThrow(/\[0, 1\]/);
  });
});

describe("Recommendation signal validation", () => {
  it("accepts all foundation signal types", () => {
    for (const signalType of AI_RECOMMENDATION_SIGNAL_TYPES) {
      const signal = validateRecommendationSignal({
        signalId: `s-${signalType}`,
        userId: "u1",
        contentId: "c1",
        signalType,
        strength: 0.5,
        occurredAt: "2026-07-29T00:00:00.000Z",
        surface: "discover",
      });
      expect(signal.signalType).toBe(signalType);
    }
  });

  it("fail-closed on unknown signal type", () => {
    expect(() =>
      validateRecommendationSignal({
        signalId: "s1",
        userId: "u1",
        contentId: "c1",
        signalType: "clickbait" as never,
        strength: 0.5,
        occurredAt: "2026-07-29T00:00:00.000Z",
        surface: "discover",
      })
    ).toThrow(/Unknown recommendation signal/i);
  });
});

describe("Candidate pipeline + ranking + diversity contracts", () => {
  it("collects candidates from registered sources only", async () => {
    const engine = new AiPersonalizationEngine();
    engine.userStore.create({
      userId: "u1",
      interests: [{ topicId: "ai", weight: 1 }],
    });
    engine.contentStore.create({
      contentId: "c1",
      contentType: "item",
      topicIds: ["ai"],
      freshnessScore: 0.8,
      qualityScore: 0.7,
    });
    engine.registerCandidateSource({
      sourceId: "interests",
      async fetchCandidates() {
        return [{ contentId: "c1", sourceId: "interests", baseScore: 0.9 }];
      },
    });
    const result = await engine.recommend({
      userId: "u1",
      surface: "discover",
      limit: 10,
    });
    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0]?.contentId).toBe("c1");
    expect(AI_CANDIDATE_SOURCE_IDS).toContain("interests");
  });

  it("ranking contracts are deterministic", () => {
    const userStore = new AiUserInterestProfileStore();
    const contentStore = new AiContentProfileStore();
    userStore.create({
      userId: "u1",
      interests: [{ topicId: "ai", weight: 1 }],
    });
    contentStore.create({
      contentId: "a",
      contentType: "item",
      topicIds: ["ai"],
      freshnessScore: 0.5,
      qualityScore: 0.5,
    });
    contentStore.create({
      contentId: "b",
      contentType: "item",
      topicIds: ["ai"],
      freshnessScore: 0.5,
      qualityScore: 0.5,
    });
    const candidates = [
      { contentId: "b", sourceId: "new" as const, baseScore: 0.5 },
      { contentId: "a", sourceId: "new" as const, baseScore: 0.5 },
    ];
    const first = rankCandidates({
      candidates,
      userStore,
      contentStore,
      userId: "u1",
    });
    const second = rankCandidates({
      candidates,
      userStore,
      contentStore,
      userId: "u1",
    });
    expect(first.map((r) => r.contentId)).toEqual(
      second.map((r) => r.contentId)
    );
    expect(first[0]?.contentId).toBe("a");
  });

  it("diversity contracts apply penalties for repeated topics", () => {
    const contentStore = new AiContentProfileStore();
    contentStore.create({
      contentId: "c1",
      contentType: "item",
      topicIds: ["ai"],
      creatorId: "creator-1",
    });
    contentStore.create({
      contentId: "c2",
      contentType: "item",
      topicIds: ["ai"],
      creatorId: "creator-1",
    });
    const penalties = computeDiversityPenalties({
      candidates: [
        { contentId: "c1", sourceId: "trending", baseScore: 0.5 },
        { contentId: "c2", sourceId: "trending", baseScore: 0.5 },
      ],
      contentStore,
      penaltyStep: 0.2,
    });
    expect(penalties.get("c1")).toBe(0);
    expect(penalties.get("c2")).toBeGreaterThan(0);
    expect(diversityContractSummary(contentStore.require("c1")).topicKey).toBe(
      "ai"
    );
  });

  it("fail-closed when ranking unknown content", () => {
    const userStore = new AiUserInterestProfileStore();
    const contentStore = new AiContentProfileStore();
    userStore.create({ userId: "u1" });
    expect(() =>
      rankCandidates({
        candidates: [
          { contentId: "missing", sourceId: "new", baseScore: 0.4 },
        ],
        userStore,
        contentStore,
        userId: "u1",
      })
    ).toThrow(/Unknown content profile/i);
  });

  it("fail-closed when recommending without interest profile", async () => {
    const engine = new AiPersonalizationEngine();
    await expect(
      engine.recommend({ userId: "ghost", surface: "search", limit: 5 })
    ).rejects.toThrow(AiPlatformError);
  });

  it("fail-closed on unknown / duplicate candidate sources", () => {
    const registry = new AiCandidateSourceRegistry();
    expect(() =>
      registry.register({
        sourceId: "not-a-source" as never,
        async fetchCandidates() {
          return [];
        },
      })
    ).toThrow(/Unknown candidate source/i);
    registry.register({
      sourceId: "following",
      async fetchCandidates() {
        return [];
      },
    });
    expect(() =>
      registry.register({
        sourceId: "following",
        async fetchCandidates() {
          return [];
        },
      })
    ).toThrow(/already registered/i);
  });

  it("exposes future hooks as noops", () => {
    const hooks = createNoopPersonalizationExtensionHooks();
    expect(hooks.embedContent?.({} as never)).toBeNull();
    expect(hooks.embedUser?.({} as never)).toBeNull();
    expect(hooks.vectorSearch?.([], 1)).toBeNull();
    expect(hooks.semanticSimilarity?.({} as never, {} as never)).toBeNull();
    expect(hooks.recommendationModelScore?.({} as never, {} as never)).toBeNull();
    expect(() => hooks.reinforcementUpdate?.({} as never)).not.toThrow();
  });

  it("scoreCandidate stays within unit interval", () => {
    const userStore = new AiUserInterestProfileStore();
    const contentStore = new AiContentProfileStore();
    const user = userStore.create({
      userId: "u1",
      interests: [{ topicId: "ai", weight: 1 }],
      negativeInterests: [{ topicId: "spam", weight: 1 }],
    });
    const content = contentStore.create({
      contentId: "c1",
      contentType: "item",
      topicIds: ["ai"],
      freshnessScore: 1,
      qualityScore: 1,
    });
    const score = scoreCandidate({
      candidate: { contentId: "c1", sourceId: "similar", baseScore: 1 },
      user,
      content,
      diversityPenalty: 0,
    });
    expect(score.finalScore).toBeGreaterThanOrEqual(0);
    expect(score.finalScore).toBeLessThanOrEqual(1);
  });
});
