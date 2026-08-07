import { describe, expect, it } from "vitest";
import {
  INSTRUCTOR_CONTENT_BLOCK_AUTHORING_TYPES,
  rejectUnsupportedInstructorBlockType,
  shapeInstructorContentBlock,
  summarizeInstructorContentBlock,
} from "./instructorContentBlockAuthoring";
import {
  LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES,
  LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES,
} from "./lessonContentBlocksFoundation";

describe("instructorContentBlockAuthoring — type allowlist", () => {
  it("exposes exactly ten instructor authoring types", () => {
    expect([...INSTRUCTOR_CONTENT_BLOCK_AUTHORING_TYPES]).toEqual([
      "rich_text",
      "heading",
      "callout",
      "image",
      "video",
      "audio",
      "quote",
      "divider",
      "external_link",
      "code_block",
    ]);
  });

  it("rejects reserved types", () => {
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_RESERVED_TYPES) {
      expect(rejectUnsupportedInstructorBlockType(t)).toMatch(/reserved/i);
      expect(shapeInstructorContentBlock({ blockType: t, text: "x" }).ok).toBe(
        false
      );
    }
  });

  it("rejects deferred and future creatable types", () => {
    for (const t of LEARNING_LESSON_CONTENT_BLOCK_DEFERRED_TYPES) {
      expect(rejectUnsupportedInstructorBlockType(t)).toBeTruthy();
    }
    for (const t of ["transcript", "pdf", "downloadable_file", "unknown"]) {
      expect(rejectUnsupportedInstructorBlockType(t)).toBeTruthy();
      expect(shapeInstructorContentBlock({ blockType: t }).ok).toBe(false);
    }
  });
});

describe("instructorContentBlockAuthoring — existing types", () => {
  it("shapes rich_text", () => {
    const r = shapeInstructorContentBlock({
      blockType: "rich_text",
      text: "Hello",
    });
    expect(r).toEqual({
      ok: true,
      blockType: "rich_text",
      content: { text: "Hello" },
    });
  });

  it("shapes heading with level 2", () => {
    const r = shapeInstructorContentBlock({
      blockType: "heading",
      text: "Title",
    });
    expect(r).toEqual({
      ok: true,
      blockType: "heading",
      content: { text: "Title", level: 2 },
    });
  });

  it("callout includes required variant defaulting to info", () => {
    const r = shapeInstructorContentBlock({
      blockType: "callout",
      text: "Note me",
    });
    expect(r).toEqual({
      ok: true,
      blockType: "callout",
      content: { text: "Note me", variant: "info" },
    });
    const explicit = shapeInstructorContentBlock({
      blockType: "callout",
      text: "Warn",
      variant: "warning",
    });
    expect(explicit.ok && explicit.content.variant).toBe("warning");
  });
});

describe("instructorContentBlockAuthoring — expansion types", () => {
  it("shapes valid image and rejects unsafe URL", () => {
    const ok = shapeInstructorContentBlock({
      blockType: "image",
      url: "https://cdn.example.com/a.png",
      alt: "Alt",
      caption: "Cap",
    });
    expect(ok).toEqual({
      ok: true,
      blockType: "image",
      content: {
        url: "https://cdn.example.com/a.png",
        alt: "Alt",
        caption: "Cap",
      },
    });
    expect(
      shapeInstructorContentBlock({
        blockType: "image",
        url: "javascript:alert(1)",
      }).ok
    ).toBe(false);
    expect(
      shapeInstructorContentBlock({
        blockType: "image",
        url: "/relative.png",
      }).ok
    ).toBe(false);
    expect(
      shapeInstructorContentBlock({ blockType: "image", url: "" }).ok
    ).toBe(false);
  });

  it("shapes video with optional provider and rejects invalid provider", () => {
    const ok = shapeInstructorContentBlock({
      blockType: "video",
      url: "https://cdn.example.com/v.mp4",
      provider: "youtube",
    });
    expect(ok.ok && ok.content).toEqual({
      url: "https://cdn.example.com/v.mp4",
      provider: "youtube",
    });
    expect(
      shapeInstructorContentBlock({
        blockType: "video",
        url: "https://cdn.example.com/v.mp4",
        provider: "tiktok",
      }).ok
    ).toBe(false);
  });

  it("shapes audio", () => {
    const r = shapeInstructorContentBlock({
      blockType: "audio",
      url: "https://cdn.example.com/a.mp3",
      caption: "Intro",
    });
    expect(r).toEqual({
      ok: true,
      blockType: "audio",
      content: {
        url: "https://cdn.example.com/a.mp3",
        caption: "Intro",
      },
    });
  });

  it("validates quote text bounds and attribution", () => {
    expect(
      shapeInstructorContentBlock({ blockType: "quote", text: "" }).ok
    ).toBe(false);
    const ok = shapeInstructorContentBlock({
      blockType: "quote",
      text: "Wisdom",
      attribution: "Anon",
    });
    expect(ok).toEqual({
      ok: true,
      blockType: "quote",
      content: { text: "Wisdom", attribution: "Anon" },
    });
  });

  it("divider empty/default omits style; allows dashed/dotted; rejects invalid", () => {
    expect(shapeInstructorContentBlock({ blockType: "divider" })).toEqual({
      ok: true,
      blockType: "divider",
      content: {},
    });
    expect(
      shapeInstructorContentBlock({ blockType: "divider", style: "solid" })
    ).toEqual({ ok: true, blockType: "divider", content: {} });
    expect(
      shapeInstructorContentBlock({ blockType: "divider", style: "dashed" })
    ).toEqual({
      ok: true,
      blockType: "divider",
      content: { style: "dashed" },
    });
    expect(
      shapeInstructorContentBlock({ blockType: "divider", style: "wave" }).ok
    ).toBe(false);
  });

  it("external_link validates URL and rejects data: scheme", () => {
    const ok = shapeInstructorContentBlock({
      blockType: "external_link",
      url: "https://example.com/docs",
      label: "Docs",
    });
    expect(ok.ok && ok.content).toEqual({
      url: "https://example.com/docs",
      label: "Docs",
    });
    expect(
      shapeInstructorContentBlock({
        blockType: "external_link",
        url: "data:text/html,hi",
      }).ok
    ).toBe(false);
  });

  it("code_block requires code and validates language pattern", () => {
    expect(
      shapeInstructorContentBlock({ blockType: "code_block", code: "  " }).ok
    ).toBe(false);
    const ok = shapeInstructorContentBlock({
      blockType: "code_block",
      code: "const x = 1;",
      language: "ts",
    });
    expect(ok).toEqual({
      ok: true,
      blockType: "code_block",
      content: { code: "const x = 1;", language: "ts" },
    });
    expect(
      shapeInstructorContentBlock({
        blockType: "code_block",
        code: "x",
        language: "BAD LANG",
      }).ok
    ).toBe(false);
  });

  it("omits empty optional fields", () => {
    const image = shapeInstructorContentBlock({
      blockType: "image",
      url: "https://cdn.example.com/a.png",
      alt: "  ",
      caption: "",
    });
    expect(image.ok && image.content).toEqual({
      url: "https://cdn.example.com/a.png",
    });
  });

  it("enforces length bounds", () => {
    expect(
      shapeInstructorContentBlock({
        blockType: "heading",
        text: "x".repeat(301),
      }).ok
    ).toBe(false);
    expect(
      shapeInstructorContentBlock({
        blockType: "image",
        url: "https://cdn.example.com/a.png",
        alt: "x".repeat(501),
      }).ok
    ).toBe(false);
  });
});

describe("instructorContentBlockAuthoring — summaries", () => {
  it("summarizes media and divider without requiring text", () => {
    expect(
      summarizeInstructorContentBlock({
        block_type: "image",
        content: { url: "https://x/a.png", alt: "Cat" },
      })
    ).toBe("Cat");
    expect(
      summarizeInstructorContentBlock({
        block_type: "divider",
        content: {},
      })
    ).toBe("Divider · solid");
    expect(
      summarizeInstructorContentBlock({
        block_type: "external_link",
        content: { url: "https://x", label: "Docs" },
      })
    ).toBe("Docs");
  });
});
