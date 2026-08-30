"use client";

import Link from "next/link";
import { useState } from "react";
import {
  recordShareAction,
  toggleLikeAction,
  toggleSaveAction,
} from "../../actions/socialInteractions";
import type { DatabasePost } from "../../data/types/post";
import { useTranslation } from "../i18n";
import { APP_ROUTES, buildCreatorProfileHref } from "../../lib/nav";
import { buildHomeSocialProfileHref } from "../../lib/social/homeSocialPost";
import {
  formatInteractionCount,
  getOrCreateViewerKey,
  shareViaTarget,
  type ShareTarget,
} from "../../lib/social/shareAndViews";
import CommentsPanel from "../social/CommentsPanel";
import MentionedText from "../social/MentionedText";
import ShareMenu from "../social/ShareMenu";
import ShareToMessagesPanel from "../social/ShareToMessagesPanel";

type HomeLatestPostLayerProps = {
  post: DatabasePost;
  onDismiss: () => void;
};

export default function HomeLatestPostLayer({
  post,
  onDismiss,
}: HomeLatestPostLayerProps) {
  const { t } = useTranslation();
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState(post.comments);
  const [saves, setSaves] = useState(post.saves ?? 0);
  const [shares, setShares] = useState(post.shares);
  const [likedByMe, setLikedByMe] = useState(false);
  const [savedByMe, setSavedByMe] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const [imageOpen, setImageOpen] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [savePending, setSavePending] = useState(false);

  const username = post.author_username;
  const profileHref = buildHomeSocialProfileHref(username, Boolean(post.image_url));
  const authorHref = buildCreatorProfileHref({ username });

  async function handleLike() {
    if (likePending) {
      return;
    }
    const previousLiked = likedByMe;
    const previousLikes = likes;
    const nextLiked = !previousLiked;
    setLikePending(true);
    setLikedByMe(nextLiked);
    setLikes(Math.max(previousLikes + (nextLiked ? 1 : -1), 0));
    const result = await toggleLikeAction(post.id);
    if (!result.ok) {
      setLikedByMe(previousLiked);
      setLikes(previousLikes);
      setLikePending(false);
      return;
    }
    setLikedByMe(result.liked);
    setLikes(result.likes);
    setLikePending(false);
  }

  async function handleSave() {
    if (savePending) {
      return;
    }
    const previousSaved = savedByMe;
    const previousSaves = saves;
    const nextSaved = !previousSaved;
    setSavePending(true);
    setSavedByMe(nextSaved);
    setSaves(Math.max(previousSaves + (nextSaved ? 1 : -1), 0));
    const result = await toggleSaveAction(post.id);
    if (!result.ok) {
      setSavedByMe(previousSaved);
      setSaves(previousSaves);
      setSavePending(false);
      return;
    }
    setSavedByMe(result.saved);
    setSaves(result.saves);
    setSavePending(false);
  }

  async function handleShareTarget(target: ShareTarget) {
    setShareOpen(false);
    const outcome = await shareViaTarget(target, {
      postId: post.id,
      title: "UMTUBA",
      text: post.content?.trim() || t("social.latest.posted"),
    });
    if (outcome.method === "none") {
      return;
    }
    const result = await recordShareAction(post.id, getOrCreateViewerKey());
    if (result.ok) {
      setShares(result.shares);
    }
  }

  return (
    <section
      className="relative mt-2 overflow-hidden rounded-2xl border border-amber-400/20 bg-[#0b0b14]/95 p-3 text-white shadow-[0_0_28px_rgba(212,175,55,0.08)]"
      aria-label={t("social.latest.eyebrow")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/80">
            {t("social.latest.eyebrow")}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Link
              href={authorHref}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/15 text-xs font-black"
            >
              {post.author_avatar || "U"}
            </Link>
            <div className="min-w-0">
              <Link
                href={authorHref}
                className="block truncate text-sm font-black hover:text-amber-100"
              >
                {post.author_username}
              </Link>
              <Link
                href={profileHref}
                className="text-[11px] text-white/45 hover:text-white/70"
              >
                {t("social.comments.justNow")}
              </Link>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="watch-focus-ring rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-bold text-white/60 hover:bg-white/10"
        >
          {t("social.latest.dismiss")}
        </button>
      </div>

      {post.content ? (
        <p className="mt-3 text-sm leading-6 text-white/85">
          <MentionedText text={post.content} />
        </p>
      ) : null}

      {post.image_url ? (
        <button
          type="button"
          onClick={() => setImageOpen(true)}
          className="mt-3 block w-full overflow-hidden rounded-xl border border-white/10 bg-black"
          aria-label={t("social.latest.openImage")}
        >
          <img
            src={post.image_url}
            alt={t("social.composer.previewAlt")}
            className="max-h-56 w-full object-contain"
          />
        </button>
      ) : null}

      <div className="relative mt-3 flex flex-wrap items-center gap-2">
        <ActionChip
          label={t("social.like")}
          count={formatInteractionCount(likes)}
          active={likedByMe}
          disabled={likePending}
          onClick={() => void handleLike()}
        />
        <ActionChip
          label={t("social.comment")}
          count={formatInteractionCount(comments)}
          onClick={() => setCommentsOpen(true)}
        />
        <ActionChip
          label={t("social.save")}
          count={formatInteractionCount(saves)}
          active={savedByMe}
          disabled={savePending}
          onClick={() => void handleSave()}
        />
        <div className="relative">
          <ActionChip
            label={t("social.share")}
            count={formatInteractionCount(shares)}
            active={shareOpen}
            onClick={() => setShareOpen((open) => !open)}
          />
          <ShareMenu
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            onSelect={(target) => void handleShareTarget(target)}
            onSendInMessages={() => {
              setShareOpen(false);
              setMessagesOpen(true);
            }}
          />
        </div>
        <Link
          href={profileHref}
          className="ms-auto text-[11px] font-bold text-amber-200/85 hover:text-amber-100"
        >
          {t("social.latest.viewProfile")}
        </Link>
      </div>

      {commentsOpen ? (
        <div className="relative mt-3 min-h-[22rem]">
          <CommentsPanel
            open={commentsOpen}
            postId={post.id}
            commentCount={comments}
            returnPath={APP_ROUTES.home}
            onClose={() => setCommentsOpen(false)}
            onCountChange={setComments}
          />
        </div>
      ) : null}

      <ShareToMessagesPanel
        open={messagesOpen}
        postId={post.id}
        caption={post.content}
        onClose={() => setMessagesOpen(false)}
        onSent={(nextShares) => {
          if (typeof nextShares === "number") {
            setShares(nextShares);
          }
        }}
      />

      {imageOpen && post.image_url ? (
        <button
          type="button"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setImageOpen(false)}
          aria-label={t("actions.close")}
        >
          <img
            src={post.image_url}
            alt={t("social.composer.previewAlt")}
            className="max-h-[90dvh] max-w-full object-contain"
          />
        </button>
      ) : null}
    </section>
  );
}

function ActionChip({
  label,
  count,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  count: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`watch-focus-ring rounded-full border px-2.5 py-1 text-[11px] font-bold disabled:opacity-50 ${
        active
          ? "border-amber-300/40 bg-amber-400/15 text-amber-50"
          : "border-white/12 bg-white/5 text-white/75 hover:bg-white/10"
      }`}
    >
      {label} · {count}
    </button>
  );
}
