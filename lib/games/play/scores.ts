import {
  isPlayableGameSlug,
  type PlayableGameSlug,
} from "./catalog";

export const GAMES_BEST_STORAGE_KEY = "umtuba.games.best.v1";

export type GameBestMap = Partial<Record<PlayableGameSlug, number>>;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function parseBestMap(raw: string | null | undefined): GameBestMap {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const next: GameBestMap = {};
    for (const [slug, value] of Object.entries(parsed)) {
      if (isPlayableGameSlug(slug) && typeof value === "number" && Number.isFinite(value)) {
        next[slug] = Math.max(0, Math.floor(value));
      }
    }
    return next;
  } catch {
    return {};
  }
}

export function readAllBests(): GameBestMap {
  if (!canUseStorage()) return {};
  try {
    return parseBestMap(window.localStorage.getItem(GAMES_BEST_STORAGE_KEY));
  } catch {
    return {};
  }
}

export function readBest(slug: PlayableGameSlug): number | null {
  const value = readAllBests()[slug];
  return typeof value === "number" ? value : null;
}

export function writeBestIfHigher(slug: PlayableGameSlug, score: number): number {
  const safe = Math.max(0, Math.floor(score));
  const all = readAllBests();
  const current = all[slug] ?? 0;
  const next = Math.max(current, safe);
  all[slug] = next;
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(GAMES_BEST_STORAGE_KEY, JSON.stringify(all));
    } catch {
      /* private mode / quota — keep in-memory return value */
    }
  }
  return next;
}
