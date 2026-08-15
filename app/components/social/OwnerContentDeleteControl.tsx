"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deletePostAction } from "../../actions/deletePost";
import { useDialogA11y } from "../../lib/product/useDialogA11y";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";
import { viewerMaySeeDeleteControl } from "../../../lib/supabase/deleteOwnedPostShared";

export type OwnerContentDeleteKind = "video" | "post";

type OwnerContentDeleteControlProps = {
  postId: number;
  kind: OwnerContentDeleteKind;
  viewerId?: string | null;
  ownerUserId?: string | null;
  /** UI-only gate. Server/database still deny non-owners. */
  isOwner?: boolean;
  variant?: "rail" | "overlay" | "header";
  onDeleted?: (postId: number) => void;
};

function copyForKind(kind: OwnerContentDeleteKind) {
  if (kind === "video") {
    return {
      moreLabel: "More actions",
      deleteLabel: "Delete video",
      title: "Delete this video?",
      body: "This permanently removes the video from Watch, Discover, your profile, and search. This cannot be undone.",
      confirm: "Delete video",
      success: "Video deleted.",
    };
  }

  return {
    moreLabel: "More actions",
    deleteLabel: "Delete post",
    title: "Delete this post?",
    body: "This permanently removes the post from your profile and feeds. This cannot be undone.",
    confirm: "Delete post",
    success: "Post deleted.",
  };
}

export default function OwnerContentDeleteControl({
  postId,
  kind,
  viewerId = null,
  ownerUserId = null,
  isOwner,
  variant = "overlay",
  onDeleted,
}: OwnerContentDeleteControlProps) {
  const copy = copyForKind(kind);
  const titleId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const firstMenuRef = useRef<HTMLButtonElement | null>(null);

  const ownerVisible =
    isOwner === true || viewerMaySeeDeleteControl(viewerId, ownerUserId);

  useDialogA11y({
    open: menuOpen,
    onClose: () => {
      if (!pending) {
        setMenuOpen(false);
      }
    },
    containerRef: menuRef,
    initialFocusRef: firstMenuRef,
  });

  useDialogA11y({
    open: confirmOpen,
    onClose: () => {
      if (!pending) {
        setConfirmOpen(false);
      }
    },
    containerRef: dialogRef,
    initialFocusRef: confirmRef,
  });

  if (!ownerVisible || !Number.isInteger(postId) || postId <= 0) {
    return null;
  }

  function openConfirm() {
    setMenuOpen(false);
    setErrorMessage(null);
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (pending) {
      return;
    }

    setPending(true);
    setErrorMessage(null);

    const result = await deletePostAction(postId);

    if (!result.ok) {
      setPending(false);
      setErrorMessage(
        sanitizeUserFacingMessage(result.message, "Unable to delete this. Please try again.")
      );
      return;
    }

    setConfirmOpen(false);
    setPending(false);
    setStatusMessage(copy.success);
    onDeleted?.(postId);
  }

  const triggerClass =
    variant === "rail"
      ? "watch-focus-ring flex flex-col items-center gap-1"
      : "watch-focus-ring flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md hover:bg-black/70";

  return (
    <div className={variant === "rail" ? "relative" : "relative z-10"}>
      <button
        type="button"
        className={triggerClass}
        aria-label={copy.moreLabel}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setMenuOpen((open) => !open);
        }}
      >
        {variant === "rail" ? (
          <>
            <span className="watch-rail-btn flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md">
              <MoreIcon />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/55">
              More
            </span>
          </>
        ) : (
          <MoreIcon />
        )}
      </button>

      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Close actions menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            ref={menuRef}
            role="menu"
            className={`absolute z-50 w-48 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#0b0b18]/96 p-1.5 shadow-2xl backdrop-blur-xl ${
              variant === "rail"
                ? "bottom-[calc(100%+0.75rem)] end-0"
                : "end-0 top-[calc(100%+0.4rem)]"
            }`}
          >
            <button
              ref={firstMenuRef}
              type="button"
              role="menuitem"
              className="flex min-h-[44px] w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-200 transition hover:bg-red-500/15"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                openConfirm();
              }}
            >
              {copy.deleteLabel}
            </button>
          </div>
        </>
      ) : null}

      {statusMessage ? (
        <p className="sr-only" role="status">
          {statusMessage}
        </p>
      ) : null}

      {confirmOpen && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[140] flex items-end justify-center p-3 sm:items-center sm:p-6">
              <button
                type="button"
                tabIndex={-1}
                className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-[2px]"
                aria-label="Cancel delete"
                disabled={pending}
                onClick={() => {
                  if (!pending) {
                    setConfirmOpen(false);
                  }
                }}
              />
              <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[28px] border border-white/15 bg-[#0b0b18] p-5 text-white shadow-2xl sm:rounded-[28px]"
              >
                <h2 id={titleId} className="text-lg font-black">
                  {copy.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/70">{copy.body}</p>
                {errorMessage ? (
                  <p role="alert" className="mt-3 text-sm font-bold text-red-200">
                    {errorMessage}
                  </p>
                ) : null}
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={pending}
                    className="watch-focus-ring min-h-[44px] rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-white/80 hover:bg-white/10 disabled:opacity-50"
                    onClick={() => setConfirmOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    ref={confirmRef}
                    type="button"
                    disabled={pending}
                    aria-busy={pending}
                    className="watch-focus-ring min-h-[44px] rounded-full border border-red-400/40 bg-red-500/90 px-4 py-2.5 text-sm font-black text-white hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
                    onClick={() => void handleConfirmDelete()}
                  >
                    {pending ? "Deleting…" : copy.confirm}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}
