import { describe, expect, it } from "vitest";
import {
  legalArMessages,
  legalEnMessages,
} from "./messages/legalCatalogs";
import { MESSAGE_CATALOGS } from "./messages/catalogs";
import { SUPPORTED_LOCALES } from "./locales";

describe("legal i18n catalogs", () => {
  const keys = Object.keys(legalEnMessages);

  it("adds the same keys to English and Arabic", () => {
    expect(Object.keys(legalArMessages)).toEqual(keys);
    expect(keys.length).toBeGreaterThan(200);
    expect(legalArMessages["legal.draftBanner"]).toMatch(/مسودة/);
    expect(legalEnMessages["legal.draftBanner"]).toMatch(/DRAFT/);
  });

  it("keeps long-form legal body as English drafts on the other 11 locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en" || locale === "ar") continue;
      for (const key of keys) {
        if (key.startsWith("analytics.consent.")) continue;
        expect(
          MESSAGE_CATALOGS[locale][key as keyof typeof legalEnMessages]
        ).toBe(legalEnMessages[key as keyof typeof legalEnMessages]);
      }
    }
  });

  it("translates the cookie consent banner on every locale", () => {
    const consentKeys = keys.filter((key) =>
      key.startsWith("analytics.consent.")
    );
    expect(consentKeys.length).toBeGreaterThan(0);
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      for (const key of consentKeys) {
        const value =
          MESSAGE_CATALOGS[locale][key as keyof typeof legalEnMessages];
        expect(value.trim().length).toBeGreaterThan(0);
        expect(value, `${locale} ${key}`).not.toBe(
          legalEnMessages[key as keyof typeof legalEnMessages]
        );
      }
    }
  });
});
