/**
 * Beta productization gates for AI-branded surfaces.
 * Default fail-closed: no AI product UI while Hub + Assistant Runtime are OFF.
 */

import { isAiHubEnabled, type AiHubFlagSource } from "./hub/featureFlag";
import {
  isAssistantRuntimeEnabled,
  type AssistantRuntimeFlagSource,
} from "./assistant/runtime/featureFlag";

export type AiProductSurfaceFlagSource = AiHubFlagSource &
  AssistantRuntimeFlagSource;

/**
 * True only when at least one AI product surface flag is ON.
 * Learning tutor / Hub-adjacent UI must not claim AI when this is false.
 */
export function isAiProductExperienceEnabled(
  source: AiProductSurfaceFlagSource = {}
): boolean {
  return isAiHubEnabled(source) || isAssistantRuntimeEnabled(source);
}
