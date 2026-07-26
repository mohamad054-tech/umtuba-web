"use client";

import { useEffect, useRef, useState, type ReactNode, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import {
  recordShareAction,
  toggleLikeAction,
  toggleSaveAction,
} from "../../actions/socialInteractions";
import { createClient } from "../../../lib/supabase/client";
import ShareMenu from "../../components/social/ShareMenu";
import { APP_ROUTES } from "../../lib/nav";
import {
  formatInteractionCount,
  getOrCreateViewerKey,
  shouldUseMobileNativeShare,
  shareViaTarget,
  shareWithNative,
  type SharePostOutcome,
  type ShareTarget,
} from "../../lib/social/shareAndViews";
import { sanitizeUserFacingMessage } from "../../lib/product/userFacingMessage";
import type { DiscoverStats } from "../types";

type DiscoverActionRailProps = {
  postId: number;
  stats: DiscoverStats;
  likedByMe: boolean;
  savedByMe: boolean;
  caption?: string;
  /** Safe path for login `?next=` (defaults to Discover). */
  returnPath?: string;
  onComment?: () => void;
  onStatsChange?: (stats: Partial<DiscoverStats>) => void;
  onFlagsChange?: (flags: { likedByMe?: boolean; savedByMe?: boolean }) => void;
};

/**
 * Persisted social interactions for Discover videos.
 * Display state is controlled by the parent; this rail applies optimistic updates upward.
 */
export default function DiscoverActionRail({
  postId,
  stats,
  likedByMe,
  savedByMe,
  caption,
  returnPath = APP_ROUTES.home,
  onComment,
  onStatsChange,
  onFlagsChange,
}: DiscoverActionRailProps) {
  const router = useRouter();
  const [sharedPulse, setSharedPulse] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [likePending, setLikePending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [sharePending, setSharePending] = useState(false);
  const hintTimerRef = useRef<number | null>(null);
  const copiedTimerRef = useRef<number | null>(null);

  const applyRealtimeStats = useEffectEvent((next: Partial<DiscoverStats>) => {
    onStatsChange?.(next);
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`post-counters-${postId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "posts",
          filter: `id=eq.${postId}`,
        },
        (payload) => {
          const row = payload.new as {
            likes?: number;
            comments?: number;
            shares?: number;
            saves?: number;
            views?: number;
          };

          const patch: Partial<DiscoverStats> = {};

          if (typeof row.likes === "number") {
            patch.likes = row.likes;
          }
          if (typeof row.comments === "number") {
            patch.comments = row.comments;
          }
          if (typeof row.shares === "number") {
            patch.shares = row.shares;
          }
          if (typeof row.saves === "number") {
            patch.saves = row.saves;
          }
          if (typeof row.views === "number") {
            patch.views = row.views;
          }

          if (Object.keys(patch).length > 0) {
            applyRealtimeStats(patch);
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [postId]);

  useEffect(() => {
    return () => {
      if (hintTimerRef.current != null) {
        window.clearTimeout(hintTimerRef.current);
      }
      if (copiedTimerRef.current != null) {
        window.clearTimeout(copiedTimerRef.current);
      }
    };
  }, []);

  function showHint(message: string) {
    setHint(sanitizeUserFacingMessage(message, "Something went wrong."));

    if (hintTimerRef.current != null) {
      window.clearTimeout(hintTimerRef.current);
    }

    hintTimerRef.current = window.setTimeout(() => {
      setHint(null);
    }, 2200);
  }

  function showCopiedSuccess() {
    setLinkCopied(true);
    showHint("Link copied");

    if (copiedTimerRef.current != null) {
      window.clearTimeout(copiedTimerRef.current);
    }

    copiedTimerRef.current = window.setTimeout(() => {
      setLinkCopied(false);
    }, 2200);
  }

  function redirectToLogin() {
    router.push(
      `${APP_ROUTES.login}?next=${encodeURIComponent(returnPath || APP_ROUTES.home)}`
    );
  }

  function shareInput() {
    return {
      postId,
      title: "UMTUBA",
      text: caption?.trim() || "Check out this video on UMTUBA",
    };
  }

  async function recordShareAfterSuccess(outcome: SharePostOutcome) {
    if (outcome.method === "none") {
      if (outcome.message !== "Share cancelled.") {
        showHint(outcome.message);
      }
      return;
    }

    setSharedPulse(true);
    window.setTimeout(() => setSharedPulse(false), 420);

    if (outcome.method === "clipboard") {
      showCopiedSuccess();
    } else if (outcome.method === "whatsapp") {
      showHint("Opening WhatsApp");
    } else {
      showHint("Shared");
    }

    // Authoritative count from server — dedupe window prevents inflation.
    const result = await recordShareAction(postId, getOrCreateViewerKey());

    if (result.ok) {
      onStatsChange?.({ shares: result.shares });
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

    const previousLiked = likedByMe;
    const previousLikes = stats.likes;
    const nextLiked = !previousLiked;
    const nextLikes = Math.max(previousLikes + (nextLiked ? 1 : -1), 0);

    setLikePending(true);
    onFlagsChange?.({ likedByMe: nextLiked });
    onStatsChange?.({ likes: nextLikes });

    const result = await toggleLikeAction(postId);

    if (!result.ok) {
      onFlagsChange?.({ likedByMe: previousLiked });
      onStatsChange?.({ likes: previousLikes });

      if (result.requiresAuth) {
        redirectToLogin();
      } else {
        showHint(result.message);
      }

      setLikePending(false);
      return;
    }

    onFlagsChange?.({ likedByMe: result.liked });
    onStatsChange?.({ likes: result.likes });
    setLikePending(false);
  }

  async function handleSave() {
    if (savePending) {
      return;
    }

    const previousSaved = savedByMe;
    const previousSaves = stats.saves;
    const nextSaved = !previousSaved;
    const nextSaves = Math.max(previousSaves + (nextSaved ? 1 : -1), 0);

    setSavePending(true);
    onFlagsChange?.({ savedByMe: nextSaved });
    onStatsChange?.({ saves: nextSaves });

    const result = await toggleSaveAction(postId);

    if (!result.ok) {
      onFlagsChange?.({ savedByMe: previousSaved });
      onStatsChange?.({ saves: previousSaves });

      if (result.requiresAuth) {
        redirectToLogin();
      } else {
        showHint(result.message);
      }

      setSavePending(false);
      return;
    }

    onFlagsChange?.({ savedByMe: result.saved });
    onStatsChange?.({ saves: result.saves });
    setSavePending(false);
  }

  return (
    <div className="relative flex flex-col items-center gap-4 pb-1">
      {hint ? (
        <p
          className={`pointer-events-none absolute -left-40 top-0 max-w-[9.5rem] rounded-full border px-2.5 py-1 text-[10px] font-bold backdrop-blur-xl ${
            linkCopied
              ? "border-emerald-300/40 bg-emerald-400/15 text-emerald-100"
              : "border-white/15 bg-black/55 text-white/80"
          }`}
          role="status"
        >
          {linkCopied ? "✓ Link copied" : hint}
        </p>
      ) : null}

      <ActionButton
        label="Like"
        count={formatInteractionCount(stats.likes)}
        active={likedByMe}
        busy={likePending}
        disabled={likePending}
        onClick={() => void handleLike()}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 21s-7.2-4.35-9.6-8.4C.6 9.3 2.1 5.8 5.4 5.2c1.9-.35 3.7.5 4.8 2 1.1-1.5 2.9-2.35 4.8-2 3.3.6 4.8 4.1 3 7.4C19.2 16.65 12 21 12 21z" />
          </svg>
        }
      />

      <ActionButton
        label="Comment"
        count={formatInteractionCount(stats.comments)}
        onClick={() => onComment?.()}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 6.5A2.5 2.5 0 017.5 4h9A2.5 2.5 0 0119 6.5v7A2.5 2.5 0 0116.5 16H10l-4.5 3.2V16H7.5A2.5 2.5 0 015 13.5v-7z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
          </svg>
        }
      />

      <ActionButton
        label="Save"
        count={formatInteractionCount(stats.saves)}
        active={savedByMe}
        busy={savePending}
        disabled={savePending}
        onClick={() => void handleSave()}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M7 3h10a1 1 0 011 1v17l-6-3.5L6 21V4a1 1 0 011-1z" />
          </svg>
        }
      />

      <div className="relative">
        <ActionButton
          label="Share"
          count={formatInteractionCount(stats.shares)}
          active={sharedPulse || shareMenuOpen || linkCopied}
          onClick={() => void handleShareButtonClick()}
          icon={
            linkCopied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M5 12.5l4.5 4.5L19 7.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M14 6l6 6-6 6M20 12H9M10 6H7.5A2.5 2.5 0 005 8.5v7A2.5 2.5 0 007.5 18H10"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )
          }
        />

        <ShareMenu
          open={shareMenuOpen}
          disabled={sharePending}
          onClose={() => setShareMenuOpen(false)}
          onSelect={(target) => void handleShareTarget(target)}
        />
      </div>
    </div>
  );
}

type ActionButtonProps = {
  label: string;
  count?: string;
  active?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
};

function ActionButton({
  label,
  count,
  active = false,
  busy = false,
  disabled = false,
  onClick,
  icon,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="watch-focus-ring flex flex-col items-center gap-1 disabled:cursor-wait disabled:opacity-60"
      aria-label={label}
      aria-pressed={active || undefined}
      aria-busy={busy || undefined}
    >
      <span
        className={`watch-rail-btn flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md ${
          active ? "is-active" : ""
        }`}
      >
        {icon}
      </span>
      {count ? (
        <span className="text-[11px] font-bold text-white/80">{count}</span>
      ) : null}
    </button>
  );
}
