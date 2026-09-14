import { describe, expect, it } from "vitest";
import {
  moderationArMessages,
  moderationEnMessages,
} from "./messages/moderationCatalogs";
import { MESSAGE_CATALOGS } from "./messages/catalogs";
import { SUPPORTED_LOCALES } from "./locales";

describe("moderation i18n catalogs", () => {
  const keys = Object.keys(moderationEnMessages);

  it("adds the same keys to English and Arabic", () => {
    expect(Object.keys(moderationArMessages)).toEqual(keys);
    expect(keys.length).toBeGreaterThan(50);
    expect(moderationArMessages["report.button"]).toMatch(/إبلاغ/);
    expect(moderationEnMessages["report.button"]).toBe("Report");
  });

  it("places English placeholders on the other 11 locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en" || locale === "ar") continue;
      for (const key of keys) {
        expect(
          MESSAGE_CATALOGS[locale][key as keyof typeof moderationEnMessages]
        ).toBe(moderationEnMessages[key as keyof typeof moderationEnMessages]);
      }
    }
  });
});
