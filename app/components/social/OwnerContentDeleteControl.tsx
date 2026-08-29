"use client";

import Link from "next/link";
import { buildEditPostHref } from "../../lib/nav";
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
    return { editLabel: "Edit video" };
  }
  return { editLabel: "Edit post" };
}

/**
 * Owner-only Edit in the Watch/Home rail slot that used to be delete.
 * Destructive delete is only on the owner edit workspace (same auth/RLS).
 */
export default function OwnerContentDeleteControl({
  postId,
  kind,
  viewerId = null,
  ownerUserId = null,
  isOwner,
  variant = "overlay",
}: OwnerContentDeleteControlProps) {
  const copy = copyForKind(kind);
  const ownerVisible =
    isOwner === true || viewerMaySeeDeleteControl(viewerId, ownerUserId);

  if (!ownerVisible || !Number.isInteger(postId) || postId <= 0) {
    return null;
  }

  const triggerClass =
    variant === "rail"
      ? "watch-focus-ring flex flex-col items-center gap-1"
      : "watch-focus-ring flex h-11 min-h-[44px] min-w-[44px] items-center justify-center rounded-full border border-white/15 bg-black/55 text-white backdrop-blur-md hover:bg-black/70";

  return (
    <div className={variant === "rail" ? "relative" : "relative z-10"}>
      <Link
        href={buildEditPostHref(postId)}
        aria-label={copy.editLabel}
        className={triggerClass}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        {variant === "rail" ? (
          <>
            <span className="watch-rail-btn flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md">
              <EditIcon />
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wide text-white/55">
              Edit
            </span>
          </>
        ) : (
          <EditIcon />
        )}
      </Link>
    </div>
  );
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 20h4l10.5-10.5-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5 17 10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
