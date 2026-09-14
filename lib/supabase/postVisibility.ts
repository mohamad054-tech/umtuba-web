/**
 * Single source of truth for who may see a post on public surfaces.
 *
 * Hide when deleted_at is set, or the author's profiles.moderation_status
 * is not 'active'. Exceptions:
 *   - Owner sees their own removed post (removed UI state is the caller's job).
 *   - A shadowbanned author sees their own posts; nobody else does.
 *   - Suspended / banned authors are hidden from every public surface,
 *     including themselves.
 *   - Platform admins are NOT widened on public surfaces. /admin/moderation
 *     must not call these helpers.
 *
 * Interactions (like / save / share / view / report / comment) are stricter:
 * removed posts and non-active authors are always rejected, including the owner.
 */

const VIEWER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const VISIBILITY_AUTHOR_EMBED =
  "visibility_author:profiles!user_id!inner(moderation_status)";

export type ViewerVisibilityQuery = {
  is: (column: string, value: null) => ViewerVisibilityQuery;
  eq: (column: string, value: string) => ViewerVisibilityQuery;
  or: (filters: string) => ViewerVisibilityQuery;
};

export type ViewerVisibilityPost = {
  user_id?: string | null;
  author_id?: string | null;
  deleted_at?: string | null;
  author_moderation_status?: string | null;
  visibility_author?: unknown;
};

export function viewerKey(
  viewerId: string | null | undefined
): string | null {
  if (typeof viewerId !== "string") return null;
  const value = viewerId.trim();
  return VIEWER_UUID_RE.test(value) ? value : null;
}

export function postsSelectVisible<C extends string>(columns: C): C {
  const trimmed = columns.trim().replace(/,+\s*$/, "");
  if (trimmed.includes("visibility_author")) {
    return trimmed as C;
  }
  return `${trimmed},\n  ${VISIBILITY_AUTHOR_EMBED}` as C;
}

export function readAuthorId(post: ViewerVisibilityPost): string | null {
  const raw = post.user_id ?? post.author_id;
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  return VIEWER_UUID_RE.test(value) ? value : null;
}

export function readAuthorModerationStatus(
  post: ViewerVisibilityPost
): string | null {
  if (typeof post.author_moderation_status === "string") {
    const direct = post.author_moderation_status.trim().toLowerCase();
    return direct || null;
  }

  const embed = post.visibility_author;
  const row = Array.isArray(embed) ? embed[0] : embed;
  if (!row || typeof row !== "object") return null;
  const status = (row as { moderation_status?: unknown }).moderation_status;
  if (typeof status !== "string") return null;
  const normalized = status.trim().toLowerCase();
  return normalized || null;
}

export function hasDeletedAt(post: ViewerVisibilityPost): boolean {
  return typeof post.deleted_at === "string" && post.deleted_at.trim().length > 0;
}

/**
 * Apply the viewer rule to a `.from("posts")` builder.
 * Pair with `postsSelectVisible(...)` so the author embed exists.
 */
export function applyViewerVisibility<Q>(
  query: Q,
  viewerId: string | null | undefined
): Q {
  const builder = query as Q & ViewerVisibilityQuery;
  const viewer = viewerKey(viewerId);
  if (!viewer) {
    return builder
      .is("deleted_at", null)
      .eq("visibility_author.moderation_status", "active") as Q;
  }

  return builder
    .or(
      `visibility_author.moderation_status.eq.active,and(visibility_author.moderation_status.eq.shadowbanned,user_id.eq.${viewer})`
    )
    .or(`deleted_at.is.null,user_id.eq.${viewer}`) as Q;
}

export function isPostVisibleToViewer(
  post: ViewerVisibilityPost,
  viewerId: string | null | undefined
): boolean {
  const viewer = viewerKey(viewerId);
  const authorId = readAuthorId(post);
  const status = readAuthorModerationStatus(post);
  const isOwner = Boolean(viewer && authorId && viewer === authorId);

  if (status === "suspended" || status === "banned") {
    return false;
  }
  if (status === "shadowbanned") {
    return isOwner;
  }
  if (hasDeletedAt(post)) {
    return isOwner && (status === "active" || status === "shadowbanned");
  }
  return status === "active";
}

/** Like / save / share / view / report / comment — no owner exception. */
export function isPostInteractable(post: ViewerVisibilityPost): boolean {
  if (hasDeletedAt(post)) return false;
  return readAuthorModerationStatus(post) === "active";
}
