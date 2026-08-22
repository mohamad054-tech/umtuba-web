"use client";

import type { ActivityTierProgress } from "../../../lib/activity-tiers";
import { useTranslation } from "../i18n";
import { activityTierTitleKey } from "../../../lib/i18n/profileChrome";
import { formatNumber } from "../../../lib/i18n";

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
  const { locale, t } = useTranslation();
  const { tier, nextTier, progressPercent, pointsToNext, score } = progress;
  const currentTitle = t(activityTierTitleKey(tier.id));
  const nextTitle = nextTier ? t(activityTierTitleKey(nextTier.id)) : "";

  return (
    <div className={className}>
      {showDetails ? (
        <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-[11px] font-bold text-white/45">
          <span>
            {nextTier
              ? t("profile.progressTo", { values: { tier: nextTitle } })
              : t("profile.maxTier", { values: { tier: currentTitle } })}
          </span>
          <span className="tabular-nums text-white/55">
            {nextTier
              ? t("profile.pointsToGo", {
                  values: {
                    count: formatNumber(locale, pointsToNext),
                    percent: formatNumber(locale, progressPercent),
                  },
                })
              : t("profile.scoreOnly", {
                  values: { score: formatNumber(locale, score) },
                })}
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
            ? t("profile.progressAria", {
                values: {
                  percent: formatNumber(locale, progressPercent),
                  tier: nextTitle,
                },
              })
            : t("profile.tierCompleteAria", { values: { tier: currentTitle } })
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
