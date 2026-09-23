import type { HifzLocalProgress } from "./types";

export const HIFZ_PROGRESS_KEY = "hifz:shams:v1";

/** Stars dim after this many ms without review (~3 days). */
export const STAR_DIM_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

export function emptyProgress(): HifzLocalProgress {
  return { version: 1, surah: 91, stars: {} };
}

export function readProgress(): HifzLocalProgress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = window.localStorage.getItem(HIFZ_PROGRESS_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as HifzLocalProgress;
    if (parsed?.version !== 1 || parsed.surah !== 91 || typeof parsed.stars !== "object") {
      return emptyProgress();
    }
    return parsed;
  } catch {
    return emptyProgress();
  }
}

export function writeProgress(progress: HifzLocalProgress): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HIFZ_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function markAyahReviewed(
  ayahNumber: number,
  at: Date = new Date(),
): HifzLocalProgress {
  const next = readProgress();
  next.stars[String(ayahNumber)] = { lastReviewedAt: at.toISOString() };
  writeProgress(next);
  return next;
}

export function isStarDimmed(
  lastReviewedAt: string | undefined,
  now: number = Date.now(),
): boolean {
  if (!lastReviewedAt) return true;
  const t = Date.parse(lastReviewedAt);
  if (Number.isNaN(t)) return true;
  return now - t > STAR_DIM_AFTER_MS;
}

/** Short haptic pulse; never throws (desktop / denied permission = no-op). */
export function softMasteryVibrate(): void {
  try {
    if (typeof navigator === "undefined") return;
    const vibrate = navigator.vibrate?.bind(navigator);
    if (typeof vibrate !== "function") return;
    vibrate(18);
  } catch {
    /* no-op */
  }
}
