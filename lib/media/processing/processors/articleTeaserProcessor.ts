/**
 * Article Teaser Processor — domain logic only; uses FFmpeg/Storage adapters.
 */

import { existsSync, promises as fs } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ARTICLE_TEASER_DURATION_MS,
  ARTICLE_TEASER_MAX_ATTEMPTS,
  ARTICLE_TEASER_RPCS,
  sanitizeTeaserErrorCode,
  type TeaserBackgroundMode,
} from "../../../articles/articleTeaserFoundation";
import { buildTeaserFfmpegArgs } from "../../../articles/articleTeaserFfmpeg";
import { POST_VIDEOS_BUCKET } from "../../../supabase/videoPostsShared";
import { runFfmpeg } from "../adapters/ffmpegAdapter";
import {
  downloadHttpOrStorage,
  safeCleanupPath,
  uploadFile,
} from "../adapters/storageAdapter";
import type { MediaProcessor, ProcessorContext } from "../processor";
import type { MediaJobRef, MediaProcessResult } from "../types";

export type ArticleTeaserClaimedPayload = {
  article_id: string;
  owner_user_id: string;
  status: string;
  teaser_source: string;
  background_mode: TeaserBackgroundMode;
  background_asset_path: string | null;
  audio_mode: string;
  generated_video_path: string | null;
  generated_post_id: number | null;
};

function asPayload(job: MediaJobRef): ArticleTeaserClaimedPayload {
  const p = job.payload;
  return {
    article_id: String(p.article_id ?? ""),
    owner_user_id: String(p.owner_user_id ?? ""),
    status: String(p.status ?? ""),
    teaser_source: String(p.teaser_source ?? ""),
    background_mode: String(p.background_mode ?? "gradient") as TeaserBackgroundMode,
    background_asset_path:
      typeof p.background_asset_path === "string" ? p.background_asset_path : null,
    audio_mode: String(p.audio_mode ?? "silent"),
    generated_video_path:
      typeof p.generated_video_path === "string" ? p.generated_video_path : null,
    generated_post_id:
      p.generated_post_id == null ? null : Number(p.generated_post_id),
  };
}

function resolveFontFile(): string {
  const candidates = [
    process.env.UMTUBA_TEASER_FONT,
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansArabic-Regular.otf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial.ttf",
  ].filter(Boolean) as string[];

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error("ffmpeg_missing_font");
}

async function markJobFailed(
  supabase: SupabaseClient,
  jobId: string,
  errorCode: string
): Promise<void> {
  await supabase
    .from("article_teaser_jobs")
    .update({
      status: "failed",
      error_code: sanitizeTeaserErrorCode(errorCode),
    })
    .eq("id", jobId)
    .eq("status", "processing");
}

async function finalizeReadyPost(
  supabase: SupabaseClient,
  job: ArticleTeaserClaimedPayload & { id: string },
  videoPath: string,
  byteSize: number,
  title: string,
  profile: {
    full_name: string;
    username: string;
    avatar_initial: string;
  }
): Promise<number> {
  const now = new Date().toISOString();
  const authorUsername = profile.username.startsWith("@")
    ? profile.username
    : `@${profile.username}`;

  if (job.generated_post_id) {
    const { data, error } = await supabase
      .from("posts")
      .update({
        content: title,
        video_path: videoPath,
        video_mime_type: "video/mp4",
        video_byte_size: byteSize,
        media_status: "ready",
        processing_progress: 100,
        processing_completed_at: now,
        processing_error: null,
        media_duration_ms: ARTICLE_TEASER_DURATION_MS,
        media_width: 1080,
        media_height: 1920,
        media_codec: "h264",
        article_id: job.article_id,
      })
      .eq("id", job.generated_post_id)
      .eq("user_id", job.owner_user_id)
      .select("id")
      .maybeSingle();
    if (!error && data?.id) return Number(data.id);
  }

  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("article_id", job.article_id)
    .eq("user_id", job.owner_user_id)
    .eq("post_type", "video")
    .eq("media_status", "ready")
    .not("video_path", "is", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { data } = await supabase
      .from("posts")
      .update({
        content: title,
        video_path: videoPath,
        video_mime_type: "video/mp4",
        video_byte_size: byteSize,
        media_status: "ready",
        processing_progress: 100,
        processing_completed_at: now,
        processing_error: null,
        media_duration_ms: ARTICLE_TEASER_DURATION_MS,
        media_width: 1080,
        media_height: 1920,
        media_codec: "h264",
      })
      .eq("id", existing.id)
      .select("id")
      .single();
    return Number(data?.id ?? existing.id);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("posts")
    .insert({
      user_id: job.owner_user_id,
      content: title,
      post_type: "video",
      author_name: profile.full_name,
      author_username: authorUsername,
      author_avatar: profile.avatar_initial,
      image_url: null,
      video_url: null,
      video_path: videoPath,
      video_mime_type: "video/mp4",
      video_byte_size: byteSize,
      media_status: "ready",
      upload_started_at: now,
      upload_completed_at: now,
      processing_started_at: now,
      processing_completed_at: now,
      processing_error: null,
      processing_progress: 100,
      media_duration_ms: ARTICLE_TEASER_DURATION_MS,
      media_width: 1080,
      media_height: 1920,
      media_codec: "h264",
      media_file_size: byteSize,
      media_aspect_ratio: "9:16",
      article_id: job.article_id,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      views: 0,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    throw new Error("post_finalize_failed");
  }
  return Number(inserted.id);
}

export function createArticleTeaserProcessor(
  supabase: SupabaseClient
): MediaProcessor {
  // Carry finalize artifacts across execute → finalize within one dispatch.
  const session = new Map<
    string,
    { uploadPath: string; postId: number; alreadyReady?: boolean }
  >();

  return {
    kind: "article_teaser",
    maxAttempts: ARTICLE_TEASER_MAX_ATTEMPTS,

    async validate(job) {
      const p = asPayload(job);
      if (!job.jobId || !p.article_id || !p.owner_user_id) {
        return { ok: false, code: "invalid_job" };
      }
      return { ok: true };
    },

    async claim() {
      const { data, error } = await supabase.rpc(ARTICLE_TEASER_RPCS.claim);
      if (error || !data) return null;
      const row = data as Record<string, unknown>;
      if (typeof row.id !== "string") return null;
      return {
        jobId: row.id,
        processorKind: "article_teaser" as const,
        attemptCount: Number(row.attempt_count ?? 0),
        payload: {
          article_id: String(row.article_id),
          owner_user_id: String(row.owner_user_id),
          status: String(row.status),
          teaser_source: String(row.teaser_source),
          background_mode: String(row.background_mode),
          background_asset_path: row.background_asset_path ?? null,
          audio_mode: String(row.audio_mode ?? "silent"),
          generated_video_path: row.generated_video_path ?? null,
          generated_post_id: row.generated_post_id ?? null,
        },
      };
    },

    async execute(job, ctx): Promise<MediaProcessResult> {
      const p = asPayload(job);

      if (p.teaser_source === "uploaded") {
        await supabase
          .from("article_teaser_jobs")
          .update({ status: "not_required", error_code: null })
          .eq("id", job.jobId);
        session.set(job.jobId, {
          uploadPath: "",
          postId: 0,
          alreadyReady: true,
        });
        return { ok: true, state: "not_required" };
      }

      if (p.generated_post_id) {
        const { data: post } = await supabase
          .from("posts")
          .select("id, media_status, video_path, article_id")
          .eq("id", p.generated_post_id)
          .maybeSingle();
        if (
          post &&
          post.media_status === "ready" &&
          post.video_path &&
          post.article_id === p.article_id
        ) {
          await supabase
            .from("article_teaser_jobs")
            .update({
              status: "ready",
              generated_video_path: post.video_path,
              error_code: null,
            })
            .eq("id", job.jobId);
          session.set(job.jobId, {
            uploadPath: String(post.video_path),
            postId: Number(post.id),
            alreadyReady: true,
          });
          return { ok: true, state: "ready" };
        }
      }

      const { data: article, error: articleError } = await supabase
        .from("articles")
        .select("id, title, user_id, status")
        .eq("id", p.article_id)
        .maybeSingle();
      if (articleError || !article) {
        return {
          ok: false,
          error: { code: "article_missing", kind: "permanent" },
        };
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_initial")
        .eq("id", p.owner_user_id)
        .maybeSingle();

      let fontFile: string;
      try {
        fontFile = resolveFontFile();
      } catch {
        return {
          ok: false,
          error: { code: "ffmpeg_missing", kind: "permanent" },
        };
      }

      const outFile = `${ctx.workDir}/${job.jobId}.mp4`;
      const bgFile = `${ctx.workDir}/bg.jpg`;
      const bgLocal = await downloadHttpOrStorage(
        supabase,
        p.background_asset_path,
        bgFile,
        "post-images"
      );

      ctx.reportProgress("processing", "ffmpeg");
      const args = buildTeaserFfmpegArgs({
        title: String(article.title ?? "Untitled"),
        authorLabel:
          typeof profile?.username === "string" ? profile.username : "creator",
        outputPath: outFile,
        fontFile,
        backgroundMode: p.background_mode,
        backgroundAssetPath: p.background_asset_path,
        backgroundImageFile: bgLocal,
      });

      const ffmpeg = await runFfmpeg({
        args,
        signal: ctx.signal,
        timeoutMs: 120_000,
      });
      if (!ffmpeg.ok) {
        ctx.log("ffmpeg_failed", {
          exitCode: ffmpeg.exitCode,
          errorCode: ffmpeg.code,
          ok: false,
        });
        return {
          ok: false,
          error: {
            code: ffmpeg.code === "timeout" ? "timeout" : ffmpeg.code,
            kind: ffmpeg.code === "ffmpeg_missing" ? "permanent" : "retryable",
          },
        };
      }
      ctx.log("ffmpeg_ok", { durationMs: ffmpeg.durationMs, exitCode: 0 });

      const stat = await fs.stat(outFile);
      const storagePath = `${p.owner_user_id}/teaser-${job.jobId}.mp4`;
      const uploadPath = p.generated_video_path || storagePath;

      ctx.reportProgress("uploading");
      const uploaded = await uploadFile(supabase, {
        bucket: POST_VIDEOS_BUCKET,
        path: uploadPath,
        localFile: outFile,
        contentType: "video/mp4",
        upsert: true,
      });
      if (!uploaded.ok) {
        ctx.log("upload_failure", { ok: false });
        return {
          ok: false,
          error: { code: "upload_failed", kind: "retryable" },
        };
      }
      ctx.log("upload_success", { ok: true });

      ctx.reportProgress("finalizing");
      let postId: number;
      try {
        postId = await finalizeReadyPost(
          supabase,
          { ...p, id: job.jobId },
          uploadPath,
          stat.size,
          String(article.title ?? "Untitled"),
          {
            full_name:
              typeof profile?.full_name === "string"
                ? profile.full_name
                : "Creator",
            username:
              typeof profile?.username === "string"
                ? profile.username
                : "creator",
            avatar_initial:
              typeof profile?.avatar_initial === "string"
                ? profile.avatar_initial
                : "U",
          }
        );
      } catch {
        return {
          ok: false,
          error: { code: "post_finalize_failed", kind: "retryable" },
        };
      }

      session.set(job.jobId, { uploadPath, postId });
      return { ok: true, state: "ready" };
    },

    async finalize(job, ctx): Promise<MediaProcessResult> {
      const carried = session.get(job.jobId);
      if (carried?.alreadyReady) {
        session.delete(job.jobId);
        return {
          ok: true,
          state: carried.postId ? "ready" : "not_required",
        };
      }
      if (!carried) {
        // Idempotent: job may already be ready from a prior attempt.
        const { data } = await supabase
          .from("article_teaser_jobs")
          .select("status")
          .eq("id", job.jobId)
          .maybeSingle();
        if (data?.status === "ready" || data?.status === "not_required") {
          return {
            ok: true,
            state: data.status === "ready" ? "ready" : "not_required",
          };
        }
        return {
          ok: false,
          error: { code: "post_finalize_failed", kind: "retryable" },
        };
      }

      const { error: readyError } = await supabase
        .from("article_teaser_jobs")
        .update({
          status: "ready",
          generated_video_path: carried.uploadPath,
          generated_post_id: carried.postId,
          error_code: null,
        })
        .eq("id", job.jobId)
        .eq("status", "processing");

      if (readyError) {
        return {
          ok: false,
          error: { code: "post_finalize_failed", kind: "retryable" },
        };
      }

      try {
        const { syncArticleDiscoveryPost } = await import(
          "../../../content/adapters/articleAdapter"
        );
        await syncArticleDiscoveryPost(
          supabase,
          asPayload(job).article_id,
          carried.postId
        );
        ctx.log("registry_sync_ok", { ok: true });
      } catch (error) {
        ctx.log("registry_sync_soft_fail", {
          ok: false,
          message: error instanceof Error ? error.message.slice(0, 80) : "err",
        });
      }

      session.delete(job.jobId);
      return { ok: true, state: "ready" };
    },

    async fail(job, error) {
      await markJobFailed(supabase, job.jobId, error.code);
      session.delete(job.jobId);
    },

    isRetryEligible(job, errorCode) {
      if (job.attemptCount >= ARTICLE_TEASER_MAX_ATTEMPTS) return false;
      const permanent = new Set([
        "article_missing",
        "invalid_job",
        "ffmpeg_missing",
        "ffmpeg_missing_font",
      ]);
      return !permanent.has(errorCode);
    },

    async cleanup(_job, workDir) {
      await safeCleanupPath(workDir);
    },
  };
}

/** Direct process helper kept for scripts / tests. */
export async function processArticleTeaserJob(
  supabase: SupabaseClient,
  job: MediaJobRef,
  ctx: ProcessorContext
): Promise<MediaProcessResult> {
  const processor = createArticleTeaserProcessor(supabase);
  const validated = await processor.validate(job);
  if (!validated.ok) {
    await processor.fail(
      job,
      { code: validated.code, kind: "permanent" },
      ctx
    );
    return {
      ok: false,
      error: { code: validated.code, kind: "permanent" },
    };
  }
  const executed = await processor.execute(job, ctx);
  if (!executed.ok) {
    await processor.fail(job, executed.error, ctx);
    return executed;
  }
  return processor.finalize(job, ctx);
}
