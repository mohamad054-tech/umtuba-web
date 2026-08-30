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
    expect(translate("en", desktopNavLabelKey("/"))).toBe("UM Life");
    expect(translate("ar", desktopNavLabelKey("/"))).toBe("UM Life");
    expect(translate("en", desktopNavLabelKey("/watch"))).toBe("Watch");
    expect(translate("ar", desktopNavLabelKey("/watch"))).toBe("شاهد");
    expect(translate("en", mobileNavLabelKey("umLife"))).toBe("UM Life");
    expect(translate("ar", mobileNavLabelKey("umLife"))).toBe("UM Life");
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
    expect(translate("en", "profile.who.eyebrow")).toBe("Who they are");
    expect(translate("ar", "profile.who.eyebrow")).toBe("من هم");
    expect(translate("en", "settings.profilePlacesHint").length).toBeGreaterThan(
      0
    );
    expect(translate("en", "settings.communications")).toBe("Communications");
    expect(translate("ar", "settings.communications")).toBe("التواصل");
    expect(translate("en", "comms.startConversation")).toBe("Start conversation");
    expect(translate("ar", "comms.startConversation")).toBe("بدء محادثة");
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
      "social.composer.prompt",
      "social.like",
      "settings.longBio",
      "profile.about.milestones",
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
    expect(translate("fr", "nav.home")).toBe("Home");
    expect(userMenuItemLabelKey("settings")).toBe("menu.settings");
    expect(userMenuGroupLabelKey("you")).toBe("menu.you");
    expect(translate("en", userMenuItemLabelKey("seller"))).toBe("Seller hub");
    expect(translate("ar", userMenuItemLabelKey("seller"))).toBe("مركز البائع");
  });
});
