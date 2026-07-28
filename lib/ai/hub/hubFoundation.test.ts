/**
 * UMTUBA AI Hub Foundation V1 — tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { AiPlatformError } from "../contracts/errors";
import { AiPersonalizationEngine } from "../personalization/engine";
import { AI_HUB_MODULE_IDS } from "./types";
import {
  aiHubActivityStore,
  aiHubFavoriteStore,
  getAiHubAssistantEntry,
  isAiHubEnabled,
  listAiHubCapabilities,
  listAiHubNavigation,
  loadAiHubSnapshot,
  resetAiHubFoundation,
} from "./index";

const USER = "11111111-1111-4111-8111-111111111111";

describe("UMTUBA AI Hub Foundation V1", () => {
  beforeEach(() => {
    resetAiHubFoundation();
  });

  it("feature flag defaults OFF", () => {
    expect(isAiHubEnabled({ env: {} })).toBe(false);
    expect(isAiHubEnabled({ env: { UMTUBA_AI_HUB: "0" } })).toBe(false);
    expect(isAiHubEnabled({ env: { UMTUBA_AI_HUB: "1" } })).toBe(true);
    expect(isAiHubEnabled({ env: { UMTUBA_AI_HUB: "true" } })).toBe(true);
  });

  it("navigation includes required Hub modules in stable order", () => {
    const nav = listAiHubNavigation();
    expect(nav.map((n) => n.moduleId)).toEqual([...AI_HUB_MODULE_IDS]);
    expect(nav.map((n) => n.label)).toEqual([
      "AI Assistant",
      "My AI",
      "Learning AI",
      "Creator AI",
      "Commerce AI",
      "Search AI",
      "World AI",
      "Marketing AI",
      "Ads AI",
    ]);
    expect(nav.every((n, i) => n.order === i)).toBe(true);
  });

  it("capability registry lists Core capabilities without provider ownership", () => {
    const caps = listAiHubCapabilities();
    expect(caps.some((c) => c.capabilityId === "assistant.runtime_turn")).toBe(
      true
    );
    expect(
      caps.some((c) => c.capabilityId === "commerce.product_draft_assistant")
    ).toBe(true);
    expect(
      caps.some((c) => c.capabilityId === "platform.diagnostics_probe")
    ).toBe(true);
    expect(caps.every((c) => c.ownsProviderSelection === false)).toBe(true);
    expect(JSON.stringify(caps)).not.toMatch(/apiKey|systemPrompt/i);
  });

  it("assistant entry does not enable chat/skills/tools/conversations", () => {
    const entry = getAiHubAssistantEntry();
    expect(entry.chatEnabled).toBe(false);
    expect(entry.conversationExecutionEnabled).toBe(false);
    expect(entry.skillExecutionEnabled).toBe(false);
    expect(entry.toolExecutionEnabled).toBe(false);
    expect(entry.runtimeCapabilityId).toBe("assistant.runtime_turn");
  });

  it("flag OFF returns disabled empty snapshot (fail-closed)", () => {
    const snap = loadAiHubSnapshot({
      userId: USER,
      enabled: false,
    });
    expect(snap.enabled).toBe(false);
    expect(snap.navigation).toEqual([]);
    expect(snap.capabilities).toEqual([]);
    expect(snap.assistantEntry).toBeNull();
    expect(snap.executedConversations).toBe(false);
    expect(snap.executedSkills).toBe(false);
    expect(snap.executedTools).toBe(false);
    expect(snap.runtimeStatus.hubEnabled).toBe(false);
    expect(snap.runtimeStatus.usedProvidersExposed).toBe(false);
    expect(snap.runtimeStatus.usedModelsExposed).toBe(false);
  });

  it("flag ON loads full Hub snapshot with activity/favorites/recommendations", () => {
    aiHubActivityStore.record({
      userId: USER,
      kind: "capability_run",
      title: "Ran diagnostics probe",
      capabilityId: "platform.diagnostics_probe",
      moduleId: "platform",
    });
    aiHubFavoriteStore.add({
      userId: USER,
      targetType: "module",
      targetId: "assistant",
    });

    const engine = new AiPersonalizationEngine();
    engine.userStore.create({
      userId: USER,
      surfaces: ["commerce"],
      interests: [{ topicId: "checkout", weight: 0.9 }],
    });

    const snap = loadAiHubSnapshot({
      userId: USER,
      enabled: true,
      engine,
      env: { UMTUBA_AI_ASSISTANT_RUNTIME: "0" },
    });

    expect(snap.enabled).toBe(true);
    expect(snap.navigation).toHaveLength(9);
    expect(snap.capabilities.length).toBeGreaterThan(0);
    expect(snap.assistantEntry?.moduleId).toBe("assistant");
    expect(snap.recentActivity).toHaveLength(1);
    expect(snap.favorites).toHaveLength(1);
    expect(snap.recommendations[0]?.contentId).toBe("checkout");
    expect(snap.runtimeStatus.assistantRuntimeFlagHint).toBe("off");
    expect(snap.executedConversations).toBe(false);
    expect(snap.executedSkills).toBe(false);
    expect(snap.executedTools).toBe(false);
  });

  it("activity and favorites are user-scoped and fail-closed on bad identity", () => {
    expect(() =>
      aiHubActivityStore.record({
        userId: "bad",
        kind: "favorite_toggle",
        title: "x",
      })
    ).toThrow(AiPlatformError);
    expect(() => aiHubFavoriteStore.list("bad")).toThrow(AiPlatformError);

    const a = aiHubActivityStore.record({
      userId: USER,
      kind: "assistant_turn",
      title: "Opened assistant entry",
      moduleId: "assistant",
    });
    expect(a.userId).toBe(USER);
    expect(aiHubActivityStore.listRecent(USER, 5)[0]?.activityId).toBe(
      a.activityId
    );
  });

  it("snapshot is deterministic for navigation/capability ids across loads", () => {
    const a = loadAiHubSnapshot({ userId: USER, enabled: true });
    const b = loadAiHubSnapshot({ userId: USER, enabled: true });
    expect(a.navigation.map((n) => n.moduleId)).toEqual(
      b.navigation.map((n) => n.moduleId)
    );
    expect(a.capabilities.map((c) => c.capabilityId)).toEqual(
      b.capabilities.map((c) => c.capabilityId)
    );
  });
});
