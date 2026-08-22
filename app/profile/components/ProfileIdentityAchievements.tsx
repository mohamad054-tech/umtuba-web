"use client";

import { useTranslation } from "../../components/i18n";
import {
  normalizeAchievementMedals,
  shouldShowIdentityAchievements,
} from "../lib/profileIdentityAchievements";
import type { ProfileView } from "../types";

type ProfileIdentityAchievementsProps = {
  profile: ProfileView;
  /** When Hero collapses, medals hide with the identity zone (§4 / §15). */
  isCollapsed?: boolean;
  /** Overflow "+N" opens About where the full Achievements section lives. */
  onOpenAbout?: () => void;
};

/**
 * Creator Identity Achievements V1 — optional small medals under Hero.
 * Does not invent verification marks or game-achievement systems.
 */
export default function ProfileIdentityAchievements({
  profile,
  isCollapsed = false,
  onOpenAbout,
}: ProfileIdentityAchievementsProps) {
  const { t } = useTranslation();
  const medals = normalizeAchievementMedals(profile.about.achievements);

  if (
    isCollapsed ||
    !shouldShowIdentityAchievements(profile.about.achievements)
  ) {
    return null;
  }

  return (
    <ul
      className="flex flex-wrap items-center gap-2"
      aria-label={t("profile.achievementsAria")}
    >
      {medals.visible.map((label) => (
        <li
          key={`achievement-${label.toLowerCase()}`}
          className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-[11px] font-bold text-amber-100"
        >
          {label}
        </li>
      ))}
      {medals.overflowCount > 0 ? (
        <li>
          {onOpenAbout ? (
            <button
              type="button"
              onClick={onOpenAbout}
              className="watch-focus-ring rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-white/55"
              aria-label={t("profile.moreAchievementsAria", {
                values: { count: String(medals.overflowCount) },
              })}
            >
              +{medals.overflowCount}
            </button>
          ) : (
            <span className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-white/55">
              +{medals.overflowCount}
            </span>
          )}
        </li>
      ) : null}
    </ul>
  );
}
