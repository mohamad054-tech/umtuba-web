/**
 * Article Auto-Teaser Video V1 — domain helpers.
 * DB: supabase/migrations/20260867_article_auto_teaser_video_v1.sql
 * Audio: silent-only in V1 (user_upload deferred).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { sanitizeArticleError } from "./articlesFoundation";

type AnyClient = SupabaseClient;

export const ARTICLE_TEASER_RPCS = {
  enqueue: "enqueue_my_article_teaser_job",
  markUploaded: "mark_my_article_teaser_uploaded",
  retry: "retry_my_article_teaser_job",
  claim: "claim_article_teaser_job",
} as const;

export const ARTICLE_TEASER_DURATION_MS = 5000;
export const ARTICLE_TEASER_WIDTH = 1080;
export const ARTICLE_TEASER_HEIGHT = 1920;
export const ARTICLE_TEASER_MAX_ATTEMPTS = 8;

export const TEASER_STATUSES = [
  "not_required",
  "pending",
  "processing",
  "ready",
  "failed",
] as const;

export type TeaserJobStatus = (typeof TEASER_STATUSES)[number];

export const TEASER_BACKGROUND_MODES = [
  "gradient",
  "article_image",
  "uploaded_image",
  "plain",
] as const;

export type TeaserBackgroundMode = (typeof TEASER_BACKGROUND_MODES)[number];

export const TEASER_GRADIENT_TEMPLATES = [
  "midnight",
  "aurora",
  "ember",
] as const;

export type TeaserGradientTemplate = (typeof TEASER_GRADIENT_TEMPLATES)[number];

export type ArticleTeaserJobRow = {
  id: string;
  article_id: string;
  owner_user_id: string;
  status: TeaserJobStatus;
  teaser_source: "uploaded" | "generated";
  background_mode: TeaserBackgroundMode;
  background_asset_path: string | null;
  audio_mode: "silent" | "user_upload";
  audio_asset_path: string | null;
  generated_video_path: string | null;
  generated_post_id: number | null;
  attempt_count: number;
  error_code: string | null;
  created_at: string;
  updated_at: string;
};

export type ArticleResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const SAFE_ERROR_CODES = new Set([
  "render_failed",
  "upload_failed",
  "post_finalize_failed",
  "article_missing",
  "ffmpeg_missing",
  "invalid_job",
  "timeout",
]);

export function sanitizeTeaserErrorCode(
  code: string | null | undefined
): string {
  const raw = (code ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (SAFE_ERROR_CODES.has(raw)) return raw;
  return "render_failed";
}

export function teaserStatusUserMessage(
  status: TeaserJobStatus,
  errorCode?: string | null
): string {
  switch (status) {
    case "not_required":
      return "Using your uploaded video as the teaser.";
    case "pending":
      return "Your auto teaser is queued.";
    case "processing":
      return "Creating your 5-second teaser video…";
    case "ready":
      return "Teaser video is ready and on Home.";
    case "failed":
      return errorCode === "ffmpeg_missing"
        ? "Teaser could not be created right now. Please retry or upload a video."
        : "Teaser could not be created. Retry or upload a video instead.";
    default:
      return "Teaser status unavailable.";
  }
}

export function isTeaserBackgroundMode(
  value: string
): value is TeaserBackgroundMode {
  return (TEASER_BACKGROUND_MODES as readonly string[]).includes(value);
}

export function resolveGradientTemplate(
  path: string | null | undefined
): TeaserGradientTemplate {
  const raw = (path ?? "").trim();
  const key = raw.startsWith("template:") ? raw.slice("template:".length) : raw;
  if ((TEASER_GRADIENT_TEMPLATES as readonly string[]).includes(key)) {
    return key as TeaserGradientTemplate;
  }
  return "midnight";
}

export function gradientTemplatePath(
  template: TeaserGradientTemplate = "midnight"
): string {
  return `template:${template}`;
}

/** Hex colors used by FFmpeg solid/gradient base (V1). */
export function gradientBaseColor(template: TeaserGradientTemplate): string {
  switch (template) {
    case "aurora":
      return "0x071A2A";
    case "ember":
      return "0x1A0B0B";
    case "midnight":
    default:
      return "0x050510";
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function mapJobRow(data: Record<string, unknown>): ArticleTeaserJobRow | null {
  const id = asString(data.id);
  const articleId = asString(data.article_id);
  const owner = asString(data.owner_user_id);
  const status = asString(data.status) as TeaserJobStatus | null;
  const source = asString(data.teaser_source) as
    | "uploaded"
    | "generated"
    | null;
  if (!id || !articleId || !owner || !status || !source) return null;
  return {
    id,
    article_id: articleId,
    owner_user_id: owner,
    status,
    teaser_source: source,
    background_mode: (asString(data.background_mode) ??
      "gradient") as TeaserBackgroundMode,
    background_asset_path: asString(data.background_asset_path),
    audio_mode:
      asString(data.audio_mode) === "user_upload" ? "user_upload" : "silent",
    audio_asset_path: asString(data.audio_asset_path),
    generated_video_path: asString(data.generated_video_path),
    generated_post_id:
      typeof data.generated_post_id === "number"
        ? data.generated_post_id
        : data.generated_post_id != null
          ? Number(data.generated_post_id)
          : null,
    attempt_count:
      typeof data.attempt_count === "number" ? data.attempt_count : 0,
    error_code: asString(data.error_code),
    created_at: asString(data.created_at) ?? "",
    updated_at: asString(data.updated_at) ?? "",
  };
}

export async function enqueueArticleTeaserJob(
  supabase: AnyClient,
  input: {
    articleId: string;
    backgroundMode?: TeaserBackgroundMode;
    backgroundAssetPath?: string | null;
  }
): Promise<ArticleResult<{ jobId: string; status: TeaserJobStatus; created: boolean }>> {
  const mode = input.backgroundMode ?? "gradient";
  let path = input.backgroundAssetPath ?? null;
  if (mode === "gradient" && !path) {
    path = gradientTemplatePath("midnight");
  }

  const { data, error } = await supabase.rpc(ARTICLE_TEASER_RPCS.enqueue, {
    p_article_id: input.articleId,
    p_background_mode: mode,
    p_background_asset_path: path,
  });
  if (error) {
    return { ok: false, message: sanitizeArticleError(error.message) };
  }
  const row = asRecord(data);
  const jobId = asString(row?.job_id);
  const status = asString(row?.status) as TeaserJobStatus | null;
  if (!jobId || !status) {
    return { ok: false, message: "Teaser job payload is malformed." };
  }
  return {
    ok: true,
    data: {
      jobId,
      status,
      created: Boolean(row?.created),
    },
  };
}

export async function markArticleTeaserUploaded(
  supabase: AnyClient,
  input: { articleId: string; teaserPostId: number }
): Promise<ArticleResult<{ jobId: string; status: TeaserJobStatus }>> {
  const { data, error } = await supabase.rpc(ARTICLE_TEASER_RPCS.markUploaded, {
    p_article_id: input.articleId,
    p_teaser_post_id: input.teaserPostId,
  });
  if (error) {
    return { ok: false, message: sanitizeArticleError(error.message) };
  }
  const row = asRecord(data);
  const jobId = asString(row?.job_id);
  const status = asString(row?.status) as TeaserJobStatus | null;
  if (!jobId || !status) {
    return { ok: false, message: "Teaser job payload is malformed." };
  }
  return { ok: true, data: { jobId, status } };
}

export async function retryArticleTeaserJob(
  supabase: AnyClient,
  articleId: string
): Promise<ArticleResult<{ jobId: string; status: TeaserJobStatus; retried: boolean }>> {
  const { data, error } = await supabase.rpc(ARTICLE_TEASER_RPCS.retry, {
    p_article_id: articleId,
  });
  if (error) {
    return { ok: false, message: sanitizeArticleError(error.message) };
  }
  const row = asRecord(data);
  const jobId = asString(row?.job_id);
  const status = asString(row?.status) as TeaserJobStatus | null;
  if (!jobId || !status) {
    return { ok: false, message: "Teaser job payload is malformed." };
  }
  return {
    ok: true,
    data: { jobId, status, retried: Boolean(row?.retried) },
  };
}

export async function getArticleTeaserJobForOwner(
  supabase: AnyClient,
  articleId: string
): Promise<ArticleTeaserJobRow | null> {
  const { data, error } = await supabase
    .from("article_teaser_jobs")
    .select(
      "id, article_id, owner_user_id, status, teaser_source, background_mode, background_asset_path, audio_mode, audio_asset_path, generated_video_path, generated_post_id, attempt_count, error_code, created_at, updated_at"
    )
    .eq("article_id", articleId)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("getArticleTeaserJobForOwner", error);
    return null;
  }
  return mapJobRow(data as Record<string, unknown>);
}

/**
 * Pure publish-plan helper used by actions + tests.
 * Uploaded teaser → no generation job enqueue (mark not_required separately).
 * No teaser → enqueue pending generation job.
 */
export function planArticleTeaserPublish(input: {
  teaserPostId: number | null;
}): { mode: "uploaded" | "generate" } {
  if (
    input.teaserPostId != null &&
    Number.isInteger(input.teaserPostId) &&
    input.teaserPostId > 0
  ) {
    return { mode: "uploaded" };
  }
  return { mode: "generate" };
}

/** Feed visibility gate mirror — generated posts must not appear before ready. */
export function isTeaserPostFeedVisible(post: {
  media_status?: string | null;
  video_path?: string | null;
}): boolean {
  return (
    post.media_status === "ready" &&
    typeof post.video_path === "string" &&
    post.video_path.trim().length > 0
  );
}
