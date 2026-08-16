/**
 * UGC video processor — one optimized H.264/AAC MP4 playback object.
 * Fail-safe: original is deleted only after the 8-step gate.
 */

import { existsSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { POST_VIDEOS_BUCKET } from "../../../supabase/videoPostsShared";
import { createVideoSignedUrl, deleteOwnedVideoObject } from "../../../supabase/videoPosts";
import { computeAspectRatioLabel } from "../../pipelineTypes";
import { runFfmpeg } from "../adapters/ffmpegAdapter";
import {
  downloadToFile,
  safeCleanupPath,
  uploadFile,
} from "../adapters/storageAdapter";
import type { MediaProcessor, ProcessorContext } from "../processor";
import type { MediaJobRef, MediaProcessResult } from "../types";
import { buildUgcFfmpegArgs, UGC_FFMPEG_TIMEOUT_MS, UGC_MAX_ATTEMPTS, UGC_STALE_PROCESSING_MS } from "../../ugc/ugcVideoPolicy";
import { buildUgcPlaybackPath, buildUgcTempPlaybackPath, isUgcPlaybackPath } from "../../ugc/ugcVideoPaths";
import {
  emptyUgcTranscodeState,
  mergeUgcTranscodeState,
  readUgcTranscodeState,
  type UgcTranscodeState,
} from "../../ugc/ugcVideoPipeline";
import { probeMediaFile } from "../../ugc/ugcVideoProbe";
import {
  shouldKeepOriginalBecauseNoSaving,
  validateOptimizedLocalOutput,
} from "../../ugc/ugcVideoValidate";

export const UGC_VIDEO_KIND = "ugc_video" as const;

export type UgcClaimedPayload = {
  post_id: number;
  owner_user_id: string;
  video_path: string;
  media_status: string;
  media_pipeline: Record<string, unknown> | null;
  video_byte_size: number | null;
};

function asPayload(job: MediaJobRef): UgcClaimedPayload {
  const p = job.payload;
  return {
    post_id: Number(p.post_id ?? 0),
    owner_user_id: String(p.owner_user_id ?? ""),
    video_path: String(p.video_path ?? ""),
    media_status: String(p.media_status ?? ""),
    media_pipeline:
      p.media_pipeline && typeof p.media_pipeline === "object"
        ? (p.media_pipeline as Record<string, unknown>)
        : null,
    video_byte_size:
      typeof p.video_byte_size === "number" ? p.video_byte_size : null,
  };
}

export function isClaimableUgcPost(row: {
  post_type?: string | null;
  article_id?: string | null;
  media_status?: string | null;
  processing_started_at?: string | null;
  video_path?: string | null;
  media_pipeline?: unknown;
  nowMs?: number;
}): boolean {
  if (row.post_type !== "video") return false;
  if (row.article_id) return false;
  const path = (row.video_path ?? "").trim();
  if (!path) return false;
  const state = readUgcTranscodeState(row.media_pipeline);
  if (!state?.enabled || state.playback_replaced) return false;
  if (state.attempt_count >= UGC_MAX_ATTEMPTS) return false;
  const status = row.media_status ?? "";
  if (status === "queued") return true;
  if (status !== "processing") return false;
  const started = row.processing_started_at
    ? Date.parse(row.processing_started_at)
    : NaN;
  if (!Number.isFinite(started)) return true;
  const now = row.nowMs ?? Date.now();
  return now - started >= UGC_STALE_PROCESSING_MS;
}

type SessionArtifact = {
  playbackPath: string;
  originalPath: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  fps: number | null;
  skipped: string | null;
  alreadyReady?: boolean;
};

async function removeUnreferencedOutput(
  supabase: SupabaseClient,
  userId: string,
  path: string,
  currentVideoPath: string
): Promise<void> {
  if (!path || path === currentVideoPath) return;
  await deleteOwnedVideoObject(supabase, userId, path);
}

export function createUgcVideoProcessor(
  supabase: SupabaseClient
): MediaProcessor {
  const session = new Map<string, SessionArtifact>();

  return {
    kind: UGC_VIDEO_KIND,
    maxAttempts: UGC_MAX_ATTEMPTS,

    async validate(job) {
      const p = asPayload(job);
      if (!job.jobId || !p.post_id || !p.owner_user_id || !p.video_path) {
        return { ok: false, code: "invalid_job" };
      }
      return { ok: true };
    },

    async claim() {
      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, user_id, post_type, article_id, video_path, video_byte_size, media_status, processing_started_at, media_pipeline"
        )
        .eq("post_type", "video")
        .in("media_status", ["queued", "processing"])
        .is("article_id", null)
        .order("created_at", { ascending: true })
        .limit(25);

      if (error || !data) return null;

      const nowMs = Date.now();
      const candidate = data.find((row) =>
        isClaimableUgcPost({ ...row, nowMs })
      );
      if (!candidate?.id || !candidate.user_id || !candidate.video_path) {
        return null;
      }

      const prior = readUgcTranscodeState(candidate.media_pipeline);
      const nextState: UgcTranscodeState = {
        ...(prior ?? emptyUgcTranscodeState(String(candidate.video_path))),
        enabled: true,
        original_path: prior?.original_path || String(candidate.video_path),
        attempt_count: (prior?.attempt_count ?? 0) + 1,
      };

      const { data: claimed, error: claimError } = await supabase
        .from("posts")
        .update({
          media_status: "processing",
          processing_started_at: new Date().toISOString(),
          processing_progress: 40,
          media_pipeline: mergeUgcTranscodeState(
            candidate.media_pipeline,
            nextState
          ),
        })
        .eq("id", candidate.id)
        .eq("user_id", candidate.user_id)
        .in("media_status", ["queued", "processing"])
        .select(
          "id, user_id, video_path, video_byte_size, media_status, media_pipeline"
        )
        .maybeSingle();

      if (claimError || !claimed) return null;

      return {
        jobId: String(claimed.id),
        processorKind: UGC_VIDEO_KIND,
        attemptCount: nextState.attempt_count,
        payload: {
          post_id: claimed.id,
          owner_user_id: claimed.user_id,
          video_path: claimed.video_path,
          media_status: claimed.media_status,
          media_pipeline: claimed.media_pipeline,
          video_byte_size: claimed.video_byte_size,
        },
      };
    },

    async execute(job, ctx): Promise<MediaProcessResult> {
      const p = asPayload(job);
      const state =
        readUgcTranscodeState(p.media_pipeline) ??
        emptyUgcTranscodeState(p.video_path);
      const originalPath = state.original_path || p.video_path;
      const playbackPath = buildUgcPlaybackPath(p.owner_user_id, originalPath);
      const tempPath = buildUgcTempPlaybackPath(p.owner_user_id, originalPath);

      if (p.media_status === "ready" && isUgcPlaybackPath(p.video_path) && state.playback_replaced) {
        session.set(job.jobId, {
          playbackPath: p.video_path,
          originalPath,
          byteSize: p.video_byte_size ?? 0,
          width: null,
          height: null,
          durationMs: null,
          fps: null,
          skipped: state.skipped,
          alreadyReady: true,
        });
        return { ok: true, state: "ready" };
      }

      const inputFile = `${ctx.workDir}/source`;
      const outputFile = `${ctx.workDir}/playback.mp4`;

      ctx.reportProgress("processing", "download");
      const downloaded = await downloadToFile(supabase, {
        bucket: POST_VIDEOS_BUCKET,
        path: originalPath,
        destFile: inputFile,
      });
      if (!downloaded.ok) {
        return { ok: false, error: { code: "download_failed", kind: "retryable" } };
      }

      const inputProbed = await probeMediaFile(inputFile, { signal: ctx.signal });
      if (!inputProbed.ok || !inputProbed.probe.hasVideo) {
        return {
          ok: false,
          error: { code: inputProbed.ok ? "output_not_playable" : inputProbed.code, kind: "retryable" },
        };
      }

      ctx.reportProgress("processing", "ffmpeg");
      const args = buildUgcFfmpegArgs({
        inputPath: inputFile,
        outputPath: outputFile,
        width: inputProbed.probe.width,
        height: inputProbed.probe.height,
        fps: inputProbed.probe.fps,
        hasAudio: inputProbed.probe.hasAudio,
      });
      const ffmpeg = await runFfmpeg({
        args,
        signal: ctx.signal,
        timeoutMs: UGC_FFMPEG_TIMEOUT_MS,
        binary: process.env.FFMPEG_PATH?.trim() || process.env.UMTUBA_FFMPEG?.trim(),
      });
      if (!ffmpeg.ok) {
        await safeCleanupPath(outputFile);
        return {
          ok: false,
          error: {
            code: ffmpeg.code,
            kind: ffmpeg.code === "ffmpeg_missing" ? "permanent" : "retryable",
          },
        };
      }

      const outputProbed = existsSync(outputFile)
        ? await probeMediaFile(outputFile, { signal: ctx.signal })
        : { ok: false as const, code: "output_missing" };

      const localGate = validateOptimizedLocalOutput({
        ffmpegOk: ffmpeg.ok,
        outputPath: outputFile,
        inputProbe: inputProbed.probe,
        outputProbe: outputProbed.ok ? outputProbed.probe : null,
      });

      if (!localGate.ok) {
        await safeCleanupPath(outputFile);
        ctx.log("ugc_local_gate_failed", { code: localGate.code });
        return {
          ok: false,
          error: {
            code: localGate.code,
            kind:
              localGate.code === "ffmpeg_missing" || localGate.code === "ffprobe_missing"
                ? "permanent"
                : "retryable",
          },
        };
      }

      const inputBytes = inputProbed.probe.sizeBytes ?? p.video_byte_size ?? 0;
      if (shouldKeepOriginalBecauseNoSaving(inputBytes, localGate.sizeBytes)) {
        await safeCleanupPath(outputFile);
        session.set(job.jobId, {
          playbackPath: originalPath,
          originalPath,
          byteSize: inputBytes,
          width: inputProbed.probe.width,
          height: inputProbed.probe.height,
          durationMs: inputProbed.probe.durationMs,
          fps: inputProbed.probe.fps,
          skipped: "no_saving",
        });
        return { ok: true, state: "ready" };
      }

      ctx.reportProgress("uploading");
      const uploaded = await uploadFile(supabase, {
        bucket: POST_VIDEOS_BUCKET,
        path: tempPath,
        localFile: outputFile,
        contentType: "video/mp4",
        upsert: true,
      });
      if (!uploaded.ok) {
        await safeCleanupPath(outputFile);
        return { ok: false, error: { code: "upload_failed", kind: "retryable" } };
      }

      const signed = await createVideoSignedUrl(supabase, tempPath);
      if (!signed) {
        await removeUnreferencedOutput(supabase, p.owner_user_id, tempPath, originalPath);
        return { ok: false, error: { code: "output_unreadable", kind: "retryable" } };
      }

      const promoted = await uploadFile(supabase, {
        bucket: POST_VIDEOS_BUCKET,
        path: playbackPath,
        localFile: outputFile,
        contentType: "video/mp4",
        upsert: true,
      });
      if (!promoted.ok) {
        await removeUnreferencedOutput(supabase, p.owner_user_id, tempPath, originalPath);
        return { ok: false, error: { code: "upload_failed", kind: "retryable" } };
      }

      const playbackSigned = await createVideoSignedUrl(supabase, playbackPath);
      if (!playbackSigned) {
        await removeUnreferencedOutput(supabase, p.owner_user_id, tempPath, originalPath);
        await removeUnreferencedOutput(supabase, p.owner_user_id, playbackPath, originalPath);
        return { ok: false, error: { code: "output_unreadable", kind: "retryable" } };
      }

      if (tempPath !== playbackPath) {
        await removeUnreferencedOutput(supabase, p.owner_user_id, tempPath, originalPath);
      }

      session.set(job.jobId, {
        playbackPath,
        originalPath,
        byteSize: localGate.sizeBytes,
        width: outputProbed.ok ? outputProbed.probe.width : inputProbed.probe.width,
        height: outputProbed.ok ? outputProbed.probe.height : inputProbed.probe.height,
        durationMs: outputProbed.ok ? outputProbed.probe.durationMs : inputProbed.probe.durationMs,
        fps: outputProbed.ok ? outputProbed.probe.fps : inputProbed.probe.fps,
        skipped: null,
      });
      return { ok: true, state: "ready" };
    },

    async finalize(job, ctx): Promise<MediaProcessResult> {
      const p = asPayload(job);
      const carried = session.get(job.jobId);
      if (carried?.alreadyReady) {
        session.delete(job.jobId);
        return { ok: true, state: "ready" };
      }
      if (!carried) {
        return {
          ok: false,
          error: { code: "post_finalize_failed", kind: "retryable" },
        };
      }

      const prior =
        readUgcTranscodeState(p.media_pipeline) ??
        emptyUgcTranscodeState(carried.originalPath);
      const nextState: UgcTranscodeState = {
        ...prior,
        enabled: true,
        original_path: carried.originalPath,
        optimized_path:
          carried.skipped === "no_saving" ? carried.originalPath : carried.playbackPath,
        playback_replaced: carried.skipped !== "no_saving",
        skipped: carried.skipped,
        last_error: null,
      };

      const now = new Date().toISOString();
      const { data: switched, error } = await supabase
        .from("posts")
        .update({
          video_path: carried.playbackPath,
          video_mime_type: "video/mp4",
          video_byte_size: carried.byteSize,
          media_file_size: carried.byteSize,
          media_width: carried.width,
          media_height: carried.height,
          media_duration_ms: carried.durationMs,
          media_fps: carried.fps,
          media_codec: "h264",
          media_aspect_ratio: computeAspectRatioLabel(carried.width, carried.height),
          media_status: "ready",
          processing_progress: 100,
          processing_completed_at: now,
          processing_error: null,
          media_pipeline: mergeUgcTranscodeState(p.media_pipeline, nextState),
        })
        .eq("id", p.post_id)
        .eq("user_id", p.owner_user_id)
        .in("media_status", ["queued", "processing"])
        .select("id, video_path")
        .maybeSingle();

      if (error || !switched) {
        await removeUnreferencedOutput(
          supabase,
          p.owner_user_id,
          carried.playbackPath,
          carried.originalPath
        );
        return {
          ok: false,
          error: { code: "post_finalize_failed", kind: "retryable" },
        };
      }

      if (
        carried.skipped !== "no_saving" &&
        carried.originalPath &&
        carried.originalPath !== carried.playbackPath
      ) {
        await deleteOwnedVideoObject(
          supabase,
          p.owner_user_id,
          carried.originalPath
        );
      }

      try {
        const { videoContentAdapter } = await import(
          "../../../content/adapters/videoAdapter"
        );
        await videoContentAdapter.sync(supabase, String(p.post_id));
        ctx.log("registry_sync_ok", { ok: true });
      } catch (syncError) {
        ctx.log("registry_sync_soft_fail", {
          ok: false,
          message:
            syncError instanceof Error ? syncError.message.slice(0, 80) : "err",
        });
      }

      session.delete(job.jobId);
      return { ok: true, state: "ready" };
    },

    async fail(job, error) {
      const p = asPayload(job);
      const prior =
        readUgcTranscodeState(p.media_pipeline) ??
        emptyUgcTranscodeState(p.video_path);
      const retryable = error.kind === "retryable" && prior.attempt_count < UGC_MAX_ATTEMPTS;
      const playbackPath = buildUgcPlaybackPath(p.owner_user_id, prior.original_path || p.video_path);
      const tempPath = buildUgcTempPlaybackPath(p.owner_user_id, prior.original_path || p.video_path);
      if (p.video_path !== playbackPath) {
        await removeUnreferencedOutput(supabase, p.owner_user_id, playbackPath, p.video_path);
      }
      if (p.video_path !== tempPath) {
        await removeUnreferencedOutput(supabase, p.owner_user_id, tempPath, p.video_path);
      }

      await supabase
        .from("posts")
        .update({
          media_status: retryable ? "queued" : "processing",
          processing_error: error.code,
          processing_progress: retryable ? 10 : 40,
          media_pipeline: mergeUgcTranscodeState(p.media_pipeline, {
            ...prior,
            last_error: error.code,
            playback_replaced: false,
          }),
        })
        .eq("id", p.post_id)
        .eq("user_id", p.owner_user_id)
        .neq("media_status", "ready");

      session.delete(job.jobId);
    },

    isRetryEligible(job, errorCode) {
      if (job.attemptCount >= UGC_MAX_ATTEMPTS) return false;
      const permanent = new Set(["invalid_job", "ffmpeg_missing", "ffprobe_missing"]);
      return !permanent.has(errorCode);
    },

    async cleanup(_job, workDir) {
      await safeCleanupPath(workDir);
    },
  };
}

export async function processUgcVideoJob(
  supabase: SupabaseClient,
  job: MediaJobRef,
  ctx: ProcessorContext
): Promise<MediaProcessResult> {
  const processor = createUgcVideoProcessor(supabase);
  const validated = await processor.validate(job);
  if (!validated.ok) {
    await processor.fail(job, { code: validated.code, kind: "permanent" }, ctx);
    return { ok: false, error: { code: validated.code, kind: "permanent" } };
  }
  const executed = await processor.execute(job, ctx);
  if (!executed.ok) {
    await processor.fail(job, executed.error, ctx);
    return executed;
  }
  return processor.finalize(job, ctx);
}
