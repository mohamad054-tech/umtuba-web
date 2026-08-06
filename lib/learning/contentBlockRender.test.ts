import { readFileSync } from "node:fs";
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
import {
  LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS,
  LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_DIVIDER_STYLES,
  LEARNING_LESSON_CONTENT_BLOCK_HEADING_LEVELS,
  LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_RICH_TEXT_FORMATS,
  LEARNING_LESSON_CONTENT_BLOCK_VIDEO_PROVIDERS,
} from "./lessonContentBlocksFoundation";
import { filterPublishedCreatableBlocks } from "./learnerDelivery";
import type { LearningLessonContentBlock } from "./lessonContentBlocksFoundation";

const ROOT = join(__dirname, "../..");
const RENDERER_SRC = readFileSync(
  join(ROOT, "app/components/learning/ContentBlockRenderer.tsx"),
  "utf8"
);
const HELPERS_SRC = readFileSync(
  join(ROOT, "lib/learning/contentBlockRender.ts"),
  "utf8"
);

function block(
  overrides: Partial<LearningLessonContentBlock> &
    Pick<LearningLessonContentBlock, "block_type" | "id" | "position">
): LearningLessonContentBlock {
  return {
    lesson_id: "lesson-1",
    status: "published",
    content: {},
    created_by: "user-1",
    updated_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    published_at: "2026-01-01T00:00:00Z",
    suspended_at: null,
    archived_at: null,
    ...overrides,
  };
}

describe("contentBlockRender helpers — URL / injection / empty", () => {
  it("accepts only http(s) media/link URLs", () => {
    expect(isSafeHttpUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(isSafeHttpUrl("http://cdn.example.com/a.png")).toBe(true);
    expect(isSafeHttpUrl("  https://cdn.example.com/a.png  ")).toBe(true);
  });

  it("fail-closes javascript/data/relative/malformed/overlong URLs", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html;base64,aaaa")).toBe(false);
    expect(isSafeHttpUrl("vbscript:msgbox(1)")).toBe(false);
    expect(isSafeHttpUrl("/relative/path")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
    expect(isSafeHttpUrl(undefined)).toBe(false);
    expect(isSafeHttpUrl(42)).toBe(false);
    expect(isSafeHttpUrl(`https://x.test/${"a".repeat(2100)}`)).toBe(false);
  });

  it("escapes HTML/script injection for safe text helpers", () => {
    expect(escapeHtmlText('<script>alert("x")</script>')).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;"
    );
    expect(escapeHtmlText("a & b < c > d 'e'")).toBe(
      "a &amp; b &lt; c &gt; d &#39;e&#39;"
    );
    expect(renderSafeBlockText('<img onerror=alert(1) src=x>')).toBe(
      "&lt;img onerror=alert(1) src=x&gt;"
    );
    expect(escapeHtmlText(null)).toBe("");
    expect(escapeHtmlText(12)).toBe("");
    expect(renderSafeBlockText(undefined)).toBe("");
  });

  it("treats empty / non-string plain text as empty string and truncates", () => {
    expect(asPlainString("")).toBe("");
    expect(asPlainString(null)).toBe("");
    expect(asPlainString({ text: "nope" })).toBe("");
    expect(asPlainString("hello", 3)).toBe("hel");
    expect(asPlainString("hello", 50)).toBe("hello");
  });
});

describe("contentBlockRender helpers — typed field defaults", () => {
  it("normalizes heading levels with fail-safe default 2", () => {
    for (const level of LEARNING_LESSON_CONTENT_BLOCK_HEADING_LEVELS) {
      expect(asHeadingLevel(level)).toBe(level);
      expect(asHeadingLevel(String(level))).toBe(level);
    }
    expect(asHeadingLevel(0)).toBe(2);
    expect(asHeadingLevel(7)).toBe(2);
    expect(asHeadingLevel("nope")).toBe(2);
    expect(asHeadingLevel(null)).toBe(2);
  });

  it("normalizes rich_text format; unknown becomes plain (no html)", () => {
    for (const format of LEARNING_LESSON_CONTENT_BLOCK_RICH_TEXT_FORMATS) {
      expect(asRichTextFormat(format)).toBe(format);
    }
    expect(asRichTextFormat("html")).toBe("plain");
    expect(asRichTextFormat("markdown-extra")).toBe("plain");
    expect(asRichTextFormat(null)).toBe("plain");
  });

  it("normalizes callout variants with info default", () => {
    for (const variant of LEARNING_LESSON_CONTENT_BLOCK_CALLOUT_VARIANTS) {
      expect(asCalloutVariant(variant)).toBe(variant);
    }
    expect(asCalloutVariant("alert")).toBe("info");
    expect(asCalloutVariant(null)).toBe("info");
  });

  it("normalizes divider styles with solid default", () => {
    for (const style of LEARNING_LESSON_CONTENT_BLOCK_DIVIDER_STYLES) {
      expect(asDividerStyle(style)).toBe(style);
    }
    expect(asDividerStyle("double")).toBe("solid");
    expect(asDividerStyle(1)).toBe("solid");
  });

  it("accepts known video providers and nulls unknowns", () => {
    for (const provider of LEARNING_LESSON_CONTENT_BLOCK_VIDEO_PROVIDERS) {
      expect(asVideoProvider(provider)).toBe(provider);
    }
    expect(asVideoProvider("wistia")).toBeNull();
    expect(asVideoProvider(null)).toBeNull();
  });

  it("classifies creatable vs reserved/deferred types", () => {
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_CREATABLE_TYPES) {
      expect(isCreatableContentBlockType(t)).toBe(true);
      expect(isReservedOrDeferredContentBlockType(t)).toBe(false);
    }
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES) {
      expect(isCreatableContentBlockType(t)).toBe(false);
      expect(isReservedOrDeferredContentBlockType(t)).toBe(true);
    }
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES) {
      expect(isCreatableContentBlockType(t)).toBe(false);
      expect(isReservedOrDeferredContentBlockType(t)).toBe(true);
    }
    expect(isCreatableContentBlockType("list")).toBe(false);
    expect(isCreatableContentBlockType("assessment")).toBe(false);
    expect(isCreatableContentBlockType("activity")).toBe(false);
    expect(isCreatableContentBlockType("")).toBe(false);
    expect(isCreatableContentBlockType(null)).toBe(false);
  });
});

describe("contentBlockRender helpers — deterministic stability", () => {
  it("returns identical outputs for identical inputs", () => {
    const sample = '<b>Hi</b> & "bye"';
    expect(escapeHtmlText(sample)).toBe(escapeHtmlText(sample));
    expect(renderSafeBlockText(sample)).toBe(renderSafeBlockText(sample));
    expect(asHeadingLevel("3")).toBe(asHeadingLevel(3));
    expect(isSafeHttpUrl("https://a.test/x")).toBe(
      isSafeHttpUrl("https://a.test/x")
    );
  });
});

describe("ContentBlockRenderer — source contracts for supported types", () => {
  it("does not use dangerouslySetInnerHTML or raw HTML pass-through", () => {
    expect(RENDERER_SRC).not.toMatch(/dangerouslySetInnerHTML/);
    expect(RENDERER_SRC).not.toMatch(/innerHTML/);
    expect(HELPERS_SRC).toMatch(
      /Never use dangerouslySetInnerHTML with unsanitized author content/
    );
    expect(HELPERS_SRC).toMatch(
      /Markdown is displayed as escaped plain text in V1/
    );
  });

  it("fail-closes unpublished and non-creatable blocks", () => {
    expect(RENDERER_SRC).toMatch(
      /block\.status !== "published" \|\|\s*!isCreatableContentBlockType\(block\.block_type\)/
    );
    expect(RENDERER_SRC).toMatch(/default:\s*return null/);
  });

  it("covers rich_text / heading / quote / callout / divider", () => {
    expect(RENDERER_SRC).toMatch(/case "rich_text"/);
    expect(RENDERER_SRC).toMatch(/asRichTextFormat\(content\.format\)/);
    expect(RENDERER_SRC).toMatch(/case "heading"/);
    expect(RENDERER_SRC).toMatch(/asHeadingLevel\(content\.level\)/);
    expect(RENDERER_SRC).toMatch(/case "quote"/);
    expect(RENDERER_SRC).toMatch(/content\.attribution/);
    expect(RENDERER_SRC).toMatch(/case "callout"/);
    expect(RENDERER_SRC).toMatch(/asCalloutVariant\(content\.variant\)/);
    expect(RENDERER_SRC).toMatch(/case "divider"/);
    expect(RENDERER_SRC).toMatch(/asDividerStyle\(content\.style\)/);
  });

  it("covers image / video / audio with safe URL gates", () => {
    expect(RENDERER_SRC).toMatch(/case "image"/);
    expect(RENDERER_SRC).toMatch(/case "video"/);
    expect(RENDERER_SRC).toMatch(/case "audio"/);
    const mediaCases = RENDERER_SRC.match(/case "(image|video|audio)"[\s\S]*?(?=case "|default:)/g);
    expect(mediaCases?.length).toBe(3);
    for (const chunk of mediaCases ?? []) {
      expect(chunk).toMatch(/isSafeHttpUrl\(url\)/);
      expect(chunk).toMatch(/return null/);
    }
  });

  it("covers code_block and external_link (no inventing embed/list)", () => {
    expect(RENDERER_SRC).toMatch(/case "code_block"/);
    expect(RENDERER_SRC).toMatch(/content\.code/);
    expect(RENDERER_SRC).toMatch(/case "external_link"/);
    expect(RENDERER_SRC).toMatch(/rel="noopener noreferrer"/);
    expect(RENDERER_SRC).not.toMatch(/case "embed"/);
    expect(RENDERER_SRC).not.toMatch(/case "list"/);
    expect(RENDERER_SRC).not.toMatch(/case "html"/);
  });

  it("covers transcript / pdf / downloadable_file media references", () => {
    expect(RENDERER_SRC).toMatch(/case "transcript"/);
    expect(RENDERER_SRC).toMatch(/case "pdf"/);
    expect(RENDERER_SRC).toMatch(/case "downloadable_file"/);
    expect(RENDERER_SRC).toMatch(/download=\{filename \|\| undefined\}/);
  });

  it("does not implement assessment/activity reference block types", () => {
    expect(RENDERER_SRC).not.toMatch(/case "assessment"/);
    expect(RENDERER_SRC).not.toMatch(/case "activity"/);
    expect(isCreatableContentBlockType("assessment")).toBe(false);
    expect(isCreatableContentBlockType("activity")).toBe(false);
  });

  it("uses safe defaults for missing content fields via asPlainString / helpers", () => {
    expect(RENDERER_SRC).toMatch(/const content = block\.content \?\? \{\}/);
    expect(RENDERER_SRC).toMatch(/asPlainString\(content\.text/);
    expect(RENDERER_SRC).toMatch(/asPlainString\(content\.alt, 500\) \|\| "Lesson image"/);
    expect(RENDERER_SRC).toMatch(
      /asPlainString\(content\.label, 300\) \|\| url/
    );
  });
});

describe("content block ordering into the renderer", () => {
  it("orders published creatable blocks by position ascending", () => {
    const rows = [
      block({
        id: "b",
        block_type: "rich_text",
        position: 2,
        content: { text: "second" },
      }),
      block({
        id: "a",
        block_type: "heading",
        position: 0,
        content: { text: "first", level: 2 },
      }),
      block({
        id: "draft",
        block_type: "quote",
        position: 1,
        status: "draft",
        content: { text: "hidden" },
      }),
      block({
        id: "reserved",
        block_type: "ai_block",
        position: -1,
        content: {},
      }),
    ];
    const ordered = filterPublishedCreatableBlocks(rows);
    expect(ordered.map((b) => b.id)).toEqual(["a", "b"]);
    expect(ordered.map((b) => b.position)).toEqual([0, 2]);
  });
});
