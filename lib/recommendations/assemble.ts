import { applyDiversityAndExploration } from "./diversity";
import { scoreRecommendationCandidates } from "./scoring";
import { DEFAULT_DIVERSITY_POLICY } from "./weights";
import type {
  DiversityPolicy,
  RecommendationCandidate,
  RecommendationScoreContext,
  ScoredCandidate,
} from "./types";

export type AssembledRecommendationPage = {
  items: ScoredCandidate[];
  scoredCount: number;
  explorationCount: number;
  uniqueCreators: number;
};

/**
 * Score → diversity → exploration pipeline for a candidate pool.
 * Does not load posts or change Discover/Watch chronological APIs.
 */
export function assembleRecommendationPage(input: {
  candidates: RecommendationCandidate[];
  context: RecommendationScoreContext;
  pageSize: number;
  policy?: DiversityPolicy;
}): AssembledRecommendationPage {
  const policy = input.policy ?? DEFAULT_DIVERSITY_POLICY;
  const scored = scoreRecommendationCandidates(
    input.candidates,
    input.context
  );
  const items = applyDiversityAndExploration(
    scored,
    input.pageSize,
    policy
  );
  const creators = new Set(items.map((i) => i.creatorId));

  return {
    items,
    scoredCount: scored.length,
    explorationCount: items.filter((i) => i.isExploration).length,
    uniqueCreators: creators.size,
  };
}
