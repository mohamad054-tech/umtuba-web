import { describe, expect, it } from "vitest";
import { ASH_SHAMS, getAshShamsAyat, ayahImageSrc } from "./ashShamsData";
import { buildLinkingPrompt } from "./linking";
import {
  firstLetterOfToken,
  firstTokens,
  lastTokens,
  tokenizeAyah,
} from "./tokenize";
import { isStarDimmed, STAR_DIM_AFTER_MS } from "./progress";

describe("ash-shams downloaded data", () => {
  it("has exactly 15 ayat and a passing cross-check flag", () => {
    expect(ASH_SHAMS.surah).toBe(91);
    expect(ASH_SHAMS.ayahCount).toBe(15);
    expect(ASH_SHAMS.ayat).toHaveLength(15);
    expect(ASH_SHAMS.crossCheckWordByWord100Percent).toBe(true);
    expect(ASH_SHAMS.script).toBe("Uthmani");
  });

  it("numbers ayat 1..15 with non-empty downloaded text", () => {
    getAshShamsAyat().forEach((ayah, i) => {
      expect(ayah.number).toBe(i + 1);
      expect(ayah.text.trim().length).toBeGreaterThan(0);
      expect(tokenizeAyah(ayah.text).length).toBeGreaterThan(0);
    });
  });

  it("maps images only for ayat 1–6", () => {
    expect(ayahImageSrc(1)).toBe("/hifz/shams/shams-1.webp");
    expect(ayahImageSrc(6)).toBe("/hifz/shams/shams-6.webp");
    expect(ayahImageSrc(7)).toBeNull();
    expect(ayahImageSrc(15)).toBeNull();
  });
});

describe("tokenize", () => {
  it("does not invent tokens — only splits whitespace", () => {
    const sample = getAshShamsAyat()[0].text;
    const tokens = tokenizeAyah(sample);
    expect(tokens.join(" ")).toBe(sample.trim().replace(/\s+/gu, " "));
  });

  it("first letter skips leading non-letters without altering the token", () => {
    const word = tokenizeAyah(getAshShamsAyat()[0].text)[0];
    const letter = firstLetterOfToken(word);
    expect(word.startsWith(letter) || word.includes(letter)).toBe(true);
    expect(/\p{L}/u.test(letter)).toBe(true);
  });

  it("first/last token slices are substrings of the ayah", () => {
    const text = getAshShamsAyat()[4].text;
    const head = firstTokens(text, 2);
    const tail = lastTokens(text, 2);
    expect(text.includes(head.split(" ")[0])).toBe(true);
    expect(text.includes(tail.split(" ").at(-1)!)).toBe(true);
  });
});

describe("linking", () => {
  it("uses only real beginnings from this surah", () => {
    const ayat = getAshShamsAyat();
    const prompt = buildLinkingPrompt(ayat, 3);
    expect(prompt).not.toBeNull();
    expect(prompt!.options).toHaveLength(3);
    expect(prompt!.correctAyah).toBe(4);
    for (const opt of prompt!.options) {
      const source = ayat[opt.ayah - 1].text;
      expect(source.startsWith(opt.snippet) || source.includes(opt.snippet.split(" ")[0])).toBe(
        true,
      );
      expect(firstTokens(source, 3)).toBe(opt.snippet);
    }
  });

  it("returns null for the last ayah as a prompt source", () => {
    expect(buildLinkingPrompt(getAshShamsAyat(), 15)).toBeNull();
  });
});

describe("progress dimming", () => {
  it("dims missing or stale reviews after ~3 days", () => {
    expect(isStarDimmed(undefined)).toBe(true);
    const fresh = new Date().toISOString();
    expect(isStarDimmed(fresh)).toBe(false);
    const stale = new Date(Date.now() - STAR_DIM_AFTER_MS - 1000).toISOString();
    expect(isStarDimmed(stale)).toBe(true);
  });
});
