/**
 * Diversity Layer Foundation — contract-level penalties only.
 */

import type { AiContentProfile } from "./types";
import type { AiRecommendationCandidate } from "./types";
import type { AiContentProfileStore } from "./contentProfile";

/**
 * Applies a simple topic/creator diversity penalty for near-duplicates
 * already selected earlier in the candidate list (by input order).
 * Not a production diversity algorithm — Foundation contract only.
 */
export function computeDiversityPenalties(input: {
  candidates: AiRecommendationCandidate[];
  contentStore: AiContentProfileStore;
  /** Max penalty per collision in [0, 1]. */
  penaltyStep?: number;
}): Map<string, number> {
  const penaltyStep = input.penaltyStep ?? 0.1;
  const penalties = new Map<string, number>();
  const seenTopics = new Set<string>();
  const seenCreators = new Set<string>();

  for (const candidate of input.candidates) {
    const content = input.contentStore.get(candidate.contentId);
    if (!content) {
      penalties.set(candidate.contentId, 0);
      continue;
    }
    let penalty = 0;
    for (const topicId of content.topicIds) {
      if (seenTopics.has(topicId)) penalty += penaltyStep;
    }
    if (content.creatorId && seenCreators.has(content.creatorId)) {
      penalty += penaltyStep;
    }
    penalties.set(candidate.contentId, Math.min(1, penalty));
    for (const topicId of content.topicIds) seenTopics.add(topicId);
    if (content.creatorId) seenCreators.add(content.creatorId);
  }
  return penalties;
}

export function diversityContractSummary(
  content: AiContentProfile
): { topicKey: string; creatorKey: string } {
  return {
    topicKey: content.topicIds.slice().sort().join("|") || "none",
    creatorKey: content.creatorId ?? "none",
  };
}
