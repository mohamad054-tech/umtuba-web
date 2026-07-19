import { STORY_TTL_MS } from "./constants";

/** Compute expires_at from created_at (+24h). */
export function computeStoryExpiresAt(
  createdAt: Date | string | number = Date.now()
): Date {
  const base =
    createdAt instanceof Date
      ? createdAt.getTime()
      : typeof createdAt === "number"
        ? createdAt
        : Date.parse(createdAt);
  const ms = Number.isFinite(base) ? base : Date.now();
  return new Date(ms + STORY_TTL_MS);
}

export function isStoryExpired(
  expiresAt: Date | string | number,
  now: Date | number = Date.now()
): boolean {
  const exp =
    expiresAt instanceof Date
      ? expiresAt.getTime()
      : typeof expiresAt === "number"
        ? expiresAt
        : Date.parse(expiresAt);
  const nowMs = now instanceof Date ? now.getTime() : now;
  if (!Number.isFinite(exp)) {
    return true;
  }
  return exp <= nowMs;
}

export function isStoryActive(
  expiresAt: Date | string | number,
  now: Date | number = Date.now()
): boolean {
  return !isStoryExpired(expiresAt, now);
}

/** Filter out expired stories (defensive app-layer gate matching RLS). */
export function filterActiveStories<T extends { expiresAt: string }>(
  stories: T[],
  now: Date | number = Date.now()
): T[] {
  return stories.filter((s) => isStoryActive(s.expiresAt, now));
}

export function remainingStoryMs(
  expiresAt: Date | string | number,
  now: Date | number = Date.now()
): number {
  const exp =
    expiresAt instanceof Date
      ? expiresAt.getTime()
      : typeof expiresAt === "number"
        ? expiresAt
        : Date.parse(expiresAt);
  const nowMs = now instanceof Date ? now.getTime() : now;
  if (!Number.isFinite(exp)) return 0;
  return Math.max(0, exp - nowMs);
}
