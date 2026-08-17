import { describe, expect, it } from "vitest";
import {
  FUTURE_LOCALE_CODES,
  SUPPORTED_LOCALES,
  normalizeToAppLocale,
  toWorldCatalogLocaleKey,
} from "./locales";
import { MESSAGE_CATALOGS } from "./messages/catalogs";
import { enMessages } from "./messages/en";
import type { TranslationKey } from "./messages/types";

const PLACEHOLDER_RE = /\{(\w+)\}/g;

function placeholders(value: string): string[] {
  return [...value.matchAll(PLACEHOLDER_RE)].map((m) => m[1]!).sort();
}

const WAVE2 = ["tr", "id", "hi", "ja", "ru", "zh-CN"] as const;

const BRAND_OR_IDENTICAL = new Set([
  "UMTUBA",
  "UM Points",
  "you@email.com",
  "your.name",
]);

describe("Wave 2 catalog quality", () => {
  const keys = Object.keys(enMessages) as TranslationKey[];

  it("reserves Traditional Chinese without landing it", () => {
    expect([...FUTURE_LOCALE_CODES]).toEqual(["zh-TW"]);
    expect(toWorldCatalogLocaleKey("zh-CN")).toBe("zh");
    expect(normalizeToAppLocale("zh-TW")).toBeNull();
  });

  it("Wave 2 catalogs have identical key sets and no empty strings", () => {
    const expected = [...keys].sort();
    for (const locale of WAVE2) {
      const actual = Object.keys(MESSAGE_CATALOGS[locale]).sort();
      expect(actual).toEqual(expected);
      for (const key of keys) {
        expect(MESSAGE_CATALOGS[locale][key].trim().length, `${locale}:${key}`).toBeGreaterThan(
          0
        );
      }
    }
  });

  it("preserves placeholders across Wave 2", () => {
    for (const key of keys) {
      const expected = placeholders(enMessages[key]);
      if (expected.length === 0) continue;
      for (const locale of WAVE2) {
        expect(placeholders(MESSAGE_CATALOGS[locale][key]), `${locale}:${key}`).toEqual(
          expected
        );
      }
    }
  });

  it("does not leak English chrome except brand/protocol tokens", () => {
    const leaks: string[] = [];
    for (const locale of WAVE2) {
      for (const key of keys) {
        const value = MESSAGE_CATALOGS[locale][key];
        const source = enMessages[key];
        if (key.startsWith("languages.")) continue;
        if (value === source && !BRAND_OR_IDENTICAL.has(source)) {
          const onlyBrand =
            /UMTUBA|UM Points|you@email\.com|your\.name/.test(source) &&
            source.length < 24;
          if (!onlyBrand) leaks.push(`${locale}:${key}=${source}`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it("does not treat zh-CN as Traditional and keeps Wave 2 LTR", () => {
    expect(MESSAGE_CATALOGS["zh-CN"]["nav.discover"]).toBe("发现");
    expect(MESSAGE_CATALOGS["zh-CN"]["nav.discover"]).not.toBe("發現");
    expect(MESSAGE_CATALOGS["zh-CN"]["settings.language"]).toBe("语言");
    expect(MESSAGE_CATALOGS["zh-CN"]["settings.language"]).not.toBe("語言");
    for (const locale of WAVE2) {
      expect(SUPPORTED_LOCALES.includes(locale)).toBe(true);
    }
  });
});
