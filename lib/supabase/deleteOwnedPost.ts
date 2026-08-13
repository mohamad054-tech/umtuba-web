/**
 * Owner-only delete for published posts (text, image, video).
 * Authorization is enforced here AND by posts RLS. UI hiding is not sufficient.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { isUuid } from "../../app/lib/nav";
import { deactivateContentLifecycle } from "../content/services/lifecycleService";
import { sourceEntityIdFromPostId } from "../content/contentRegistry";
import { sanitizeUserFacingMessage } from "../../app/lib/product/userFacingMessage";
import { isOwnedVideoPath } from "./videoPostsShared";
import { deleteOwnedVideoObject } from "./videoPosts";
import {
  OWN_CONTENT_DELETE_ERRORS,
  POST_IMAGES_BUCKET,
  parseOwnedPostImageObjectPath,
  type DeleteOwnedPostResult,
} from "./deleteOwnedPostShared";

export {
  applySuccessfulDeleteToList,
  OWN_CONTENT_DELETE_ERRORS,
  parseOwnedPostImageObjectPath,
  POST_IMAGES_BUCKET,
  viewerMaySeeDeleteControl,
  type DeleteOwnedPostCode,
  type DeleteOwnedPostResult,
} from "./deleteOwnedPostShared";

type LoadedPost = {
  id: number;
  user_id: string | null;
  post_type: string | null;
  video_path: string | null;
  thumbnail_path: string | null;
  image_url: string | null;
};

async function deleteOwnedImageObject(
  supabase: SupabaseClient,
  userId: string,
  path: string
): Promise<void> {
  if (!isOwnedVideoPath(userId, path)) {
    console.error(
      "Refusing to delete image object outside caller folder:",
      path
    );
    return;
  }

  const { error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .remove([path]);

  if (error) {
    console.error("Failed to delete owned post image object:", path, error);
  }
}

async function cleanupOwnedMedia(
  supabase: SupabaseClient,
  userId: string,
  post: LoadedPost
): Promise<void> {
  const videoPath = post.video_path?.trim() || "";
  if (videoPath) {
    await deleteOwnedVideoObject(supabase, userId, videoPath);
  }

  const thumbnailPath = post.thumbnail_path?.trim() || "";
  if (thumbnailPath && thumbnailPath !== videoPath) {
    await deleteOwnedVideoObject(supabase, userId, thumbnailPath);
  }

  const imagePath = parseOwnedPostImageObjectPath(userId, post.image_url);
  if (imagePath) {
    await deleteOwnedImageObject(supabase, userId, imagePath);
  }
}

async function deactivateOwnedRegistry(
  supabase: SupabaseClient,
  userId: string,
  postId: number,
  postType: string | null
): Promise<void> {
  if (postType !== "video") {
    return;
  }

  try {
    await deactivateContentLifecycle(
      supabase,
      "video",
      sourceEntityIdFromPostId(postId),
      userId
    );
  } catch (error) {
    console.error("Failed to deactivate content registry after post delete:", error);
  }
}

export async function deletePostForOwner(
  supabase: SupabaseClient,
  userId: string,
  postId: number
): Promise<DeleteOwnedPostResult> {
  if (!isUuid(userId)) {
    return {
      ok: false,
      code: "auth_required",
      message: OWN_CONTENT_DELETE_ERRORS.authRequired,
    };
  }

  if (!Number.isInteger(postId) || postId <= 0) {
    return {
      ok: false,
      code: "invalid",
      message: OWN_CONTENT_DELETE_ERRORS.invalid,
    };
  }

  const { data: existing, error: loadError } = await supabase
    .from("posts")
    .select("id, user_id, post_type, video_path, thumbnail_path, image_url")
    .eq("id", postId)
    .maybeSingle();

  if (loadError) {
    console.error("deletePostForOwner load error:", loadError);
    return {
      ok: false,
      code: "delete_failed",
      message: sanitizeUserFacingMessage(
        loadError.message,
        OWN_CONTENT_DELETE_ERRORS.deleteFailed
      ),
    };
  }

  if (!existing) {
    return {
      ok: false,
      code: "not_found",
      message: OWN_CONTENT_DELETE_ERRORS.notFound,
    };
  }

  const post = existing as LoadedPost;

  if (post.user_id !== userId) {
    return {
      ok: false,
      code: "not_owner",
      message: OWN_CONTENT_DELETE_ERRORS.notOwner,
    };
  }

  const { data: removed, error: deleteError } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId)
    .select("id");

  if (deleteError) {
    console.error("deletePostForOwner delete error:", deleteError);
    return {
      ok: false,
      code: "delete_failed",
      message: sanitizeUserFacingMessage(
        deleteError.message,
        OWN_CONTENT_DELETE_ERRORS.deleteFailed
      ),
    };
  }

  if (!Array.isArray(removed) || removed.length === 0) {
    return {
      ok: false,
      code: "delete_failed",
      message: OWN_CONTENT_DELETE_ERRORS.deleteFailed,
    };
  }

  await cleanupOwnedMedia(supabase, userId, post);
  await deactivateOwnedRegistry(supabase, userId, postId, post.post_type);

  return {
    ok: true,
    postId,
    postType: (post.post_type || "text").trim() || "text",
  };
}

/** Test helper: never delete objects outside the owner folder. */
export function wouldDeleteStoragePath(
  userId: string,
  path: string | null | undefined
): boolean {
  const trimmed = (path ?? "").trim();
  if (!trimmed) {
    return false;
  }
  return isOwnedVideoPath(userId, trimmed);
}
