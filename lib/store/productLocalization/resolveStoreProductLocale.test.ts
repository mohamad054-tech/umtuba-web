import { describe, expect, it } from "vitest";
import { resolveStoreProductLocale } from "./resolveStoreProductLocale";

describe("resolveStoreProductLocale", () => {
  it("uses the request locale when the cookie is an AppLocale", () => {
    expect(resolveStoreProductLocale({ requestLocale: "ar", rawCookie: "ar" })).toBe("ar");
    expect(resolveStoreProductLocale({ requestLocale: "en", rawCookie: "en" })).toBe("en");
    expect(resolveStoreProductLocale({ requestLocale: "fr", rawCookie: "fr" })).toBe("fr");
  });

  it("honors a 13-locale Store cookie even when AppLocale cannot represent it", () => {
    expect(resolveStoreProductLocale({ requestLocale: "en", rawCookie: "ja" })).toBe("ja");
    expect(resolveStoreProductLocale({ requestLocale: "en", rawCookie: "zh-CN" })).toBe("zh-CN");
    expect(resolveStoreProductLocale({ requestLocale: "en", rawCookie: "zh-cn" })).toBe("zh-CN");
  });

  it("does not invent a locale from an unknown cookie", () => {
    expect(resolveStoreProductLocale({ requestLocale: "de", rawCookie: "xx" })).toBe("de");
  });
});
