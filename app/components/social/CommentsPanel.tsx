"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  createCommentAction,
  deleteCommentAction,
  listCommentsAction,
} from "../../actions/socialInteractions";
import type { PostCommentDTO } from "../../../lib/supabase/socialInteractions";
import { APP_ROUTES } from "../../lib/nav";
import { COMMENT_MAX_LENGTH } from "../../../lib/supabase/socialInteractions";
import {
  COMMENT_AUTH_PROMPT,
  buildCommentSignInHref,
  clearCommentDraft,
  readCommentDraft,
  writeCommentDraft,
} from "../../lib/social/commentDraft";
import { useDialogA11y } from "../../lib/product/useDialogA11y";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";

type CommentsPanelProps = {
  open: boolean;
  postId: number;
  commentCount: number;
  /** Surface path to return to after sign-in (defaults to Discover). */
  returnPath?: string;
  /** Scroll/highlight this comment after load (notification deep link). */
  focusCommentId?: number | null;
  /** Inline thread for UM Life focused posts; default remains the Watch sheet. */
  variant?: "sheet" | "inline";
  onClose: () => void;
  onCountChange?: (count: number) => void;
};

function formatRelativeTime(iso: string): string {
  const created = new Date(iso).getTime();
  const now = Date.now();
  const minutes = Math.floor((now - created) / 60000);

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function CommentsPanel({
  open,
  postId,
  commentCount,
  returnPath = APP_ROUTES.discover,
  focusCommentId = null,
  variant = "sheet",
  onClose,
  onCountChange,
}: CommentsPanelProps) {
  const isInline = variant === "inline";
  const [comments, setComments] = useState<PostCommentDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadEpoch, setLoadEpoch] = useState(0);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useDialogA11y({
    open: open && !isInline,
    onClose,
    containerRef: panelRef,
    initialFocusRef: closeRef,
  });

  useEffect(() => {
    setDraft(readCommentDraft(postId));
    setRequiresAuth(false);
    setErrorMessage(null);
  }, [postId]);

  useEffect(() => {
    writeCommentDraft(postId, draft);
  }, [draft, postId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setComments(null);
    setLoadError(null);

    void (async () => {
      const result = await listCommentsAction(postId);

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setLoadError(
          sanitizeUserFacingMessage(
            result.message,
            "Couldn't load comments. Please try again."
          )
        );
        setComments([]);
        return;
      }

      setLoadError(null);
      setComments(result.comments);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, postId, loadEpoch]);

  useEffect(() => {
    if (!open || !focusCommentId || !comments?.length) {
      return;
    }
    const node = document.getElementById(`comment-${focusCommentId}`);
    if (!node) {
      return;
    }
    node.scrollIntoView({ block: "nearest", behavior: "smooth" });
    node.setAttribute("data-focused", "true");
  }, [open, focusCommentId, comments]);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setRequiresAuth(false);

    const result = await createCommentAction(postId, draft);

    if (!result.ok) {
      // Keep draft text — never discard on auth or other failures.
      setErrorMessage(
        result.requiresAuth
          ? COMMENT_AUTH_PROMPT
          : sanitizeUserFacingMessage(
              result.message,
              "Couldn't post your comment. Please try again."
            )
      );
      setRequiresAuth(Boolean(result.requiresAuth));
      setIsSubmitting(false);
      return;
    }

    setDraft("");
    clearCommentDraft(postId);
    setComments((current) => [result.comment, ...(current ?? [])]);
    onCountChange?.(result.comments);
    setIsSubmitting(false);
  }

  async function handleDelete(commentId: number) {
    if (deletingId != null) {
      return;
    }

    setDeletingId(commentId);
    setErrorMessage(null);

    const result = await deleteCommentAction(commentId);

    if (!result.ok) {
      setErrorMessage(
        result.requiresAuth
          ? COMMENT_AUTH_PROMPT
          : sanitizeUserFacingMessage(
              result.message,
              "Couldn't delete that comment. Please try again."
            )
      );
      setRequiresAuth(Boolean(result.requiresAuth));
      setDeletingId(null);
      return;
    }

    setComments((current) =>
      (current ?? []).filter((item) => item.id !== commentId)
    );
    onCountChange?.(result.comments);
    setDeletingId(null);
  }

  const isLoading = comments === null && !loadError;
  const signInHref = buildCommentSignInHref(returnPath);

  const thread = (
    <>
      <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-300/80">
            Comments
          </p>
          <h2 id="comments-panel-title" className="mt-2 text-2xl font-black">
            {commentCount}
          </h2>
        </div>

        {isInline ? null : (
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10"
          >
            Close
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {isLoading ? (
          <p className="text-sm text-white/50" role="status">
            Loading comments…
          </p>
        ) : loadError ? (
          <div className="space-y-3" role="alert">
            <p className="text-sm text-red-300">{loadError}</p>
            <button
              type="button"
              onClick={() => setLoadEpoch((epoch) => epoch + 1)}
              className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/85 hover:bg-white/10"
            >
              Try again
            </button>
          </div>
        ) : (comments ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/45">
            Be the first to comment.
          </div>
        ) : (
          (comments ?? []).map((comment) => (
            <article
              key={comment.id}
              id={`comment-${comment.id}`}
              aria-current={
                focusCommentId === comment.id ? "true" : undefined
              }
              className={`rounded-2xl border px-4 py-3 ${
                focusCommentId === comment.id
                  ? "border-sky-400/40 bg-sky-500/10"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-blue-400/40 to-indigo-600/50 text-xs font-black">
                  {comment.author.avatarInitial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-black">
                      {comment.author.displayName}
                    </p>
                    <span className="text-[11px] text-white/40">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-6 text-white/80">
                    {comment.body}
                  </p>
                  {comment.isMine ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(comment.id)}
                      disabled={deletingId === comment.id}
                      className="mt-2 text-xs font-bold text-red-300/80 hover:text-red-200 disabled:opacity-50"
                    >
                      {deletingId === comment.id ? "Deleting…" : "Delete"}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="border-t border-white/10 p-5">
        {requiresAuth ? (
          <div
            className="mb-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50"
            role="status"
          >
            <p>{COMMENT_AUTH_PROMPT}</p>
            <Link
              href={signInHref}
              className="mt-3 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black"
            >
              Sign in to comment
            </Link>
          </div>
        ) : null}

        {errorMessage && !requiresAuth ? (
          <p className="mb-3 text-sm text-red-300" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
          <label className="sr-only" htmlFor={`comment-draft-${postId}`}>
            Write a comment
          </label>
          <textarea
            id={`comment-draft-${postId}`}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            maxLength={COMMENT_MAX_LENGTH}
            rows={3}
            placeholder="Add a comment…"
            className="w-full resize-none rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-white/30 focus:outline-none"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] text-white/40">
              {draft.trim().length}/{COMMENT_MAX_LENGTH}
            </span>
            <button
              type="submit"
              disabled={isSubmitting || draft.trim().length === 0}
              className="watch-focus-ring rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black disabled:opacity-40"
            >
              {isSubmitting ? "Posting…" : "Post"}
            </button>
          </div>
        </form>
      </div>
    </>
  );

  if (isInline) {
    return (
      <section
        className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.03]"
        aria-labelledby="comments-panel-title"
      >
        {thread}
      </section>
    );
  }

  return (
    <div className="absolute inset-0 z-40 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close comments"
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        className="watch-panel-enter relative z-10 flex h-full w-full max-w-sm flex-col border-s border-white/10 bg-[#080816]/95 text-white shadow-2xl backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comments-panel-title"
      >
        {thread}
      </aside>
    </div>
  );
}
