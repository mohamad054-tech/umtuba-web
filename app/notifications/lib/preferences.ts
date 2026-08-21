import type { TranslationKey } from "../../../lib/i18n";
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
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
}[] = [
  {
    key: "socialEnabled",
    labelKey: "settings.pref.social",
    descriptionKey: "settings.pref.socialHint",
  },
  {
    key: "journeyEnabled",
    labelKey: "settings.pref.journey",
    descriptionKey: "settings.pref.journeyHint",
  },
  {
    key: "rewardsEnabled",
    labelKey: "settings.pref.rewards",
    descriptionKey: "settings.pref.rewardsHint",
  },
  {
    key: "nearbyLiveEnabled",
    labelKey: "settings.pref.nearbyLive",
    descriptionKey: "settings.pref.nearbyLiveHint",
  },
  {
    key: "aiInsightsEnabled",
    labelKey: "settings.pref.aiInsights",
    descriptionKey: "settings.pref.aiInsightsHint",
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
    case "referral_reward":
      return prefs.rewardsEnabled;
    case "nearby_live_started":
      return prefs.nearbyLiveEnabled;
    case "ai_creator_insight":
      return prefs.aiInsightsEnabled;
    default:
      return true;
  }
}
