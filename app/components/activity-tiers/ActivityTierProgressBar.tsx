"use client";

import type { ActivityTierProgress } from "../../../lib/activity-tiers";

type ActivityTierProgressBarProps = {
  progress: ActivityTierProgress;
  className?: string;
  /** Show numeric “X to next” helper text. */
  showDetails?: boolean;
};

export default function ActivityTierProgressBar({
  progress,
  className = "",
  showDetails = true,
}: ActivityTierProgressBarProps) {
  const { tier, nextTier, progressPercent, pointsToNext, score } = progress;

  return (
    <div className={className}>
      {showDetails ? (
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-[11px] font-bold text-white/45">
          <span>
            {nextTier
              ? `Progress to ${nextTier.displayTitle}`
              : `${tier.displayTitle} — max tier`}
          </span>
          <span className="tabular-nums text-white/55">
            {nextTier
              ? `${pointsToNext.toLocaleString()} to go · ${progressPercent}%`
              : `${score.toLocaleString()} score`}
          </span>
        </div>
      ) : null}
      <div
        className="h-2 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progressPercent}
        aria-label={
          nextTier
            ? `${progressPercent}% toward ${nextTier.displayTitle}`
            : `${tier.displayTitle} tier complete`
        }
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-[width] duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
