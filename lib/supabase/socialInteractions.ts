import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  PostCommentRow,
  ProfileRow,
} from "./database.types";

export const COMMENT_MAX_LENGTH = 500;
export const COMMENT_MIN_LENGTH = 1;
export const COMMENTS_PAGE_LIMIT = 40;
export const COMMENTS_HARD_LIMIT = 50;

const DEVICE_VIEWER_KEY_RE =
  /^d:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Validate anonymous device keys before calling share/view RPCs. */
export function normalizeDeviceViewerKey(viewerKey: string): string | null {
  const trimmed = viewerKey.trim().toLowerCase();

  if (!DEVICE_VIEWER_KEY_RE.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export type ActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; message: string; requiresAuth?: boolean };

export type PostViewerState = {
  likedByMe: boolean;
  savedByMe: boolean;
};

export type PostCommentDTO = {
  id: number;
  postId: number;
  body: string;
  createdAt: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarInitial: string;
  };
  isMine: boolean;
};

export type ToggleLikeResult = {
  liked: boolean;
  likes: number;
};

export type ToggleSaveResult = {
  saved: boolean;
  saves: number;
};

export type ShareResult = {
  counted: boolean;
  shares: number;
};

export type ViewResult = {
  counted: boolean;
  views: number;
};

export type CreateCommentResult = {
  comment: PostCommentDTO;
  comments: number;
};

export type DeleteCommentResult = {
  comments: number;
};

type RpcJson = Record<string, unknown> | null;

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseRpcJson(data: unknown): RpcJson {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  return data as Record<string, unknown>;
}

export function validateCommentBody(body: string): ActionResult<{ body: string }> {
  const trimmed = body.trim();

  if (trimmed.length < COMMENT_MIN_LENGTH) {
    return { ok: false, message: "Comment cannot be empty." };
  }

  if (trimmed.length > COMMENT_MAX_LENGTH) {
    return {
      ok: false,
      message: `Comment must be ${COMMENT_MAX_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true, body: trimmed };
}

/**
 * Batch-load like/save state for the current user across many posts (no N+1).
 */
export async function loadViewerInteractionState(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  postIds: number[]
): Promise<Map<number, PostViewerState>> {
  const state = new Map<number, PostViewerState>();

  for (const postId of postIds) {
    state.set(postId, { likedByMe: false, savedByMe: false });
  }

  if (!userId || postIds.length === 0) {
    return state;
  }

  const [likesResult, savesResult] = await Promise.all([
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds),
    supabase
      .from("post_saves")
      .select("post_id")
      .eq("user_id", userId)
      .in("post_id", postIds),
  ]);

  if (likesResult.error) {
    console.error("Unable to load like state:", likesResult.error);
  } else {
    for (const row of likesResult.data ?? []) {
      const current = state.get(row.post_id);
      if (current) {
        current.likedByMe = true;
      }
    }
  }

  if (savesResult.error) {
    console.error("Unable to load save state:", savesResult.error);
  } else {
    for (const row of savesResult.data ?? []) {
      const current = state.get(row.post_id);
      if (current) {
        current.savedByMe = true;
      }
    }
  }

  return state;
}

export async function togglePostLike(
  supabase: SupabaseClient,
  postId: number
): Promise<ActionResult<ToggleLikeResult>> {
  const { data, error } = await supabase.rpc("toggle_post_like", {
    p_post_id: postId,
  });

  if (error) {
    console.error("toggle_post_like failed:", error);
    const message = (error.message || "").toLowerCase();

    if (message.includes("authentication required")) {
      return {
        ok: false,
        message: "Please sign in to like posts.",
        requiresAuth: true,
      };
    }

    return { ok: false, message: "Unable to update like. Please try again." };
  }

  const payload = parseRpcJson(data);

  if (!payload) {
    return { ok: false, message: "Unable to update like. Please try again." };
  }

  return {
    ok: true,
    liked: asBoolean(payload.liked),
    likes: asNumber(payload.likes),
  };
}

export async function togglePostSave(
  supabase: SupabaseClient,
  postId: number
): Promise<ActionResult<ToggleSaveResult>> {
  const { data, error } = await supabase.rpc("toggle_post_save", {
    p_post_id: postId,
  });

  if (error) {
    console.error("toggle_post_save failed:", error);
    const message = (error.message || "").toLowerCase();

    if (message.includes("authentication required")) {
      return {
        ok: false,
        message: "Please sign in to save posts.",
        requiresAuth: true,
      };
    }

    return { ok: false, message: "Unable to update save. Please try again." };
  }

  const payload = parseRpcJson(data);

  if (!payload) {
    return { ok: false, message: "Unable to update save. Please try again." };
  }

  return {
    ok: true,
    saved: asBoolean(payload.saved),
    saves: asNumber(payload.saves),
  };
}

export async function recordPostShare(
  supabase: SupabaseClient,
  postId: number,
  viewerKey: string | null
): Promise<ActionResult<ShareResult>> {
  const { data, error } = await supabase.rpc("record_post_share", {
    p_post_id: postId,
    p_viewer_key: viewerKey,
  });

  if (error) {
    console.error("record_post_share failed:", error);
    const message = (error.message || "").toLowerCase();

    if (message.includes("invalid viewer key")) {
      return { ok: false, message: "Unable to record share." };
    }

    return { ok: false, message: "Unable to record share. Please try again." };
  }

  const payload = parseRpcJson(data);

  if (!payload) {
    return { ok: false, message: "Unable to record share. Please try again." };
  }

  return {
    ok: true,
    counted: asBoolean(payload.counted),
    shares: asNumber(payload.shares),
  };
}

export async function recordPostView(
  supabase: SupabaseClient,
  postId: number,
  viewerKey: string | null,
  geo?: {
    countryCode?: string | null;
    countryName?: string | null;
    city?: string | null;
    qualified?: boolean;
  }
): Promise<ActionResult<ViewResult>> {
  const { data, error } = await supabase.rpc("record_post_view", {
    p_post_id: postId,
    p_viewer_key: viewerKey,
    p_country_code: geo?.countryCode ?? null,
    p_country_name: geo?.countryName ?? null,
    p_city: geo?.city ?? null,
    p_qualified: geo?.qualified ?? true,
  });

  if (error) {
    console.error("record_post_view failed:", error);
    return { ok: false, message: "Unable to record view." };
  }

  const payload = parseRpcJson(data);

  if (!payload) {
    return { ok: false, message: "Unable to record view." };
  }

  return {
    ok: true,
    counted: asBoolean(payload.counted),
    views: asNumber(payload.views),
  };
}

type ProfileSnippet = Pick<
  ProfileRow,
  "id" | "username" | "display_name" | "full_name" | "avatar_initial"
>;

function mapCommentRow(
  row: PostCommentRow,
  profile: ProfileSnippet | undefined,
  currentUserId: string | null
): PostCommentDTO {
  const username = profile?.username
    ? profile.username.startsWith("@")
      ? profile.username
      : `@${profile.username}`
    : "@user";

  return {
    id: row.id,
    postId: row.post_id,
    body: row.body,
    createdAt: row.created_at,
    author: {
      id: row.user_id,
      username,
      displayName:
        profile?.display_name?.trim() ||
        profile?.full_name?.trim() ||
        username,
      avatarInitial: profile?.avatar_initial || "U",
    },
    isMine: Boolean(currentUserId && currentUserId === row.user_id),
  };
}

async function loadProfilesByIds(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, ProfileSnippet>> {
  const map = new Map<string, ProfileSnippet>();
  const unique = Array.from(new Set(userIds.filter(Boolean)));

  if (unique.length === 0) {
    return map;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, full_name, avatar_initial")
    .in("id", unique);

  if (error) {
    console.error("Unable to load comment author profiles:", error);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.id, row);
  }

  return map;
}

export async function listPostComments(
  supabase: SupabaseClient,
  postId: number,
  currentUserId: string | null,
  limit = COMMENTS_PAGE_LIMIT
): Promise<ActionResult<{ comments: PostCommentDTO[] }>> {
  const safeLimit = Math.min(
    Math.max(Math.floor(limit), 1),
    COMMENTS_HARD_LIMIT
  );

  const { data, error } = await supabase
    .from("post_comments")
    .select("id, post_id, user_id, body, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    console.error("listPostComments failed:", error);
    return {
      ok: false,
      message: "Unable to load comments. Please try again.",
    };
  }

  const rows = (data ?? []) as PostCommentRow[];
  const profiles = await loadProfilesByIds(
    supabase,
    rows.map((row) => row.user_id)
  );

  const comments = rows.map((row) =>
    mapCommentRow(row, profiles.get(row.user_id), currentUserId)
  );

  return { ok: true, comments };
}

export async function createPostComment(
  supabase: SupabaseClient,
  postId: number,
  userId: string,
  rawBody: string
): Promise<ActionResult<CreateCommentResult>> {
  const validated = validateCommentBody(rawBody);

  if (!validated.ok) {
    return validated;
  }

  const { data: post, error: postError } = await supabase
    .from("posts")
    .select("id")
    .eq("id", postId)
    .maybeSingle();

  if (postError || !post) {
    return { ok: false, message: "Post not found." };
  }

  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: postId,
      user_id: userId,
      body: validated.body,
    })
    .select("id, post_id, user_id, body, created_at")
    .single();

  if (error || !data) {
    console.error("createPostComment failed:", error);
    return {
      ok: false,
      message: "Unable to post comment. Please try again.",
    };
  }

  const [profiles, postResult] = await Promise.all([
    loadProfilesByIds(supabase, [userId]),
    supabase.from("posts").select("comments").eq("id", postId).maybeSingle(),
  ]);

  return {
    ok: true,
    comment: mapCommentRow(
      data as PostCommentRow,
      profiles.get(userId),
      userId
    ),
    comments: asNumber(postResult.data?.comments, 0),
  };
}

export async function deletePostComment(
  supabase: SupabaseClient,
  commentId: number,
  userId: string
): Promise<ActionResult<DeleteCommentResult>> {
  const { data: existing, error: lookupError } = await supabase
    .from("post_comments")
    .select("id, post_id, user_id")
    .eq("id", commentId)
    .maybeSingle();

  if (lookupError || !existing) {
    return { ok: false, message: "Comment not found." };
  }

  if (existing.user_id !== userId) {
    return { ok: false, message: "You can only delete your own comments." };
  }

  const { error } = await supabase
    .from("post_comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", userId);

  if (error) {
    console.error("deletePostComment failed:", error);
    return {
      ok: false,
      message: "Unable to delete comment. Please try again.",
    };
  }

  const { data: postRow } = await supabase
    .from("posts")
    .select("comments")
    .eq("id", existing.post_id)
    .maybeSingle();

  return {
    ok: true,
    comments: asNumber(postRow?.comments, 0),
  };
}
