"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  createCommentAction,
  deleteCommentAction,
  listCommentsAction,
} from "../../actions/socialInteractions";
import type { PostCommentDTO } from "../../../lib/supabase/socialInteractions";
import { APP_ROUTES } from "../../lib/nav";
import { COMMENT_MAX_LENGTH } from "../../../lib/supabase/socialInteractions";

type CommentsPanelProps = {
  open: boolean;
  postId: number;
  commentCount: number;
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
  onClose,
  onCountChange,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<PostCommentDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const result = await listCommentsAction(postId);

      if (cancelled) {
        return;
      }

      if (!result.ok) {
        setLoadError(result.message);
        setComments([]);
        return;
      }

      setLoadError(null);
      setComments(result.comments);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, postId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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
      setErrorMessage(result.message);
      setRequiresAuth(Boolean(result.requiresAuth));
      setIsSubmitting(false);
      return;
    }

    setDraft("");
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
      setErrorMessage(result.message);
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

  return (
    <div className="absolute inset-0 z-40 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close comments"
        onClick={onClose}
      />

      <aside
        className="watch-panel-enter relative z-10 flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-[#080816]/95 text-white shadow-2xl backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comments-panel-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-300/80">
              Comments
            </p>
            <h2 id="comments-panel-title" className="mt-2 text-2xl font-black">
              {commentCount}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <p className="text-sm text-white/50">Loading comments…</p>
          ) : loadError ? (
            <p className="text-sm text-red-300" role="alert">
              {loadError}
            </p>
          ) : (comments ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/45">
              Be the first to comment.
            </div>
          ) : (
            (comments ?? []).map((comment) => (
              <article
                key={comment.id}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
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
          {errorMessage ? (
            <p className="mb-3 text-sm text-red-300" role="alert">
              {errorMessage}
              {requiresAuth ? (
                <>
                  {" "}
                  <Link
                    href={`${APP_ROUTES.login}?next=/discover`}
                    className="font-bold underline"
                  >
                    Sign in
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
            <label className="sr-only" htmlFor={`comment-draft-${postId}`}>
              Write a comment
            </label>
            <textarea
              id={`comment-draft-${postId}`}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
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
      </aside>
    </div>
  );
}
