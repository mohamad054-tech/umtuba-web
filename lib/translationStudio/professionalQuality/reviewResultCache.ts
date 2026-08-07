/**
 * In-request / process-local professional review result cache (V1 foundation).
 * Keyed by deterministic cache key — never persists across glossary/style changes.
 */

import type { RunProfessionalTranslationReviewResult } from "./reviewPipeline";

const MAX_ENTRIES = 64;
const store = new Map<
  string,
  { savedAt: number; result: RunProfessionalTranslationReviewResult }
>();

export type ProfessionalReviewCacheLookup = {
  hit: boolean;
  result?: RunProfessionalTranslationReviewResult;
};

export function getCachedProfessionalReview(
  cacheKey: string
): ProfessionalReviewCacheLookup {
  const hit = store.get(cacheKey);
  if (!hit) return { hit: false };
  return { hit: true, result: hit.result };
}

export function setCachedProfessionalReview(
  cacheKey: string,
  result: RunProfessionalTranslationReviewResult
): void {
  if (store.size >= MAX_ENTRIES) {
    const first = store.keys().next().value;
    if (first) store.delete(first);
  }
  store.set(cacheKey, { savedAt: Date.now(), result });
}

/** Test-only reset. */
export function clearProfessionalReviewCacheForTests(): void {
  store.clear();
}
