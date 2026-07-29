/**
 * Video ranking boundary — uses Personalization scoring/diversity only.
 * When disabled or data missing → passthrough original order (no production change).
 */

import type { AiPersonalizationEngine } from "../../personalization/engine";
import { AiContentProfileStore } from "../../personalization/contentProfile";
import { computeDiversityPenalties } from "../../personalization/diversity";
import { rankCandidates } from "../../personalization/scoring";
import { AiUserInterestProfileStore } from "../../personalization/userInterestProfile";
import { toVideoRecommendationCandidates } from "./candidateAdapter";
import { toVideoContentProfile } from "./contentProfileAdapter";
import { isVideoPersonalizationIntegrationEnabled } from "./featureFlag";
import type {
  VideoContentMetadata,
  VideoRankRequest,
  VideoRankResult,
} from "./types";

export type VideoRankBoundaryDeps = {
  engine: AiPersonalizationEngine;
  enabled?: boolean;
  /** Optional content metadata to register before ranking. */
  contentMetadata?: VideoContentMetadata[];
};

/**
 * Rank video candidates via Shared Personalization contracts.
 * Never mutates production feed loaders — caller decides whether to apply.
 */
export async function rankVideoCandidatesForPersonalization(
  request: VideoRankRequest,
  deps: VideoRankBoundaryDeps
): Promise<VideoRankResult> {
  const enabled =
    typeof deps.enabled === "boolean"
      ? deps.enabled
      : isVideoPersonalizationIntegrationEnabled();

  const original = sanitizeOrder(request.originalOrder);
  if (!enabled) {
    return {
      contentIds: original,
      mode: "passthrough",
      reason: "integration_disabled",
    };
  }

  if (!request.userId?.trim()) {
    return {
      contentIds: original,
      mode: "passthrough",
      reason: "missing_user",
    };
  }

  if (request.candidates.length === 0) {
    return {
      contentIds: original,
      mode: "passthrough",
      reason: "empty_candidates",
    };
  }

  if (!deps.engine.userStore.get(request.userId)) {
    return {
      contentIds: original,
      mode: "passthrough",
      reason: "missing_interest_profile",
    };
  }

  for (const meta of deps.contentMetadata ?? []) {
    const profile = toVideoContentProfile(meta);
    if (!deps.engine.contentStore.get(profile.contentId)) {
      deps.engine.contentStore.create({
        contentId: profile.contentId,
        contentType: profile.contentType,
        topicIds: profile.topicIds,
        creatorId: profile.creatorId,
        freshnessScore: profile.freshnessScore,
        qualityScore: profile.qualityScore,
        metadata: profile.metadata,
      });
    }
  }

  let candidates;
  try {
    candidates = toVideoRecommendationCandidates(request.candidates);
  } catch {
    return {
      contentIds: original,
      mode: "passthrough",
      reason: "invalid_candidates",
    };
  }

  for (const c of candidates) {
    if (!deps.engine.contentStore.get(c.contentId)) {
      return {
        contentIds: original,
        mode: "passthrough",
        reason: "missing_content_profile",
      };
    }
  }

  try {
    const diversityPenaltyByContentId = computeDiversityPenalties({
      candidates,
      contentStore: deps.engine.contentStore,
    });
    const rankedRows = rankCandidates({
      candidates,
      userStore: deps.engine.userStore,
      contentStore: deps.engine.contentStore,
      userId: request.userId,
      diversityPenaltyByContentId,
    });
    const limit = request.limit ?? rankedRows.length;
    const ranked = rankedRows.slice(0, limit).map((r) => r.contentId);
    if (ranked.length === 0) {
      return {
        contentIds: original,
        mode: "passthrough",
        reason: "empty_rank_result",
      };
    }
    const seen = new Set(ranked);
    for (const id of original) {
      if (!seen.has(id)) ranked.push(id);
    }
    return {
      contentIds: ranked,
      mode: "personalized",
      reason: "personalization_engine",
    };
  } catch {
    return {
      contentIds: original,
      mode: "passthrough",
      reason: "rank_failed_fallback",
    };
  }
}

function sanitizeOrder(order: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of order) {
    const trimmed = typeof id === "string" ? id.trim() : "";
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function createIsolatedVideoRankStores(): {
  userStore: AiUserInterestProfileStore;
  contentStore: AiContentProfileStore;
} {
  return {
    userStore: new AiUserInterestProfileStore(),
    contentStore: new AiContentProfileStore(),
  };
}
