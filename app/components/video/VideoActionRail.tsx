"use client";

import { useState, type ReactNode } from "react";
import type { WatchPanelId } from "./watchTypes";

type VideoActionRailProps = {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  onOpenPanel: (panel: Exclude<WatchPanelId, null>) => void;
};

/**
 * Local demo interactions only — never persisted to Supabase.
 */
export default function VideoActionRail({
  likes,
  comments,
  shares,
  saves,
  onOpenPanel,
}: VideoActionRailProps) {
  const [localLikes, setLocalLikes] = useState(likes);
  const [liked, setLiked] = useState(false);
  const [localSaves, setLocalSaves] = useState(saves);
  const [saved, setSaved] = useState(false);
  const [sharedPulse, setSharedPulse] = useState(false);

  function handleLike() {
    setLiked((wasLiked) => {
      const next = !wasLiked;
      setLocalLikes(likes + (next ? 1 : 0));
      return next;
    });
  }

  function handleSave() {
    setSaved((wasSaved) => {
      const next = !wasSaved;
      setLocalSaves(saves + (next ? 1 : 0));
      return next;
    });
  }

  function handleShare() {
    setSharedPulse(true);
    window.setTimeout(() => setSharedPulse(false), 420);
  }

  return (
    <div className="flex flex-col items-center gap-4 pb-1">
      <ActionButton
        label="Like"
        count={localLikes}
        active={liked}
        onClick={handleLike}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 21s-7.2-4.35-9.6-8.4C.6 9.3 2.1 5.8 5.4 5.2c1.9-.35 3.7.5 4.8 2 1.1-1.5 2.9-2.35 4.8-2 3.3.6 4.8 4.1 3 7.4C19.2 16.65 12 21 12 21z" />
          </svg>
        }
      />

      <ActionButton
        label="Comment"
        count={comments}
        onClick={() => onOpenPanel("comments")}
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
        label="Share"
        count={shares}
        active={sharedPulse}
        onClick={handleShare}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M14 6l6 6-6 6M20 12H9M10 6H7.5A2.5 2.5 0 005 8.5v7A2.5 2.5 0 007.5 18H10"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        }
      />

      <ActionButton
        label="Save"
        count={localSaves}
        active={saved}
        onClick={handleSave}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M7 3h10a1 1 0 011 1v17l-6-3.5L6 21V4a1 1 0 011-1z" />
          </svg>
        }
      />

      <ActionButton
        label="UConnect"
        onClick={() => onOpenPanel("uconnect")}
        icon={
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M8 12a3 3 0 100-6 3 3 0 000 6zM16 12a3 3 0 100-6 3 3 0 000 6zM4.5 19a3.5 3.5 0 017 0M12.5 19a3.5 3.5 0 017 0"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        }
      />
    </div>
  );
}

type ActionButtonProps = {
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
  icon: ReactNode;
};

function ActionButton({
  label,
  count,
  active = false,
  onClick,
  icon,
}: ActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="watch-focus-ring flex flex-col items-center gap-1"
      aria-label={label}
      aria-pressed={active || undefined}
    >
      <span
        className={`watch-rail-btn flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md ${
          active ? "is-active" : ""
        }`}
      >
        {icon}
      </span>
      {typeof count === "number" ? (
        <span className="text-[11px] font-bold text-white/80">{count}</span>
      ) : (
        <span className="text-[10px] font-bold uppercase tracking-wide text-white/55">
          {label}
        </span>
      )}
    </button>
  );
}
