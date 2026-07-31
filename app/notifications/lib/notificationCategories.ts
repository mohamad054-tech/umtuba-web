import type { NotificationFilterCategory } from "../../../lib/supabase/notifications";

export type { NotificationFilterCategory };

export const NOTIFICATION_FILTERS: {
  id: NotificationFilterCategory;
  label: string;
}[] = [
  { id: "all", label: "All" },
  { id: "social", label: "Social" },
  { id: "journey", label: "Journey" },
  { id: "live", label: "Live" },
  { id: "rewards", label: "Rewards" },
  { id: "ai", label: "AI" },
  { id: "commerce", label: "Commerce" },
];

const SOCIAL = new Set([
  "follow",
  "post_like",
  "comment",
  "reply",
  "mention",
  "direct_message",
  "post_save",
  "post_share",
]);

const JOURNEY = new Set([
  "post_reached_country",
  "post_trending_country",
  "post_milestone",
  "post_journey_summary",
]);

const LIVE = new Set(["live_started", "nearby_live_started"]);

const REWARDS = new Set(["um_points_earned", "reward_milestone", "referral_reward"]);

const AI = new Set(["ai_creator_insight"]);

const COMMERCE = new Set([
  "commerce_order_created",
  "commerce_payment_pending",
  "commerce_payment_captured",
  "commerce_payment_failed",
  "commerce_order_confirmed",
  "commerce_order_cancelled",
  "commerce_fulfillment_ready",
  "commerce_digital_access_granted",
  "commerce_order_shipped",
  "commerce_order_delivered",
  "commerce_refund_requested",
  "commerce_refund_completed",
  "commerce_refund_rejected",
  "commerce_refund_failed",
  "commerce_product_approved",
  "commerce_product_rejected",
  "commerce_seller_approved",
  "commerce_seller_rejected",
  "commerce_inventory_low",
  "commerce_inventory_out",
  "commerce_payout_ready",
  "commerce_payout_blocked",
]);

export function categoryForNotificationType(type: string): NotificationFilterCategory {
  if (SOCIAL.has(type)) return "social";
  if (JOURNEY.has(type)) return "journey";
  if (LIVE.has(type)) return "live";
  if (REWARDS.has(type)) return "rewards";
  if (AI.has(type)) return "ai";
  if (COMMERCE.has(type) || type.startsWith("commerce_")) return "commerce";
  return "all";
}

export function notificationMatchesFilter(
  type: string,
  category: NotificationFilterCategory
): boolean {
  if (category === "all") return true;
  return categoryForNotificationType(type) === category;
}

export function parseNotificationFilter(
  value: string | null | undefined
): NotificationFilterCategory {
  const v = (value ?? "all").trim().toLowerCase();
  if (
    v === "social" ||
    v === "journey" ||
    v === "live" ||
    v === "rewards" ||
    v === "ai" ||
    v === "commerce"
  ) {
    return v;
  }
  return "all";
}
