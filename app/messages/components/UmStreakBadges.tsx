"use client";

import { useTranslation } from "../../components/i18n";
import type { UmStreakViewerView } from "../types";

const BADGE_KEYS = {
  3: "umStreak.badge3",
  7: "umStreak.badge7",
  30: "umStreak.badge30",
  100: "umStreak.badge100",
  365: "umStreak.badge365",
} as const;

export default function UmStreakBadges({
  streak,
}: {
  streak: UmStreakViewerView;
}) {
  const { t } = useTranslation();

  return (
    <ul
      className="flex flex-wrap gap-2"
      aria-label={t("umStreak.badges")}
    >
      {streak.badges.map((badge) => (
        <li
          key={badge.days}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${
            badge.earned
              ? "border-amber-300/50 bg-amber-400/15 text-amber-100"
              : "border-white/10 bg-white/5 text-white/40"
          }`}
        >
          {t(BADGE_KEYS[badge.days])}
        </li>
      ))}
    </ul>
  );
}
