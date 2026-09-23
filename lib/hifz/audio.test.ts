import { describe, expect, it } from "vitest";
import {
  husaryAyahUrl,
  husaryBasmalaUrl,
  husaryClipUrl,
  padSurahAyah,
  repeatPauseMs,
  repeatWordOpacity,
  REPEAT_PAUSE_MIN_EXTRA_MS,
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
  it("pauses about as long as the ayah plus a little", () => {
    expect(repeatPauseMs(5000)).toBe(5000 + Math.max(REPEAT_PAUSE_MIN_EXTRA_MS, 1000));
    expect(repeatPauseMs(1000)).toBe(1000 + REPEAT_PAUSE_MIN_EXTRA_MS);
  });

  it("fades words gently across repeats without going invisible", () => {
    expect(repeatWordOpacity(0, 3)).toBe(1);
    expect(repeatWordOpacity(2, 3)).toBeLessThan(repeatWordOpacity(0, 3));
    expect(repeatWordOpacity(2, 3)).toBeGreaterThanOrEqual(0.28);
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
