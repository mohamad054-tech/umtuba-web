import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  compactLocaleLabel,
  getLocaleDirection,
  isAppLocale,
  normalizeToAppLocale,
  resolveLocaleOrFallback,
} from "./locales";
import { parseAcceptLanguageHeader, resolveAppLocale } from "./resolve";
import { translate, resetMissingTranslationWarningsForTests } from "./translate";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "./format";
import { MESSAGE_CATALOGS } from "./messages/catalogs";
import type { TranslationKey } from "./messages/types";

describe("locale contract", () => {
  it("supports the thirteen platform locales", () => {
    expect([...SUPPORTED_LOCALES]).toEqual([
      "ar",
      "en",
      "fr",
      "es",
      "de",
      "pt",
      "id",
      "hi",
      "ru",
      "tr",
      "zh-CN",
      "ja",
      "ko",
    ]);
    for (const code of SUPPORTED_LOCALES) {
      expect(isAppLocale(code)).toBe(true);
    }
  });

  it("rejects unsupported locales", () => {
    expect(isAppLocale("zh")).toBe(false);
    expect(isAppLocale("zh-TW")).toBe(false);
    expect(isAppLocale("en-US")).toBe(false);
    expect(isAppLocale("")).toBe(false);
    expect(isAppLocale(null)).toBe(false);
  });

  it("falls back safely for unsupported tags", () => {
    expect(resolveLocaleOrFallback("zh-TW")).toBe(DEFAULT_LOCALE);
    expect(resolveLocaleOrFallback("zh-CN")).toBe("zh-CN");
    expect(resolveLocaleOrFallback("")).toBe("en");
    expect(resolveLocaleOrFallback(undefined)).toBe("en");
  });

  it("marks Arabic RTL and others LTR", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    for (const code of SUPPORTED_LOCALES) {
      if (code === "ar") continue;
      expect(getLocaleDirection(code)).toBe("ltr");
    }
  });

  it("exposes compact chrome codes for current locales and pt-BR alias", () => {
    expect(compactLocaleLabel("en")).toBe("EN");
    expect(compactLocaleLabel("ar")).toBe("AR");
    expect(compactLocaleLabel("pt")).toBe("PT");
    expect(normalizeToAppLocale("pt-BR")).toBe("pt");
    expect(compactLocaleLabel(normalizeToAppLocale("pt-BR") ?? "en")).toBe("PT");
  });
});

describe("browser language normalization", () => {
  it("normalizes regional tags to primary supported locales", () => {
    expect(normalizeToAppLocale("ar-PS")).toBe("ar");
    expect(normalizeToAppLocale("en-US")).toBe("en");
    expect(normalizeToAppLocale("fr_CA")).toBe("fr");
    expect(normalizeToAppLocale("ES-mx")).toBe("es");
    expect(normalizeToAppLocale("de-DE")).toBe("de");
    expect(normalizeToAppLocale("pt-BR")).toBe("pt");
  });

  it("returns null for unknown primary languages", () => {
    expect(normalizeToAppLocale("zh-Hans")).toBe("zh-CN");
    expect(normalizeToAppLocale("ja")).toBe("ja");
    expect(normalizeToAppLocale("zh-TW")).toBeNull();
  });
});

describe("locale resolution order", () => {
  it("prefers saved cookie over URL explicit and browser", () => {
    expect(
      resolveAppLocale({
        explicit: "ar",
        cookiePreference: "fr",
        browserLanguages: "de",
      })
    ).toBe("fr");
  });

  it("uses URL explicit when no saved preference exists", () => {
    expect(
      resolveAppLocale({
        explicit: "ar",
        browserLanguages: "de",
      })
    ).toBe("ar");
  });

  it("prefers user preference over cookie when explicit absent", () => {
    expect(
      resolveAppLocale({
        userPreference: "es",
        cookiePreference: "fr",
        browserLanguages: "de",
      })
    ).toBe("es");
  });

  it("prefers cookie over browser", () => {
    expect(
      resolveAppLocale({
        cookiePreference: "pt",
        browserLanguages: "de-DE,en;q=0.8",
      })
    ).toBe("pt");
  });

  it("uses Accept-Language quality order", () => {
    expect(parseAcceptLanguageHeader("fr-FR,fr;q=0.9,en;q=0.8")).toEqual([
      "fr-FR",
      "fr",
      "en",
    ]);
    expect(
      resolveAppLocale({
        browserLanguages: "zh-CN,fr-FR;q=0.8,en;q=0.5",
      })
    ).toBe("zh-CN");
  });

  it("falls back to default when nothing matches", () => {
    expect(
      resolveAppLocale({
        explicit: "nope",
        cookiePreference: "xx",
        browserLanguages: "xx,yy",
      })
    ).toBe("en");
  });

  it("ignores invalid cookie and uses browser", () => {
    expect(
      resolveAppLocale({
        cookiePreference: "invalid",
        browserLanguages: "ar-EG",
      })
    ).toBe("ar");
  });
});

describe("translation catalogs", () => {
  const sampleKeys: TranslationKey[] = [
    "actions.save",
    "actions.cancel",
    "status.loading",
    "settings.language",
    "languages.ar",
    "nav.home",
    "nav.following",
    "following.title",
    "settings.title",
    "world.titleHold",
    "world.hold.migrations",
    "world.error.unavailable",
    "learning.lesson.unavailableTitle",
    "learning.lesson.returnToCatalog",
    "learning.catalog.title",
    "learning.course.curriculum",
    "learning.enroll.notEligible",
    "learning.enroll.requiredTitle",
    "learning.hub.subtitle",
    "store.chrome.orders",
    "store.empty.catalogTitle",
    "store.hero.shopTitle",
  ];

  it("provides foundation keys for every supported locale", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = MESSAGE_CATALOGS[locale];
      for (const key of sampleKeys) {
        expect(catalog[key].length).toBeGreaterThan(0);
      }
    }
  });

  it("translates Arabic actions", () => {
    expect(translate("ar", "actions.save")).toBe("حفظ");
    expect(translate("ar", "actions.cancel")).toBe("إلغاء");
  });

  it("localizes Learning lesson unavailable chrome including Arabic RTL", () => {
    expect(translate("en", "learning.lesson.unavailableTitle")).toBe(
      "Lesson unavailable"
    );
    expect(translate("ar", "learning.lesson.unavailableTitle")).toBe(
      "الدرس غير متاح"
    );
    expect(translate("ar", "learning.lesson.returnToCatalog")).toBe(
      "العودة إلى كتالوج التعلّم"
    );
    expect(translate("ar", "learning.catalog.title")).toBe("كتالوج التعلّم");
    expect(translate("ar", "learning.course.free")).toBe("مجاني");
    expect(translate("ar", "learning.enroll.notEligible")).toBe(
      "لست مؤهلًا للتسجيل الذاتي في هذه الدورة."
    );
    expect(translate("ar", "learning.enroll.requiredTitle")).toBe(
      "التسجيل مطلوب"
    );
    expect(getLocaleDirection("ar")).toBe("rtl");
  });
});


describe("missing translation fallback", () => {
  beforeEach(() => {
    resetMissingTranslationWarningsForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("falls back without throwing for unknown keys at runtime cast", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const value = translate("fr", "actions.missing" as TranslationKey);
    expect(value).toBe("actions.missing");
    expect(warn).toHaveBeenCalled();
  });
});

describe("formatters", () => {
  it("formats numbers with locale-aware grouping", () => {
    expect(formatNumber("en", 1234.5)).toMatch(/1[,.]234/);
    expect(formatNumber("de", 1234.5)).toMatch(/1\.234/);
  });

  it("formats percentages", () => {
    expect(formatPercent("en", 0.25)).toMatch(/25/);
  });

  it("formats currency without changing the numeric value", () => {
    const usd = formatCurrency("en", 10, "USD");
    expect(usd).toMatch(/10/);
    expect(usd).toMatch(/\$|USD/);
  });

  it("formats dates for Arabic and English", () => {
    const stamp = new Date("2026-07-30T12:00:00Z");
    const en = formatDate("en", stamp, { year: "numeric", month: "short" });
    const ar = formatDate("ar", stamp, { year: "numeric", month: "short" });
    expect(en.length).toBeGreaterThan(0);
    expect(ar.length).toBeGreaterThan(0);
  });

  it("returns empty string for invalid dates", () => {
    expect(formatDate("en", "not-a-date")).toBe("");
  });
});
