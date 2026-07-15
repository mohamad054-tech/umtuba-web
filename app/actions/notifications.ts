"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  getNotificationPreferences,
  getUnreadNotificationCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyAiCreatorInsight,
  notifyPostJourneySummary,
  notifyPostReachedCountry,
  notifyPostTrendingCountry,
  notifyPostViewMilestone,
  updateNotificationPreferences,
  type ActionResult,
  type AppNotification,
  type NotificationFilterCategory,
  type NotificationPreferences,
} from "../../lib/supabase/notifications";
import { parseNotificationFilter } from "../notifications/lib/notificationCategories";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(value: string, label: string): ActionResult<{ id: string }> {
  const trimmed = value.trim();
  if (!UUID_RE.test(trimmed)) {
    return { ok: false, message: `Invalid ${label}.` };
  }
  return { ok: true, id: trimmed };
}

function parsePostId(value: number | string): ActionResult<{ postId: number }> {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
    return { ok: false, message: "Invalid post id." };
  }
  return { ok: true, postId: n };
}

export async function listNotificationsAction(input?: {
  limit?: number;
  before?: string | null;
  category?: NotificationFilterCategory | string | null;
}): Promise<
  ActionResult<{ notifications: AppNotification[]; nextCursor: string | null }>
> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Please sign in to view notifications.",
      requiresAuth: true,
    };
  }

  const category = parseNotificationFilter(
    typeof input?.category === "string" ? input.category : "all"
  );

  const supabase = await createClient();
  return listNotifications(supabase, {
    limit: input?.limit,
    before: input?.before,
    category,
  });
}

export async function getUnreadNotificationCountAction(): Promise<
  ActionResult<{ count: number }>
> {
  const user = await getServerUser();
  if (!user) {
    return { ok: true, count: 0 };
  }

  const supabase = await createClient();
  return getUnreadNotificationCount(supabase);
}

export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult<{ done: true }>> {
  const parsed = parseUuid(notificationId, "notification");
  if (!parsed.ok) return parsed;

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return markNotificationRead(supabase, parsed.id);
}

export async function markAllNotificationsReadAction(): Promise<
  ActionResult<{ count: number }>
> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return markAllNotificationsRead(supabase);
}

export async function getNotificationPreferencesAction(): Promise<
  ActionResult<{ preferences: NotificationPreferences }>
> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return getNotificationPreferences(supabase);
}

export async function updateNotificationPreferencesAction(input: {
  journeyEnabled?: boolean;
  rewardsEnabled?: boolean;
  nearbyLiveEnabled?: boolean;
  aiInsightsEnabled?: boolean;
  socialEnabled?: boolean;
}): Promise<ActionResult<{ preferences: NotificationPreferences }>> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return updateNotificationPreferences(supabase, input);
}

export async function notifyPostReachedCountryAction(input: {
  postId: number | string;
  countryCode: string;
  countryName: string;
}): Promise<ActionResult<{ created: boolean; notificationId: string | null }>> {
  const post = parsePostId(input.postId);
  if (!post.ok) return post;

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return notifyPostReachedCountry(supabase, {
    postId: post.postId,
    countryCode: input.countryCode,
    countryName: input.countryName,
  });
}

export async function notifyPostTrendingCountryAction(input: {
  postId: number | string;
  countryCode: string;
  countryName: string;
}): Promise<ActionResult<{ created: boolean; notificationId: string | null }>> {
  const post = parsePostId(input.postId);
  if (!post.ok) return post;

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return notifyPostTrendingCountry(supabase, {
    postId: post.postId,
    countryCode: input.countryCode,
    countryName: input.countryName,
  });
}

export async function notifyPostViewMilestoneAction(input: {
  postId: number | string;
  views: number;
}): Promise<ActionResult<{ createdCount: number }>> {
  const post = parsePostId(input.postId);
  if (!post.ok) return post;

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return notifyPostViewMilestone(supabase, {
    postId: post.postId,
    views: input.views,
  });
}

export async function notifyPostJourneySummaryAction(
  postId: number | string
): Promise<ActionResult<{ created: boolean; notificationId: string | null }>> {
  const post = parsePostId(postId);
  if (!post.ok) return post;

  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  const supabase = await createClient();
  return notifyPostJourneySummary(supabase, post.postId);
}

export async function notifyAiCreatorInsightAction(input: {
  insightKey: string;
  title: string;
  body?: string | null;
  category?: string;
  metadata?: Record<string, unknown>;
}): Promise<ActionResult<{ created: boolean; notificationId: string | null }>> {
  const user = await getServerUser();
  if (!user) {
    return { ok: false, message: "Please sign in.", requiresAuth: true };
  }

  if (!input.insightKey.trim() || !input.title.trim()) {
    return { ok: false, message: "Insight key and title are required." };
  }

  const supabase = await createClient();
  return notifyAiCreatorInsight(supabase, {
    insightKey: input.insightKey.trim(),
    title: input.title.trim(),
    body: input.body,
    category: input.category,
    metadata: input.metadata,
  });
}
