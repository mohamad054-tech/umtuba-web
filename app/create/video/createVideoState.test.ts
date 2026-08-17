import { describe, expect, it } from "vitest";
import { validateVideoDuration } from "../../../lib/supabase/videoPostsShared";
import {
  bindWebRetryToCurrentFile,
  canSubmitWebCreate,
  createWebFileFingerprint,
  evaluateWebCreateFile,
  isStaleWebCreateAttempt,
  resetWebCreateAfterPublish,
} from "./createVideoState";

function fakeFile(name: string, size: number, type = "video/mp4"): File {
  const file = new File([new Uint8Array(1)], name, {
    type,
    lastModified: 1_700_000_000_000,
  });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("web create upload state lifecycle", () => {
  it("resets per-upload draft after successful publish", () => {
    expect(resetWebCreateAfterPublish()).toEqual({
      caption: "",
      selectedFile: null,
      previewUrl: "",
      probedMeta: null,
      errorMessage: "",
      uploadPercent: 0,
    });
  });

  it("rejected / invalid file cannot inherit a previous valid upload", () => {
    const previous = fakeFile("ok.mp4", 1024);
    const rejected = fakeFile("long.mp4", 51 * 1024 * 1024);

    expect(
      evaluateWebCreateFile({ file: previous, durationMs: 12_000 }).ok
    ).toBe(true);
    const rejectedCheck = evaluateWebCreateFile({
      file: rejected,
      durationMs: 120_000,
    });
    expect(rejectedCheck.ok).toBe(false);
    expect(rejectedCheck).toMatchObject({
      message: expect.stringMatching(/50 MB/i),
    });
    expect(
      canSubmitWebCreate({
        file: rejected,
        durationMs: 120_000,
        caption: "ok",
        isAuthenticated: true,
        busy: false,
      })
    ).toBe(false);
    expect(
      bindWebRetryToCurrentFile({
        file: rejected,
        durationMs: 120_000,
        busy: false,
        nonce: 2,
      }).ok
    ).toBe(false);
  });

  it("retry binds to the current file fingerprint, not a previous one", () => {
    const current = fakeFile("current.mp4", 2048);
    const bound = bindWebRetryToCurrentFile({
      file: current,
      durationMs: 8_000,
      busy: false,
      nonce: 3,
    });
    expect(bound.ok).toBe(true);
    if (bound.ok) {
      expect(bound.file.name).toBe("current.mp4");
      expect(bound.attemptId).toContain(createWebFileFingerprint(current));
    }
    expect(
      bindWebRetryToCurrentFile({
        file: current,
        durationMs: 0,
        busy: false,
        nonce: 4,
      }).ok
    ).toBe(false);
  });

  it("stale attempt ids cannot complete a newer selection", () => {
    expect(isStaleWebCreateAttempt("b:2", "a:1")).toBe(true);
    expect(isStaleWebCreateAttempt("b:2", "b:2")).toBe(false);
  });

  it("duration validator matches the Create UI warning gate", () => {
    expect(validateVideoDuration(null).ok).toBe(true);
    expect(validateVideoDuration(0).ok).toBe(false);
    expect(validateVideoDuration(1500).ok).toBe(true);
    expect(
      evaluateWebCreateFile({
        file: fakeFile("bad-duration.mp4", 1024),
        durationMs: 0,
      })
    ).toMatchObject({
      ok: false,
      message: expect.stringMatching(/duration/i),
    });
  });
});
