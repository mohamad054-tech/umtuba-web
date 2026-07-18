import { APP_ROUTES } from "../nav";

export function commentDraftStorageKey(postId: number): string {
  return `umtuba_comment_draft_${postId}`;
}

export function readCommentDraft(postId: number): string {
  if (typeof window === "undefined") {
    return "";
  }
  try {
    return window.sessionStorage.getItem(commentDraftStorageKey(postId)) ?? "";
  } catch {
    return "";
  }
}

export function writeCommentDraft(postId: number, draft: string): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const key = commentDraftStorageKey(postId);
    const trimmed = draft.trim();
    if (!trimmed) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(key, draft);
  } catch {
    // sessionStorage may be unavailable — draft still lives in React state.
  }
}

export function clearCommentDraft(postId: number): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.removeItem(commentDraftStorageKey(postId));
  } catch {
    // ignore
  }
}

/** Login URL that returns the user to the surface they were commenting on. */
export function buildCommentSignInHref(returnPath: string): string {
  const next = returnPath.trim() || APP_ROUTES.discover;
  return `${APP_ROUTES.login}?next=${encodeURIComponent(next)}`;
}

export const COMMENT_AUTH_PROMPT =
  "Sign in to post your comment. Your draft is saved on this device.";
