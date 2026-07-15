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

const REWARDS = new Set(["um_points_earned", "reward_milestone"]);

const AI = new Set(["ai_creator_insight"]);

export function categoryForNotificationType(type: string): NotificationFilterCategory {
  if (SOCIAL.has(type)) return "social";
  if (JOURNEY.has(type)) return "journey";
  if (LIVE.has(type)) return "live";
  if (REWARDS.has(type)) return "rewards";
  if (AI.has(type)) return "ai";
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
    v === "ai"
  ) {
    return v;
  }
  return "all";
}
