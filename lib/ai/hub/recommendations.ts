/**
 * Hub recommendations — contracts over Personalization Foundation.
 * Does not execute tools/skills; returns bounded recommendation cards.
 */

import { randomUUID } from "crypto";
import { AiPlatformError } from "../contracts/errors";
import { isAiUuid } from "../context/envelope";
import {
  aiPersonalizationEngine,
  type AiPersonalizationEngine,
} from "../personalization/engine";
import type { AiProductSurface } from "../personalization/types";
import type { AiHubModuleId, AiHubRecommendationItem } from "./types";

function moduleFromSurface(
  surface: AiProductSurface
): AiHubModuleId | "platform" {
  switch (surface) {
    case "learning":
      return "learning";
    case "commerce":
      return "commerce";
    case "creator":
      return "creator";
    case "ads":
      return "ads";
    case "world":
      return "world";
    case "search":
      return "search";
    case "video_feed":
    case "discover":
      return "assistant";
    default:
      return "platform";
  }
}

export type BuildHubRecommendationsInput = {
  userId: string;
  surface?: AiProductSurface;
  engine?: AiPersonalizationEngine;
  limit?: number;
};

/**
 * Build hub-facing recommendation cards from personalization ranking when
 * candidates/profiles exist; otherwise return an empty deterministic list.
 */
export function buildAiHubRecommendations(
  input: BuildHubRecommendationsInput
): AiHubRecommendationItem[] {
  if (!isAiUuid(input.userId)) {
    throw new AiPlatformError("unauthenticated", "Valid user is required.");
  }
  const engine = input.engine ?? aiPersonalizationEngine;
  const surface = input.surface ?? "platform";
  const limit =
    Number.isFinite(input.limit) && (input.limit ?? 0) > 0
      ? Math.min(Math.floor(input.limit!), 20)
      : 5;

  const profile = engine.userStore.get(input.userId);
  if (!profile) {
    return [];
  }

  // Prefer interest topics as lightweight hub recommendations when no ranked
  // candidates are available — still personalization-backed, no RAG/tools.
  const fromInterests: AiHubRecommendationItem[] = profile.interests
    .slice()
    .sort((a, b) => {
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.topicId.localeCompare(b.topicId);
    })
    .slice(0, limit)
    .map((topic) => ({
      recommendationId: randomUUID(),
      contentId: topic.topicId,
      moduleId: moduleFromSurface(surface),
      title: `Explore: ${topic.topicId}`,
      score: topic.weight,
      reasons: ["personalization_interest"],
    }));

  return fromInterests;
}
