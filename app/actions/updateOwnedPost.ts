"use server";

import { revalidatePath } from "next/cache";
import { APP_ROUTES } from "../lib/nav";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  OWN_CONTENT_EDIT_ERRORS,
  updatePostForOwner,
  type EditOwnedPostInput,
  type EditOwnedPostResult,
} from "../../lib/posts/editOwnedPost";
import type { VideoTrimRange } from "../../lib/media/videoTrim";

export type UpdateOwnedPostActionResult = EditOwnedPostResult;

function revalidateSocialSurfacesAfterEdit(postId: number): void {
  revalidatePath(APP_ROUTES.home);
  revalidatePath(APP_ROUTES.discover);
  revalidatePath(APP_ROUTES.watch);
  revalidatePath("/feed");
  revalidatePath(APP_ROUTES.search);
  revalidatePath(APP_ROUTES.saved);
  revalidatePath(APP_ROUTES.profile, "layout");
  revalidatePath(`/edit/post/${postId}`);
  revalidatePath(`/watch?post=${postId}`);
}

export type UpdateOwnedPostActionInput = {
  postId: number;
  content?: string;
  hashtags?: string[];
  articleTitle?: string | null;
  articleBody?: string | null;
  removeArticle?: boolean;
  trim?: VideoTrimRange | null;
  coverUrl?: string | null;
  clearCover?: boolean;
  media?: EditOwnedPostInput["media"];
};

export async function updateOwnedPostAction(
  input: UpdateOwnedPostActionInput
): Promise<UpdateOwnedPostActionResult> {
  const parsedId = typeof input.postId === "number" ? input.postId : Number(input.postId);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return {
      ok: false,
      code: "invalid",
      message: OWN_CONTENT_EDIT_ERRORS.invalid,
      livePreserved: true,
    };
  }

  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      code: "auth_required",
      message: OWN_CONTENT_EDIT_ERRORS.authRequired,
      livePreserved: true,
    };
  }

  const supabase = await createClient();
  const result = await updatePostForOwner(supabase, user.id, parsedId, {
    content: input.content,
    hashtags: input.hashtags,
    articleTitle: input.articleTitle,
    articleBody: input.articleBody,
    removeArticle: input.removeArticle,
    trim: input.trim,
    coverUrl: input.coverUrl,
    clearCover: input.clearCover,
    media: input.media,
  });

  if (result.ok) {
    revalidateSocialSurfacesAfterEdit(parsedId);
  }

  return result;
}
