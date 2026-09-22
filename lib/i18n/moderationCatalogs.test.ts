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

  it("translates report and video more menus on every locale", () => {
    const mustDiffer = keys.filter(
      (key) =>
        key.startsWith("video.more.") ||
        key === "report.button" ||
        key === "report.submit" ||
        key.startsWith("report.title.") ||
        key.startsWith("report.error.")
    );
    expect(mustDiffer.length).toBeGreaterThan(0);
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      for (const key of mustDiffer) {
        const value =
          MESSAGE_CATALOGS[locale][key as keyof typeof moderationEnMessages];
        expect(value.trim().length, `${locale} ${key}`).toBeGreaterThan(0);
        expect(value, `${locale} ${key}`).not.toBe(
          moderationEnMessages[key as keyof typeof moderationEnMessages]
        );
      }
    }
  });
});
