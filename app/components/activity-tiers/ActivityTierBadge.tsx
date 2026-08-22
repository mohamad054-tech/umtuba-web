"use client";

import {
  activityTierAccentClasses,
  type ActivityTierDefinition,
} from "../../../lib/activity-tiers";
import { useTranslation } from "../i18n";
import {
  activityTierLabelKey,
  activityTierTitleKey,
} from "../../../lib/i18n/profileChrome";

type ActivityTierBadgeProps = {
  tier: ActivityTierDefinition;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
};

export default function ActivityTierBadge({
  tier,
  size = "md",
  showLabel = true,
  className = "",
}: ActivityTierBadgeProps) {
  const { t } = useTranslation();
  const label = t(activityTierLabelKey(tier.id));
  const title = t(activityTierTitleKey(tier.id));
  const accent = activityTierAccentClasses(tier.accent);
  const sizeClass =
    size === "sm"
      ? "h-7 gap-1 px-2 text-[10px]"
      : size === "lg"
        ? "h-10 gap-2 px-3.5 text-sm"
        : "h-8 gap-1.5 px-2.5 text-[11px]";

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border font-bold ${accent.border} ${accent.bg} ${accent.text} ${sizeClass} ${className}`}
      title={title}
    >
      <span aria-hidden className="shrink-0 opacity-90">
        {tier.icon}
      </span>
      {showLabel ? (
        <span className="truncate">{label}</span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </span>
  );
}
