/**
 * Device-only spaced review schedule for Surah ash-Shams.
 * Ratings: أعدها / متردد / حفظتها — never sent to a server.
 */

export type HifzSelfRating = "again" | "unsure" | "remembered";

/** Consecutive «حفظتها» ladder (days until next due). Caps at the last rung. */
export const REMEMBERED_INTERVAL_DAYS = [3, 7, 14, 30, 60] as const;

/** «أعدها» — return later today (hours from now). */
export const AGAIN_LATER_HOURS = 4;

export type ReviewScheduleState = {
  streak: number;
  intervalDays: number;
};

export type ReviewScheduleResult = {
  dueAt: Date;
  streak: number;
  intervalDays: number;
  rating: HifzSelfRating;
};

export function addHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(from: Date, days: number): Date {
  const next = new Date(from.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function endOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

/**
 * Compute the next due time and streak after a self-rating.
 * - أعدها (again): later today (+AGAIN_LATER_HOURS), streak resets
 * - متردد (unsure): tomorrow (+1 day), streak resets
 * - حفظتها (remembered): 3 → 7 → 14 → 30 → 60 days, streak grows
 */
export function scheduleAfterRating(
  rating: HifzSelfRating,
  previous: ReviewScheduleState | null,
  now: Date = new Date(),
): ReviewScheduleResult {
  if (rating === "again") {
    return {
      rating,
      dueAt: addHours(now, AGAIN_LATER_HOURS),
      streak: 0,
      intervalDays: 0,
    };
  }
  if (rating === "unsure") {
    return {
      rating,
      dueAt: addDays(now, 1),
      streak: 0,
      intervalDays: 1,
    };
  }
  const prevStreak = previous?.streak ?? 0;
  const streak = prevStreak + 1;
  const ladderIndex = Math.min(
    streak - 1,
    REMEMBERED_INTERVAL_DAYS.length - 1,
  );
  const intervalDays = REMEMBERED_INTERVAL_DAYS[ladderIndex];
  return {
    rating,
    dueAt: addDays(now, intervalDays),
    streak,
    intervalDays,
  };
}

export function isDueAt(
  dueAtIso: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!dueAtIso) return false;
  const t = Date.parse(dueAtIso);
  if (Number.isNaN(t)) return false;
  return t <= now.getTime();
}

/** Due at or before end of the local calendar day (for «مراجعات اليوم»). */
export function isDueToday(
  dueAtIso: string | undefined,
  now: Date = new Date(),
): boolean {
  if (!dueAtIso) return false;
  const t = Date.parse(dueAtIso);
  if (Number.isNaN(t)) return false;
  return t <= endOfLocalDay(now).getTime();
}

export type MapVerseStatus = "memorized" | "needsReview" | "notStarted";

export type MapVerseInput = {
  rating?: HifzSelfRating;
  dueAt?: string;
};

/**
 * Map card status:
 * - لم تبدأ — never rated
 * - تحتاج مراجعة — due today (or overdue)
 * - محفوظة — last rating was حفظتها and not due yet
 */
export function mapVerseStatus(
  entry: MapVerseInput | null | undefined,
  now: Date = new Date(),
): MapVerseStatus {
  if (!entry?.rating || !entry.dueAt) return "notStarted";
  if (isDueToday(entry.dueAt, now)) return "needsReview";
  if (entry.rating === "remembered") return "memorized";
  return "needsReview";
}

export function surahProgressPercent(
  statuses: readonly MapVerseStatus[],
): number {
  if (statuses.length === 0) return 0;
  const memorized = statuses.filter((s) => s === "memorized").length;
  return Math.round((memorized / statuses.length) * 100);
}
