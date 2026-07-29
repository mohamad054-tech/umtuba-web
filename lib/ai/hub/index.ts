/**
 * UMTUBA AI Hub Foundation — public exports.
 */

export { isAiHubEnabled } from "./featureFlag";
export { listAiHubNavigation, getAiHubNavItem } from "./navigation";
export { listAiHubCapabilities } from "./capabilityRegistry";
export { getAiHubAssistantEntry } from "./assistantEntry";
export {
  AiHubActivityStore,
  aiHubActivityStore,
} from "./activity";
export {
  AiHubFavoriteStore,
  aiHubFavoriteStore,
} from "./favorites";
export { buildAiHubRecommendations } from "./recommendations";
export { buildAiHubRuntimeStatus } from "./runtimeStatus";
export {
  loadAiHubSnapshot,
  resetAiHubFoundation,
} from "./foundation";
export type { LoadAiHubSnapshotInput } from "./foundation";
export {
  AI_HUB_MODULE_IDS,
  type AiHubModuleId,
  type AiHubNavItem,
  type AiHubCapabilityCard,
  type AiHubAssistantEntry,
  type AiHubActivityItem,
  type AiHubFavoriteItem,
  type AiHubRecommendationItem,
  type AiHubRuntimeStatus,
  type AiHubSnapshot,
} from "./types";
