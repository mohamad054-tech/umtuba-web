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

const TYPE_LABEL: Partial<Record<NotificationType, string>> = {
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
  learning_course_completed: "Learning",
  learning_announcement_posted: "Learning",
  learning_discussion_reply: "Learning",
  learning_qa_answered: "Learning",
  learning_live_session_scheduled: "Learning",
  learning_live_session_updated: "Learning",
  learning_live_session_cancelled: "Learning",
  commerce_order_created: "Commerce",
  commerce_payment_pending: "Commerce",
  commerce_payment_captured: "Commerce",
  commerce_payment_failed: "Commerce",
  commerce_order_confirmed: "Commerce",
  commerce_order_cancelled: "Commerce",
  commerce_fulfillment_ready: "Commerce",
  commerce_digital_access_granted: "Commerce",
  commerce_order_shipped: "Commerce",
  commerce_order_delivered: "Commerce",
  commerce_refund_requested: "Commerce",
  commerce_refund_completed: "Commerce",
  commerce_product_approved: "Commerce",
  commerce_product_rejected: "Commerce",
  commerce_seller_approved: "Commerce",
  commerce_seller_rejected: "Commerce",
  commerce_inventory_low: "Commerce",
  commerce_inventory_out: "Commerce",
  commerce_payout_ready: "Commerce",
  commerce_payout_blocked: "Commerce",
};

const TYPE_ICON: Partial<Record<NotificationType, string>> = {
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
  learning_course_completed: "✓",
  learning_announcement_posted: "📢",
  learning_discussion_reply: "💬",
  learning_qa_answered: "❓",
  learning_live_session_scheduled: "📅",
  learning_live_session_updated: "📅",
  learning_live_session_cancelled: "📅",
  commerce_order_created: "🛒",
  commerce_payment_pending: "🛒",
  commerce_payment_captured: "🛒",
  commerce_payment_failed: "🛒",
  commerce_order_confirmed: "🛒",
  commerce_order_cancelled: "🛒",
  commerce_fulfillment_ready: "🛒",
  commerce_digital_access_granted: "🛒",
  commerce_order_shipped: "🛒",
  commerce_order_delivered: "🛒",
  commerce_refund_requested: "🛒",
  commerce_refund_completed: "🛒",
  commerce_product_approved: "🛒",
  commerce_product_rejected: "🛒",
  commerce_seller_approved: "🛒",
  commerce_seller_rejected: "🛒",
  commerce_inventory_low: "🛒",
  commerce_inventory_out: "🛒",
  commerce_payout_ready: "🛒",
  commerce_payout_blocked: "🛒",
};

function labelForType(type: NotificationType): string {
  return TYPE_LABEL[type] ?? (type.startsWith("commerce_") ? "Commerce" : "Update");
}

function iconForType(type: NotificationType): string {
  return TYPE_ICON[type] ?? (type.startsWith("commerce_") ? "🛒" : "•");
}

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
            {flag || iconForType(notification.type) || initial}
          </div>
        )}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#080816] bg-[#12122a] text-[10px] text-white/80">
          {iconForType(notification.type)}
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
            {labelForType(notification.type)}
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
