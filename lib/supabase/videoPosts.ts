import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatabasePost } from "../../app/data/types/post";
import type { DiscoverVideo } from "../../app/discover/types";
import {
  isOwnedVideoPath,
  POST_VIDEOS_BUCKET,
  validateCaption,
  validateVideoFile,
  VIDEO_SIGNED_URL_TTL_SECONDS,
} from "./videoPostsShared";

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
  likes,
  comments,
  shares,
  saves,
  views,
  created_at
`;

export type VideoPostRow = DatabasePost & {
  video_path: string | null;
  video_mime_type: string | null;
  video_byte_size: number | null;
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
};

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
        user_id: post.user_id,
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
      id: post.user_id ?? String(post.id),
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
 * a video post row. On validation or insert failure, deletes the uploaded object.
 * Intended for server-side use with the user's session.
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
    .select(postColumns)
    .single();

  if (error) {
    console.error("Unable to create video post row:", error);
    await failAndCleanup("Unable to create the video post. Please try again.");
  }

  return data as VideoPostRow;
}

export { postColumns };
