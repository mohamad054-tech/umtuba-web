import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  asCalloutVariant,
  asDividerStyle,
  asHeadingLevel,
  asPlainString,
  asRichTextFormat,
  asVideoProvider,
  escapeHtmlText,
  isCreatableContentBlockType,
  isReservedOrDeferredContentBlockType,
  isSafeHttpUrl,
  renderSafeBlockText,
} from "./contentBlockRender";

const ROOT = process.cwd();

describe("LEARNING_CONTENT_BLOCK_SAFE_RENDER_CONTRACT_TESTS_V1", () => {
  describe("isSafeHttpUrl", () => {
    it("accepts http(s) URLs", () => {
      expect(isSafeHttpUrl("https://example.com/a")).toBe(true);
      expect(isSafeHttpUrl("http://example.com")).toBe(true);
      expect(isSafeHttpUrl("  https://cdn.example/x.png  ")).toBe(true);
    });

    it("rejects dangerous or invalid values", () => {
      expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeHttpUrl("data:text/html,hi")).toBe(false);
      expect(isSafeHttpUrl("vbscript:msgbox(1)")).toBe(false);
      expect(isSafeHttpUrl("")).toBe(false);
      expect(isSafeHttpUrl("   ")).toBe(false);
      expect(isSafeHttpUrl(null)).toBe(false);
      expect(isSafeHttpUrl(123)).toBe(false);
      expect(isSafeHttpUrl("/relative/path")).toBe(false);
      expect(isSafeHttpUrl("not a url")).toBe(false);
      expect(isSafeHttpUrl(`https://example.com/${"a".repeat(2100)}`)).toBe(
        false
      );
    });
  });

  describe("escapeHtmlText / renderSafeBlockText", () => {
    it("escapes HTML special characters", () => {
      expect(escapeHtmlText(`<script>"x"&'y'</script>`)).toBe(
        "&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;"
      );
      expect(escapeHtmlText(null)).toBe("");
      expect(renderSafeBlockText("<b>hi</b>")).toBe("&lt;b&gt;hi&lt;/b&gt;");
    });
  });

  describe("type and payload helpers", () => {
    it("guards creatable vs reserved/deferred types", () => {
      expect(isCreatableContentBlockType("rich_text")).toBe(true);
      expect(isCreatableContentBlockType("not_a_type")).toBe(false);
      expect(isReservedOrDeferredContentBlockType("ai_block")).toBe(true);
      expect(isReservedOrDeferredContentBlockType("gallery")).toBe(true);
      expect(isReservedOrDeferredContentBlockType("rich_text")).toBe(false);
    });

    it("normalizes plain strings and heading levels", () => {
      expect(asPlainString("hello", 3)).toBe("hel");
      expect(asPlainString(42)).toBe("");
      expect(asHeadingLevel(3)).toBe(3);
      expect(asHeadingLevel("9")).toBe(2);
      expect(asHeadingLevel(undefined)).toBe(2);
    });

    it("defaults callout/format/divider/video helpers", () => {
      expect(asCalloutVariant("warning")).toBe("warning");
      expect(asCalloutVariant("nope")).toBe("info");
      expect(asRichTextFormat("markdown")).toBe("markdown");
      expect(asRichTextFormat("html")).toBe("plain");
      expect(asDividerStyle("dashed")).toBe("dashed");
      expect(asDividerStyle("wave")).toBe("solid");
      expect(asVideoProvider("youtube")).toBe("youtube");
      expect(asVideoProvider("flash")).toBe(null);
    });
  });

  it("ContentBlockRenderer does not use unsanitized dangerouslySetInnerHTML", () => {
    const candidates = [
      "app/components/learning/ContentBlockRenderer.tsx",
      "app/components/learning/content/ContentBlockRenderer.tsx",
      "app/components/learning/lesson/ContentBlockRenderer.tsx",
    ];
    const path = candidates.map((p) => join(ROOT, p)).find((p) => existsSync(p));
    expect(path, "ContentBlockRenderer.tsx must exist").toBeTruthy();
    const src = readFileSync(path!, "utf8");
    expect(src).not.toMatch(/dangerouslySetInnerHTML=\{\s*\{\s*__html:\s*[^e]/);
    // Prefer escaped / safe helpers if referenced
    const usesSafeHelpers =
      src.includes("isSafeHttpUrl") ||
      src.includes("escapeHtmlText") ||
      src.includes("renderSafeBlockText") ||
      src.includes("asPlainString") ||
      !src.includes("dangerouslySetInnerHTML");
    expect(usesSafeHelpers).toBe(true);
  });
});
