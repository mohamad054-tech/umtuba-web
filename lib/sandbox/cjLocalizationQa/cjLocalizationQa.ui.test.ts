import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const page = join(process.cwd(), "app/sandbox/store/cj-localization-qa/page.tsx");
const layout = join(process.cwd(), "app/sandbox/store/cj-localization-qa/layout.tsx");

describe("cj localization QA preview", () => {
  it("is a dedicated sandbox route with a three-column QA layout", () => {
    const src = readFileSync(page, "utf8");
    const chrome = readFileSync(layout, "utf8");
    expect(src).toMatch(/Original CJ/);
    expect(src).toMatch(/Clean English/);
    expect(src).toMatch(/العربية المهنية/);
    expect(src).toMatch(/dir="rtl"/);
    expect(src).toMatch(/formatMinorUnits/);
    expect(src).toMatch(/store\.umPoints\.earnWithPurchase/);
    expect(src).not.toMatch(/cj-launch\/page/);
    expect(src).not.toMatch(/OPENAI_API_KEY|GEMINI_API_KEY|CJ_API_KEY/);
    expect(chrome).toMatch(/robots: \{ index: false/);
    const copy = readFileSync(join(process.cwd(), "lib/sandbox/cjLocalizationQa/copy.ts"), "utf8");
    expect(copy).toMatch(/CJ PRODUCT LOCALIZATION QA/);
  });
});
