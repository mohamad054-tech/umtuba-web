"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  createPostComment,
  deletePostComment,
  listPostComments,
  loadViewerInteractionState,
  normalizeDeviceViewerKey,
  recordPostShare,
  recordPostView,
  togglePostLike,
  togglePostSave,
  type ActionResult,
  type CreateCommentResult,
  type DeleteCommentResult,
  type PostCommentDTO,
  type ShareResult,
  type ToggleLikeResult,
  type ToggleSaveResult,
  type ViewResult,
} from "../../lib/supabase/socialInteractions";
import {
  applyViewerStateToPosts,
  attachPlaybackUrls,
  postColumns,
  type PublicPostDTO,
  type VideoPostRow,
} from "../../lib/supabase/videoPosts";

function parsePostId(postId: number): ActionResult<{ postId: number }> {
  if (!Number.isInteger(postId) || postId <= 0) {
    return { ok: false, message: "Invalid post." };
  }

  return { ok: true, postId };
}

export async function toggleLikeAction(
  postId: number
): Promise<ActionResult<ToggleLikeResult>> {
  const parsed = parsePostId(postId);
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to like posts.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return togglePostLike(supabase, parsed.postId);
}

export async function toggleSaveAction(
  postId: number
): Promise<ActionResult<ToggleSaveResult>> {
  const parsed = parsePostId(postId);
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to save posts.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return togglePostSave(supabase, parsed.postId);
}

export async function recordShareAction(
  postId: number,
  viewerKey?: string | null
): Promise<ActionResult<ShareResult>> {
  const parsed = parsePostId(postId);
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  const supabase = await createClient();

  // Authenticated: SQL forces u:{auth.uid()}. Anonymous: require d:{uuid}.
  let resolvedKey: string | null = null;

  if (!user) {
    if (typeof viewerKey !== "string") {
      return { ok: false, message: "Unable to record share." };
    }

    resolvedKey = normalizeDeviceViewerKey(viewerKey);

    if (!resolvedKey) {
      return { ok: false, message: "Unable to record share." };
    }
  }

  return recordPostShare(supabase, parsed.postId, resolvedKey);
}

export async function recordViewAction(
  postId: number,
  viewerKey?: string | null
): Promise<ActionResult<ViewResult>> {
  const parsed = parsePostId(postId);
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();
  const supabase = await createClient();

  let resolvedKey: string | null = null;

  if (!user) {
    if (typeof viewerKey !== "string") {
      return { ok: false, message: "Unable to record view." };
    }

    resolvedKey = normalizeDeviceViewerKey(viewerKey);

    if (!resolvedKey) {
      return { ok: false, message: "Unable to record view." };
    }
  }

  return recordPostView(supabase, parsed.postId, resolvedKey);
}

export async function listCommentsAction(
  postId: number
): Promise<ActionResult<{ comments: PostCommentDTO[] }>> {
  const parsed = parsePostId(postId);
  if (!parsed.ok) {
    return parsed;
  }

  const supabase = await createClient();
  const user = await getServerUser();
  return listPostComments(supabase, parsed.postId, user?.id ?? null);
}

export async function createCommentAction(
  postId: number,
  body: string
): Promise<ActionResult<CreateCommentResult>> {
  const parsed = parsePostId(postId);
  if (!parsed.ok) {
    return parsed;
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to comment.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return createPostComment(supabase, parsed.postId, user.id, body);
}

export async function deleteCommentAction(
  commentId: number
): Promise<ActionResult<DeleteCommentResult>> {
  if (!Number.isInteger(commentId) || commentId <= 0) {
    return { ok: false, message: "Invalid comment." };
  }

  const user = await getServerUser();

  if (!user) {
    return {
      ok: false,
      message: "Please sign in to delete comments.",
      requiresAuth: true,
    };
  }

  const supabase = await createClient();
  return deletePostComment(supabase, commentId, user.id);
}

export type SavedPostsResult =
  | { ok: true; posts: PublicPostDTO[] }
  | { ok: false; message: string; requiresAuth?: boolean };

export async function loadSavedPostsAction(): Promise<SavedPostsResult> {
  try {
    const user = await getServerUser();

    if (!user) {
      return {
        ok: false,
        message: "Please sign in to view saved posts.",
        requiresAuth: true,
      };
    }

    const supabase = await createClient();

    const { data: saves, error: savesError } = await supabase
      .from("post_saves")
      .select("post_id, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (savesError) {
      console.error("Unable to load saved post ids:", savesError);
      return {
        ok: false,
        message: "Unable to load saved posts. Please try again.",
      };
    }

    const postIds = (saves ?? []).map((row) => row.post_id);

    if (postIds.length === 0) {
      return { ok: true, posts: [] };
    }

    const { data, error } = await supabase
      .from("posts")
      .select(postColumns)
      .in("id", postIds);

    if (error) {
      console.error("Unable to load saved posts:", error);
      return {
        ok: false,
        message: "Unable to load saved posts. Please try again.",
      };
    }

    const rows = (data ?? []) as VideoPostRow[];
    const withUrls = await attachPlaybackUrls(supabase, rows);
    const order = new Map(postIds.map((id, index) => [id, index]));

    withUrls.sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
    );

    const viewerState = await loadViewerInteractionState(
      supabase,
      user.id,
      withUrls.map((post) => post.id)
    );

    return {
      ok: true,
      posts: applyViewerStateToPosts(withUrls, viewerState),
    };
  } catch (error) {
    console.error("loadSavedPostsAction failed:", error);
    return {
      ok: false,
      message: "Unable to load saved posts. Please try again.",
    };
  }
}
