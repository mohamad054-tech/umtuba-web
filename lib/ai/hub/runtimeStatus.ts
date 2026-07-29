/**
 * Hub runtime status — sanitized Core status (no provider internals / secrets).
 */

import { describeAiConfigStatus, loadAiPlatformConfig } from "../config";
import { isAssistantRuntimeEnabled } from "../assistant/runtime/featureFlag";
import type { AiHubRuntimeStatus } from "./types";

export type BuildHubRuntimeStatusInput = {
  hubEnabled: boolean;
  env?: Record<string, string | undefined>;
};

export function buildAiHubRuntimeStatus(
  input: BuildHubRuntimeStatusInput
): AiHubRuntimeStatus {
  const config = loadAiPlatformConfig();
  const status = describeAiConfigStatus(config);
  const assistantOn = isAssistantRuntimeEnabled(
    input.env ? { env: input.env } : {}
  );

  return {
    hubEnabled: input.hubEnabled,
    coreMode: status.mode,
    openaiConfigured: status.openaiConfigured,
    stubEligible: status.stubEligible,
    assistantRuntimeFlagHint: assistantOn ? "on" : "off",
    missingConfigKeys: [...status.missing],
    usedProvidersExposed: false,
    usedModelsExposed: false,
  };
}
