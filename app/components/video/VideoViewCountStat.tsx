"use client";

import { formatInteractionCount } from "../../lib/social/shareAndViews";
import { useTranslation } from "../i18n";

type VideoViewCountStatProps = {
  views: number;
  variant?: "rail" | "life" | "caption";
};

function EyeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M2.6 12s3.4-7 9.4-7 9.4 7 9.4 7-3.4 7-9.4 7-9.4-7-9.4-7z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * Non-interactive view count. Same compact number as like/comment/share.
 * Visible to everyone, including guests. 0 renders as "0".
 */
export default function VideoViewCountStat({
  views,
  variant = "rail",
}: VideoViewCountStatProps) {
  const { t } = useTranslation();
  const count = formatInteractionCount(views);
  const label = t("video.views.label", { values: { count } });

  if (variant === "caption") {
    return (
      <span
        className="inline-flex items-center gap-1 text-[11px] font-bold text-white/80"
        aria-label={label}
      >
        <EyeIcon size={13} />
        <span aria-hidden>{count}</span>
      </span>
    );
  }

  if (variant === "life") {
    return (
      <span
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white/5 px-3 py-2.5 text-sm font-bold text-white/80"
        aria-label={label}
      >
        <EyeIcon size={16} />
        <span aria-hidden>{count}</span>
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1" aria-label={label}>
      <span className="watch-rail-btn flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md">
        <EyeIcon />
      </span>
      <span className="text-[11px] font-bold text-white/80" aria-hidden>
        {count}
      </span>
    </div>
  );
}
