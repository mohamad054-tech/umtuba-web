/**
 * UMTUBA AI Hub Foundation V1 — contracts.
 * Product-facing AI entry map. No UI. No DB. No providers.
 */

export const AI_HUB_MODULE_IDS = [
  "assistant",
  "my_ai",
  "learning",
  "creator",
  "commerce",
  "search",
  "world",
  "marketing",
  "ads",
] as const;
export type AiHubModuleId = (typeof AI_HUB_MODULE_IDS)[number];

export type AiHubNavItem = {
  moduleId: AiHubModuleId;
  label: string;
  description: string;
  /** Stable route key for future UI — not an App Router page in V1. */
  entryKey: string;
  enabled: boolean;
  order: number;
};

export type AiHubCapabilityStatus =
  | "available"
  | "registered"
  | "disabled"
  | "coming_soon";

export type AiHubCapabilityCard = {
  capabilityId: string;
  title: string;
  moduleId: AiHubModuleId | "platform";
  status: AiHubCapabilityStatus;
  /** Prompt version when known — never system prompt text. */
  promptVersion: string | null;
  /** Hub must never expose provider/model selection. */
  ownsProviderSelection: false;
};

export type AiHubAssistantEntry = {
  entryId: "assistant.hub_entry";
  moduleId: "assistant";
  /** Points at Assistant Runtime — does not start a conversation. */
  runtimeCapabilityId: "assistant.runtime_turn";
  chatEnabled: false;
  conversationExecutionEnabled: false;
  skillExecutionEnabled: false;
  toolExecutionEnabled: false;
  label: string;
  description: string;
};

export type AiHubActivityKind =
  | "capability_run"
  | "assistant_turn"
  | "recommendation_view"
  | "favorite_toggle";

export type AiHubActivityItem = {
  activityId: string;
  userId: string;
  kind: AiHubActivityKind;
  capabilityId: string | null;
  moduleId: AiHubModuleId | "platform" | null;
  title: string;
  occurredAt: string;
};

export type AiHubFavoriteItem = {
  favoriteId: string;
  userId: string;
  targetType: "capability" | "module" | "assistant_entry";
  targetId: string;
  createdAt: string;
};

export type AiHubRecommendationItem = {
  recommendationId: string;
  contentId: string;
  moduleId: AiHubModuleId | "platform";
  title: string;
  score: number;
  reasons: string[];
};

export type AiHubRuntimeStatus = {
  hubEnabled: boolean;
  coreMode: "disabled" | "live" | "stub";
  openaiConfigured: boolean;
  geminiConfigured: boolean;
  anthropicConfigured: boolean;
  stubEligible: boolean;
  assistantRuntimeFlagHint: "on" | "off" | "unknown";
  /** Sanitized missing config keys only — never secret values. */
  missingConfigKeys: string[];
  usedProvidersExposed: false;
  usedModelsExposed: false;
};

export type AiHubSnapshot = {
  snapshotId: string;
  generatedAt: string;
  enabled: boolean;
  navigation: AiHubNavItem[];
  capabilities: AiHubCapabilityCard[];
  assistantEntry: AiHubAssistantEntry | null;
  recentActivity: AiHubActivityItem[];
  favorites: AiHubFavoriteItem[];
  recommendations: AiHubRecommendationItem[];
  runtimeStatus: AiHubRuntimeStatus;
  /** Explicit V1 non-goals. */
  executedConversations: false;
  executedSkills: false;
  executedTools: false;
};
