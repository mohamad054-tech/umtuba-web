/**
 * Assistant Hub entry — entry contract only (no chat / conversation execution).
 */

import { ASSISTANT_RUNTIME_CAPABILITY_ID } from "../assistant/runtime/types";
import type { AiHubAssistantEntry } from "./types";

export function getAiHubAssistantEntry(): AiHubAssistantEntry {
  return {
    entryId: "assistant.hub_entry",
    moduleId: "assistant",
    runtimeCapabilityId: ASSISTANT_RUNTIME_CAPABILITY_ID,
    chatEnabled: false,
    conversationExecutionEnabled: false,
    skillExecutionEnabled: false,
    toolExecutionEnabled: false,
    label: "AI Assistant",
    description:
      "Official entry to UMTUBA Assistant Runtime. Chat UI and conversation execution are not enabled in Hub Foundation V1.",
  };
}
