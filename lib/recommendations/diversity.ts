import { DEFAULT_DIVERSITY_POLICY } from "./weights";
import type { DiversityPolicy, ScoredCandidate } from "./types";

export function explorationSlotCount(
  pageSize: number,
  policy: DiversityPolicy = DEFAULT_DIVERSITY_POLICY
): number {
  if (pageSize <= 0) return 0;
  const fromFraction = Math.floor(
    pageSize * policy.explorationSlotFraction
  );
  return Math.min(
    pageSize,
    Math.max(policy.minExplorationSlots, fromFraction)
  );
}

/**
 * Reorder scored candidates to:
 * 1) Cap per-creator domination
 * 2) Reserve exploration slots for unseen creators
 *
 * Stable within each pool by existing score order.
 */
export function applyDiversityAndExploration(
  scored: ScoredCandidate[],
  pageSize: number,
  policy: DiversityPolicy = DEFAULT_DIVERSITY_POLICY
): ScoredCandidate[] {
  if (pageSize <= 0 || scored.length === 0) {
    return [];
  }

  const explorationSlots = explorationSlotCount(pageSize, policy);
  const creatorCounts = new Map<string, number>();
  const selected: ScoredCandidate[] = [];
  const selectedIds = new Set<number>();

  const canTake = (item: ScoredCandidate): boolean => {
    const count = creatorCounts.get(item.creatorId) ?? 0;
    return count < policy.maxPerCreator;
  };

  const take = (item: ScoredCandidate) => {
    selected.push(item);
    selectedIds.add(item.postId);
    creatorCounts.set(
      item.creatorId,
      (creatorCounts.get(item.creatorId) ?? 0) + 1
    );
  };

  // Pass 1: fill exploration slots with highest-scoring unseen creators.
  let explorationTaken = 0;
  for (const item of scored) {
    if (explorationTaken >= explorationSlots) break;
    if (!item.isExploration) continue;
    if (!canTake(item)) continue;
    take(item);
    explorationTaken += 1;
  }

  // Pass 2: fill remaining slots by score with creator caps.
  for (const item of scored) {
    if (selected.length >= pageSize) break;
    if (selectedIds.has(item.postId)) continue;
    if (!canTake(item)) continue;
    take(item);
  }

  // Pass 3: if still short (sparse candidates), relax creator caps.
  if (selected.length < pageSize) {
    for (const item of scored) {
      if (selected.length >= pageSize) break;
      if (selectedIds.has(item.postId)) continue;
      take(item);
    }
  }

  return selected;
}

/**
 * Guarantee: no creator exceeds maxPerCreator when enough alternatives exist.
 */
export function assertCreatorDiversity(
  page: ScoredCandidate[],
  maxPerCreator: number
): boolean {
  const counts = new Map<string, number>();
  for (const item of page) {
    const next = (counts.get(item.creatorId) ?? 0) + 1;
    if (next > maxPerCreator) return false;
    counts.set(item.creatorId, next);
  }
  return true;
}
