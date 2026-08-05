/**
 * AI Hub Foundation facade — loads a user-scoped Hub snapshot.
 * Flag-gated. No UI. No conversation/skill/tool execution.
 */

import { randomUUID } from "crypto";
import { AiPlatformError } from "../contracts/errors";
import { isAiUuid } from "../context/envelope";
import {
  aiPersonalizationEngine,
  type AiPersonalizationEngine,
} from "../personalization/engine";
import { getAiHubAssistantEntry } from "./assistantEntry";
import {
  aiHubActivityStore,
  type AiHubActivityStore,
} from "./activity";
import { listAiHubCapabilities } from "./capabilityRegistry";
import { isAiHubEnabled } from "./featureFlag";
import {
  aiHubFavoriteStore,
  type AiHubFavoriteStore,
} from "./favorites";
import { listAiHubNavigation } from "./navigation";
import { buildAiHubRecommendations } from "./recommendations";
import { buildAiHubRuntimeStatus } from "./runtimeStatus";
import type { AiHubSnapshot } from "./types";

export type LoadAiHubSnapshotInput = {
  userId: string;
  /** Test override — default reads UMTUBA_AI_HUB. */
  enabled?: boolean;
  activityStore?: AiHubActivityStore;
  favoriteStore?: AiHubFavoriteStore;
  engine?: AiPersonalizationEngine;
  env?: Record<string, string | undefined>;
};

function emptyDisabledSnapshot(userId: string): AiHubSnapshot {
  return {
    snapshotId: randomUUID(),
    generatedAt: new Date().toISOString(),
    enabled: false,
    navigation: [],
    capabilities: [],
    assistantEntry: null,
    recentActivity: [],
    favorites: [],
    recommendations: [],
    runtimeStatus: buildAiHubRuntimeStatus({
      hubEnabled: false,
      env: undefined,
    }),
    executedConversations: false,
    executedSkills: false,
    executedTools: false,
  };
}

/**
 * Load AI Hub snapshot for an authenticated user.
 * When flag OFF → empty disabled snapshot (fail-closed; no catalog leak required).
 */
export function loadAiHubSnapshot(
  input: LoadAiHubSnapshotInput
): AiHubSnapshot {
  if (!isAiUuid(input.userId)) {
    throw new AiPlatformError("unauthenticated", "Valid user is required.");
  }

  const enabled =
    typeof input.enabled === "boolean"
      ? input.enabled
      : isAiHubEnabled(input.env ? { env: input.env } : {});

  if (!enabled) {
    const snap = emptyDisabledSnapshot(input.userId);
    snap.runtimeStatus = buildAiHubRuntimeStatus({
      hubEnabled: false,
      env: input.env,
    });
    return snap;
  }

  const activityStore = input.activityStore ?? aiHubActivityStore;
  const favoriteStore = input.favoriteStore ?? aiHubFavoriteStore;
  const engine = input.engine ?? aiPersonalizationEngine;

  return {
    snapshotId: randomUUID(),
    generatedAt: new Date().toISOString(),
    enabled: true,
    navigation: listAiHubNavigation(),
    capabilities: listAiHubCapabilities(),
    assistantEntry: getAiHubAssistantEntry(),
    recentActivity: activityStore.listRecent(input.userId, 10),
    favorites: favoriteStore.list(input.userId),
    recommendations: buildAiHubRecommendations({
      userId: input.userId,
      engine,
      limit: 5,
    }),
    runtimeStatus: buildAiHubRuntimeStatus({
      hubEnabled: true,
      env: input.env,
    }),
    executedConversations: false,
    executedSkills: false,
    executedTools: false,
  };
}

export function resetAiHubFoundation(): void {
  aiHubActivityStore.reset();
  aiHubFavoriteStore.reset();
}
