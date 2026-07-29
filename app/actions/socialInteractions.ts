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
import { wireSocialEngagementToPersonalization } from "../../lib/ai/integrations/video/wiring";

function parsePostId(postId: number): ActionResult<{ postId: number }> {
  if (!Number.isInteger(postId) || postId <= 0) {
    return { ok: false, message: "Invalid post." };
  }

  return { ok: true, postId };
}

function safeWireSocial(
  event: "impression" | "like" | "save" | "share" | "comment",
  contentId: string,
  serverUserId: string | null
): void {
  try {
    wireSocialEngagementToPersonalization({
      event,
      contentId,
      serverUserId,
    });
  } catch {
    // Personalization must never break primary social actions.
  }
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
  const result = await togglePostLike(supabase, parsed.postId);
  if (result.ok && result.liked) {
    safeWireSocial("like", String(parsed.postId), user.id);
  }
  return result;
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
  const result = await togglePostSave(supabase, parsed.postId);
  if (result.ok && result.saved) {
    safeWireSocial("save", String(parsed.postId), user.id);
  }
  return result;
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

  const result = await recordPostShare(supabase, parsed.postId, resolvedKey);
  if (result.ok && user) {
    safeWireSocial("share", String(parsed.postId), user.id);
  }
  return result;
}

export async function recordViewAction(
  postId: number,
  viewerKey?: string | null,
  geo?: {
    countryCode?: string | null;
    countryName?: string | null;
    city?: string | null;
  } | null
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

  const { headers } = await import("next/headers");
  const headerStore = await headers();
  const headerCountry =
    headerStore.get("cf-ipcountry") ||
    headerStore.get("x-vercel-ip-country") ||
    headerStore.get("x-country-code");

  let profileCity: string | null = null;
  let profileCountry: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("city, country")
      .eq("id", user.id)
      .maybeSingle();
    profileCity =
      typeof profile?.city === "string" ? profile.city : null;
    profileCountry =
      typeof profile?.country === "string" ? profile.country : null;
  }

  const { buildApproximateGeo, normalizeCountryCode, countryNameFromCode } =
    await import("../../lib/geo/approximateLocation");

  // Prefer explicit client geo (still approximate), then CDN country, then profile.
  const fromClient = buildApproximateGeo({
    countryCode: geo?.countryCode ?? null,
    countryName: geo?.countryName ?? null,
    city: geo?.city ?? profileCity,
  });
  const fromHeader = normalizeCountryCode(headerCountry);
  const countryCode = fromClient.countryCode ?? fromHeader;
  const countryName =
    fromClient.countryName ??
    countryNameFromCode(countryCode) ??
    (profileCountry && profileCountry.trim() ? profileCountry.trim() : null);
  const city = fromClient.city;

  const viewResult = await recordPostView(supabase, parsed.postId, resolvedKey, {
    countryCode,
    countryName,
    city,
    qualified: true,
  });
  if (viewResult.ok && user) {
    safeWireSocial("impression", String(parsed.postId), user.id);
  }
  return viewResult;
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
  const result = await createPostComment(supabase, parsed.postId, user.id, body);
  if (result.ok) {
    safeWireSocial("comment", String(parsed.postId), user.id);
  }
  return result;
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
