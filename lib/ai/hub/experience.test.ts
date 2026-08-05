/**
 * AI Hub Experience Foundation V1 — tests.
 */

import { describe, expect, it } from "vitest";
import { AI_HUB_MODULE_IDS } from "./types";
import {
  AI_HUB_EXPERIENCE_ROUTES,
  isAiHubExperienceAvailable,
  toAiHubHomeViewModel,
} from "./experience";
import type { AiHubSnapshot } from "./types";

function sampleSnapshot(enabled: boolean): AiHubSnapshot {
  return {
    snapshotId: "snap",
    generatedAt: new Date().toISOString(),
    enabled,
    navigation: AI_HUB_MODULE_IDS.map((moduleId, order) => ({
      moduleId,
      label: moduleId,
      description: moduleId,
      entryKey: `hub.${moduleId}`,
      enabled: true,
      order,
    })),
    capabilities: [],
    assistantEntry: enabled
      ? {
          entryId: "assistant.hub_entry",
          moduleId: "assistant",
          runtimeCapabilityId: "assistant.runtime_turn",
          chatEnabled: false,
          conversationExecutionEnabled: false,
          skillExecutionEnabled: false,
          toolExecutionEnabled: false,
          label: "AI Assistant",
          description: "Entry only",
        }
      : null,
    recentActivity: [],
    favorites: [],
    recommendations: [],
    runtimeStatus: {
      hubEnabled: enabled,
      coreMode: "stub",
      openaiConfigured: false,
      geminiConfigured: false,
      anthropicConfigured: false,
      localConfigured: false,
      stubEligible: true,
      assistantRuntimeFlagHint: "off",
      missingConfigKeys: [],
      usedProvidersExposed: false,
      usedModelsExposed: false,
    },
    executedConversations: false,
    executedSkills: false,
    executedTools: false,
  };
}

describe("AI Hub Experience Foundation V1", () => {
  it("experience availability follows UMTUBA_AI_HUB (default OFF)", () => {
    expect(isAiHubExperienceAvailable({ env: {} })).toBe(false);
    expect(
      isAiHubExperienceAvailable({ env: { UMTUBA_AI_HUB: "1" } })
    ).toBe(true);
  });

  it("exposes isolated Hub routes (not product Home/App Shell)", () => {
    expect(AI_HUB_EXPERIENCE_ROUTES.home).toBe("/ai-hub");
    expect(AI_HUB_EXPERIENCE_ROUTES.assistant).toBe("/ai-hub/assistant");
  });

  it("maps enabled snapshot to home view model with all modules", () => {
    const model = toAiHubHomeViewModel(sampleSnapshot(true));
    expect(model).not.toBeNull();
    expect(model!.navigation.map((n) => n.moduleId)).toEqual([
      ...AI_HUB_MODULE_IDS,
    ]);
    expect(model!.assistantEntry.chatEnabled).toBe(false);
    expect(model!.assistantEntry.conversationExecutionEnabled).toBe(false);
    expect(model!.assistantEntry.skillExecutionEnabled).toBe(false);
    expect(model!.assistantEntry.toolExecutionEnabled).toBe(false);
    expect(model!.runtimeStatus.usedProvidersExposed).toBe(false);
  });

  it("fail-closes view model when Hub snapshot disabled", () => {
    expect(toAiHubHomeViewModel(sampleSnapshot(false))).toBeNull();
  });
});
