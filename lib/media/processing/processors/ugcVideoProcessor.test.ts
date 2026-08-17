import { describe, expect, it, vi, beforeEach } from "vitest";
import { writeFileSync } from "node:fs";
import { createUgcVideoProcessor } from "./ugcVideoProcessor";
import type { MediaJobRef } from "../types";
import type { ProcessorContext } from "../processor";

const OWNER = "11111111-1111-4111-8111-111111111111";
const ORIGINAL = `${OWNER}/clip.mp4`;
const PLAYBACK = `${OWNER}/clip-playback.mp4`;
const TEMP = `${OWNER}/clip-playback.tmp.mp4`;

const downloadToFile = vi.fn();
const uploadFile = vi.fn();
const runFfmpeg = vi.fn();
const probeMediaFile = vi.fn();
const createVideoSignedUrl = vi.fn();
const deleteOwnedVideoObject = vi.fn();
const videoSync = vi.fn();

vi.mock("../adapters/storageAdapter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../adapters/storageAdapter")>();
  return {
    ...actual,
    downloadToFile: (...args: unknown[]) => downloadToFile(...args),
    uploadFile: (...args: unknown[]) => uploadFile(...args),
  };
});

vi.mock("../adapters/ffmpegAdapter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../adapters/ffmpegAdapter")>();
  return {
    ...actual,
    runFfmpeg: (...args: unknown[]) => runFfmpeg(...args),
  };
});

vi.mock("../../ugc/ugcVideoProbe", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../ugc/ugcVideoProbe")>();
  return {
    ...actual,
    probeMediaFile: (...args: unknown[]) => probeMediaFile(...args),
  };
});

vi.mock("../../../supabase/videoPosts", () => ({
  createVideoSignedUrl: (...args: unknown[]) => createVideoSignedUrl(...args),
  deleteOwnedVideoObject: (...args: unknown[]) => deleteOwnedVideoObject(...args),
}));

vi.mock("../../../content/adapters/videoAdapter", () => ({
  videoContentAdapter: {
    sync: (...args: unknown[]) => videoSync(...args),
  },
}));

function job(overrides: Partial<MediaJobRef["payload"]> = {}): MediaJobRef {
  return {
    jobId: "42",
    processorKind: "ugc_video",
    attemptCount: 1,
    payload: {
      post_id: 42,
      owner_user_id: OWNER,
      video_path: ORIGINAL,
      media_status: "processing",
      video_byte_size: 5_000_000,
      media_pipeline: {
        ugc_transcode: {
          v: 1,
          enabled: true,
          original_path: ORIGINAL,
          optimized_path: null,
          attempt_count: 1,
          last_error: null,
          playback_replaced: false,
          skipped: null,
        },
      },
      ...overrides,
    },
  };
}

function ctx(workDir: string): ProcessorContext {
  return {
    signal: new AbortController().signal,
    workDir,
    attemptCount: 1,
    reportProgress: () => undefined,
    log: () => undefined,
  };
}

const LOUDNORM_ANALYZE_STDERR = [
  "{",
  '\t"input_i" : "-24.00",',
  '\t"input_tp" : "-2.10",',
  '\t"input_lra" : "6.40",',
  '\t"input_thresh" : "-34.20",',
  '\t"output_i" : "-16.10",',
  '\t"output_tp" : "-1.40",',
  '\t"output_lra" : "6.40",',
  '\t"output_thresh" : "-26.10",',
  '\t"normalization_type" : "dynamic",',
  '\t"target_offset" : "0.10"',
  "}",
].join("\n");

function probe(size: number, extras: Record<string, unknown> = {}) {
  return {
    ok: true as const,
    probe: {
      hasVideo: true,
      hasAudio: true,
      width: 1080,
      height: 1920,
      fps: 30,
      durationMs: 3000,
      sizeBytes: size,
      videoCodec: "h264",
      audioCodec: "aac",
      formatName: "mp4",
      streams: [],
      ...extras,
    },
  };
}

function createSupabase(options?: {
  claimRows?: unknown[];
  updateResult?: { data: unknown; error: unknown };
}) {
  const removed: string[][] = [];
  const updates: unknown[] = [];
  const from = vi.fn((table: string) => {
    if (table === "posts") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn(async () => ({
                    data: options?.claimRows ?? [],
                    error: null,
                  })),
                }),
              }),
            }),
          }),
        }),
        update: vi.fn((payload: unknown) => {
          updates.push(payload);
          const chain = {
            eq: vi.fn(() => chain),
            in: vi.fn(() => chain),
            neq: vi.fn(() => chain),
            select: vi.fn().mockReturnValue({
              maybeSingle: vi.fn(async () =>
                options?.updateResult ?? {
                  data: { id: 42, user_id: OWNER, video_path: PLAYBACK },
                  error: null,
                }
              ),
            }),
          };
          return chain;
        }),
      };
    }
    return {};
  });
  return {
    from,
    updates,
    storage: {
      from: vi.fn(() => ({
        remove: vi.fn(async (paths: string[]) => {
          removed.push(paths);
          return { error: null };
        }),
      })),
    },
    removed,
  };
}

describe("ugc video processor fail-safe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    downloadToFile.mockResolvedValue({ ok: true, path: "x" });
    uploadFile.mockResolvedValue({ ok: true, path: PLAYBACK });
    runFfmpeg.mockResolvedValue({
      ok: true,
      durationMs: 10,
      stderr: LOUDNORM_ANALYZE_STDERR,
    });
    createVideoSignedUrl.mockResolvedValue("https://signed.example/v.mp4");
    deleteOwnedVideoObject.mockResolvedValue(undefined);
    videoSync.mockResolvedValue(undefined);
  });

  it("FAILED_TRANSCODE_PRESERVES_ORIGINAL and removes corrupt output", async () => {
    const supabase = createSupabase();
    const processor = createUgcVideoProcessor(supabase as never);
    probeMediaFile.mockResolvedValue(probe(5_000_000));
    runFfmpeg
      .mockResolvedValueOnce({
        ok: true,
        durationMs: 5,
        stderr: LOUDNORM_ANALYZE_STDERR,
      })
      .mockResolvedValueOnce({
        ok: false,
        code: "render_failed",
        exitCode: 1,
        stderr: "boom",
        durationMs: 5,
      });

    const result = await processor.execute(job(), ctx("/tmp/ugc-test"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("render_failed");
    expect(uploadFile).not.toHaveBeenCalled();

    await processor.fail(
      job(),
      { code: "render_failed", kind: "retryable" },
      ctx("/tmp/ugc-test")
    );
    expect(deleteOwnedVideoObject).toHaveBeenCalledWith(
      expect.anything(),
      OWNER,
      PLAYBACK
    );
    expect(deleteOwnedVideoObject).toHaveBeenCalledWith(
      expect.anything(),
      OWNER,
      TEMP
    );
    const failUpdate = supabase.updates.at(-1) as { media_status?: string };
    expect(failUpdate.media_status).toBe("queued");
    expect(failUpdate).not.toMatchObject({ media_status: "ready" });
  });

  it("AUDIO_ANALYZE_FAIL_PRESERVES_ORIGINAL and does not upload", async () => {
    const supabase = createSupabase();
    const processor = createUgcVideoProcessor(supabase as never);
    probeMediaFile.mockResolvedValue(probe(5_000_000));
    runFfmpeg.mockResolvedValue({
      ok: false,
      code: "render_failed",
      exitCode: 1,
      stderr: "loudnorm failed",
      durationMs: 5,
    });

    const result = await processor.execute(job(), ctx("/tmp/ugc-test"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("loudnorm_analyze_failed");
    expect(uploadFile).not.toHaveBeenCalled();
    expect(deleteOwnedVideoObject).not.toHaveBeenCalledWith(
      expect.anything(),
      OWNER,
      ORIGINAL
    );
  });

  it("skips loudnorm for video-only sources and still succeeds", async () => {
    const supabase = createSupabase();
    const processor = createUgcVideoProcessor(supabase as never);
    const workDir = `${process.env.TEMP || "/tmp"}/ugc-silent-${Date.now()}`;
    const { mkdirSync } = await import("node:fs");
    mkdirSync(workDir, { recursive: true });
    writeFileSync(`${workDir}/playback.mp4`, Buffer.alloc(80_000));
    probeMediaFile
      .mockResolvedValueOnce(probe(5_000_000, { hasAudio: false, audioCodec: null }))
      .mockResolvedValueOnce(probe(80_000, { hasAudio: false, audioCodec: null }));

    const executed = await processor.execute(job(), ctx(workDir));
    expect(executed).toEqual({ ok: true, state: "ready" });
    expect(runFfmpeg).toHaveBeenCalledTimes(1);
    const encodeArgs = runFfmpeg.mock.calls[0]?.[0]?.args as string[];
    expect(encodeArgs).toContain("-an");
    expect(encodeArgs.join(" ")).not.toContain("loudnorm");
  });

  it("rejects clipped loudnorm output without deleting the original", async () => {
    const supabase = createSupabase();
    const processor = createUgcVideoProcessor(supabase as never);
    probeMediaFile.mockResolvedValue(probe(5_000_000));
    runFfmpeg
      .mockResolvedValueOnce({
        ok: true,
        durationMs: 5,
        stderr: LOUDNORM_ANALYZE_STDERR,
      })
      .mockResolvedValueOnce({
        ok: true,
        durationMs: 8,
        stderr: LOUDNORM_ANALYZE_STDERR.replace('"output_tp" : "-1.40"', '"output_tp" : "0.40"'),
      });

    const result = await processor.execute(job(), ctx("/tmp/ugc-clip"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("output_audio_clipping");
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("still promotes playback when loudnorm is applied even if the file is not smaller", async () => {
    const supabase = createSupabase();
    const processor = createUgcVideoProcessor(supabase as never);
    const workDir = `${process.env.TEMP || "/tmp"}/ugc-loud-${Date.now()}`;
    const { mkdirSync } = await import("node:fs");
    mkdirSync(workDir, { recursive: true });
    writeFileSync(`${workDir}/playback.mp4`, Buffer.alloc(80_000));
    probeMediaFile
      .mockResolvedValueOnce(probe(50_000))
      .mockResolvedValueOnce(probe(80_000));
    uploadFile
      .mockResolvedValueOnce({ ok: true, path: TEMP })
      .mockResolvedValueOnce({ ok: true, path: PLAYBACK });

    const executed = await processor.execute(job(), ctx(workDir));
    expect(executed).toEqual({ ok: true, state: "ready" });
    expect(uploadFile).toHaveBeenCalled();
  });

  it("BACKGROUND_WORKER_RETRY re-queues until max attempts", async () => {
    const supabase = createSupabase();
    const processor = createUgcVideoProcessor(supabase as never);
    expect(processor.isRetryEligible(job(), "upload_failed")).toBe(true);
    expect(
      processor.isRetryEligible({ ...job(), attemptCount: 5 }, "upload_failed")
    ).toBe(false);

    await processor.fail(
      { ...job(), attemptCount: 5, payload: { ...job().payload, media_pipeline: {
        ugc_transcode: {
          v: 1,
          enabled: true,
          original_path: ORIGINAL,
          optimized_path: null,
          attempt_count: 5,
          last_error: null,
          playback_replaced: false,
          skipped: null,
        },
      } } },
      { code: "upload_failed", kind: "retryable" },
      ctx("/tmp/ugc-test")
    );
    const failUpdate = supabase.updates.at(-1) as { media_status?: string };
    expect(failUpdate.media_status).toBe("processing");
  });

  it("atomically switches to optimized object then deletes original", async () => {
    const supabase = createSupabase();
    const processor = createUgcVideoProcessor(supabase as never);
    const workDir = `${process.env.TEMP || "/tmp"}/ugc-proc-${Date.now()}`;
    const { mkdirSync } = await import("node:fs");
    mkdirSync(workDir, { recursive: true });
    writeFileSync(`${workDir}/playback.mp4`, Buffer.alloc(80_000));

    probeMediaFile
      .mockResolvedValueOnce(probe(5_000_000))
      .mockResolvedValueOnce(probe(80_000));
    uploadFile
      .mockResolvedValueOnce({ ok: true, path: TEMP })
      .mockResolvedValueOnce({ ok: true, path: PLAYBACK });

    const executed = await processor.execute(job(), ctx(workDir));
    expect(executed).toEqual({ ok: true, state: "ready" });

    const finalized = await processor.finalize(job(), ctx(workDir));
    expect(finalized).toEqual({ ok: true, state: "ready" });
    expect(deleteOwnedVideoObject).toHaveBeenCalledWith(
      expect.anything(),
      OWNER,
      ORIGINAL
    );
    const readyUpdate = supabase.updates.find(
      (row) => (row as { media_status?: string }).media_status === "ready"
    ) as { video_path?: string };
    expect(readyUpdate.video_path).toBe(PLAYBACK);
  });

  it("does not mark ready when signed URL verification fails", async () => {
    const supabase = createSupabase();
    const processor = createUgcVideoProcessor(supabase as never);
    const workDir = `${process.env.TEMP || "/tmp"}/ugc-unreadable-${Date.now()}`;
    const { mkdirSync } = await import("node:fs");
    mkdirSync(workDir, { recursive: true });
    writeFileSync(`${workDir}/playback.mp4`, Buffer.alloc(80_000));
    probeMediaFile
      .mockResolvedValueOnce(probe(5_000_000))
      .mockResolvedValueOnce(probe(80_000));
    createVideoSignedUrl.mockResolvedValue(null);

    const executed = await processor.execute(job(), ctx(workDir));
    expect(executed.ok).toBe(false);
    if (!executed.ok) expect(executed.error.code).toBe("output_unreadable");
    expect(supabase.updates.some((row) => (row as { media_status?: string }).media_status === "ready")).toBe(false);
  });
});
