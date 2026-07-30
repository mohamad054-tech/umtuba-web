/**
 * AI Hub Capability Registry — catalog of known Core/domain capabilities.
 * Display only. Does not invoke capabilities, skills, or tools.
 */

import { LEARNING_TUTOR_CAPABILITIES } from "../capabilities/learning/tutorRunner";
import { listPromptDefinitions } from "../prompts/registry";
import { ASSISTANT_RUNTIME_CAPABILITY_ID } from "../assistant/runtime/types";
import type { AiHubCapabilityCard, AiHubModuleId } from "./types";

function moduleForCapability(
  capabilityId: string
): AiHubModuleId | "platform" {
  if (capabilityId.startsWith("learning.")) return "learning";
  if (capabilityId.startsWith("commerce.")) return "commerce";
  if (capabilityId.startsWith("assistant.")) return "assistant";
  if (capabilityId.startsWith("creator.")) return "creator";
  if (capabilityId.startsWith("search.")) return "search";
  if (capabilityId.startsWith("world.")) return "world";
  if (capabilityId.startsWith("marketing.")) return "marketing";
  if (capabilityId.startsWith("ads.")) return "ads";
  if (capabilityId.startsWith("platform.")) return "platform";
  return "platform";
}

function titleFor(capabilityId: string): string {
  const leaf = capabilityId.split(".").pop() ?? capabilityId;
  return leaf
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Build capability cards from registered prompts + known domain capability ids.
 */
export function listAiHubCapabilities(): AiHubCapabilityCard[] {
  const byId = new Map<string, AiHubCapabilityCard>();

  for (const prompt of listPromptDefinitions()) {
    const capabilityId = String(prompt.capabilityId);
    const status =
      prompt.status === "active"
        ? "available"
        : prompt.status === "deprecated"
          ? "disabled"
          : "registered";
    byId.set(capabilityId, {
      capabilityId,
      title: titleFor(capabilityId),
      moduleId: moduleForCapability(capabilityId),
      status,
      promptVersion: prompt.version,
      ownsProviderSelection: false,
    });
  }

  for (const capabilityId of LEARNING_TUTOR_CAPABILITIES) {
    if (byId.has(capabilityId)) continue;
    byId.set(capabilityId, {
      capabilityId,
      title: titleFor(capabilityId),
      moduleId: "learning",
      status: "registered",
      promptVersion: null,
      ownsProviderSelection: false,
    });
  }

  if (!byId.has(ASSISTANT_RUNTIME_CAPABILITY_ID)) {
    byId.set(ASSISTANT_RUNTIME_CAPABILITY_ID, {
      capabilityId: ASSISTANT_RUNTIME_CAPABILITY_ID,
      title: "Runtime Turn",
      moduleId: "assistant",
      status: "registered",
      promptVersion: null,
      ownsProviderSelection: false,
    });
  }

  // Placeholder coming-soon cards for Hub modules without Core capabilities yet.
  const comingSoon: Array<{ id: string; moduleId: AiHubModuleId }> = [
    { id: "creator.assist_coming_soon", moduleId: "creator" },
    { id: "search.assist_coming_soon", moduleId: "search" },
    { id: "world.assist_coming_soon", moduleId: "world" },
    { id: "marketing.assist_coming_soon", moduleId: "marketing" },
    { id: "ads.assist_coming_soon", moduleId: "ads" },
    { id: "my_ai.space_coming_soon", moduleId: "my_ai" },
  ];
  for (const item of comingSoon) {
    if (byId.has(item.id)) continue;
    byId.set(item.id, {
      capabilityId: item.id,
      title: titleFor(item.id),
      moduleId: item.moduleId,
      status: "coming_soon",
      promptVersion: null,
      ownsProviderSelection: false,
    });
  }

  return [...byId.values()].sort((a, b) =>
    a.capabilityId.localeCompare(b.capabilityId)
  );
}
