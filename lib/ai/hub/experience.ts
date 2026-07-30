/**
 * AI Hub Experience Foundation — routes + access helpers (no product App Shell).
 */

import { isAiHubEnabled, type AiHubFlagSource } from "./featureFlag";
import type {
  AiHubActivityItem,
  AiHubAssistantEntry,
  AiHubCapabilityCard,
  AiHubFavoriteItem,
  AiHubNavItem,
  AiHubRecommendationItem,
  AiHubRuntimeStatus,
  AiHubSnapshot,
} from "./types";

export const AI_HUB_EXPERIENCE_ROUTES = {
  home: "/ai-hub",
  assistant: "/ai-hub/assistant",
} as const;

export type AiHubHomeViewModel = {
  navigation: AiHubNavItem[];
  capabilities: AiHubCapabilityCard[];
  assistantEntry: AiHubAssistantEntry;
  recentActivity: AiHubActivityItem[];
  favorites: AiHubFavoriteItem[];
  recommendations: AiHubRecommendationItem[];
  runtimeStatus: AiHubRuntimeStatus;
};

/**
 * Experience is available only when UMTUBA_AI_HUB is ON.
 * Default OFF → production behavior unchanged (route should 404).
 */
export function isAiHubExperienceAvailable(
  source: AiHubFlagSource = {}
): boolean {
  return isAiHubEnabled(source);
}

/**
 * Map a enabled Hub snapshot into a home view model.
 * Fail-closed if assistant entry missing while enabled.
 */
export function toAiHubHomeViewModel(
  snapshot: AiHubSnapshot
): AiHubHomeViewModel | null {
  if (!snapshot.enabled || !snapshot.assistantEntry) {
    return null;
  }
  return {
    navigation: snapshot.navigation,
    capabilities: snapshot.capabilities,
    assistantEntry: snapshot.assistantEntry,
    recentActivity: snapshot.recentActivity,
    favorites: snapshot.favorites,
    recommendations: snapshot.recommendations,
    runtimeStatus: snapshot.runtimeStatus,
  };
}
