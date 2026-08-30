"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  createCommentAction,
  deleteCommentAction,
  listCommentsAction,
} from "../../actions/socialInteractions";
import type { PostCommentDTO } from "../../../lib/supabase/socialInteractions";
import { APP_ROUTES, buildCreatorProfileHref } from "../../lib/nav";
import { COMMENT_MAX_LENGTH } from "../../../lib/supabase/socialInteractions";
import {
  COMMENT_AUTH_PROMPT,
  buildCommentSignInHref,
  clearCommentDraft,
  readCommentDraft,
  writeCommentDraft,
} from "../../lib/social/commentDraft";
import {
  applyMentionInsertion,
  getActiveMentionQuery,
} from "../../lib/social/mentions";
import { useDialogA11y } from "../../lib/product/useDialogA11y";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";
import { globalSearchAction } from "../../actions/search";
import type { SearchResultItem } from "../../../lib/search/types";
import { useTranslation } from "../i18n";
import MentionedText from "./MentionedText";

type CommentsPanelProps = {
  open: boolean;
  postId: number;
  commentCount: number;
  /** Surface path to return to after sign-in (defaults to Discover). */
  returnPath?: string;
  /** Scroll/highlight this comment after load (notification deep link). */
  focusCommentId?: number | null;
  onClose: () => void;
  onCountChange?: (count: number) => void;
};

function formatRelativeTime(iso: string, justNow: string): string {
  const created = new Date(iso).getTime();
  const now = Date.now();
  const minutes = Math.floor((now - created) / 60000);

  if (minutes < 1) {
    return justNow;
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
  onClose,
  onCountChange,
}: CommentsPanelProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<PostCommentDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadEpoch, setLoadEpoch] = useState(0);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [mentionResults, setMentionResults] = useState<SearchResultItem[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [caret, setCaret] = useState(0);
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useDialogA11y({
    open,
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
            t("social.comments.loadError")
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
  }, [open, postId, loadEpoch, t]);

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

  useEffect(() => {
    if (!open) {
      setMentionOpen(false);
      setMentionResults([]);
      return;
    }

    const active = getActiveMentionQuery(draft, caret);
    if (!active || active.query.length < 2) {
      setMentionOpen(false);
      setMentionResults([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void globalSearchAction({
        query: active.query,
        tab: "people",
        limit: 6,
        remember: false,
      }).then((result) => {
        if (!result.ok) {
          setMentionResults([]);
          setMentionOpen(false);
          return;
        }
        const people = result.result.items.filter(
          (item) => item.entityType === "person"
        );
        setMentionResults(people);
        setMentionOpen(people.length > 0);
      });
    }, 280);

    return () => window.clearTimeout(timer);
  }, [caret, draft, open]);

  if (!open) {
    return null;
  }

  function insertMention(item: SearchResultItem) {
    const username = (item.subtitle ?? item.title).replace(/^@/, "");
    const next = applyMentionInsertion(draft, caret, username);
    if (!next) {
      return;
    }
    setDraft(next.text);
    setCaret(next.caret);
    setMentionOpen(false);
    window.setTimeout(() => {
      const node = textareaRef.current;
      if (node) {
        node.focus();
        node.setSelectionRange(next.caret, next.caret);
      }
    }, 0);
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
      setErrorMessage(
        result.requiresAuth
          ? COMMENT_AUTH_PROMPT
          : sanitizeUserFacingMessage(
              result.message,
              t("social.comments.postError")
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
    setMentionOpen(false);
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
              t("social.comments.deleteError")
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

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-end md:items-stretch">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label={t("social.comments.closeAria")}
        onClick={onClose}
      />

      <aside
        ref={panelRef}
        className="watch-panel-enter relative z-10 flex h-[min(88dvh,100%)] w-full max-w-none flex-col rounded-t-3xl border border-white/10 bg-[#080816]/95 text-white shadow-2xl backdrop-blur-xl md:h-full md:max-w-sm md:rounded-none md:border-l md:border-t-0"
        role="dialog"
        aria-modal="true"
        aria-labelledby="comments-panel-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-amber-200/80">
              {t("social.comments.title")}
            </p>
            <h2 id="comments-panel-title" className="mt-2 text-2xl font-black">
              {commentCount}
            </h2>
          </div>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold hover:bg-white/10"
          >
            {t("social.comments.close")}
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <p className="text-sm text-white/50" role="status">
              {t("social.comments.loading")}
            </p>
          ) : loadError ? (
            <div className="space-y-3" role="alert">
              <p className="text-sm text-red-300">{loadError}</p>
              <button
                type="button"
                onClick={() => setLoadEpoch((epoch) => epoch + 1)}
                className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/85 hover:bg-white/10"
              >
                {t("social.comments.retry")}
              </button>
            </div>
          ) : (comments ?? []).length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/45">
              {t("social.comments.empty")}
            </div>
          ) : (
            (comments ?? []).map((comment) => {
              const profileHref = buildCreatorProfileHref({
                username: comment.author.username,
              });
              return (
                <article
                  key={comment.id}
                  id={`comment-${comment.id}`}
                  aria-current={
                    focusCommentId === comment.id ? "true" : undefined
                  }
                  className={`rounded-2xl border px-4 py-3 ${
                    focusCommentId === comment.id
                      ? "border-amber-400/40 bg-amber-500/10"
                      : "border-white/10 bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Link
                      href={profileHref}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-gradient-to-br from-amber-400/40 to-amber-700/50 text-xs font-black"
                    >
                      {comment.author.avatarInitial}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={profileHref}
                          className="truncate text-sm font-black hover:text-amber-100"
                        >
                          {comment.author.displayName}
                        </Link>
                        <Link
                          href={profileHref}
                          className="text-[11px] text-white/40"
                        >
                          {formatRelativeTime(
                            comment.createdAt,
                            t("social.comments.justNow")
                          )}
                        </Link>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-white/80">
                        <MentionedText text={comment.body} />
                      </p>
                      {comment.isMine ? (
                        <button
                          type="button"
                          onClick={() => void handleDelete(comment.id)}
                          disabled={deletingId === comment.id}
                          className="mt-2 text-xs font-bold text-red-300/80 hover:text-red-200 disabled:opacity-50"
                        >
                          {deletingId === comment.id
                            ? t("social.comments.deleting")
                            : t("social.comments.delete")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })
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
                {t("social.comments.signIn")}
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
              {t("social.comments.write")}
            </label>
            <div className="relative">
              {mentionOpen ? (
                <div
                  className="absolute inset-x-0 bottom-full z-20 mb-2 overflow-hidden rounded-2xl border border-white/12 bg-[#0b0b18] shadow-2xl"
                  role="listbox"
                  aria-label={t("social.mention.people")}
                >
                  {mentionResults.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-white/45">
                      {t("social.mention.empty")}
                    </p>
                  ) : (
                    mentionResults.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        role="option"
                        onClick={() => insertMention(person)}
                        className="flex w-full items-center justify-between px-3 py-2 text-start hover:bg-white/10"
                      >
                        <span className="truncate text-sm font-bold">
                          {person.title}
                        </span>
                        <span className="truncate text-[11px] text-white/45">
                          {person.subtitle}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
              <textarea
                ref={textareaRef}
                id={`comment-draft-${postId}`}
                value={draft}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setCaret(event.target.selectionStart ?? event.target.value.length);
                }}
                onClick={(event) => {
                  setCaret(event.currentTarget.selectionStart ?? 0);
                }}
                onKeyUp={(event) => {
                  setCaret(event.currentTarget.selectionStart ?? 0);
                }}
                maxLength={COMMENT_MAX_LENGTH}
                rows={3}
                dir="auto"
                placeholder={t("social.comments.placeholder")}
                className="w-full resize-none rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/35 focus:border-amber-300/40 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-white/40">
                {draft.trim().length}/{COMMENT_MAX_LENGTH}
              </span>
              <button
                type="submit"
                disabled={isSubmitting || draft.trim().length === 0}
                className="watch-focus-ring rounded-full bg-amber-300 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-black disabled:opacity-40"
              >
                {isSubmitting
                  ? t("social.comments.posting")
                  : t("social.comments.post")}
              </button>
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}
