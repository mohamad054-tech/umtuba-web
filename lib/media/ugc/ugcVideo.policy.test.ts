import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildUgcFfmpegArgs,
  computeOutputSize,
  durationWithinTolerance,
  parseFrameRate,
  shouldCapFps,
  UGC_CRF,
} from "./ugcVideoPolicy";
import { isUgcVideoTranscodeEnabled } from "./ugcVideoFlag";
import {
  buildUgcPlaybackPath,
  collectOwnedMediaPaths,
  isUgcPlaybackPath,
} from "./ugcVideoPaths";
import { parseFfprobeJson } from "./ugcVideoProbe";
import {
  shouldKeepOriginalBecauseNoSaving,
  validateOptimizedLocalOutput,
} from "./ugcVideoValidate";
import {
  emptyUgcTranscodeState,
  mergeUgcTranscodeState,
  readUgcTranscodeState,
  referencedUgcPaths,
} from "./ugcVideoPipeline";
import { findOrphanObjectPaths, collectReferencedPostVideoPaths } from "./orphanPostVideos";
import { isClaimableUgcPost } from "../processing/processors/ugcVideoProcessor";

const ROOT = join(__dirname, "../../..");
const OWNER = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function probe(overrides: Partial<ReturnType<typeof parseFfprobeJson>> = {}) {
  return {
    hasVideo: true,
    hasAudio: true,
    width: 1080,
    height: 1920,
    fps: 30,
    durationMs: 3000,
    sizeBytes: 1_000_000,
    videoCodec: "h264",
    audioCodec: "aac",
    formatName: "mov,mp4,mpeg4,isom",
    streams: [],
    ...overrides,
  };
}

describe("UGC encode policy", () => {
  it("uses visually good CRF and never hardcodes CRF 28+", () => {
    expect(UGC_CRF).toBe(23);
    const args = buildUgcFfmpegArgs({
      inputPath: "in.mp4",
      outputPath: "out.mp4",
      width: 2160,
      height: 3840,
      fps: 60,
      hasAudio: true,
    });
    expect(args).toContain("libx264");
    expect(args).toContain("aac");
    expect(args).toContain("yuv420p");
    expect(args).toContain("+faststart");
    expect(args).toContain("23");
    expect(args).not.toContain("28");
    expect(args.join(" ")).toMatch(/force_original_aspect_ratio=decrease/);
    expect(args.join(" ")).toMatch(/min\(iw,/);
    expect(args).toContain("-r");
    expect(args).toContain("30");
  });

  it("never upscales and keeps source fps at or below 30", () => {
    expect(computeOutputSize(720, 1280)).toEqual({ width: 720, height: 1280 });
    expect(computeOutputSize(2160, 3840)).toEqual({ width: 1080, height: 1920 });
    expect(computeOutputSize(3840, 2160)).toEqual({ width: 1920, height: 1080 });
    expect(shouldCapFps(30)).toBe(false);
    expect(shouldCapFps(29.97)).toBe(false);
    expect(shouldCapFps(60)).toBe(true);
    expect(parseFrameRate("30000/1001")).toBeCloseTo(29.97, 2);
    const keepFps = buildUgcFfmpegArgs({
      inputPath: "in.mp4",
      outputPath: "out.mp4",
      fps: 30,
      hasAudio: false,
    });
    expect(keepFps).not.toContain("-r");
    expect(keepFps).toContain("-an");
  });

  it("builds deterministic playback keys and refuses foreign folders", () => {
    expect(buildUgcPlaybackPath(OWNER, `${OWNER}/abc.mov`)).toBe(
      `${OWNER}/abc-playback.mp4`
    );
    expect(buildUgcPlaybackPath(OWNER, `${OWNER}/abc-playback.mp4`)).toBe(
      `${OWNER}/abc-playback.mp4`
    );
    expect(isUgcPlaybackPath(`${OWNER}/abc-playback.mp4`)).toBe(true);
    expect(
      collectOwnedMediaPaths(OWNER, [`${OWNER}/a.mp4`, `${OTHER}/b.mp4`, ""])
    ).toEqual([`${OWNER}/a.mp4`]);
  });
});

describe("UGC fail-safe gate", () => {
  it("rejects missing/empty/unplayable/duration-mismatch output", () => {
    expect(
      validateOptimizedLocalOutput({
        ffmpegOk: false,
        outputPath: "missing.mp4",
        inputProbe: probe(),
        outputProbe: null,
      }).ok
    ).toBe(false);
    expect(
      validateOptimizedLocalOutput({
        ffmpegOk: true,
        outputPath: join(ROOT, "package.json"),
        inputProbe: probe(),
        outputProbe: probe({ hasVideo: false }),
      })
    ).toMatchObject({ ok: false, code: "output_not_playable" });
    expect(
      validateOptimizedLocalOutput({
        ffmpegOk: true,
        outputPath: join(ROOT, "package.json"),
        inputProbe: probe({ hasAudio: true }),
        outputProbe: probe({ hasAudio: false }),
      })
    ).toMatchObject({ ok: false, code: "output_audio_missing" });
    expect(
      validateOptimizedLocalOutput({
        ffmpegOk: true,
        outputPath: join(ROOT, "package.json"),
        inputProbe: probe({ durationMs: 5000 }),
        outputProbe: probe({ durationMs: 1000 }),
      })
    ).toMatchObject({ ok: false, code: "duration_mismatch" });
    expect(durationWithinTolerance(3000, 3100)).toBe(true);
    expect(shouldKeepOriginalBecauseNoSaving(100, 120)).toBe(true);
    expect(shouldKeepOriginalBecauseNoSaving(200, 80)).toBe(false);
  });

  it("parses ffprobe json for video+audio and silent video", () => {
    const parsed = parseFfprobeJson(
      JSON.stringify({
        streams: [
          {
            codec_type: "video",
            codec_name: "h264",
            width: 1080,
            height: 1920,
            r_frame_rate: "30/1",
            duration: "3.0",
          },
          { codec_type: "audio", codec_name: "aac", duration: "3.0" },
        ],
        format: { duration: "3.0", size: "12345", format_name: "mov,mp4" },
      })
    );
    expect(parsed).toMatchObject({
      hasVideo: true,
      hasAudio: true,
      width: 1080,
      height: 1920,
      durationMs: 3000,
    });
    const silent = parseFfprobeJson(
      JSON.stringify({
        streams: [{ codec_type: "video", codec_name: "h264", width: 2, height: 2 }],
        format: { duration: "1" },
      })
    );
    expect(silent?.hasAudio).toBe(false);
    expect(silent?.hasVideo).toBe(true);
  });
});

describe("UGC pipeline state + claim", () => {
  it("defaults the transcode flag off", () => {
    expect(isUgcVideoTranscodeEnabled({})).toBe(false);
    expect(isUgcVideoTranscodeEnabled({ UGC_VIDEO_TRANSCODE: "0" })).toBe(false);
    expect(isUgcVideoTranscodeEnabled({ UGC_VIDEO_TRANSCODE: "1" })).toBe(true);
  });

  it("merges ugc_transcode without dropping overlays", () => {
    const merged = mergeUgcTranscodeState(
      { overlays: [{ id: "t1" }], hls: null },
      emptyUgcTranscodeState(`${OWNER}/src.mp4`)
    );
    expect(merged.overlays).toEqual([{ id: "t1" }]);
    expect(readUgcTranscodeState(merged)?.original_path).toBe(`${OWNER}/src.mp4`);
  });

  it("claims only new flagged UGC jobs and is idempotent after replace", () => {
    const pipeline = mergeUgcTranscodeState(
      {},
      emptyUgcTranscodeState(`${OWNER}/src.mp4`)
    );
    expect(
      isClaimableUgcPost({
        post_type: "video",
        article_id: null,
        media_status: "queued",
        video_path: `${OWNER}/src.mp4`,
        media_pipeline: pipeline,
      })
    ).toBe(true);
    expect(
      isClaimableUgcPost({
        post_type: "video",
        article_id: "art-1",
        media_status: "queued",
        video_path: `${OWNER}/src.mp4`,
        media_pipeline: pipeline,
      })
    ).toBe(false);
    const replaced = mergeUgcTranscodeState(
      pipeline,
      {
        ...emptyUgcTranscodeState(`${OWNER}/src.mp4`),
        playback_replaced: true,
        optimized_path: `${OWNER}/src-playback.mp4`,
      }
    );
    expect(
      isClaimableUgcPost({
        post_type: "video",
        media_status: "queued",
        video_path: `${OWNER}/src-playback.mp4`,
        media_pipeline: replaced,
      })
    ).toBe(false);
  });
});

describe("orphan + referenced paths", () => {
  it("never treats a referenced object as an orphan", () => {
    const refs = collectReferencedPostVideoPaths([
      {
        video_path: `${OWNER}/a-playback.mp4`,
        thumbnail_path: `${OWNER}/thumbs/a.jpg`,
        media_pipeline: mergeUgcTranscodeState(
          {},
          {
            ...emptyUgcTranscodeState(`${OWNER}/a.mp4`),
            optimized_path: `${OWNER}/a-playback.mp4`,
            playback_replaced: true,
          }
        ),
      },
    ]);
    const { orphans, skippedReferenced } = findOrphanObjectPaths(
      [`${OWNER}/a.mp4`, `${OWNER}/a-playback.mp4`, `${OWNER}/lost.mp4`],
      refs
    );
    expect(orphans).toEqual([`${OWNER}/lost.mp4`]);
    expect(skippedReferenced).toEqual(
      expect.arrayContaining([`${OWNER}/a.mp4`, `${OWNER}/a-playback.mp4`])
    );
    expect(
      referencedUgcPaths({
        videoPath: `${OWNER}/a-playback.mp4`,
        pipeline: mergeUgcTranscodeState(
          {},
          emptyUgcTranscodeState(`${OWNER}/a.mp4`)
        ),
      })
    ).toEqual(expect.arrayContaining([`${OWNER}/a-playback.mp4`, `${OWNER}/a.mp4`]));
  });
});

describe("UGC wiring contracts", () => {
  it("registers ugc_video beside article teasers and keeps HLS out of V1", () => {
    const worker = read("scripts/media/mediaWorker.ts");
    expect(worker).toMatch(/ugc_video/);
    expect(worker).not.toMatch(/hls/i);
    const types = read("lib/media/processing/types.ts");
    expect(types).toMatch(/"ugc_video"/);
    const register = read("lib/media/processing/registerBuiltinProcessors.ts");
    expect(register).toMatch(/createUgcVideoProcessor/);
    const processor = read("lib/media/processing/processors/ugcVideoProcessor.ts");
    expect(processor).toMatch(/deleteOwnedVideoObject/);
    expect(processor).toMatch(/createVideoSignedUrl/);
    expect(processor).toMatch(/playback_replaced/);
    expect(processor).toMatch(/analyzeUgcLoudness/);
    expect(processor).not.toMatch(/hls/i);
  });

  it("leaves new uploads on original when the flag is off", () => {
    const insert = read("lib/supabase/videoPosts.ts");
    expect(insert).toMatch(/isUgcVideoTranscodeEnabled/);
    expect(insert).toMatch(/transcodeEnabled/);
    expect(insert).toMatch(/media_status: "ready"/);
  });
});
