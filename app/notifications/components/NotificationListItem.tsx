"use client";

import Link from "next/link";
import type {
  AppNotification,
  NotificationType,
} from "../../../lib/supabase/notifications";
import { formatRelativeTime } from "../lib/formatRelativeTime";
import {
  countryCodeToFlag,
  formatMilestoneValue,
  readMetaNumber,
  readMetaString,
} from "../lib/notificationMeta";

const TYPE_LABEL: Record<NotificationType, string> = {
  follow: "Follow",
  post_like: "Like",
  comment: "Comment",
  reply: "Reply",
  mention: "Mention",
  live_started: "Live",
  direct_message: "Message",
  post_reached_country: "Journey",
  post_trending_country: "Trending",
  post_milestone: "Milestone",
  post_journey_summary: "Journey",
  um_points_earned: "UM Points",
  reward_milestone: "Reward",
  referral_reward: "Referral",
  nearby_live_started: "Nearby",
  ai_creator_insight: "AI Insight",
  post_save: "Save",
  post_share: "Share",
};

const TYPE_ICON: Record<NotificationType, string> = {
  follow: "👤",
  post_like: "♥",
  comment: "💬",
  reply: "↩",
  mention: "@",
  live_started: "●",
  direct_message: "✉",
  post_reached_country: "✈",
  post_trending_country: "↗",
  post_milestone: "★",
  post_journey_summary: "◉",
  um_points_earned: "◆",
  reward_milestone: "◆",
  referral_reward: "🎉",
  nearby_live_started: "◎",
  ai_creator_insight: "✦",
  post_save: "☆",
  post_share: "↗",
};

type NotificationListItemProps = {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
};

export default function NotificationListItem({
  notification,
  onOpen,
}: NotificationListItemProps) {
  const actor = notification.actor;
  const href = notification.href?.trim() || null;
  const meta = notification.metadata;
  const countryCode = readMetaString(meta, "countryCode");
  const countryName = readMetaString(meta, "countryName");
  const city = readMetaString(meta, "city");
  const flag = countryCodeToFlag(countryCode);
  const points =
    readMetaNumber(meta, "points") ??
    readMetaNumber(meta, "pointsAwarded");
  const milestoneValue = formatMilestoneValue(
    meta.milestoneValue ?? meta.countryCount
  );
  const milestoneKind = readMetaString(meta, "milestoneKind");

  const initial =
    actor?.avatarInitial?.slice(0, 2).toUpperCase() ||
    notification.title.charAt(0).toUpperCase() ||
    "U";

  const className = `watch-focus-ring flex gap-3 rounded-2xl border px-3.5 py-3 transition ${
    notification.unread
      ? "border-blue-400/25 bg-blue-500/10 hover:bg-blue-500/15"
      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
  }`;

  const body = (
    <>
      <div className="relative shrink-0">
        {actor?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={actor.avatarUrl}
            alt=""
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/40 to-cyan-400/20 text-sm font-black text-white">
            {flag || TYPE_ICON[notification.type] || initial}
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#080816] bg-[#12122a] text-[10px] text-white/80">
          {TYPE_ICON[notification.type]}
        </span>
        {notification.unread ? (
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)]" />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-white/95">
            {flag && countryName ? (
              <span className="mr-1.5" aria-hidden>
                {flag}
              </span>
            ) : null}
            {notification.title}
          </p>
          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/35">
            {TYPE_LABEL[notification.type]}
          </span>
        </div>

        {notification.body ? (
          <p className="mt-0.5 line-clamp-2 text-sm text-white/55">
            {notification.body}
          </p>
        ) : null}

        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          {countryName ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-100/80">
              {flag ? `${flag} ` : ""}
              {countryName}
            </span>
          ) : null}
          {city && notification.type === "nearby_live_started" ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-100/80">
              {city}
            </span>
          ) : null}
          {milestoneValue ? (
            <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-100">
              {milestoneKind === "countries"
                ? `${milestoneValue} countries`
                : milestoneKind === "views"
                  ? `${milestoneValue} views`
                  : milestoneValue}
            </span>
          ) : null}
          {points != null &&
          (notification.type === "um_points_earned" ||
            notification.type === "reward_milestone" ||
            notification.type === "referral_reward") ? (
            <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-100">
              +{points.toLocaleString()} UM
            </span>
          ) : null}
          <span className="text-[11px] font-medium text-white/35">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>
      </div>
    </>
  );

  if (!href) {
    return (
      <button
        type="button"
        onClick={() => onOpen(notification)}
        className={`${className} w-full text-left`}
      >
        {body}
      </button>
    );
  }

  return (
    <Link href={href} onClick={() => onOpen(notification)} className={className}>
      {body}
    </Link>
  );
}
