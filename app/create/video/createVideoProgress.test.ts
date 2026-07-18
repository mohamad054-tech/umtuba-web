import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CREATE_PUBLISH_FAILED_MESSAGE,
  CREATE_UPLOAD_COMPLETE_MESSAGE,
  processingProgressAfterUpload,
  processingProgressOnReady,
  processingProgressWhilePublishing,
} from "./createVideoProgress";

describe("createVideoProgress", () => {
  it("keeps processing indeterminate until server success", () => {
    expect(processingProgressAfterUpload()).toEqual({
      phase: "queued",
      uploadPercent: 100,
      processingPercent: null,
    });
    expect(processingProgressWhilePublishing().processingPercent).toBeNull();
    expect(processingProgressOnReady()).toEqual({
      phase: "success",
      processingPercent: 100,
    });
  });

  it("CreateVideoForm does not fake processing percent jumps", () => {
    const form = readFileSync(
      join(process.cwd(), "app/create/video/CreateVideoForm.tsx"),
      "utf8"
    );
    expect(form).not.toMatch(/setProcessingPercent\(10\)/);
    expect(form).not.toMatch(/setProcessingPercent\(40\)/);
    expect(form).not.toMatch(
      /new Promise\(\s*\(?\s*r?\s*\)?\s*=>\s*window\.setTimeout/
    );
    expect(form).toMatch(/indeterminate/);
    expect(form).toMatch(/CREATE_UPLOAD_COMPLETE_MESSAGE|Upload complete/);
    expect(form).toMatch(/Cancel upload/);
    expect(form).toMatch(/AbortController/);
  });

  it("exposes friendly failure copy", () => {
    expect(CREATE_PUBLISH_FAILED_MESSAGE).not.toMatch(/sql|stack|supabase/i);
    expect(CREATE_UPLOAD_COMPLETE_MESSAGE.toLowerCase()).toMatch(/upload complete/);
  });
});
