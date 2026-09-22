import { describe, expect, it } from "vitest";
import { MESSAGE_CATALOGS } from "./messages/catalogs";
import { SUPPORTED_LOCALES } from "./locales";
import type { TranslationKey } from "./messages/types";

const RECENT_UI_KEYS = [
  "video.more.button",
  "video.more.editCaption",
  "video.more.copyLink",
  "video.more.delete",
  "video.more.notInterested",
  "video.more.report",
  "video.views.label",
  "games.title",
  "games.play",
  "games.howTo",
  "games.playAgain",
  "analytics.consent.accept",
  "analytics.consent.decline",
  "analytics.consent.body",
] as const satisfies readonly TranslationKey[];

describe("catalog key parity with English", () => {
  it("fails if any locale is missing a key that exists in en", () => {
    const enKeys = Object.keys(MESSAGE_CATALOGS.en) as TranslationKey[];
    expect(enKeys.length).toBeGreaterThan(0);

    for (const locale of SUPPORTED_LOCALES) {
      const catalog = MESSAGE_CATALOGS[locale];
      for (const key of enKeys) {
        const value = catalog[key];
        expect(value, `${locale} missing ${key}`).toEqual(expect.any(String));
        expect(value.trim().length, `${locale} empty ${key}`).toBeGreaterThan(0);
      }
    }
  });

  it("translates recent UI chrome instead of leaving English", () => {
    const en = MESSAGE_CATALOGS.en;
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      for (const key of RECENT_UI_KEYS) {
        expect(MESSAGE_CATALOGS[locale][key], `${locale} ${key}`).not.toBe(
          en[key]
        );
      }
    }
  });
});
