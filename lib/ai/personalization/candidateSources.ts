/**
 * Candidate source interfaces — contracts only (no domain fetchers).
 */

import { AiPlatformError } from "../contracts/errors";
import {
  AI_CANDIDATE_SOURCE_IDS,
  type AiCandidateSourceId,
  type AiPersonalizationContext,
  type AiRecommendationCandidate,
} from "./types";

export type AiCandidateSource = {
  sourceId: AiCandidateSourceId;
  fetchCandidates: (
    context: AiPersonalizationContext
  ) => Promise<AiRecommendationCandidate[]>;
};

const SOURCE_SET = new Set<string>(AI_CANDIDATE_SOURCE_IDS);

export function assertCandidateSourceId(
  sourceId: string
): asserts sourceId is AiCandidateSourceId {
  if (!SOURCE_SET.has(sourceId)) {
    throw new AiPlatformError(
      "invalid_input",
      `Unknown candidate source: ${sourceId}`
    );
  }
}

export function validateCandidate(
  candidate: AiRecommendationCandidate
): AiRecommendationCandidate {
  const contentId = candidate.contentId.trim();
  if (!contentId) {
    throw new AiPlatformError("invalid_input", "contentId is required.");
  }
  assertCandidateSourceId(candidate.sourceId);
  if (
    !Number.isFinite(candidate.baseScore) ||
    candidate.baseScore < 0 ||
    candidate.baseScore > 1
  ) {
    throw new AiPlatformError(
      "invalid_input",
      "baseScore must be a finite number in [0, 1]."
    );
  }
  return {
    contentId,
    sourceId: candidate.sourceId,
    baseScore: candidate.baseScore,
  };
}

/**
 * In-memory stub source registry for Foundation tests / local wiring.
 * Real product sources register later without changing this contract.
 */
export class AiCandidateSourceRegistry {
  private readonly sources = new Map<AiCandidateSourceId, AiCandidateSource>();

  register(source: AiCandidateSource): void {
    assertCandidateSourceId(source.sourceId);
    if (this.sources.has(source.sourceId)) {
      throw new AiPlatformError(
        "invalid_input",
        `Candidate source already registered: ${source.sourceId}`
      );
    }
    this.sources.set(source.sourceId, source);
  }

  get(sourceId: AiCandidateSourceId): AiCandidateSource | null {
    return this.sources.get(sourceId) ?? null;
  }

  require(sourceId: AiCandidateSourceId): AiCandidateSource {
    const source = this.get(sourceId);
    if (!source) {
      throw new AiPlatformError(
        "invalid_input",
        `Candidate source is not registered: ${sourceId}`
      );
    }
    return source;
  }

  list(): AiCandidateSource[] {
    return AI_CANDIDATE_SOURCE_IDS.map((id) => this.sources.get(id)).filter(
      (s): s is AiCandidateSource => Boolean(s)
    );
  }

  reset(): void {
    this.sources.clear();
  }
}

export async function collectCandidates(
  registry: AiCandidateSourceRegistry,
  context: AiPersonalizationContext,
  sourceIds: AiCandidateSourceId[] = [...AI_CANDIDATE_SOURCE_IDS]
): Promise<AiRecommendationCandidate[]> {
  if (!context.userId.trim()) {
    throw new AiPlatformError("invalid_input", "userId is required.");
  }
  if (!Number.isFinite(context.limit) || context.limit <= 0) {
    throw new AiPlatformError(
      "invalid_input",
      "limit must be a positive finite number."
    );
  }

  const collected: AiRecommendationCandidate[] = [];
  const seen = new Set<string>();
  for (const sourceId of sourceIds) {
    assertCandidateSourceId(sourceId);
    const source = registry.get(sourceId);
    if (!source) continue;
    const batch = await source.fetchCandidates(context);
    for (const raw of batch) {
      const candidate = validateCandidate(raw);
      if (candidate.sourceId !== sourceId) {
        throw new AiPlatformError(
          "invalid_input",
          `Candidate source mismatch for ${candidate.contentId}.`
        );
      }
      const key = `${candidate.sourceId}:${candidate.contentId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      collected.push(candidate);
    }
  }
  return collected;
}
