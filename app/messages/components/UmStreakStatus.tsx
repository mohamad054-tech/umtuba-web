"use client";

import { useTranslation } from "../../components/i18n";
import type { UmStreakViewerView } from "../types";

type UmStreakStatusProps = {
  streak: UmStreakViewerView;
  compact?: boolean;
};

export default function UmStreakStatus({
  streak,
  compact = false,
}: UmStreakStatusProps) {
  const { t } = useTranslation();
  const label =
    streak.state === "started"
      ? t("umStreak.started")
      : streak.state === "active_today"
        ? t("umStreak.activeToday")
        : streak.state === "waiting_for_friend"
          ? t("umStreak.waitingForFriend")
          : streak.state === "you_need_to_reply"
            ? t("umStreak.youStillNeedToReply")
            : streak.state === "at_risk"
              ? t("umStreak.atRisk")
              : t("umStreak.title");

  if (streak.currentStreak <= 0 && streak.state === "none") {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-300/30 bg-black/60 px-2.5 py-1 text-amber-200 ${
        compact ? "text-[11px]" : "text-xs"
      }`}
      role="status"
      aria-label={`${t("umStreak.title")} ${streak.currentStreak}. ${label}`}
    >
      <span aria-hidden="true">🔥</span>
      <span className="font-black tabular-nums">{streak.currentStreak}</span>
      {!compact ? (
        <span className="max-w-[12rem] truncate font-medium text-amber-100/80">
          {label}
        </span>
      ) : null}
    </div>
  );
}
