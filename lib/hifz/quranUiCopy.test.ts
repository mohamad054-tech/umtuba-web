import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES } from "../i18n/locales";
import { quranNotesCopy } from "./quranUiCopy";

describe("quran note buttons", () => {
  it("uses the Arabic page words", () => {
    expect(quranNotesCopy("ar")).toMatchObject({
      meanings: "ترجمة المعاني",
      hide: "إخفاء",
    });
  });

  it("gives every language its own words", () => {
    for (const locale of SUPPORTED_LOCALES) {
      const copy = quranNotesCopy(locale);
      expect(copy.meanings.trim().length).toBeGreaterThan(0);
      expect(copy.hide.trim().length).toBeGreaterThan(0);
      expect(copy.tafsir.trim().length).toBeGreaterThan(0);
    }
    expect(quranNotesCopy("en").meanings).toBe("Translation of the meanings");
    expect(quranNotesCopy("en").hide).toBe("Hide");
    expect(quranNotesCopy("fr").hide).not.toBe("Hide");
    expect(quranNotesCopy("tr").meanings).not.toBe("Translation of the meanings");
  });
});
