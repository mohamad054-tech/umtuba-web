import type { RankableCandidate, SearchEntityType, SearchResultItem } from "./types";

/** Weights for the V1 composite score (replaceable later). */
export const SEARCH_RANK_WEIGHTS = {
  match: 0.55,
  activity: 0.25,
  quality: 0.2,
} as const;

const ENTITY_QUALITY_BOOST: Record<SearchEntityType, number> = {
  person: 0.55,
  video: 0.6,
  story: 0.5,
  store: 0.65,
  product: 0.6,
};

export function scoreMatchFields(
  queryNormalized: string,
  fields: string[]
): number {
  if (!queryNormalized) return 0;
  let best = 0;
  for (const field of fields) {
    const value = (field ?? "").trim().toLowerCase();
    if (!value) continue;
    if (value === queryNormalized) {
      best = Math.max(best, 1);
      continue;
    }
    if (value.startsWith(queryNormalized)) {
      best = Math.max(best, 0.88);
      continue;
    }
    if (value.includes(` ${queryNormalized}`) || value.includes(queryNormalized)) {
      best = Math.max(best, 0.62);
      continue;
    }
    // Loose token overlap
    const tokens = queryNormalized.split(" ").filter(Boolean);
    const hits = tokens.filter((t) => value.includes(t)).length;
    if (hits > 0) {
      best = Math.max(best, 0.35 + (hits / tokens.length) * 0.2);
    }
  }
  return best;
}

/**
 * Activity score from an ISO timestamp. Newer → higher.
 * Half-life ~14 days for V1.
 */
export function scoreActivity(activityAt: string | null | undefined, now = Date.now()): number {
  if (!activityAt) return 0.25;
  const ts = Date.parse(activityAt);
  if (!Number.isFinite(ts)) return 0.25;
  const ageMs = Math.max(0, now - ts);
  const halfLifeMs = 14 * 24 * 60 * 60 * 1000;
  const score = Math.exp(-ageMs / halfLifeMs);
  return Math.min(1, Math.max(0.05, score));
}

export function scoreQuality(
  entityType: SearchEntityType,
  qualityPrior: number
): number {
  const prior = Number.isFinite(qualityPrior)
    ? Math.min(1, Math.max(0, qualityPrior))
    : 0.4;
  const base = ENTITY_QUALITY_BOOST[entityType] ?? 0.5;
  return Math.min(1, base * 0.45 + prior * 0.55);
}

export function composeSearchScore(input: {
  matchScore: number;
  activityScore: number;
  qualityScore: number;
}): number {
  const raw =
    input.matchScore * SEARCH_RANK_WEIGHTS.match +
    input.activityScore * SEARCH_RANK_WEIGHTS.activity +
    input.qualityScore * SEARCH_RANK_WEIGHTS.quality;
  return Math.round(Math.min(100, Math.max(0, raw * 100)) * 10) / 10;
}

export function rankCandidates(
  queryNormalized: string,
  candidates: RankableCandidate[],
  now = Date.now()
): SearchResultItem[] {
  const ranked = candidates.map((c) => {
    const matchScore = scoreMatchFields(queryNormalized, c.matchFields);
    const activityScore = scoreActivity(c.activityAt, now);
    const qualityScore = scoreQuality(c.entityType, c.qualityPrior);
    const score = composeSearchScore({
      matchScore,
      activityScore,
      qualityScore,
    });
    return {
      id: c.id,
      entityType: c.entityType,
      title: c.title,
      subtitle: c.subtitle,
      href: c.href,
      imageUrl: c.imageUrl,
      badge: c.badge,
      score,
      matchScore: Math.round(matchScore * 1000) / 1000,
      activityScore: Math.round(activityScore * 1000) / 1000,
      qualityScore: Math.round(qualityScore * 1000) / 1000,
    } satisfies SearchResultItem;
  });

  ranked.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.title.localeCompare(b.title);
  });

  return ranked;
}
