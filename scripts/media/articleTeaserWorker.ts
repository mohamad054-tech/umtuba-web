/**
 * Article Auto-Teaser Video V1 — internal Node + FFmpeg worker.
 *
 * Run (after migration applied locally / env ready):
 *   npx tsx scripts/media/articleTeaserWorker.ts
 *   npx tsx scripts/media/articleTeaserWorker.ts --once
 *
 * Requires:
 *   - ffmpeg on PATH
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (worker only — never ship to client)
 *
 * Never invoke from publishArticleAction.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { spawn } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ARTICLE_TEASER_DURATION_MS,
  ARTICLE_TEASER_RPCS,
  sanitizeTeaserErrorCode,
  type TeaserBackgroundMode,
} from "../../lib/articles/articleTeaserFoundation";
import { buildTeaserFfmpegArgs } from "../../lib/articles/articleTeaserFfmpeg";
import { POST_VIDEOS_BUCKET } from "../../lib/supabase/videoPostsShared";

type ClaimedJob = {
  id: string;
  article_id: string;
  owner_user_id: string;
  status: string;
  teaser_source: string;
  background_mode: TeaserBackgroundMode;
  background_asset_path: string | null;
  audio_mode: string;
  generated_video_path: string | null;
  generated_post_id: number | null;
  attempt_count: number;
};

function env(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function createServiceClient(): SupabaseClient {
  return createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function resolveFontFile(): string {
  const candidates = [
    process.env.UMTUBA_TEASER_FONT,
    // Windows
    "C:/Windows/Fonts/arial.ttf",
    "C:/Windows/Fonts/segoeui.ttf",
    "C:/Windows/Fonts/tahoma.ttf",
    // Linux
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansArabic-Regular.otf",
    // macOS
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial.ttf",
  ].filter(Boolean) as string[];

  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error("ffmpeg_missing_font");
}

async function runFfmpeg(args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 2000) stderr = stderr.slice(-2000);
    });
    child.on("error", (error) => {
      reject(
        Object.assign(new Error("ffmpeg_missing"), {
          cause: error,
        })
      );
    });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`render_failed:${code}:${stderr.slice(0, 200)}`));
    });
  });
}

async function downloadBackgroundImage(
  supabase: SupabaseClient,
  assetPath: string | null,
  destFile: string
): Promise<string | null> {
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) {
    const res = await fetch(assetPath);
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(destFile, buffer);
    return destFile;
  }
  const path = assetPath.replace(/^post-images\//, "");
  const { data, error } = await supabase.storage.from("post-images").download(path);
  if (error || !data) return null;
  const buffer = Buffer.from(await data.arrayBuffer());
  await fs.writeFile(destFile, buffer);
  return destFile;
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
  job: ClaimedJob,
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

  // Reuse existing ready post for this article if any (idempotency).
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

export async function processClaimedJob(
  supabase: SupabaseClient,
  job: ClaimedJob
): Promise<"ready" | "failed"> {
  if (job.teaser_source === "uploaded") {
    await supabase
      .from("article_teaser_jobs")
      .update({ status: "not_required", error_code: null })
      .eq("id", job.id);
    return "ready";
  }

  // Idempotent short-circuit: already has a ready linked post.
  if (job.generated_post_id) {
    const { data: post } = await supabase
      .from("posts")
      .select("id, media_status, video_path, article_id")
      .eq("id", job.generated_post_id)
      .maybeSingle();
    if (
      post &&
      post.media_status === "ready" &&
      post.video_path &&
      post.article_id === job.article_id
    ) {
      await supabase
        .from("article_teaser_jobs")
        .update({
          status: "ready",
          generated_video_path: post.video_path,
          error_code: null,
        })
        .eq("id", job.id);
      return "ready";
    }
  }

  const { data: article, error: articleError } = await supabase
    .from("articles")
    .select("id, title, user_id, status")
    .eq("id", job.article_id)
    .maybeSingle();
  if (articleError || !article) {
    await markJobFailed(supabase, job.id, "article_missing");
    return "failed";
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, username, avatar_initial")
    .eq("id", job.owner_user_id)
    .maybeSingle();

  const workDir = await fs.mkdtemp(join(tmpdir(), "umtuba-teaser-"));
  const outFile = join(workDir, `${job.id}.mp4`);
  const bgFile = join(workDir, "bg.jpg");

  try {
    let fontFile: string;
    try {
      fontFile = resolveFontFile();
    } catch {
      await markJobFailed(supabase, job.id, "ffmpeg_missing");
      return "failed";
    }

    const bgLocal = await downloadBackgroundImage(
      supabase,
      job.background_asset_path,
      bgFile
    );

    const args = buildTeaserFfmpegArgs({
      title: String(article.title ?? "Untitled"),
      authorLabel:
        typeof profile?.username === "string" ? profile.username : "creator",
      outputPath: outFile,
      fontFile,
      backgroundMode: job.background_mode,
      backgroundAssetPath: job.background_asset_path,
      backgroundImageFile: bgLocal,
    });

    try {
      await runFfmpeg(args);
    } catch (error) {
      const message = error instanceof Error ? error.message : "render_failed";
      await markJobFailed(
        supabase,
        job.id,
        message.startsWith("ffmpeg_missing") ? "ffmpeg_missing" : "render_failed"
      );
      return "failed";
    }

    const stat = await fs.stat(outFile);
    const storagePath = `${job.owner_user_id}/teaser-${job.id}.mp4`;

    // Prefer reusing previous generated path for retries.
    const uploadPath = job.generated_video_path || storagePath;
    const fileBuffer = await fs.readFile(outFile);
    const { error: uploadError } = await supabase.storage
      .from(POST_VIDEOS_BUCKET)
      .upload(uploadPath, fileBuffer, {
        contentType: "video/mp4",
        upsert: true,
      });
    if (uploadError) {
      await markJobFailed(supabase, job.id, "upload_failed");
      return "failed";
    }

    let postId: number;
    try {
      postId = await finalizeReadyPost(
        supabase,
        job,
        uploadPath,
        stat.size,
        String(article.title ?? "Untitled"),
        {
          full_name:
            typeof profile?.full_name === "string" ? profile.full_name : "Creator",
          username:
            typeof profile?.username === "string" ? profile.username : "creator",
          avatar_initial:
            typeof profile?.avatar_initial === "string"
              ? profile.avatar_initial
              : "U",
        }
      );
    } catch {
      await markJobFailed(supabase, job.id, "post_finalize_failed");
      return "failed";
    }

    const { error: readyError } = await supabase
      .from("article_teaser_jobs")
      .update({
        status: "ready",
        generated_video_path: uploadPath,
        generated_post_id: postId,
        error_code: null,
      })
      .eq("id", job.id)
      .eq("status", "processing");

    if (readyError) {
      await markJobFailed(supabase, job.id, "post_finalize_failed");
      return "failed";
    }

    try {
      const { syncArticleDiscoveryPost } = await import(
        "../../lib/content/adapters/articleAdapter"
      );
      await syncArticleDiscoveryPost(supabase, job.article_id, postId);
    } catch (error) {
      console.error("content registry discovery sync", error);
    }

    return "ready";
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

async function claimJob(supabase: SupabaseClient): Promise<ClaimedJob | null> {
  const { data, error } = await supabase.rpc(ARTICLE_TEASER_RPCS.claim);
  if (error) {
    console.error("claim_article_teaser_job", error.message);
    return null;
  }
  if (!data) return null;
  const row = data as Record<string, unknown>;
  if (typeof row.id !== "string") return null;
  return {
    id: row.id,
    article_id: String(row.article_id),
    owner_user_id: String(row.owner_user_id),
    status: String(row.status),
    teaser_source: String(row.teaser_source),
    background_mode: String(row.background_mode) as TeaserBackgroundMode,
    background_asset_path:
      typeof row.background_asset_path === "string"
        ? row.background_asset_path
        : null,
    audio_mode: String(row.audio_mode ?? "silent"),
    generated_video_path:
      typeof row.generated_video_path === "string"
        ? row.generated_video_path
        : null,
    generated_post_id:
      row.generated_post_id == null ? null : Number(row.generated_post_id),
    attempt_count: Number(row.attempt_count ?? 0),
  };
}

async function main() {
  const once = process.argv.includes("--once");
  const supabase = createServiceClient();
  console.log("[article-teaser-worker] started", once ? "(once)" : "(loop)");

  for (;;) {
    const job = await claimJob(supabase);
    if (!job) {
      if (once) break;
      await new Promise((r) => setTimeout(r, 3000));
      continue;
    }
    console.log("[article-teaser-worker] claimed", job.id);
    const result = await processClaimedJob(supabase, job);
    console.log("[article-teaser-worker] result", job.id, result);
    if (once) break;
  }
}

const isDirect =
  typeof process.argv[1] === "string" &&
  /articleTeaserWorker\.(ts|js|mjs|cjs)$/.test(process.argv[1].replace(/\\/g, "/"));

if (isDirect) {
  main().catch((error) => {
    console.error("[article-teaser-worker] fatal", error);
    process.exitCode = 1;
  });
}
