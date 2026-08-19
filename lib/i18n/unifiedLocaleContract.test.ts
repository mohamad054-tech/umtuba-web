import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_LOCALE,
  persistLocaleDocumentCookies,
  planDeviceLocaleBridge,
  readLocaleFromSearch,
  readSavedLocaleFromDocument,
  resolveAppLocale,
  resolveSupportedBrowserLocale,
} from "./index";
import { getLocaleDirection } from "./locales";
import { sandboxDirection, sandboxT } from "../sandbox/i18n";
import { storeT } from "../sandbox/store/messages";

const ARABIC = /[\u0600-\u06FF]/;
const ROOT = join(__dirname, "../..");

function read(rel: string) {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("unified web locale contract", () => {
  it("resolves device Arabic with no saved preference to ar + RTL", () => {
    expect(
      resolveAppLocale({
        browserLanguages: "ar-PS,ar;q=0.9,en;q=0.3",
      })
    ).toBe("ar");
    expect(getLocaleDirection("ar")).toBe("rtl");
    expect(resolveSupportedBrowserLocale("ar-EG")).toBe("ar");
  });

  it("resolves device German to de", () => {
    expect(resolveAppLocale({ browserLanguages: "de-DE,de;q=0.9" })).toBe("de");
  });

  it("falls back to English for unsupported device locales", () => {
    expect(resolveAppLocale({ browserLanguages: "ja,zh-Hans" })).toBe("ja");
    expect(resolveSupportedBrowserLocale("xx,yy")).toBeNull();
  });

  it("keeps manual English on an Arabic device", () => {
    expect(
      resolveAppLocale({
        cookiePreference: "en",
        browserLanguages: "ar-PS",
      })
    ).toBe("en");
    expect(
      planDeviceLocaleBridge({
        cookiePreference: "en",
        deviceLanguages: ["ar-PS"],
        serverLocale: "en",
      })
    ).toEqual({ action: "none" });
  });

  it("ranks saved preference above URL above device", () => {
    expect(
      resolveAppLocale({
        cookiePreference: "en",
        explicit: "ar",
        browserLanguages: "de",
      })
    ).toBe("en");
    expect(
      resolveAppLocale({
        explicit: "pt",
        browserLanguages: "ar",
      })
    ).toBe("pt");
  });

  it("reads hl and locale URL aliases", () => {
    expect(readLocaleFromSearch("?hl=ar")).toBe("ar");
    expect(readLocaleFromSearch("locale=de&q=bag")).toBe("de");
    expect(readLocaleFromSearch("?hl=zz")).toBeNull();
  });

  it("bridges navigator.language only when no cookie or URL locale exists", () => {
    expect(
      planDeviceLocaleBridge({
        deviceLanguages: ["ar-PS", "en"],
        serverLocale: "en",
      })
    ).toEqual({
      action: "persist",
      locale: "ar",
      reason: "device-mismatch",
    });
    expect(
      planDeviceLocaleBridge({
        urlLocale: "fr",
        deviceLanguages: ["ar"],
        serverLocale: "fr",
      })
    ).toEqual({ action: "none" });
    expect(
      planDeviceLocaleBridge({
        deviceLanguages: ["zh-TW"],
        serverLocale: "en",
      })
    ).toEqual({ action: "none" });
    expect(
      planDeviceLocaleBridge({
        deviceLanguages: ["de-DE"],
        serverLocale: "de",
      })
    ).toEqual({
      action: "persist",
      locale: "de",
      reason: "device-persist",
    });
  });

  it("persists explicit LanguageSelector cookies that survive device locale", () => {
    const cookies = persistLocaleDocumentCookies("en", "explicit");
    const header = cookies
      .map((entry) => entry.split(";")[0] ?? "")
      .join("; ");
    expect(header).toContain("umtuba_locale=en");
    expect(header).toContain("umtuba_locale_source=explicit");
    expect(readSavedLocaleFromDocument(header)).toBe("en");
  });

  it("translates Store + Learning sandbox chrome to Arabic without rewriting authored titles", () => {
    expect(storeT("ar", "cart")).toMatch(ARABIC);
    expect(storeT("ar", "checkout")).toMatch(ARABIC);
    expect(storeT("ar", "orders")).toMatch(ARABIC);
    expect(storeT("ar", "search")).toMatch(ARABIC);
    expect(sandboxT("ar", "learning")).toMatch(ARABIC);
    expect(sandboxT("ar", "enrollSandbox")).toMatch(ARABIC);
    expect(sandboxT("ar", "aiTutor")).toMatch(ARABIC);
    expect(sandboxT("ar", "certificate")).toMatch(ARABIC);
    expect(sandboxDirection("ar")).toBe("rtl");
    expect(sandboxT("ar", "authoredSourceLanguage")).toMatch(ARABIC);
  });

  it("keeps one locale system across shell, store, learning, and sandbox", () => {
    expect(read("app/layout.tsx")).toMatch(/resolveRequestLocale/);
    expect(read("app/layout.tsx")).toMatch(/force-dynamic/);
    expect(read("app/store/page.tsx")).toMatch(/resolveRequestLocale/);
    expect(read("app/learning/page.tsx")).toMatch(/resolveRequestLocale/);
    expect(read("app/sandbox/business-preview/page.tsx")).toMatch(
      /resolveRequestLocale/
    );
    expect(read("app/components/i18n/I18nProvider.tsx")).toMatch(
      /DeviceLocaleBridge/
    );
    expect(read("app/components/i18n/LanguageSelector.tsx")).toMatch(
      /applyDocumentLocale/
    );
    expect(read("lib/supabase/middleware.ts")).toMatch(/Accept-Language/);
    expect(read("app/components/sandbox/learning/LearningSandbox.tsx")).not.toMatch(
      /locale:\s*["']en["']/
    );
  });
});
