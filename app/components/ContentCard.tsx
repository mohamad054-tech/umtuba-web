"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Post } from "../data/types/post";
import {
  recordShareAction,
  recordViewAction,
  toggleLikeAction,
  toggleSaveAction,
} from "../actions/socialInteractions";
import { APP_ROUTES } from "../lib/nav";
import {
  formatInteractionCount,
  getOrCreateViewerKey,
  shouldUseMobileNativeShare,
  shareViaTarget,
  shareWithNative,
  type SharePostOutcome,
  type ShareTarget,
} from "../lib/social/shareAndViews";
import CommentsPanel from "./social/CommentsPanel";
import ShareMenu from "./social/ShareMenu";
import OwnerContentDeleteControl from "./social/OwnerContentDeleteControl";

type ContentCardProps = {
  post: Post;
  viewerId?: string | null;
  onPostChange?: (postId: number, patch: Partial<Post>) => void;
  onPostDeleted?: (postId: number) => void;
};

const postTypeLabels: Record<Post["type"], string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  poll: "Poll",
  question: "Question",
  challenge: "Challenge",
  idea: "Idea",
  opportunity: "Opportunity",
};

export default function ContentCard({
  post,
  viewerId = null,
  onPostChange,
  onPostDeleted,
}: ContentCardProps) {
  const router = useRouter();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const viewedRef = useRef(false);
  const cardRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = cardRef.current;

    if (!node || viewedRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (!entry?.isIntersecting || viewedRef.current) {
          return;
        }

        viewedRef.current = true;
        const viewerKey = getOrCreateViewerKey();

        void recordViewAction(post.id, viewerKey).then((result) => {
          if (result.ok) {
            onPostChange?.(post.id, { views: result.views });
          }
        });
      },
      { threshold: 0.55 }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [onPostChange, post.id]);

  function showHint(message: string) {
    setHint(message);
    window.setTimeout(() => setHint(null), 2200);
  }

  function showCopiedSuccess() {
    setLinkCopied(true);
    showHint("✓ Link copied");
    window.setTimeout(() => setLinkCopied(false), 2200);
  }

  function redirectToLogin() {
    router.push(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.discover)}`
    );
  }

  function shareInput() {
    return {
      postId: post.id,
      title: "UMTUBA",
      text: post.content || "Check out this post on UMTUBA",
    };
  }

  async function recordShareAfterSuccess(outcome: SharePostOutcome) {
    if (outcome.method === "none") {
      if (outcome.message !== "Share cancelled.") {
        showHint(outcome.message);
      }
      return;
    }

    if (outcome.method === "clipboard") {
      showCopiedSuccess();
    } else if (outcome.method === "whatsapp") {
      showHint("Opening WhatsApp");
    } else {
      showHint("Shared");
    }

    const result = await recordShareAction(post.id, getOrCreateViewerKey());

    if (result.ok) {
      onPostChange?.(post.id, { shares: result.shares });
    }
  }

  async function handleShareButtonClick() {
    if (sharePending) {
      return;
    }

    if (shouldUseMobileNativeShare()) {
      setSharePending(true);
      const outcome = await shareWithNative(shareInput());
      await recordShareAfterSuccess(outcome);
      setSharePending(false);
      return;
    }

    setShareMenuOpen((open) => !open);
  }

  async function handleShareTarget(target: ShareTarget) {
    if (sharePending) {
      return;
    }

    setSharePending(true);
    setShareMenuOpen(false);

    const outcome = await shareViaTarget(target, shareInput());
    await recordShareAfterSuccess(outcome);
    setSharePending(false);
  }

  async function handleLike() {
    if (likePending) {
      return;
    }

    const previousLiked = post.likedByMe;
    const previousLikes = post.likes;
    const nextLiked = !previousLiked;
    const nextLikes = Math.max(previousLikes + (nextLiked ? 1 : -1), 0);

    setLikePending(true);
    onPostChange?.(post.id, { likedByMe: nextLiked, likes: nextLikes });

    const result = await toggleLikeAction(post.id);

    if (!result.ok) {
      onPostChange?.(post.id, {
        likedByMe: previousLiked,
        likes: previousLikes,
      });

      if (result.requiresAuth) {
        redirectToLogin();
      } else {
        showHint(result.message);
      }

      setLikePending(false);
      return;
    }

    onPostChange?.(post.id, { likedByMe: result.liked, likes: result.likes });
    setLikePending(false);
  }

  async function handleSave() {
    if (savePending) {
      return;
    }

    const previousSaved = post.savedByMe;
    const previousSaves = post.saves;
    const nextSaved = !previousSaved;
    const nextSaves = Math.max(previousSaves + (nextSaved ? 1 : -1), 0);

    setSavePending(true);
    onPostChange?.(post.id, { savedByMe: nextSaved, saves: nextSaves });

    const result = await toggleSaveAction(post.id);

    if (!result.ok) {
      onPostChange?.(post.id, {
        savedByMe: previousSaved,
        saves: previousSaves,
      });

      if (result.requiresAuth) {
        redirectToLogin();
      } else {
        showHint(result.message);
      }

      setSavePending(false);
      return;
    }

    onPostChange?.(post.id, { savedByMe: result.saved, saves: result.saves });
    setSavePending(false);
  }

  return (
    <article
      ref={cardRef}
      className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.04]"
    >
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white font-black text-black">
            {post.author.avatar}
          </div>

          <div className="min-w-0">
            <p className="truncate font-black">{post.author.name}</p>
            <p className="truncate text-sm text-white/50">
              {post.author.username} · {post.createdAt}
            </p>
          </div>

          <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/70">
            {postTypeLabels[post.type]}
          </span>
          <OwnerContentDeleteControl
            postId={post.id}
            kind={post.type === "video" ? "video" : "post"}
            viewerId={viewerId}
            ownerUserId={post.ownerUserId}
            variant="header"
            onDeleted={onPostDeleted}
          />
        </div>

        {post.content ? (
          <p className="mt-5 text-lg leading-8 text-white/90">{post.content}</p>
        ) : null}
      </div>

      {post.image ? (
        <img
          src={post.image}
          alt={post.content || "Post image"}
          className="h-72 w-full object-cover"
        />
      ) : null}

      {post.video ? (
        <div className="bg-black">
          <video
            src={post.video}
            controls
            playsInline
            preload="metadata"
            className="max-h-96 w-full bg-black"
            aria-label={post.content || "Video post"}
          />
        </div>
      ) : null}

      <div className="border-t border-white/10 p-5">
        {hint ? (
          <p
            className={`mb-3 text-xs font-bold ${
              linkCopied ? "text-emerald-300" : "text-white/60"
            }`}
            role="status"
          >
            {hint}
          </p>
        ) : null}

        <div className="grid grid-cols-3 gap-3 text-sm">
          <button
            type="button"
            onClick={() => void handleLike()}
            aria-pressed={post.likedByMe}
            className={`rounded-2xl px-3 py-3 font-bold transition ${
              post.likedByMe
                ? "bg-white text-black"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            ❤️ {formatInteractionCount(post.likes)}
          </button>

          <button
            type="button"
            onClick={() => setCommentsOpen(true)}
            className="rounded-2xl bg-white/5 px-3 py-3 font-bold hover:bg-white/10"
          >
            💬 {formatInteractionCount(post.comments)}
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => void handleShareButtonClick()}
              className={`w-full rounded-2xl px-3 py-3 font-bold transition ${
                linkCopied || shareMenuOpen
                  ? "bg-white text-black"
                  : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {linkCopied ? "✓ Copied" : `↗️ ${formatInteractionCount(post.shares)}`}
            </button>

            <ShareMenu
              open={shareMenuOpen}
              align="center"
              disabled={sharePending}
              onClose={() => setShareMenuOpen(false)}
              onSelect={(target) => void handleShareTarget(target)}
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <button
            type="button"
            className="rounded-2xl border border-white/10 px-4 py-3 font-bold hover:bg-white/10"
          >
            🤝 UConnect
          </button>

          <button
            type="button"
            onClick={() => void handleSave()}
            aria-pressed={post.savedByMe}
            className={`rounded-2xl border px-4 py-3 font-bold transition ${
              post.savedByMe
                ? "border-white bg-white text-black"
                : "border-white/10 hover:bg-white/10"
            }`}
          >
            🔖 {post.savedByMe ? "Saved" : "Save"} ·{" "}
            {formatInteractionCount(post.saves)}
          </button>
        </div>
      </div>

      {commentsOpen ? (
        <div className="absolute inset-0 z-20">
          <CommentsPanel
            key={post.id}
            open={commentsOpen}
            postId={post.id}
            commentCount={post.comments}
            onClose={() => setCommentsOpen(false)}
            onCountChange={(count) => {
              onPostChange?.(post.id, { comments: count });
            }}
          />
        </div>
      ) : null}
    </article>
  );
}
