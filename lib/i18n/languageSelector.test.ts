import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, listSupportedLocales } from "./locales";

describe("LanguageSelector locale menu", () => {
  const src = readFileSync(
    join(process.cwd(), "app", "components", "i18n", "LanguageSelector.tsx"),
    "utf8"
  );

  it("exposes every supported locale as a visible listbox option", () => {
    expect(listSupportedLocales()).toHaveLength(SUPPORTED_LOCALES.length);
    expect(SUPPORTED_LOCALES).toHaveLength(13);
    for (const code of SUPPORTED_LOCALES) {
      expect(src).toContain("data-locale-option");
      expect(src).toContain("listSupportedLocales");
    }
    expect(src).toContain('role="listbox"');
    expect(src).toContain('dir="ltr"');
    expect(src).toContain("nativeName");
    expect(src).toContain("englishName");
    expect(src).not.toMatch(/<select[\s>]/);
    expect(src).toContain("applyDocumentLocale");
    expect(src).toContain("compactLocaleLabel");
    expect(src).toContain("data-locale-code={locale}");
  });
});
