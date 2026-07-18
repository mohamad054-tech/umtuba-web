import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildMockThumbnailPath,
  clampProcessingProgress,
  computeAspectRatioLabel,
  EMPTY_MEDIA_PIPELINE_EXTENSIONS,
  isMediaPipelineStatus,
  isPubliclyVisibleMedia,
  MEDIA_PIPELINE_STATUSES,
  mediaStatusLabel,
} from "./pipelineTypes";

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

describe("Media Pipeline V1 types", () => {
  it("defines the full lifecycle status set", () => {
    expect(MEDIA_PIPELINE_STATUSES).toEqual([
      "draft",
      "uploading",
      "queued",
      "processing",
      "ready",
      "failed",
    ]);
    expect(isMediaPipelineStatus("ready")).toBe(true);
    expect(isMediaPipelineStatus("transcoding")).toBe(false);
    expect(mediaStatusLabel("processing")).toBe("Processing");
  });

  it("only treats ready videos with a path as publicly visible", () => {
    expect(
      isPubliclyVisibleMedia({
        postType: "video",
        mediaStatus: "ready",
        videoPath: "user/a.mp4",
      })
    ).toBe(true);
    expect(
      isPubliclyVisibleMedia({
        postType: "video",
        mediaStatus: "processing",
        videoPath: "user/a.mp4",
      })
    ).toBe(false);
    expect(
      isPubliclyVisibleMedia({
        postType: "video",
        mediaStatus: "ready",
        videoPath: null,
      })
    ).toBe(false);
    expect(
      isPubliclyVisibleMedia({
        postType: "image",
        mediaStatus: "ready",
        videoPath: null,
      })
    ).toBe(false);
  });

  it("clamps progress and computes aspect ratios", () => {
    expect(clampProcessingProgress(150)).toBe(100);
    expect(clampProcessingProgress(-4)).toBe(0);
    expect(computeAspectRatioLabel(1920, 1080)).toBe("16:9");
    expect(computeAspectRatioLabel(1080, 1920)).toBe("9:16");
    expect(computeAspectRatioLabel(null, 1080)).toBeNull();
  });

  it("builds thumbnail paths under the owner thumbs folder", () => {
    const path = buildMockThumbnailPath(
      "11111111-1111-1111-1111-111111111111",
      "abc-123"
    );
    expect(path).toBe(
      "11111111-1111-1111-1111-111111111111/thumbs/abc-123.jpg"
    );
  });

  it("keeps future extension slots null by default", () => {
    expect(EMPTY_MEDIA_PIPELINE_EXTENSIONS).toEqual({
      hls: null,
      dash: null,
      abr: null,
      ai_enhancement: null,
      ai_translation: null,
      ai_dubbing: null,
    });
  });
});

describe("Media Pipeline V1 contracts", () => {
  it("ships additive migration with lifecycle, metadata, and readiness RLS", () => {
    const migration = read(
      "supabase/migrations/20260730_media_pipeline_v1.sql"
    );
    expect(migration).toMatch(/media_status/);
    expect(migration).toMatch(/upload_started_at/);
    expect(migration).toMatch(/processing_progress/);
    expect(migration).toMatch(/thumbnail_path/);
    expect(migration).toMatch(/media_pipeline/);
    expect(migration).toMatch(/ai_dubbing/);
    expect(migration).toMatch(/is_video_post_publicly_visible/);
    expect(migration).toMatch(/Posts are viewable when public or owned/);
    expect(migration).toMatch(/media_status = 'ready'/);
    expect(migration).not.toMatch(/drop table/i);
  });

  it("gates Discover/Watch/Profile queries on ready media_status", () => {
    const server = read("lib/supabase/videoPostsServer.ts");
    const profile = read("lib/supabase/profileContent.ts");
    expect(server).toMatch(/media_status.*ready|eq\("media_status", "ready"\)/);
    expect(profile).toMatch(/eq\("media_status", "ready"\)/);
    expect(server).toMatch(/isPubliclyVisibleMedia/);
  });

  it("exposes upload and processing progress components", () => {
    const form = read("app/create/video/CreateVideoForm.tsx");
    expect(form).toMatch(/MediaUploadProgress/);
    expect(form).toMatch(/MediaProcessingProgress/);
    expect(form).toMatch(/MediaPipelineStatusBadge/);
    expect(form).toMatch(/probeVideoFileMetadata/);
  });
});
