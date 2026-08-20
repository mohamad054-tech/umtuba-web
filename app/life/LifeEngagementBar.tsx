"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  recordShareAction,
  toggleLikeAction,
  toggleSaveAction,
} from "../actions/socialInteractions";
import CommentsPanel from "../components/social/CommentsPanel";
import ShareMenu from "../components/social/ShareMenu";
import { APP_ROUTES, buildLifePostHref } from "../lib/nav";
import {
  formatInteractionCount,
  shareViaTarget,
  shareWithNative,
  shouldUseMobileNativeShare,
  type SharePostOutcome,
  type ShareTarget,
} from "../lib/social/shareAndViews";
import type { LifePost } from "./lib/lifePosts";

function subscribeToNoop() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

function readVisualViewportBox(): { top: number; height: number } {
  const viewport = window.visualViewport;
  if (viewport) {
    return { top: viewport.offsetTop, height: viewport.height };
  }
  return { top: 0, height: window.innerHeight };
}

type LifeEngagementBarProps = {
  post: LifePost;
  commentsVariant?: "sheet" | "inline";
  onChange: (postId: number, patch: Partial<LifePost>) => void;
};

export default function LifeEngagementBar({
  post,
  commentsVariant = "sheet",
  onChange,
}: LifeEngagementBarProps) {
  const router = useRouter();
  const mounted = useSyncExternalStore(
    subscribeToNoop,
    getClientSnapshot,
    getServerSnapshot
  );
  const [commentsOpen, setCommentsOpen] = useState(commentsVariant === "inline");
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [viewportBox, setViewportBox] = useState({ top: 0, height: 0 });
  const returnPath = buildLifePostHref(post.id);
  const busy = likePending || savePending || sharePending;
  const sheetOpen = commentsOpen && commentsVariant !== "inline";

  useEffect(() => {
    if (!sheetOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) {
      return;
    }

    function syncViewport() {
      setViewportBox(readVisualViewportBox());
    }

    syncViewport();
    const viewport = window.visualViewport;
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
    };
  }, [sheetOpen]);

  function redirectToLogin() {
    router.push(
      `${APP_ROUTES.login}?next=${encodeURIComponent(returnPath)}`
    );
  }

  function shareInput() {
    return {
      postId: post.id,
      title: "UM Life",
      text: post.content || "UM Life",
      surface: "life" as const,
    };
  }

  async function recordShareAfterSuccess(outcome: SharePostOutcome) {
    if (outcome.method === "none") {
      return;
    }
    const result = await recordShareAction(post.id);
    if (result.ok) {
      onChange(post.id, { shares: result.shares });
    }
  }

  async function handleLike() {
    if (likePending) {
      return;
    }
    const previousLiked = post.likedByMe;
    const previousLikes = post.likes;
    setLikePending(true);
    onChange(post.id, {
      likedByMe: !previousLiked,
      likes: Math.max(previousLikes + (previousLiked ? -1 : 1), 0),
    });
    const result = await toggleLikeAction(post.id);
    if (!result.ok) {
      onChange(post.id, { likedByMe: previousLiked, likes: previousLikes });
      if (result.requiresAuth) {
        redirectToLogin();
      } else {
        setHint(result.message);
      }
      setLikePending(false);
      return;
    }
    onChange(post.id, { likedByMe: result.liked, likes: result.likes });
    setLikePending(false);
  }

  async function handleSave() {
    if (savePending) {
      return;
    }
    const previousSaved = post.savedByMe;
    const previousSaves = post.saves;
    setSavePending(true);
    onChange(post.id, {
      savedByMe: !previousSaved,
      saves: Math.max(previousSaves + (previousSaved ? -1 : 1), 0),
    });
    const result = await toggleSaveAction(post.id);
    if (!result.ok) {
      onChange(post.id, { savedByMe: previousSaved, saves: previousSaves });
      if (result.requiresAuth) {
        redirectToLogin();
      } else {
        setHint(result.message);
      }
      setSavePending(false);
      return;
    }
    onChange(post.id, { savedByMe: result.saved, saves: result.saves });
    setSavePending(false);
  }

  async function handleShareTarget(target: ShareTarget) {
    setSharePending(true);
    const outcome = await shareViaTarget(target, shareInput());
    await recordShareAfterSuccess(outcome);
    if (outcome.method === "none") {
      setHint(outcome.message);
    }
    setShareMenuOpen(false);
    setSharePending(false);
  }

  async function handleShareButtonClick() {
    if (shouldUseMobileNativeShare()) {
      await handleShareTarget("native");
      return;
    }
    setShareMenuOpen((open) => !open);
  }

  return (
    <div className="relative">
      {hint ? (
        <p className="mb-3 text-xs font-bold text-white/60" role="status">
          {hint}
        </p>
      ) : null}

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
        aria-busy={busy}
      >
        <button
          type="button"
          onClick={() => void handleLike()}
          aria-pressed={post.likedByMe}
          aria-busy={likePending}
          className={`watch-focus-ring min-h-11 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
            post.likedByMe
              ? "bg-white text-black"
              : "bg-white/5 hover:bg-white/10"
          }`}
        >
          ♥ {formatInteractionCount(post.likes)}
        </button>
        <button
          type="button"
          onClick={() => setCommentsOpen(true)}
          className="watch-focus-ring min-h-11 rounded-2xl bg-white/5 px-3 py-2.5 text-sm font-bold hover:bg-white/10"
        >
          💬 {formatInteractionCount(post.comments)}
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => void handleShareButtonClick()}
            aria-busy={sharePending}
            className="watch-focus-ring min-h-11 w-full rounded-2xl bg-white/5 px-3 py-2.5 text-sm font-bold hover:bg-white/10"
          >
            ↗ {formatInteractionCount(post.shares)}
          </button>
          <ShareMenu
            open={shareMenuOpen}
            align="center"
            disabled={sharePending}
            onClose={() => setShareMenuOpen(false)}
            onSelect={(target) => void handleShareTarget(target)}
          />
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          aria-pressed={post.savedByMe}
          aria-busy={savePending}
          className={`watch-focus-ring min-h-11 rounded-2xl border px-3 py-2.5 text-sm font-bold transition ${
            post.savedByMe
              ? "border-white bg-white text-black"
              : "border-white/10 hover:bg-white/10"
          }`}
        >
          ⌁ {formatInteractionCount(post.saves)}
        </button>
      </div>

      {commentsOpen && commentsVariant === "inline" ? (
        <CommentsPanel
          key={post.id}
          open={commentsOpen}
          variant="inline"
          postId={post.id}
          commentCount={post.comments}
          returnPath={returnPath}
          onClose={() => setCommentsOpen(true)}
          onCountChange={(count) => onChange(post.id, { comments: count })}
        />
      ) : null}

      {sheetOpen && mounted
        ? createPortal(
            <div
              className="fixed inset-x-0 z-[80]"
              data-life-comments-sheet="viewport"
              style={{
                top: viewportBox.height > 0 ? viewportBox.top : 0,
                height:
                  viewportBox.height > 0 ? viewportBox.height : "100dvh",
                paddingBottom:
                  "max(0.75rem, env(safe-area-inset-bottom, 0px))",
              }}
            >
              <div className="relative h-full min-h-0 w-full">
                <CommentsPanel
                  key={post.id}
                  open={commentsOpen}
                  postId={post.id}
                  commentCount={post.comments}
                  returnPath={returnPath}
                  onClose={() => setCommentsOpen(false)}
                  onCountChange={(count) =>
                    onChange(post.id, { comments: count })
                  }
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
