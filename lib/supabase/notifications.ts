import type { SupabaseClient } from "@supabase/supabase-js";
import { enrichDirectMessageHref } from "../../app/messages/lib/threadState";

export type NotificationFilterCategory =
  | "all"
  | "social"
  | "journey"
  | "live"
  | "rewards"
  | "ai";

export type NotificationPreferences = {
  journeyEnabled: boolean;
  rewardsEnabled: boolean;
  nearbyLiveEnabled: boolean;
  aiInsightsEnabled: boolean;
  socialEnabled: boolean;
  updatedAt: string | null;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  journeyEnabled: true,
  rewardsEnabled: true,
  nearbyLiveEnabled: false,
  aiInsightsEnabled: true,
  socialEnabled: true,
  updatedAt: null,
};

export type ActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; message: string; requiresAuth?: boolean };

export type NotificationType =
  | "follow"
  | "post_like"
  | "comment"
  | "reply"
  | "mention"
  | "live_started"
  | "direct_message"
  | "post_reached_country"
  | "post_trending_country"
  | "post_milestone"
  | "post_journey_summary"
  | "um_points_earned"
  | "reward_milestone"
  | "nearby_live_started"
  | "ai_creator_insight"
  | "post_save"
  | "post_share"
  | "referral_reward";

export type NotificationActor = {
  id: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  avatarInitial: string;
};

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  href: string | null;
  metadata: Record<string, unknown>;
  dedupeKey: string | null;
  readAt: string | null;
  createdAt: string;
  actorId: string | null;
  actor: NotificationActor | null;
  unread: boolean;
};

const NOTIFICATION_TYPES = new Set<NotificationType>([
  "follow",
  "post_like",
  "comment",
  "reply",
  "mention",
  "live_started",
  "direct_message",
  "post_reached_country",
  "post_trending_country",
  "post_milestone",
  "post_journey_summary",
  "um_points_earned",
  "reward_milestone",
  "nearby_live_started",
  "ai_creator_insight",
  "post_save",
  "post_share",
  "referral_reward",
]);

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "");
    if (message.trim()) return message;
  }
  return fallback;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function parseActor(value: unknown): NotificationActor | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string") {
    return null;
  }

  return {
    id: row.id,
    username: typeof row.username === "string" ? row.username : null,
    displayName:
      typeof row.displayName === "string" && row.displayName.trim()
        ? row.displayName
        : "Someone",
    avatarUrl: typeof row.avatarUrl === "string" ? row.avatarUrl : null,
    avatarInitial:
      typeof row.avatarInitial === "string" && row.avatarInitial.trim()
        ? row.avatarInitial
        : "U",
  };
}

function parseNotification(value: unknown): AppNotification | null {
  const row = asRecord(value);
  if (!row || typeof row.id !== "string" || typeof row.type !== "string") {
    return null;
  }

  const type = row.type as NotificationType;
  if (!NOTIFICATION_TYPES.has(type)) {
    return null;
  }

  const createdAt =
    typeof row.createdAt === "string"
      ? row.createdAt
      : typeof row.created_at === "string"
        ? row.created_at
        : null;
  if (!createdAt) {
    return null;
  }

  const readAt =
    typeof row.readAt === "string"
      ? row.readAt
      : typeof row.read_at === "string"
        ? row.read_at
        : null;

  const dedupeKey =
    typeof row.dedupeKey === "string"
      ? row.dedupeKey
      : typeof row.dedupe_key === "string"
        ? row.dedupe_key
        : null;

  return {
    id: row.id,
    type,
    title: typeof row.title === "string" ? row.title : "Notification",
    body: typeof row.body === "string" ? row.body : null,
    entityType:
      typeof row.entityType === "string"
        ? row.entityType
        : typeof row.entity_type === "string"
          ? row.entity_type
          : null,
    entityId:
      typeof row.entityId === "string"
        ? row.entityId
        : typeof row.entity_id === "string"
          ? row.entity_id
          : null,
    href: enrichDirectMessageHref(
      typeof row.href === "string" ? row.href : null,
      type,
      asRecord(row.metadata) ?? {}
    ),
    metadata: asRecord(row.metadata) ?? {},
    dedupeKey,
    readAt,
    createdAt,
    actorId:
      typeof row.actorId === "string"
        ? row.actorId
        : typeof row.actor_id === "string"
          ? row.actor_id
          : null,
    actor: parseActor(row.actor),
    unread: !readAt,
  };
}

function parsePreferences(value: unknown): NotificationPreferences {
  const row = asRecord(value);
  if (!row) {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }

  return {
    journeyEnabled:
      typeof row.journeyEnabled === "boolean"
        ? row.journeyEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.journeyEnabled,
    rewardsEnabled:
      typeof row.rewardsEnabled === "boolean"
        ? row.rewardsEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.rewardsEnabled,
    nearbyLiveEnabled:
      typeof row.nearbyLiveEnabled === "boolean"
        ? row.nearbyLiveEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.nearbyLiveEnabled,
    aiInsightsEnabled:
      typeof row.aiInsightsEnabled === "boolean"
        ? row.aiInsightsEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.aiInsightsEnabled,
    socialEnabled:
      typeof row.socialEnabled === "boolean"
        ? row.socialEnabled
        : DEFAULT_NOTIFICATION_PREFERENCES.socialEnabled,
    updatedAt:
      typeof row.updatedAt === "string"
        ? row.updatedAt
        : typeof row.updated_at === "string"
          ? row.updated_at
          : null,
  };
}

export async function listNotifications(
  supabase: SupabaseClient,
  input?: {
    limit?: number;
    before?: string | null;
    category?: NotificationFilterCategory | null;
  }
): Promise<
  ActionResult<{ notifications: AppNotification[]; nextCursor: string | null }>
> {
  const limit = Math.max(1, Math.min(input?.limit ?? 20, 50));
  const { data, error } = await supabase.rpc("list_my_notifications", {
    p_limit: limit,
    p_before: input?.before ?? null,
    p_category: input?.category ?? "all",
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to load notifications."),
    };
  }

  const rows = Array.isArray(data) ? data : [];
  const notifications = rows
    .map(parseNotification)
    .filter((n): n is AppNotification => Boolean(n));

  const nextCursor =
    notifications.length >= limit
      ? notifications[notifications.length - 1]?.createdAt ?? null
      : null;

  return { ok: true, notifications, nextCursor };
}

export async function getUnreadNotificationCount(
  supabase: SupabaseClient
): Promise<ActionResult<{ count: number }>> {
  const { data, error } = await supabase.rpc("get_unread_notification_count");

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to load unread count."),
    };
  }

  const count = typeof data === "number" ? data : Number(data ?? 0);
  return { ok: true, count: Number.isFinite(count) ? count : 0 };
}

export async function markNotificationRead(
  supabase: SupabaseClient,
  notificationId: string
): Promise<ActionResult<{ done: true }>> {
  const { error } = await supabase.rpc("mark_notification_read", {
    p_id: notificationId,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to mark notification as read."),
    };
  }

  return { ok: true, done: true };
}

export async function markAllNotificationsRead(
  supabase: SupabaseClient
): Promise<ActionResult<{ count: number }>> {
  const { data, error } = await supabase.rpc("mark_all_notifications_read");

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to mark all as read."),
    };
  }

  const count = typeof data === "number" ? data : Number(data ?? 0);
  return { ok: true, count: Number.isFinite(count) ? count : 0 };
}


export async function getNotificationPreferences(
  supabase: SupabaseClient
): Promise<ActionResult<{ preferences: NotificationPreferences }>> {
  const { data, error } = await supabase.rpc("get_my_notification_preferences");

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to load notification preferences."),
    };
  }

  return { ok: true, preferences: parsePreferences(data) };
}

export async function updateNotificationPreferences(
  supabase: SupabaseClient,
  input: Partial<{
    journeyEnabled: boolean;
    rewardsEnabled: boolean;
    nearbyLiveEnabled: boolean;
    aiInsightsEnabled: boolean;
    socialEnabled: boolean;
  }>
): Promise<ActionResult<{ preferences: NotificationPreferences }>> {
  const { data, error } = await supabase.rpc(
    "update_my_notification_preferences",
    {
      p_journey_enabled: input.journeyEnabled ?? null,
      p_rewards_enabled: input.rewardsEnabled ?? null,
      p_nearby_live_enabled: input.nearbyLiveEnabled ?? null,
      p_ai_insights_enabled: input.aiInsightsEnabled ?? null,
      p_social_enabled: input.socialEnabled ?? null,
    }
  );

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(
        error,
        "Unable to update notification preferences."
      ),
    };
  }

  return { ok: true, preferences: parsePreferences(data) };
}

export async function notifyPostReachedCountry(
  supabase: SupabaseClient,
  input: { postId: number; countryCode: string; countryName: string }
): Promise<ActionResult<{ created: boolean; notificationId: string | null }>> {
  const { data, error } = await supabase.rpc("notify_post_reached_country", {
    p_post_id: input.postId,
    p_country_code: input.countryCode,
    p_country_name: input.countryName,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to record country reach."),
    };
  }

  const row = asRecord(data);
  return {
    ok: true,
    created: Boolean(row?.created),
    notificationId:
      typeof row?.notificationId === "string" ? row.notificationId : null,
  };
}

export async function notifyPostTrendingCountry(
  supabase: SupabaseClient,
  input: { postId: number; countryCode: string; countryName: string }
): Promise<ActionResult<{ created: boolean; notificationId: string | null }>> {
  const { data, error } = await supabase.rpc("notify_post_trending_country", {
    p_post_id: input.postId,
    p_country_code: input.countryCode,
    p_country_name: input.countryName,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to record trending country."),
    };
  }

  const row = asRecord(data);
  return {
    ok: true,
    created: Boolean(row?.created),
    notificationId:
      typeof row?.notificationId === "string" ? row.notificationId : null,
  };
}

export async function notifyPostViewMilestone(
  supabase: SupabaseClient,
  input: { postId: number; views: number }
): Promise<ActionResult<{ createdCount: number }>> {
  const { data, error } = await supabase.rpc("notify_post_view_milestone", {
    p_post_id: input.postId,
    p_views: input.views,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to emit view milestones."),
    };
  }

  const row = asRecord(data);
  const createdCount = Number(row?.createdCount ?? 0);
  return {
    ok: true,
    createdCount: Number.isFinite(createdCount) ? createdCount : 0,
  };
}

export async function notifyPostJourneySummary(
  supabase: SupabaseClient,
  postId: number
): Promise<ActionResult<{ created: boolean; notificationId: string | null }>> {
  const { data, error } = await supabase.rpc("notify_post_journey_summary", {
    p_post_id: postId,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to emit journey summary."),
    };
  }

  const row = asRecord(data);
  return {
    ok: true,
    created: Boolean(row?.created),
    notificationId:
      typeof row?.notificationId === "string" ? row.notificationId : null,
  };
}

export async function notifyAiCreatorInsight(
  supabase: SupabaseClient,
  input: {
    insightKey: string;
    title: string;
    body?: string | null;
    category?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<ActionResult<{ created: boolean; notificationId: string | null }>> {
  const { data, error } = await supabase.rpc("notify_ai_creator_insight", {
    p_insight_key: input.insightKey,
    p_title: input.title,
    p_body: input.body ?? null,
    p_category: input.category ?? "general",
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to create AI insight."),
    };
  }

  const row = asRecord(data);
  return {
    ok: true,
    created: Boolean(row?.created),
    notificationId:
      typeof row?.notificationId === "string" ? row.notificationId : null,
  };
}

/** Map a realtime INSERT/UPDATE row into AppNotification (actor may be sparse). */
export function mapNotificationRow(
  row: Record<string, unknown>
): AppNotification | null {
  return parseNotification({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    entityType: row.entity_type ?? row.entityType,
    entityId: row.entity_id ?? row.entityId,
    href: row.href,
    metadata: row.metadata,
    dedupeKey: row.dedupe_key ?? row.dedupeKey,
    readAt: row.read_at ?? row.readAt,
    createdAt: row.created_at ?? row.createdAt,
    actorId: row.actor_id ?? row.actorId,
    actor: row.actor ?? null,
  });
}

/** Exported for unit tests — validates type allowlist parsing. */
export function parseNotificationForTest(
  value: unknown
): AppNotification | null {
  return parseNotification(value);
}
