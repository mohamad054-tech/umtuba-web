import { describe, expect, it } from "vitest";
import {
  AGAIN_LATER_HOURS,
  REMEMBERED_INTERVAL_DAYS,
  addDays,
  addHours,
  endOfLocalDay,
  isDueAt,
  isDueToday,
  mapVerseStatus,
  scheduleAfterRating,
  startOfLocalDay,
  surahProgressPercent,
} from "./reviewSchedule";

describe("scheduleAfterRating", () => {
  const now = new Date("2026-09-23T12:00:00");

  it("أعدها returns later today (+4h) and resets streak", () => {
    const result = scheduleAfterRating(
      "again",
      { streak: 3, intervalDays: 14 },
      now,
    );
    expect(result.rating).toBe("again");
    expect(result.streak).toBe(0);
    expect(result.intervalDays).toBe(0);
    expect(result.dueAt.getTime()).toBe(addHours(now, AGAIN_LATER_HOURS).getTime());
    expect(AGAIN_LATER_HOURS).toBe(4);
  });

  it("متردد returns tomorrow (+1d) and resets streak", () => {
    const result = scheduleAfterRating(
      "unsure",
      { streak: 2, intervalDays: 7 },
      now,
    );
    expect(result.rating).toBe("unsure");
    expect(result.streak).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.dueAt.getTime()).toBe(addDays(now, 1).getTime());
  });

  it("حفظتها climbs 3 → 7 → 14 → 30 → 60 days", () => {
    let prev = null as { streak: number; intervalDays: number } | null;
    const expectedDays = [...REMEMBERED_INTERVAL_DAYS];
    expect(expectedDays).toEqual([3, 7, 14, 30, 60]);

    for (let i = 0; i < expectedDays.length; i++) {
      const result = scheduleAfterRating("remembered", prev, now);
      expect(result.rating).toBe("remembered");
      expect(result.streak).toBe(i + 1);
      expect(result.intervalDays).toBe(expectedDays[i]);
      expect(result.dueAt.getTime()).toBe(addDays(now, expectedDays[i]).getTime());
      prev = { streak: result.streak, intervalDays: result.intervalDays };
    }

    const capped = scheduleAfterRating("remembered", prev, now);
    expect(capped.streak).toBe(6);
    expect(capped.intervalDays).toBe(60);
  });

  it("حفظتها with null previous starts at first ladder rung", () => {
    const result = scheduleAfterRating("remembered", null, now);
    expect(result.streak).toBe(1);
    expect(result.intervalDays).toBe(3);
  });
});

describe("due helpers", () => {
  const now = new Date("2026-09-23T15:30:00");

  it("isDueAt is true when dueAt is at or before now", () => {
    expect(isDueAt(addHours(now, -1).toISOString(), now)).toBe(true);
    expect(isDueAt(now.toISOString(), now)).toBe(true);
    expect(isDueAt(addHours(now, 1).toISOString(), now)).toBe(false);
    expect(isDueAt(undefined, now)).toBe(false);
    expect(isDueAt("not-a-date", now)).toBe(false);
  });

  it("isDueToday includes anything due by end of local day", () => {
    expect(isDueToday(addHours(now, 2).toISOString(), now)).toBe(true);
    expect(isDueToday(endOfLocalDay(now).toISOString(), now)).toBe(true);
    expect(isDueToday(addDays(startOfLocalDay(now), 1).toISOString(), now)).toBe(
      false,
    );
    expect(isDueToday(undefined, now)).toBe(false);
  });
});

describe("mapVerseStatus + surahProgressPercent", () => {
  const now = new Date("2026-09-23T12:00:00");

  it("maps لم تبدأ / تحتاج مراجعة / محفوظة", () => {
    expect(mapVerseStatus(null, now)).toBe("notStarted");
    expect(mapVerseStatus({}, now)).toBe("notStarted");
    expect(
      mapVerseStatus(
        { rating: "remembered", dueAt: addDays(now, 3).toISOString() },
        now,
      ),
    ).toBe("memorized");
    expect(
      mapVerseStatus(
        { rating: "remembered", dueAt: addHours(now, -1).toISOString() },
        now,
      ),
    ).toBe("needsReview");
    expect(
      mapVerseStatus(
        { rating: "again", dueAt: addHours(now, 1).toISOString() },
        now,
      ),
    ).toBe("needsReview");
  });

  it("computes memorized percentage", () => {
    expect(surahProgressPercent([])).toBe(0);
    expect(
      surahProgressPercent([
        "memorized",
        "memorized",
        "needsReview",
        "notStarted",
      ]),
    ).toBe(50);
    expect(
      surahProgressPercent(Array.from({ length: 15 }, () => "memorized")),
    ).toBe(100);
  });
});