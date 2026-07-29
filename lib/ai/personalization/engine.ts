/**
 * Personalization Engine Foundation V1.
 * General platform for Video/Discover/Learning/Commerce/Creator/Ads/World/Search.
 * No DB. No UI. No domain-specific fetchers wired in.
 */

import { AiPlatformError } from "../contracts/errors";
import {
  collectCandidates,
  AiCandidateSourceRegistry,
  type AiCandidateSource,
} from "./candidateSources";
import { aiContentProfiles, AiContentProfileStore } from "./contentProfile";
import { computeDiversityPenalties } from "./diversity";
import { rankCandidates } from "./scoring";
import { validateRecommendationSignal } from "./signals";
import {
  createNoopPersonalizationExtensionHooks,
  type AiPersonalizationContext,
  type AiPersonalizationExtensionHooks,
  type AiRankedRecommendation,
  type AiRecommendationSignal,
  type AiCandidateSourceId,
} from "./types";
import {
  aiUserInterestProfiles,
  AiUserInterestProfileStore,
} from "./userInterestProfile";

export type AiPersonalizationEngineOptions = {
  userStore?: AiUserInterestProfileStore;
  contentStore?: AiContentProfileStore;
  sources?: AiCandidateSourceRegistry;
  hooks?: AiPersonalizationExtensionHooks;
};

export type AiPersonalizationResult = {
  userId: string;
  surface: AiPersonalizationContext["surface"];
  recommendations: AiRankedRecommendation[];
};

export class AiPersonalizationEngine {
  readonly userStore: AiUserInterestProfileStore;
  readonly contentStore: AiContentProfileStore;
  readonly sources: AiCandidateSourceRegistry;
  private hooks: AiPersonalizationExtensionHooks;

  constructor(options: AiPersonalizationEngineOptions = {}) {
    this.userStore = options.userStore ?? new AiUserInterestProfileStore();
    this.contentStore = options.contentStore ?? new AiContentProfileStore();
    this.sources = options.sources ?? new AiCandidateSourceRegistry();
    this.hooks = {
      ...createNoopPersonalizationExtensionHooks(),
      ...options.hooks,
    };
  }

  registerCandidateSource(source: AiCandidateSource): void {
    this.sources.register(source);
  }

  ingestSignal(signal: AiRecommendationSignal): AiRecommendationSignal {
    const validated = validateRecommendationSignal(signal);
    this.hooks.reinforcementUpdate?.(validated);
    return validated;
  }

  /**
   * Candidate → diversity → score → deterministic rank pipeline.
   * Missing interest profile or invalid context fails closed.
   */
  async recommend(
    context: AiPersonalizationContext,
    sourceIds?: AiCandidateSourceId[]
  ): Promise<AiPersonalizationResult> {
    if (!context.userId.trim()) {
      throw new AiPlatformError("invalid_input", "userId is required.");
    }
    this.userStore.require(context.userId);

    const candidates = await collectCandidates(
      this.sources,
      context,
      sourceIds
    );
    const diversityPenaltyByContentId = computeDiversityPenalties({
      candidates,
      contentStore: this.contentStore,
    });
    const recommendations = rankCandidates({
      candidates,
      userStore: this.userStore,
      contentStore: this.contentStore,
      userId: context.userId,
      diversityPenaltyByContentId,
      hooks: this.hooks,
    }).slice(0, context.limit);

    return {
      userId: context.userId,
      surface: context.surface,
      recommendations,
    };
  }
}

/** Process-local default engine (empty sources until products register). */
export const aiPersonalizationEngine = new AiPersonalizationEngine({
  userStore: aiUserInterestProfiles,
  contentStore: aiContentProfiles,
});

export function resetPersonalizationFoundation(): void {
  aiUserInterestProfiles.reset();
  aiContentProfiles.reset();
  aiPersonalizationEngine.sources.reset();
}
