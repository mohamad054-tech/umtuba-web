/**
 * Recommendation scoring + ranking pipeline contracts.
 * Foundation only — no production ML algorithm.
 */

import { AiPlatformError } from "../contracts/errors";
import type { AiContentProfileStore } from "./contentProfile";
import type { AiUserInterestProfileStore } from "./userInterestProfile";
import type {
  AiContentProfile,
  AiPersonalizationExtensionHooks,
  AiRankedRecommendation,
  AiRecommendationCandidate,
  AiRecommendationScore,
  AiUserInterestProfile,
} from "./types";
import { createNoopPersonalizationExtensionHooks } from "./types";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

export function computeInterestScore(
  user: AiUserInterestProfile,
  content: AiContentProfile
): number {
  if (content.topicIds.length === 0 || user.interests.length === 0) return 0;
  const interestMap = new Map(user.interests.map((i) => [i.topicId, i.weight]));
  const negativeMap = new Map(
    user.negativeInterests.map((i) => [i.topicId, i.weight])
  );
  let positive = 0;
  let negative = 0;
  let hits = 0;
  for (const topicId of content.topicIds) {
    const w = interestMap.get(topicId);
    if (w != null) {
      positive += w;
      hits += 1;
    }
    const n = negativeMap.get(topicId);
    if (n != null) negative += n;
  }
  if (hits === 0 && negative === 0) return 0;
  const raw = hits > 0 ? positive / hits - negative : -negative;
  return clamp01(raw);
}

export function scoreCandidate(input: {
  candidate: AiRecommendationCandidate;
  user: AiUserInterestProfile;
  content: AiContentProfile;
  diversityPenalty?: number;
  hooks?: AiPersonalizationExtensionHooks;
}): AiRecommendationScore {
  const hooks =
    input.hooks ?? createNoopPersonalizationExtensionHooks();
  const interestScore = computeInterestScore(input.user, input.content);
  const modelScore = hooks.recommendationModelScore?.(
    input.user,
    input.content
  );
  const diversityPenalty = clamp01(input.diversityPenalty ?? 0);

  const blendedInterest =
    modelScore == null
      ? interestScore
      : clamp01(0.5 * interestScore + 0.5 * clamp01(modelScore));

  const finalScore = clamp01(
    0.4 * input.candidate.baseScore +
      0.3 * blendedInterest +
      0.15 * input.content.freshnessScore +
      0.15 * input.content.qualityScore -
      diversityPenalty
  );

  const reasons: string[] = [
    `source:${input.candidate.sourceId}`,
    `base:${input.candidate.baseScore.toFixed(3)}`,
    `interest:${blendedInterest.toFixed(3)}`,
  ];
  if (diversityPenalty > 0) {
    reasons.push(`diversity_penalty:${diversityPenalty.toFixed(3)}`);
  }

  return {
    contentId: input.candidate.contentId,
    sourceId: input.candidate.sourceId,
    baseScore: input.candidate.baseScore,
    interestScore: blendedInterest,
    freshnessScore: input.content.freshnessScore,
    qualityScore: input.content.qualityScore,
    diversityPenalty,
    finalScore,
    reasons,
  };
}

/**
 * Deterministic ranking: finalScore desc, then contentId asc.
 * Missing content profiles fail closed.
 */
export function rankCandidates(input: {
  candidates: AiRecommendationCandidate[];
  userStore: AiUserInterestProfileStore;
  contentStore: AiContentProfileStore;
  userId: string;
  diversityPenaltyByContentId?: Map<string, number>;
  hooks?: AiPersonalizationExtensionHooks;
}): AiRankedRecommendation[] {
  const user = input.userStore.require(input.userId);
  if (input.candidates.length === 0) {
    return [];
  }

  const scored: AiRecommendationScore[] = input.candidates.map((candidate) => {
    const content = input.contentStore.get(candidate.contentId);
    if (!content) {
      throw new AiPlatformError(
        "invalid_input",
        `Unknown content profile for candidate: ${candidate.contentId}`
      );
    }
    return scoreCandidate({
      candidate,
      user,
      content,
      diversityPenalty: input.diversityPenaltyByContentId?.get(
        candidate.contentId
      ),
      hooks: input.hooks,
    });
  });

  const ordered = [...scored].sort((a, b) => {
    if (a.finalScore !== b.finalScore) return b.finalScore - a.finalScore;
    return a.contentId.localeCompare(b.contentId);
  });

  return ordered.map((score, index) => ({
    contentId: score.contentId,
    sourceId: score.sourceId,
    score,
    rank: index + 1,
  }));
}
