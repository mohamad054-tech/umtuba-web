import { describe, expect, it } from "vitest";
import {
  SUPPORTED_LOCALES,
  compactLocaleLabel,
  getLocaleDirection,
  normalizeToAppLocale,
  resolveAppLocale,
  translate,
} from "./index";
import { MESSAGE_CATALOGS } from "./messages/catalogs";
import { storeEnMessages } from "./messages/storeCatalogs";
import type { TranslationKey } from "./messages/types";
import { sandboxT } from "../sandbox/i18n";
import { storeT } from "../sandbox/store/messages";

const NEW_LOCALES = ["id", "hi", "ru", "tr", "zh-CN", "ja", "ko"] as const;
const CHROME: TranslationKey[] = [
  "nav.home",
  "nav.discover",
  "nav.search",
  "nav.messages",
  "nav.profile",
  "nav.following",
  "menu.create",
  "menu.saved",
  "menu.following",
  "menu.store",
  "menu.learning",
  "watch.eyebrow",
  "watch.readOnUmLife",
  "life.composeNav",
  "create.title",
  "search.title",
  "messages.title",
  "settings.language",
  "store.chrome.orders",
  "store.chrome.favorites",
  "learning.hub.title",
];

describe("professional 13-language registry", () => {
  it("lands thirteen locales with zh-CN distinct from zh-TW", () => {
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
    expect(normalizeToAppLocale("zh-Hans")).toBe("zh-CN");
    expect(normalizeToAppLocale("zh-CN")).toBe("zh-CN");
    expect(normalizeToAppLocale("zh")).toBe("zh-CN");
    expect(normalizeToAppLocale("zh-TW")).toBeNull();
    expect(normalizeToAppLocale("zh-Hant")).toBeNull();
    expect(normalizeToAppLocale("ko-KR")).toBe("ko");
    expect(normalizeToAppLocale("id-ID")).toBe("id");
    expect(compactLocaleLabel("zh-CN")).toBe("ZH");
  });

  it("keeps Arabic RTL and every other landed locale LTR", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    for (const code of SUPPORTED_LOCALES) {
      if (code === "ar") continue;
      expect(getLocaleDirection(code)).toBe("ltr");
    }
  });

  it("auto-detects new device locales without a cookie", () => {
    expect(resolveAppLocale({ browserLanguages: "ja-JP,en;q=0.4" })).toBe("ja");
    expect(resolveAppLocale({ browserLanguages: "zh-CN,en;q=0.3" })).toBe(
      "zh-CN"
    );
    expect(resolveAppLocale({ browserLanguages: "ko-KR" })).toBe("ko");
    expect(
      resolveAppLocale({
        cookiePreference: "en",
        browserLanguages: "ja",
      })
    ).toBe("en");
  });

  it("provides every foundation and store key in all 13 locales", () => {
    const storeKeys = Object.keys(storeEnMessages);
    for (const locale of SUPPORTED_LOCALES) {
      const catalog = MESSAGE_CATALOGS[locale];
      for (const key of CHROME) {
        expect(catalog[key].length, `${locale} ${key}`).toBeGreaterThan(0);
      }
      for (const key of storeKeys) {
        expect(String(catalog[key as TranslationKey] ?? "").length).toBeGreaterThan(
          0
        );
      }
    }
  });

  it("does not leak English product chrome in the seven new locales", () => {
    for (const locale of NEW_LOCALES) {
      for (const key of CHROME) {
        const value = translate(locale, key);
        const english = translate("en", key);
        expect(value, `${locale} ${key}`).not.toBe(english);
      }
    }
    expect(translate("zh-CN", "nav.discover")).toBe("发现");
    expect(translate("zh-CN", "nav.discover")).not.toBe("發現");
    expect(translate("ja", "watch.eyebrow")).toBe("視聴");
    expect(translate("ko", "nav.discover")).toBe("탐색");
    expect(translate("ru", "nav.following")).toBe("Подписки");
    expect(translate("id", "menu.create")).toBe("Buat");
    expect(translate("hi", "nav.search")).toBe("खोज");
    expect(translate("tr", "nav.discover")).toBe("Keşfet");
  });

  it("translates Watch as a surface label and keeps UMTUBA Latin", () => {
    expect(translate("fr", "watch.eyebrow")).toBe("Regarder");
    expect(translate("es", "watch.eyebrow")).toBe("Ver");
    expect(translate("de", "watch.eyebrow")).toBe("Ansehen");
    expect(translate("pt", "watch.eyebrow")).toBe("Assistir");
    expect(translate("fr", "landing.joinCta")).toContain("UMTUBA");
    expect(translate("ja", "landing.joinCta")).toContain("UMTUBA");
    expect(translate("zh-CN", "landing.joinCta")).toContain("UMTUBA");
  });

  it("localizes sandbox Learning and Store chrome for the seven new locales", () => {
    const learningKeys = [
      "title",
      "hub",
      "learning",
      "store",
      "signIn",
      "catalog",
      "commercial",
      "rights",
      "openCourse",
      "authoredSourceLanguage",
    ] as const;
    const storeKeys = [
      "home",
      "catalog",
      "search",
      "cart",
      "checkout",
      "addToCart",
      "heroTitle",
      "emptyCart",
    ] as const;
    for (const locale of NEW_LOCALES) {
      for (const key of learningKeys) {
        expect(sandboxT(locale, key), `${locale} sandbox ${key}`).not.toBe(
          sandboxT("en", key)
        );
      }
      for (const key of storeKeys) {
        expect(storeT(locale, key), `${locale} sandbox-store ${key}`).not.toBe(
          storeT("en", key)
        );
      }
    }
    expect(sandboxT("id", "learning")).toBe("Pembelajaran");
    expect(sandboxT("hi", "store")).toBe("स्टोर");
    expect(sandboxT("ru", "commercial")).toBe("Коммерческая модель");
    expect(sandboxT("tr", "rights")).toBe("Haklar");
    expect(sandboxT("zh-CN", "hub")).toBe("概览");
    expect(sandboxT("ja", "learning")).toBe("学習");
    expect(sandboxT("ko", "store")).toBe("스토어");
    expect(storeT("zh-CN", "addToCart")).toBe("加入购物车");
    expect(storeT("ja", "checkout")).toBe("会計");
    expect(storeT("ko", "favorites")).toBe("찜");
  });
});
