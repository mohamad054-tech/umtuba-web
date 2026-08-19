import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  buildLocaleDocumentCookie,
  getLocaleDirection,
  parseLocaleCookieValue,
  resolveAppLocale,
  translate,
} from "./index";
import {
  desktopNavLabelKey,
  mobileNavLabelKey,
  userMenuGroupLabelKey,
  userMenuItemLabelKey,
} from "./shellLabels";

describe("App Shell translation V1", () => {
  it("translates primary navigation for Arabic and English", () => {
    expect(translate("en", "nav.home")).toBe("Home");
    expect(translate("ar", "nav.home")).toBe("الرئيسية");
    expect(translate("en", "nav.messages")).toBe("Messages");
    expect(translate("ar", "nav.messages")).toBe("الرسائل");
    expect(translate("en", desktopNavLabelKey("/world"))).toBe("World");
    expect(translate("ar", desktopNavLabelKey("/world"))).toBe("العالم");
    expect(translate("en", mobileNavLabelKey("profile"))).toBe("Profile");
    expect(translate("ar", mobileNavLabelKey("profile"))).toBe("الملف");
  });

  it("translates settings chrome and language labels", () => {
    expect(translate("en", "settings.title")).toBe("Settings");
    expect(translate("ar", "settings.title")).toBe("الإعدادات");
    expect(translate("en", "settings.language")).toBe("Language");
    expect(translate("ar", "settings.language")).toBe("اللغة");
    expect(translate("en", "settings.signOut")).toBe("Sign out");
    expect(translate("ar", "settings.signOut")).toBe("تسجيل الخروج");
  });

  it("translates generic actions, status, dialogs, and empty/error", () => {
    for (const key of [
      "actions.save",
      "actions.cancel",
      "actions.continue",
      "actions.back",
      "actions.retry",
      "actions.close",
      "actions.edit",
      "actions.delete",
      "actions.search",
      "actions.confirm",
      "status.loading",
      "status.empty",
      "status.error",
      "status.success",
      "dialog.confirmTitle",
      "empty.title",
      "error.title",
    ] as const) {
      expect(translate("en", key).length).toBeGreaterThan(0);
      expect(translate("ar", key).length).toBeGreaterThan(0);
      expect(translate("ar", key)).not.toBe(translate("en", key));
    }
  });

  it("switches RTL for Arabic and LTR for English", () => {
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(getLocaleDirection("en")).toBe("ltr");
  });

  it("localizes landing join CTA (UAF-06) without hardcoding Arabic globally", () => {
    expect(translate("en", "landing.joinCta")).toBe("Join UMTUBA");
    expect(translate("ar", "landing.joinCta")).toBe("انضم إلى UMTUBA");
    expect(translate("fr", "landing.joinCta")).toBe("Rejoindre UMTUBA");
    expect(translate("en", "landing.startExploring")).toBe("Start Exploring");
    expect(translate("ar", "landing.startExploring")).toBe("ابدأ الاستكشاف");
  });

  it("persists locale via cookie helpers", () => {
    const cookie = buildLocaleDocumentCookie("ar");
    expect(cookie).toContain("umtuba_locale=ar");
    expect(parseLocaleCookieValue("ar")).toBe("ar");
    expect(parseLocaleCookieValue("en-US")).toBe("en");
    expect(
      resolveAppLocale({
        cookiePreference: "ar",
        browserLanguages: "en-US",
      })
    ).toBe("ar");
    expect(
      resolveAppLocale({
        cookiePreference: "en",
        browserLanguages: "ar-PS",
      })
    ).toBe("en");
  });

  it("falls back safely for missing keys and unsupported locales", () => {
    expect(resolveAppLocale({ explicit: "nope" })).toBe(DEFAULT_LOCALE);
    expect(translate("fr", "nav.home")).toBe("Accueil");
    expect(translate("es", "nav.home")).toBe("Inicio");
    expect(translate("de", "nav.home")).toBe("Start");
    expect(translate("pt", "nav.home")).toBe("Início");
    expect(userMenuItemLabelKey("settings")).toBe("menu.settings");
    expect(userMenuGroupLabelKey("you")).toBe("menu.you");
    expect(translate("en", userMenuItemLabelKey("seller"))).toBe("Seller hub");
    expect(translate("ar", userMenuItemLabelKey("seller"))).toBe("مركز البائع");
    expect(userMenuItemLabelKey("following")).toBe("menu.following");
    expect(translate("en", "following.title")).toBe("Following");
    expect(translate("ar", "following.title")).toBe("المتابَعون");
    expect(translate("fr", "following.title")).toBe("Abonnements");
    expect(translate("es", "following.title")).toBe("Siguiendo");
    expect(translate("de", "following.title")).toBe("Folge ich");
    expect(translate("pt", "following.title")).toBe("Seguindo");
  });

  it("localizes remaining chrome for all six locales", () => {
    const chromeKeys = [
      "nav.home",
      "nav.messages",
      "menu.settings",
      "home.upload",
      "search.title",
      "messages.title",
      "watch.eyebrow",
      "create.title",
      "store.profile.about",
      "store.profile.currency",
      "auth.login.email",
    ] as const;

    expect(translate("en", "store.profile.about")).toBe("About");
    expect(translate("ar", "store.profile.about")).toBe("حول المتجر");
    expect(translate("fr", "store.profile.currency")).toBe("Devise");
    expect(translate("es", "create.title")).toBe("Crear");
    expect(translate("de", "messages.title")).toBe("Nachrichten");
    expect(translate("pt", "search.title")).toBe("Pesquisar");

    for (const key of chromeKeys) {
      const english = translate("en", key);
      for (const locale of ["ar", "fr", "es", "de", "pt"] as const) {
        expect(translate(locale, key).length).toBeGreaterThan(0);
        expect(translate(locale, key)).not.toBe(english);
      }
    }
  });
});
