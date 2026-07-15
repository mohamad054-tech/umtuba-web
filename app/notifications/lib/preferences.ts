import type { NotificationPreferences } from "../../../lib/supabase/notifications";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "../../../lib/supabase/notifications";

export type { NotificationPreferences };
export { DEFAULT_NOTIFICATION_PREFERENCES };

export type NotificationPreferenceKey = Exclude<
  keyof NotificationPreferences,
  "updatedAt"
>;

export const NOTIFICATION_PREFERENCE_FIELDS: {
  key: NotificationPreferenceKey;
  label: string;
  description: string;
}[] = [
  {
    key: "socialEnabled",
    label: "Social",
    description: "Follows, likes, comments, replies, mentions, and messages.",
  },
  {
    key: "journeyEnabled",
    label: "Post Journey",
    description: "Country reach, trending, milestones, and journey summaries.",
  },
  {
    key: "rewardsEnabled",
    label: "Rewards",
    description: "UM Points earned and reward milestones.",
  },
  {
    key: "nearbyLiveEnabled",
    label: "Nearby live",
    description:
      "Alert when a live starts in your approximate city. Exact location is never shared.",
  },
  {
    key: "aiInsightsEnabled",
    label: "AI insights",
    description: "Creator performance tips and momentum alerts.",
  },
];

export function mergeNotificationPreferences(
  partial: Partial<NotificationPreferences> | null | undefined
): NotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...partial,
    nearbyLiveEnabled:
      partial?.nearbyLiveEnabled ??
      DEFAULT_NOTIFICATION_PREFERENCES.nearbyLiveEnabled,
  };
}

export function preferenceAllowsType(
  prefs: NotificationPreferences,
  type: string
): boolean {
  switch (type) {
    case "follow":
    case "post_like":
    case "comment":
    case "reply":
    case "mention":
    case "direct_message":
    case "live_started":
    case "post_save":
    case "post_share":
      return prefs.socialEnabled;
    case "post_reached_country":
    case "post_trending_country":
    case "post_milestone":
    case "post_journey_summary":
      return prefs.journeyEnabled;
    case "um_points_earned":
    case "reward_milestone":
      return prefs.rewardsEnabled;
    case "nearby_live_started":
      return prefs.nearbyLiveEnabled;
    case "ai_creator_insight":
      return prefs.aiInsightsEnabled;
    default:
      return true;
  }
}
