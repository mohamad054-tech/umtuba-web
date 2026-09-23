import { describe, expect, it } from "vitest";
import {
  buildHusaryQueue,
  husaryAyahUrl,
  husaryBasmalaUrl,
  husaryClipUrl,
  padSurahAyah,
  repeatPauseMs,
  repeatWordOpacity,
  REPEAT_PAUSE_MEDIUM_MIN_MS,
  REPEAT_PAUSE_MIN_EXTRA_MS,
  REPEAT_PAUSE_SHORT_MIN_MS,
} from "./audio";
import {
  getHusaryAyahTiming,
  HUSARY_WORD_TIMINGS_USABLE,
  wordIndexAtMs,
} from "./husaryTimings";
import { getAshShamsAyat } from "./ashShamsData";
import { tokenizeAyah as tokenize } from "./tokenize";

describe("husary audio urls", () => {
  it("maps basmala and ayat 1–15 to distinct stream paths", () => {
    expect(padSurahAyah(91, 1)).toBe("091001");
    expect(padSurahAyah(91, 15)).toBe("091015");
    expect(husaryBasmalaUrl()).toContain("/bismillah.mp3");
    expect(husaryClipUrl("basmala")).toBe(husaryBasmalaUrl());
    expect(husaryAyahUrl(1)).toContain("/091001.mp3");
    expect(husaryAyahUrl(15)).toContain("/091015.mp3");
    expect(husaryAyahUrl(1)).not.toBe(husaryBasmalaUrl());
  });

  it("rejects out-of-range ayah numbers", () => {
    expect(() => husaryAyahUrl(0)).toThrow();
    expect(() => husaryAyahUrl(16)).toThrow();
  });
});

describe("repeat pause and fade", () => {
  it("defaults to a short breath pause clearly shorter than the old long gap", () => {
    const short = repeatPauseMs(5000);
    const long = repeatPauseMs(5000, "long");
    expect(short).toBe(Math.max(REPEAT_PAUSE_SHORT_MIN_MS, Math.round(5000 * 0.28)));
    expect(short).toBeLessThan(long);
    expect(long).toBe(5000 + Math.max(REPEAT_PAUSE_MIN_EXTRA_MS, 1000));
  });

  it("scales short / medium / long distinctly", () => {
    const short = repeatPauseMs(4000, "short");
    const medium = repeatPauseMs(4000, "medium");
    const long = repeatPauseMs(4000, "long");
    expect(short).toBeLessThan(medium);
    expect(medium).toBeLessThan(long);
    expect(short).toBe(Math.max(REPEAT_PAUSE_SHORT_MIN_MS, Math.round(4000 * 0.28)));
    expect(medium).toBe(Math.max(REPEAT_PAUSE_MEDIUM_MIN_MS, Math.round(4000 * 0.55)));
  });

  it("keeps a floor on very short ayat", () => {
    expect(repeatPauseMs(1000, "short")).toBe(REPEAT_PAUSE_SHORT_MIN_MS);
    expect(repeatPauseMs(1000, "medium")).toBe(REPEAT_PAUSE_MEDIUM_MIN_MS);
    expect(repeatPauseMs(1000, "long")).toBe(1000 + REPEAT_PAUSE_MIN_EXTRA_MS);
  });

  it("fades words gently across repeats without going invisible", () => {
    expect(repeatWordOpacity(0, 3)).toBe(1);
    expect(repeatWordOpacity(2, 3)).toBeLessThan(repeatWordOpacity(0, 3));
    expect(repeatWordOpacity(2, 3)).toBeGreaterThanOrEqual(0.28);
  });
});

describe("buildHusaryQueue tilawaLink", () => {
  it("continues from the start ayah through the end of the surah", () => {
    const q = buildHusaryQueue("tilawaLink", 7, 3);
    expect(q.map((i) => i.clip)).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15]);
  });

  it("plays basmala then ayat 1–15 when started from basmala", () => {
    const q = buildHusaryQueue("tilawaLink", "basmala", 3);
    expect(q[0]?.clip).toBe("basmala");
    expect(q.slice(1).map((i) => i.clip)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);
  });

  it("uses the chosen pause length between repeat rounds", () => {
    const shortQ = buildHusaryQueue("repeat", 1, 3, "short");
    const longQ = buildHusaryQueue("repeat", 1, 3, "long");
    expect(shortQ).toHaveLength(3);
    expect(shortQ[0]?.pauseAfterMs).toBeDefined();
    expect(shortQ[2]?.pauseAfterMs).toBeUndefined();
    expect(shortQ[0]!.pauseAfterMs!).toBeLessThan(longQ[0]!.pauseAfterMs!);
  });
});

describe("husary word timings", () => {
  it("aligns segment counts with downloaded Uthmani tokens", () => {
    expect(HUSARY_WORD_TIMINGS_USABLE).toBe(true);
    for (const ayah of getAshShamsAyat()) {
      const timing = getHusaryAyahTiming(ayah.number);
      expect(timing).not.toBeNull();
      expect(timing!.words.length).toBe(tokenize(ayah.text).length);
    }
  });

  it("resolves the active word from elapsed ms", () => {
    const timing = getHusaryAyahTiming(1)!;
    expect(wordIndexAtMs(1, timing.words[0].startMs + 1)).toBe(0);
    expect(wordIndexAtMs(1, timing.words[1].startMs + 1)).toBe(1);
  });
});
