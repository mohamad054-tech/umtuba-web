import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  addOverlay,
  clamp01,
  clampScale,
  countByKind,
  createStickerOverlay,
  createTextOverlay,
  DEFAULT_OVERLAY_TEXT,
  DEFAULT_TEXT_SCALE,
  hasOverlays,
  MAX_OVERLAYS,
  MAX_OVERLAY_SCALE,
  MAX_OVERLAY_TEXT_LENGTH,
  MIN_OVERLAY_SCALE,
  moveOverlay,
  normalizeRotation,
  OVERLAY_TEXT_COLORS,
  overlaysFromMediaPipeline,
  parseOverlays,
  removeOverlay,
  sanitizeOverlayElements,
  serializeOverlays,
  STICKER_EMOJIS,
  updateOverlay,
  type VideoOverlayElement,
} from "./videoOverlays";

const ROOT = process.cwd();
function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("videoOverlays clamps", () => {
  it("clamps normalized coordinates to 0..1", () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.7)).toBe(1);
    expect(clamp01(0.42)).toBe(0.42);
    expect(clamp01(Number.NaN)).toBe(0);
  });

  it("clamps scale to editor bounds", () => {
    expect(clampScale(0)).toBe(MIN_OVERLAY_SCALE);
    expect(clampScale(99)).toBe(MAX_OVERLAY_SCALE);
    // Non-finite input falls back to a safe default rather than a bound.
    expect(clampScale(Number.POSITIVE_INFINITY)).toBe(DEFAULT_TEXT_SCALE);
    expect(clampScale(Number.NaN)).toBe(DEFAULT_TEXT_SCALE);
  });

  it("normalizes rotation into (-180, 180]", () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(370)).toBe(10);
    expect(normalizeRotation(-190)).toBe(170);
    expect(normalizeRotation(540)).toBe(180);
  });
});

describe("overlay factories", () => {
  it("creates a centered text overlay with sane defaults", () => {
    const el = createTextOverlay();
    expect(el.kind).toBe("text");
    expect(el.x).toBe(0.5);
    expect(el.y).toBe(0.5);
    expect(el.text).toBe(DEFAULT_OVERLAY_TEXT);
    expect(OVERLAY_TEXT_COLORS).toContain(el.color);
    expect(el.id).toBeTruthy();
  });

  it("truncates overly long text", () => {
    const el = createTextOverlay({ text: "a".repeat(500) });
    expect(el.text?.length).toBe(MAX_OVERLAY_TEXT_LENGTH);
  });

  it("creates a sticker overlay from a palette emoji", () => {
    const el = createStickerOverlay(STICKER_EMOJIS[2]);
    expect(el.kind).toBe("sticker");
    expect(el.emoji).toBe(STICKER_EMOJIS[2]);
  });

  it("gives unique ids to distinct overlays", () => {
    const a = createTextOverlay();
    const b = createTextOverlay();
    expect(a.id).not.toBe(b.id);
  });
});

describe("overlay list operations", () => {
  it("adds up to MAX_OVERLAYS then stops", () => {
    let list: VideoOverlayElement[] = [];
    for (let i = 0; i < MAX_OVERLAYS + 5; i += 1) {
      list = addOverlay(list, createTextOverlay());
    }
    expect(list.length).toBe(MAX_OVERLAYS);
  });

  it("moves an overlay with clamped coordinates", () => {
    const el = createTextOverlay({ x: 0.5, y: 0.5 });
    const list = moveOverlay([el], el.id, 2, -1);
    expect(list[0].x).toBe(1);
    expect(list[0].y).toBe(0);
  });

  it("updates text/color for text overlays only", () => {
    const text = createTextOverlay();
    const sticker = createStickerOverlay(STICKER_EMOJIS[0]);
    const list = updateOverlay([text, sticker], text.id, {
      text: "Hello",
      color: OVERLAY_TEXT_COLORS[2],
    });
    expect(list[0].text).toBe("Hello");
    expect(list[0].color).toBe(OVERLAY_TEXT_COLORS[2]);
    // Sticker untouched, still no text field applied.
    expect(list[1].text).toBeUndefined();
  });

  it("keeps last valid text when update is blank", () => {
    const text = createTextOverlay({ text: "Keep me" });
    const list = updateOverlay([text], text.id, { text: "   " });
    expect(list[0].text).toBe("Keep me");
  });

  it("removes overlays by id", () => {
    const a = createTextOverlay();
    const b = createTextOverlay();
    const list = removeOverlay([a, b], a.id);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(b.id);
  });

  it("counts overlays by kind", () => {
    const list = [
      createTextOverlay(),
      createTextOverlay(),
      createStickerOverlay(STICKER_EMOJIS[0]),
    ];
    expect(countByKind(list)).toEqual({ text: 2, sticker: 1 });
    expect(hasOverlays(list)).toBe(true);
    expect(hasOverlays([])).toBe(false);
    expect(hasOverlays(null)).toBe(false);
  });
});

describe("sanitize / serialize / parse round-trip", () => {
  it("drops malformed elements and caps the count", () => {
    const dirty = [
      { kind: "text", text: "ok", x: 0.1, y: 0.2, scale: 0.1, rotation: 0 },
      { kind: "text", text: "   " }, // empty -> dropped
      { kind: "bogus", foo: 1 }, // unknown -> dropped
      null,
      "nope",
      { kind: "sticker", emoji: "🔥" },
    ];
    const clean = sanitizeOverlayElements(dirty);
    expect(clean).toHaveLength(2);
    expect(clean[0].kind).toBe("text");
    expect(clean[1].kind).toBe("sticker");
  });

  it("serializes to a versioned envelope and parses it back", () => {
    const list = [
      createTextOverlay({ text: "Hi", x: 0.25, y: 0.75 }),
      createStickerOverlay(STICKER_EMOJIS[1], { x: 0.9, y: 0.1 }),
    ];
    const composition = serializeOverlays(list);
    expect(composition.version).toBe(1);
    expect(composition.elements).toHaveLength(2);

    const parsed = parseOverlays(composition);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].text).toBe("Hi");
    expect(parsed[0].x).toBeCloseTo(0.25);
    expect(parsed[1].emoji).toBe(STICKER_EMOJIS[1]);
  });

  it("parses a bare elements array too", () => {
    const list = [createTextOverlay({ text: "Bare" })];
    const parsed = parseOverlays(list);
    expect(parsed[0].text).toBe("Bare");
  });

  it("reads overlays from a media_pipeline blob and tolerates junk", () => {
    const blob = {
      hls: null,
      overlays: serializeOverlays([createTextOverlay({ text: "Stored" })]),
    };
    const parsed = overlaysFromMediaPipeline(blob);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].text).toBe("Stored");

    expect(overlaysFromMediaPipeline(null)).toEqual([]);
    expect(overlaysFromMediaPipeline({})).toEqual([]);
    expect(overlaysFromMediaPipeline({ overlays: "bad" })).toEqual([]);
  });
});

describe("create/publish wiring contracts", () => {
  it("CreateVideoForm mounts the pre-publish overlay editor", () => {
    const form = read("app/create/video/CreateVideoForm.tsx");
    expect(form).toMatch(/VideoOverlayEditor/);
    expect(form).toMatch(/overlays/);
    // Must not regress the honest pipeline controls.
    expect(form).toMatch(/Cancel upload/);
    expect(form).toMatch(/AbortController/);
    expect(form).toMatch(/probeVideoFileMetadata/);
    expect(form).toMatch(/MediaUploadProgress/);
  });

  it("editor exposes text overlay + emoji/sticker controls", () => {
    const editor = read("app/create/video/VideoOverlayEditor.tsx");
    expect(editor).toMatch(/createTextOverlay/);
    expect(editor).toMatch(/createStickerOverlay/);
    expect(editor).toMatch(/Add text/i);
    expect(editor).toMatch(/Stickers/);
    expect(editor).toMatch(/handleDeleteSelected/);
    expect(editor).toMatch(/updateOverlay/);
    expect(editor).toMatch(/dir="ltr"/);
    expect(editor).toMatch(/max-sm:h-\[min\(52vh/);
  });

  it("overlays persist through the create action into media_pipeline", () => {
    const action = read("app/actions/createVideoPost.ts");
    expect(action).toMatch(/overlays/);
    const videoPosts = read("lib/supabase/videoPosts.ts");
    expect(videoPosts).toMatch(/overlays/);
    expect(videoPosts).toMatch(/media_pipeline/);
  });
});
