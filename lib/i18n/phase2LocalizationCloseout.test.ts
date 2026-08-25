import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, translate } from "./index";
import { resolveLocaleFromQueryAndCookie } from "../site/hreflang";
import { MESSAGE_CATALOGS } from "./messages/catalogs";
import type { TranslationKey } from "./messages/types";

const WATCH_KEYS: TranslationKey[] = [
  "watch.discoverWorld",
  "watch.fullscreen",
  "watch.exitFullscreen",
  "nav.discover",
];

const LEARNING_PUBLIC_KEYS: TranslationKey[] = [
  "learning.visual.greeting",
  "learning.visual.guestName",
  "learning.visual.discover",
  "learning.visual.myLibrary",
  "learning.hub.becomeTeacher",
  "learning.hub.teacherCenter",
];

function readRepo(relativePath: string) {
  return readFileSync(join(process.cwd(), relativePath), "utf8");
}

describe("Phase 2 localization closeout", () => {
  it("ships Watch fullscreen/discover chrome in all 13 locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      for (const key of WATCH_KEYS) {
        expect(MESSAGE_CATALOGS[locale][key].trim().length).toBeGreaterThan(0);
      }
    }
    expect(translate("ar", "watch.discoverWorld")).toBe("اكتشف العالم");
    expect(translate("ar", "watch.fullscreen")).toBe("ملء الشاشة");
    expect(translate("fr", "watch.fullscreen")).toBe("Plein écran");
    expect(translate("ja", "nav.discover")).toBe("発見");
  });

  it("does not keep English Learning guest chrome in non-English locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      expect(translate(locale, "learning.visual.greeting")).not.toBe(
        "Welcome back, {name}"
      );
      expect(translate(locale, "learning.visual.guestName")).not.toBe("Guest");
      expect(translate(locale, "learning.visual.discover")).not.toBe("Discover");
      expect(translate(locale, "learning.visual.myLibrary")).not.toBe(
        "My library"
      );
      expect(translate(locale, "learning.hub.teacherCenter")).not.toBe(
        "Teacher Center"
      );
      expect(translate(locale, "learning.hub.becomeTeacher")).not.toBe(
        "Become a Teacher"
      );
      expect(translate(locale, "learning.visual.liveBanner")).not.toBe(
        "UMTUBA Learning — live product catalog and routes."
      );
    }
    for (const key of LEARNING_PUBLIC_KEYS) {
      expect(translate("fr", key).trim().length).toBeGreaterThan(0);
    }
  });

  it("localizes Search placeholder and category tabs in all 13 locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      expect(translate(locale, "search.placeholder")).not.toMatch(
        /Search people, videos/
      );
      expect(translate(locale, "search.tab.all")).not.toBe("All");
    }
    expect(translate("ar", "search.placeholder")).toContain("أشخاص");
    const search = readRepo("app/search/SearchExperience.tsx");
    expect(search).toMatch(/t\("search.placeholder"\)/);
    expect(search).toMatch(/SEARCH_TAB_KEYS/);
    expect(search).not.toMatch(/Search people, videos, stories, stores/);
  });

  it("wires Watch header chrome to i18n instead of English literals", () => {
    const watch = readRepo("app/watch/WatchExperience.tsx");
    expect(watch).toMatch(/t\("watch.discoverWorld"\)/);
    expect(watch).toMatch(/t\("nav.discover"\)/);
    expect(watch).toMatch(/t\("watch.fullscreen"\)/);
    expect(watch).toMatch(/t\("watch.exitFullscreen"\)/);
    expect(watch).not.toMatch(/>\s*Discover\s*</);
    expect(watch).not.toMatch(/"Discover the world"/);
    expect(watch).not.toMatch(/>\s*Fullscreen\s*</);
    expect(watch).not.toMatch(/"Exit Fullscreen"/);
  });

  it("localizes forgot-password and update-password chrome in all 13 locales", () => {
    for (const locale of SUPPORTED_LOCALES) {
      if (locale === "en") continue;
      expect(translate(locale, "auth.forgot.title")).not.toBe(
        "Reset your password"
      );
      expect(translate(locale, "auth.forgot.submit")).not.toBe(
        "Send reset link"
      );
      expect(translate(locale, "auth.updatePassword.invalidTitle")).not.toBe(
        "Link invalid or expired"
      );
      expect(translate(locale, "auth.field.showPassword")).not.toBe("Show");
    }
    expect(translate("ar", "auth.forgot.title")).toBe("إعادة تعيين كلمة المرور");
    expect(translate("ar", "auth.forgot.submit")).toContain("رابط");
    const forgot = readRepo("app/forgot-password/page.tsx");
    expect(forgot).toMatch(/t\("auth.forgot.title"\)/);
    expect(forgot).not.toMatch(/"Reset your password"/);
    const update = readRepo("app/auth/update-password/page.tsx");
    expect(update).toMatch(/t\("auth.updatePassword.title"\)/);
    expect(update).not.toMatch(/"Choose a new password"/);
    const field = readRepo("app/components/auth/AuthField.tsx");
    expect(field).toMatch(/t\("auth.field.showPassword"\)/);
    expect(field).not.toMatch(/>Show</);
  });

  it("preserves hl and locale cookie on auth-gate login redirects", () => {
    const middleware = readRepo("lib/supabase/middleware.ts");
    expect(middleware).toMatch(/resolveLocaleFromQueryAndCookie/);
    expect(middleware).toMatch(/LOCALE_QUERY_PARAM/);
    expect(resolveLocaleFromQueryAndCookie((key) => (key === "hl" ? "ar" : null), null)).toBe(
      "ar"
    );
    expect(
      resolveLocaleFromQueryAndCookie(() => null, "zh-CN")
    ).toBe("zh-CN");
    expect(resolveLocaleFromQueryAndCookie(() => null, "nope")).toBeNull();
  });
});
