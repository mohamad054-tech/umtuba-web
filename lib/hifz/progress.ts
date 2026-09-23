import {
  DEFAULT_REPEAT_PAUSE_LENGTH,
  type RepeatPauseLength,
} from "./audio";
import {
  isDueToday,
  scheduleAfterRating,
  type HifzSelfRating,
} from "./reviewSchedule";
import type {
  HifzLocalProgress,
  HifzLocalProgressV1,
  HifzVerseProgress,
} from "./types";

export const HIFZ_PROGRESS_KEY = "hifz:shams:v1";

/** Device-only preference for listen-and-repeat silence length. */
export const HIFZ_REPEAT_PAUSE_KEY = "hifz:shams:repeatPause:v1";

/** Stars dim after this many ms without review (~3 days). Kept for legacy helpers/tests. */
export const STAR_DIM_AFTER_MS = 3 * 24 * 60 * 60 * 1000;

const PAUSE_LENGTHS: readonly RepeatPauseLength[] = [
  "short",
  "medium",
  "long",
];

export function emptyProgress(): HifzLocalProgress {
  return { version: 2, surah: 91, verses: {}, stars: {} };
}

function migrateV1(parsed: HifzLocalProgressV1): HifzLocalProgress {
  const verses: Record<string, HifzVerseProgress> = {};
  const stars = parsed.stars ?? {};
  for (const [key, star] of Object.entries(stars)) {
    if (!star?.lastReviewedAt) continue;
    const ratedAt = new Date(star.lastReviewedAt);
    const scheduled = scheduleAfterRating("remembered", null, ratedAt);
    verses[key] = {
      lastRatedAt: star.lastReviewedAt,
      rating: "remembered",
      dueAt: scheduled.dueAt.toISOString(),
      streak: scheduled.streak,
      intervalDays: scheduled.intervalDays,
    };
  }
  return { version: 2, surah: 91, verses, stars };
}

function normalizeProgress(raw: unknown): HifzLocalProgress {
  if (!raw || typeof raw !== "object") return emptyProgress();
  const obj = raw as Partial<HifzLocalProgress> & Partial<HifzLocalProgressV1>;
  if (obj.surah !== 91) return emptyProgress();
  if (obj.version === 2 && obj.verses && typeof obj.verses === "object") {
    const stars =
      obj.stars && typeof obj.stars === "object"
        ? obj.stars
        : Object.fromEntries(
            Object.entries(obj.verses).map(([k, v]) => [
              k,
              { lastReviewedAt: v.lastRatedAt },
            ]),
          );
    return { version: 2, surah: 91, verses: obj.verses, stars };
  }
  if (obj.version === 1 && obj.stars && typeof obj.stars === "object") {
    return migrateV1(obj as HifzLocalProgressV1);
  }
  return emptyProgress();
}

export function readProgress(): HifzLocalProgress {
  if (typeof window === "undefined") return emptyProgress();
  try {
    const raw = window.localStorage.getItem(HIFZ_PROGRESS_KEY);
    if (!raw) return emptyProgress();
    return normalizeProgress(JSON.parse(raw));
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

export function readRepeatPauseLength(): RepeatPauseLength {
  if (typeof window === "undefined") return DEFAULT_REPEAT_PAUSE_LENGTH;
  try {
    const raw = window.localStorage.getItem(HIFZ_REPEAT_PAUSE_KEY);
    if (raw && (PAUSE_LENGTHS as readonly string[]).includes(raw)) {
      return raw as RepeatPauseLength;
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_REPEAT_PAUSE_LENGTH;
}

export function writeRepeatPauseLength(length: RepeatPauseLength): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HIFZ_REPEAT_PAUSE_KEY, length);
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Legacy helper — records a calm review pulse as «حفظتها». */
export function markAyahReviewed(
  ayahNumber: number,
  at: Date = new Date(),
): HifzLocalProgress {
  return rateAyah(ayahNumber, "remembered", at);
}

export function rateAyah(
  ayahNumber: number,
  rating: HifzSelfRating,
  at: Date = new Date(),
): HifzLocalProgress {
  const next = readProgress();
  const key = String(ayahNumber);
  const prev = next.verses[key] ?? null;
  const scheduled = scheduleAfterRating(
    rating,
    prev
      ? { streak: prev.streak, intervalDays: prev.intervalDays }
      : null,
    at,
  );
  next.verses[key] = {
    lastRatedAt: at.toISOString(),
    rating: scheduled.rating,
    dueAt: scheduled.dueAt.toISOString(),
    streak: scheduled.streak,
    intervalDays: scheduled.intervalDays,
  };
  next.stars[key] = { lastReviewedAt: at.toISOString() };
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

export function listDueToday(
  progress: HifzLocalProgress,
  now: Date = new Date(),
): number[] {
  const due: number[] = [];
  for (let i = 1; i <= 15; i++) {
    const entry = progress.verses[String(i)];
    if (entry && isDueToday(entry.dueAt, now)) due.push(i);
  }
  return due;
}
