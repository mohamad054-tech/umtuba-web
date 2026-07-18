import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatabasePost } from "../../app/data/types/post";
import type { DiscoverVideo } from "../../app/discover/types";
import { isUuid } from "../../app/lib/nav";
import {
  buildMockThumbnailPath,
  clampProcessingProgress,
  computeAspectRatioLabel,
  EMPTY_MEDIA_PIPELINE_EXTENSIONS,
  type MediaMetadata,
} from "../media/pipelineTypes";
import {
  isOwnedVideoPath,
  POST_VIDEOS_BUCKET,
  validateCaption,
  validateVideoFile,
  VIDEO_SIGNED_URL_TTL_SECONDS,
} from "./videoPostsShared";
import { normalizeUsername } from "./validation";

/**
 * Auth user id for messaging. Never use post id / username as a stand-in.
 * When posts.user_id is null, recover from owned video path `{user_id}/…`.
 */
export function resolvePostAuthorUserId(post: {
  user_id: string | null;
  video_path?: string | null;
}): string | null {
  if (isUuid(post.user_id)) {
    return post.user_id!.trim();
  }

  const path = post.video_path?.replace(/^\/+/, "").trim() ?? "";
  if (!path || path.includes("..") || path.includes("\\")) {
    return null;
  }

  const folder = path.split("/")[0]?.trim() ?? "";
  return isUuid(folder) ? folder : null;
}

const postColumns = `
  id,
  user_id,
  content,
  post_type,
  author_name,
  author_username,
  author_avatar,
  image_url,
  video_url,
  video_path,
  video_mime_type,
  video_byte_size,
  media_status,
  upload_started_at,
  upload_completed_at,
  processing_started_at,
  processing_completed_at,
  processing_error,
  processing_progress,
  media_duration_ms,
  media_width,
  media_height,
  media_fps,
  media_codec,
  media_bitrate,
  media_file_size,
  media_aspect_ratio,
  thumbnail_path,
  media_pipeline,
  likes,
  comments,
  shares,
  saves,
  views,
  created_at
`;

/** Ready-only filter shared by Discover / Watch / Profile queries. */
export const READY_VIDEO_FILTER = {
  postType: "video" as const,
  mediaStatus: "ready" as const,
};

export type VideoPostRow = DatabasePost & {
  video_path: string | null;
  video_mime_type: string | null;
  video_byte_size: number | null;
  media_status?: string | null;
  upload_started_at?: string | null;
  upload_completed_at?: string | null;
  processing_started_at?: string | null;
  processing_completed_at?: string | null;
  processing_error?: string | null;
  processing_progress?: number | null;
  media_duration_ms?: number | null;
  media_width?: number | null;
  media_height?: number | null;
  media_fps?: number | null;
  media_codec?: string | null;
  media_bitrate?: number | null;
  media_file_size?: number | null;
  media_aspect_ratio?: string | null;
  thumbnail_path?: string | null;
  media_pipeline?: Record<string, unknown> | null;
};

/** Client-safe post: playback URL only — never includes storage paths. */
export type PublicPostDTO = {
  id: number;
  user_id: string | null;
  content: string;
  post_type: string;
  author_name: string;
  author_username: string;
  author_avatar: string;
  image_url: string | null;
  video_url: string | null;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  likedByMe: boolean;
  savedByMe: boolean;
  created_at: string;
};

export type CreateVideoPostInput = {
  caption: string;
  videoPath: string;
  mimeType: string;
  byteSize: number;
  /** Client-probed metadata (optional; server clamps / ignores invalid). */
  metadata?: Partial<MediaMetadata> | null;
  uploadStartedAt?: string | null;
};

function sanitizeMetadata(
  input: Partial<MediaMetadata> | null | undefined,
  byteSize: number
): MediaMetadata {
  const width =
    typeof input?.width === "number" && input.width > 0
      ? Math.round(input.width)
      : null;
  const height =
    typeof input?.height === "number" && input.height > 0
      ? Math.round(input.height)
      : null;
  const durationMs =
    typeof input?.durationMs === "number" && input.durationMs >= 0
      ? Math.round(input.durationMs)
      : null;
  const fps =
    typeof input?.fps === "number" && input.fps > 0 ? input.fps : null;
  const bitrate =
    typeof input?.bitrate === "number" && input.bitrate > 0
      ? Math.round(input.bitrate)
      : null;
  const codec =
    typeof input?.codec === "string" && input.codec.trim()
      ? input.codec.trim().slice(0, 64)
      : null;

  return {
    durationMs,
    width,
    height,
    fps,
    codec,
    bitrate,
    fileSize: byteSize > 0 ? byteSize : null,
    aspectRatio:
      (typeof input?.aspectRatio === "string" && input.aspectRatio.trim()
        ? input.aspectRatio.trim().slice(0, 32)
        : null) || computeAspectRatioLabel(width, height),
  };
}

function extractHashtags(caption: string): string[] {
  const matches = caption.match(/#[\p{L}\p{N}_]+/gu);
  if (!matches) {
    return [];
  }

  const unique = new Set(matches.map((tag) => tag.slice(0, 48)));
  return Array.from(unique).slice(0, 8);
}

/**
 * Best-effort delete of an owned object. Used for orphan cleanup after failed
 * publish / failed validation. Never throws to callers.
 */
export async function deleteOwnedVideoObject(
  supabase: SupabaseClient,
  userId: string,
  path: string
): Promise<void> {
  if (!isOwnedVideoPath(userId, path)) {
    console.error(
      "Refusing to delete video object outside caller folder:",
      path
    );
    return;
  }

  const { error } = await supabase.storage
    .from(POST_VIDEOS_BUCKET)
    .remove([path]);

  if (error) {
    console.error("Failed to delete orphaned video object:", path, error);
  }
}

/**
 * Server-side only: mint a short-lived signed URL for a storage path.
 * Relies on storage RLS (owner folder or published post reference).
 */
export async function createVideoSignedUrl(
  supabase: SupabaseClient,
  path: string
): Promise<string | null> {
  const trimmed = path.trim();

  if (!trimmed) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(POST_VIDEOS_BUCKET)
    .createSignedUrl(trimmed, VIDEO_SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error("Unable to sign video URL for path:", trimmed, error);
    return null;
  }

  return data.signedUrl;
}

export async function attachPlaybackUrls(
  supabase: SupabaseClient,
  posts: VideoPostRow[]
): Promise<PublicPostDTO[]> {
  return Promise.all(
    posts.map(async (post) => {
      let playbackUrl: string | null = null;

      const path = post.video_path?.trim();

      if (path) {
        playbackUrl = await createVideoSignedUrl(supabase, path);
      } else {
        const legacyUrl = post.video_url?.trim();

        if (
          legacyUrl?.startsWith("http://") ||
          legacyUrl?.startsWith("https://")
        ) {
          playbackUrl = legacyUrl;
        }
      }

      return {
        id: post.id,
        user_id: resolvePostAuthorUserId(post),
        content: post.content,
        post_type: post.post_type,
        author_name: post.author_name,
        author_username: post.author_username,
        author_avatar: post.author_avatar,
        image_url: post.image_url,
        video_url: playbackUrl,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        saves: post.saves ?? 0,
        views: post.views ?? 0,
        likedByMe: false,
        savedByMe: false,
        created_at: post.created_at,
      };
    })
  );
}

/**
 * Fill missing PublicPostDTO.user_id via profiles.username when the post row
 * has no user_id and the storage path did not yield one.
 */
export async function enrichAuthorUserIdsFromProfiles(
  supabase: SupabaseClient,
  posts: PublicPostDTO[]
): Promise<PublicPostDTO[]> {
  const missing = posts.filter((post) => !isUuid(post.user_id));

  if (missing.length === 0) {
    return posts;
  }

  const usernames = Array.from(
    new Set(
      missing
        .map((post) => normalizeUsername(post.author_username))
        .filter(Boolean)
    )
  );

  if (usernames.length === 0) {
    return posts;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", usernames);

  if (error) {
    console.error("Unable to resolve post authors by username:", error);
    return posts;
  }

  const idByUsername = new Map<string, string>();
  for (const row of data ?? []) {
    if (isUuid(row.id) && row.username) {
      idByUsername.set(normalizeUsername(row.username), row.id);
    }
  }

  return posts.map((post) => {
    if (isUuid(post.user_id)) {
      return post;
    }

    const resolved = idByUsername.get(normalizeUsername(post.author_username));
    return resolved ? { ...post, user_id: resolved } : post;
  });
}

export function applyViewerStateToPosts(
  posts: PublicPostDTO[],
  viewerState: Map<number, { likedByMe: boolean; savedByMe: boolean }>
): PublicPostDTO[] {
  return posts.map((post) => {
    const state = viewerState.get(post.id);
    return {
      ...post,
      likedByMe: state?.likedByMe ?? false,
      savedByMe: state?.savedByMe ?? false,
    };
  });
}

export function mapVideoPostToDiscover(post: PublicPostDTO): DiscoverVideo | null {
  if (!post.video_url) {
    return null;
  }

  const username = post.author_username.startsWith("@")
    ? post.author_username
    : `@${post.author_username}`;

  return {
    id: String(post.id),
    src: post.video_url,
    caption: post.content || "Untitled video",
    hashtags: extractHashtags(post.content),
    location: {
      city: "UMTUBA",
      country: "Worldwide",
    },
    creator: {
      // Auth UUID only — never post.id / username stand-ins.
      id: isUuid(post.user_id) ? post.user_id!.trim() : null,
      name: post.author_name,
      username,
      avatar: post.author_avatar || "U",
    },
    stats: {
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      saves: post.saves,
      views: post.views,
    },
    likedByMe: post.likedByMe,
    savedByMe: post.savedByMe,
  };
}

/**
 * Verifies the uploaded object exists under the caller's folder, then inserts
 * a video post through Media Pipeline V1: queued → processing → ready.
 * On validation or insert failure, deletes the uploaded object.
 * Never persists signed URLs — only the storage path.
 */
export async function insertVideoPostForUser(
  supabase: SupabaseClient,
  userId: string,
  profile: {
    full_name: string;
    username: string;
    avatar_initial: string;
  },
  input: CreateVideoPostInput
): Promise<VideoPostRow> {
  const caption = input.caption.trim();
  const videoPath = input.videoPath.trim();
  const now = new Date().toISOString();
  const uploadStartedAt =
    typeof input.uploadStartedAt === "string" && input.uploadStartedAt.trim()
      ? input.uploadStartedAt.trim()
      : now;
  const meta = sanitizeMetadata(input.metadata, input.byteSize);

  async function failAndCleanup(message: string): Promise<never> {
    await deleteOwnedVideoObject(supabase, userId, videoPath);
    throw new Error(message);
  }

  if (!isOwnedVideoPath(userId, videoPath)) {
    await failAndCleanup("Invalid video upload path.");
  }

  const captionCheck = validateCaption(caption);

  if (!captionCheck.ok) {
    await failAndCleanup(captionCheck.message);
  }

  const fileCheck = validateVideoFile({
    mimeType: input.mimeType,
    byteSize: input.byteSize,
  });

  if (!fileCheck.ok) {
    await failAndCleanup(fileCheck.message);
  }

  // Owner SELECT policy allows verifying the object before the post row exists.
  const signedUrl = await createVideoSignedUrl(supabase, videoPath);

  if (!signedUrl) {
    await failAndCleanup(
      "The uploaded video could not be verified. Please try again."
    );
  }

  const authorUsername = profile.username.startsWith("@")
    ? profile.username
    : `@${profile.username}`;

  const thumbAssetId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `t-${Date.now()}`;
  const thumbnailPath = buildMockThumbnailPath(userId, thumbAssetId);

  const { data: queued, error: insertError } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      content: caption,
      post_type: "video",
      author_name: profile.full_name,
      author_username: authorUsername,
      author_avatar: profile.avatar_initial,
      image_url: null,
      video_url: null,
      video_path: videoPath,
      video_mime_type: input.mimeType,
      video_byte_size: input.byteSize,
      media_status: "queued",
      upload_started_at: uploadStartedAt,
      upload_completed_at: now,
      processing_started_at: null,
      processing_completed_at: null,
      processing_error: null,
      processing_progress: 0,
      media_duration_ms: meta.durationMs,
      media_width: meta.width,
      media_height: meta.height,
      media_fps: meta.fps,
      media_codec: meta.codec,
      media_bitrate: meta.bitrate,
      media_file_size: meta.fileSize,
      media_aspect_ratio: meta.aspectRatio,
      thumbnail_path: thumbnailPath,
      media_pipeline: EMPTY_MEDIA_PIPELINE_EXTENSIONS,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      views: 0,
    })
    .select(postColumns)
    .single();

  if (insertError || !queued) {
    console.error("Unable to create video post row:", insertError);
    const message = (insertError?.message || "").toLowerCase();
    if (
      message.includes("media_status") ||
      message.includes("schema cache") ||
      (insertError as { code?: string } | null)?.code === "PGRST204"
    ) {
      return insertVideoPostLegacy(
        supabase,
        userId,
        profile,
        input,
        failAndCleanup
      );
    }
    await failAndCleanup("Unable to create the video post. Please try again.");
  }

  const queuedRow = queued as VideoPostRow;

  const processingStarted = new Date().toISOString();
  await supabase
    .from("posts")
    .update({
      media_status: "processing",
      processing_started_at: processingStarted,
      processing_progress: clampProcessingProgress(35),
    })
    .eq("id", queuedRow.id)
    .eq("user_id", userId);

  const processingCompleted = new Date().toISOString();
  const { data: ready, error: readyError } = await supabase
    .from("posts")
    .update({
      media_status: "ready",
      processing_progress: 100,
      processing_completed_at: processingCompleted,
      processing_error: null,
      thumbnail_path: thumbnailPath,
    })
    .eq("id", queuedRow.id)
    .eq("user_id", userId)
    .select(postColumns)
    .single();

  if (readyError || !ready) {
    console.error("Unable to finalize video ready state:", readyError);
    await supabase
      .from("posts")
      .update({
        media_status: "failed",
        processing_error: "Processing failed. Please try again.",
        processing_progress: clampProcessingProgress(0),
      })
      .eq("id", queuedRow.id)
      .eq("user_id", userId);
    await failAndCleanup(
      "Unable to finish processing the video. Please try again."
    );
  }

  return ready as VideoPostRow;
}

/** Pre-migration insert path (video_path only). */
async function insertVideoPostLegacy(
  supabase: SupabaseClient,
  userId: string,
  profile: {
    full_name: string;
    username: string;
    avatar_initial: string;
  },
  input: CreateVideoPostInput,
  failAndCleanup: (message: string) => Promise<never>
): Promise<VideoPostRow> {
  const caption = input.caption.trim();
  const videoPath = input.videoPath.trim();
  const authorUsername = profile.username.startsWith("@")
    ? profile.username
    : `@${profile.username}`;

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      content: caption,
      post_type: "video",
      author_name: profile.full_name,
      author_username: authorUsername,
      author_avatar: profile.avatar_initial,
      image_url: null,
      video_url: null,
      video_path: videoPath,
      video_mime_type: input.mimeType,
      video_byte_size: input.byteSize,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      views: 0,
    })
    .select(
      `
      id,
      user_id,
      content,
      post_type,
      author_name,
      author_username,
      author_avatar,
      image_url,
      video_url,
      video_path,
      video_mime_type,
      video_byte_size,
      likes,
      comments,
      shares,
      saves,
      views,
      created_at
    `
    )
    .single();

  if (error || !data) {
    console.error("Unable to create video post row (legacy):", error);
    await failAndCleanup("Unable to create the video post. Please try again.");
  }

  return data as VideoPostRow;
}

export { postColumns };
