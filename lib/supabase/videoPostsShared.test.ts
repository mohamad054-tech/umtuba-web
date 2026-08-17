import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveVideoMimeType,
  validateCaption,
  validateVideoDuration,
  validateVideoFile,
  VIDEO_ACCEPT_ATTR,
} from "./videoPostsShared";

const ROOT = join(process.cwd());

function read(...parts: string[]): string {
  return readFileSync(join(ROOT, ...parts), "utf8");
}

describe("resolveVideoMimeType / validateVideoFile", () => {
  it("accepts explicit MIME types", () => {
    expect(resolveVideoMimeType("video/mp4")).toBe("video/mp4");
    expect(resolveVideoMimeType("video/webm")).toBe("video/webm");
    expect(resolveVideoMimeType("video/quicktime")).toBe("video/quicktime");
  });

  it("infers MIME from mobile filenames when type is empty", () => {
    expect(resolveVideoMimeType("", "clip.MP4")).toBe("video/mp4");
    expect(resolveVideoMimeType("  ", "holiday.mov")).toBe("video/quicktime");
    expect(resolveVideoMimeType(null, "reel.webm")).toBe("video/webm");
    expect(resolveVideoMimeType(undefined, "phone.m4v")).toBe("video/mp4");
  });

  it("validates size and returns resolved mime", () => {
    const ok = validateVideoFile({
      mimeType: "",
      byteSize: 1024,
      fileName: "clip.mp4",
    });
    expect(ok).toEqual({ ok: true, mimeType: "video/mp4" });

    expect(
      validateVideoFile({ mimeType: "video/mp4", byteSize: 0 }).ok
    ).toBe(false);
    expect(
      validateVideoFile({
        mimeType: "application/pdf",
        byteSize: 10,
        fileName: "doc.pdf",
      }).ok
    ).toBe(false);
  });

  it("validates caption length", () => {
    expect(validateCaption("hello").ok).toBe(true);
    expect(validateCaption("x".repeat(1001)).ok).toBe(false);
  });

  it("validates duration with the same rule the Create UI uses to disable Publish", () => {
    expect(validateVideoDuration(null).ok).toBe(true);
    expect(validateVideoDuration(0).ok).toBe(false);
    expect(validateVideoDuration(1500).ok).toBe(true);
    expect(validateVideoDuration(Number.NaN).ok).toBe(false);
  });

  it("accept attribute includes extension fallbacks for mobile pickers", () => {
    expect(VIDEO_ACCEPT_ATTR).toMatch(/\.mp4/);
    expect(VIDEO_ACCEPT_ATTR).toMatch(/\.mov/);
    expect(VIDEO_ACCEPT_ATTR).toMatch(/video\/mp4/);
  });
});

describe("upload publish harden contracts", () => {
  it("supports abortable XHR upload with timeout", () => {
    const posts = read("lib/supabase/posts.ts");
    expect(posts).toMatch(/AbortSignal/);
    expect(posts).toMatch(/xhr\.timeout/);
    expect(posts).toMatch(/onabort/);
    expect(posts).toMatch(/Upload cancelled/);
  });

  it("create form cancels upload and sanitizes errors", () => {
    const form = read("app/create/video/CreateVideoForm.tsx");
    expect(form).toMatch(/Cancel upload/);
    expect(form).toMatch(/AbortController/);
    expect(form).toMatch(/sanitizeUserFacingMessage/);
    expect(form).toMatch(/queuePendingOrphan|PENDING_ORPHAN_KEY/);
    expect(form).toMatch(/aria-busy/);
    expect(form).toMatch(/ProductLoadingState/);
  });

  it("auth-required publish keeps orphan path for later cleanup", () => {
    const action = read("app/actions/createVideoPost.ts");
    expect(action).toMatch(/auth_required/);
    expect(action).toMatch(/sanitizeUserFacingMessage/);
  });

  it("finalization failure deletes the post row instead of leaving failed orphans", () => {
    const videoPosts = read("lib/supabase/videoPosts.ts");
    expect(videoPosts).toMatch(/Unable to finalize video ready state/);
    expect(videoPosts).toMatch(/\.delete\(\)/);
    expect(videoPosts).toMatch(/\.eq\("id", queuedRow\.id\)/);
  });
});
