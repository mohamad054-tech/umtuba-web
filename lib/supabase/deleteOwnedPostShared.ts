import { isUuid } from "../../app/lib/nav";
import { isOwnedVideoPath } from "./videoPostsShared";

export const POST_IMAGES_BUCKET = "post-images";

export const OWN_CONTENT_DELETE_ERRORS = {
  authRequired: "Please sign in to delete this.",
  notOwner: "You can only delete your own content.",
  notFound: "This content is no longer available.",
  deleteFailed: "Unable to delete this. Please try again.",
  invalid: "Invalid content.",
} as const;

export type DeleteOwnedPostCode =
  | "auth_required"
  | "not_owner"
  | "not_found"
  | "delete_failed"
  | "invalid";

export type DeleteOwnedPostResult =
  | { ok: true; postId: number; postType: string }
  | { ok: false; message: string; code: DeleteOwnedPostCode };

/** UI-only visibility. Server/RLS remain the authorization source. */
export function viewerMaySeeDeleteControl(
  viewerId: string | null | undefined,
  ownerUserId: string | null | undefined
): boolean {
  if (!isUuid(viewerId) || !isUuid(ownerUserId)) {
    return false;
  }
  return viewerId === ownerUserId;
}

export function parseOwnedPostImageObjectPath(
  userId: string,
  imageUrl: string | null | undefined
): string | null {
  const trimmed = (imageUrl ?? "").trim();
  if (!trimmed || trimmed.includes("..") || trimmed.includes("\\")) {
    return null;
  }

  const markers = [
    "/object/public/post-images/",
    "/object/sign/post-images/",
  ];

  for (const marker of markers) {
    const index = trimmed.indexOf(marker);
    if (index === -1) {
      continue;
    }

    let rest = trimmed.slice(index + marker.length).split("?")[0];
    try {
      rest = decodeURIComponent(rest);
    } catch {
      return null;
    }
    rest = rest.replace(/^\/+/, "");
    if (isOwnedVideoPath(userId, rest)) {
      return rest;
    }
  }

  return null;
}

export function applySuccessfulDeleteToList<T>(
  items: T[],
  shouldRemove: (item: T) => boolean,
  succeeded: boolean
): T[] {
  if (!succeeded) {
    return items;
  }
  return items.filter((item) => !shouldRemove(item));
}
