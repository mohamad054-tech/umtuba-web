import type { SupabaseClient } from "@supabase/supabase-js";
import {
  STORIES_BUCKET,
  STORY_SIGNED_URL_TTL_SECONDS,
} from "./constants";
import { STORY_ERRORS, storyUserMessage } from "./errors";
import { filterActiveStories, isStoryActive } from "./expiry";
import {
  isOwnedStoryPath,
  validateStoryCaption,
  validateStoryFile,
} from "./validation";
import type {
  CreateStoryInput,
  StoryItem,
  StoryMediaType,
  StoryOwnerProfile,
  StoryRailGroup,
  StoryRow,
  StoryViewerRow,
} from "./types";

type ProfileLite = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  avatar_initial: string | null;
};

function mapOwner(row: ProfileLite | null | undefined, fallbackId: string): StoryOwnerProfile {
  return {
    id: row?.id ?? fallbackId,
    username: row?.username ?? null,
    full_name: row?.full_name ?? null,
    avatar_url: row?.avatar_url ?? null,
    avatar_initial: (row?.avatar_initial || "U").slice(0, 2).toUpperCase(),
  };
}

function mapStoryRow(
  row: StoryRow,
  owner: StoryOwnerProfile,
  viewedByMe: boolean,
  mediaUrl: string | null,
  viewCount?: number
): StoryItem {
  // Intentionally omit media_path — clients receive signed mediaUrl only.
  return {
    id: row.id,
    ownerId: row.owner_id,
    mediaType: row.media_type,
    caption: row.caption,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    mediaUrl,
    owner,
    viewedByMe,
    viewCount,
  };
}

export async function createStorySignedUrl(
  supabase: SupabaseClient,
  mediaPath: string
): Promise<string | null> {
  const trimmed = mediaPath.trim();
  if (!trimmed) return null;
  const { data, error } = await supabase.storage
    .from(STORIES_BUCKET)
    .createSignedUrl(trimmed, STORY_SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error("createStorySignedUrl error:", error);
    return null;
  }
  return data.signedUrl;
}

export async function deleteOwnedStoryStorageObject(
  supabase: SupabaseClient,
  userId: string,
  mediaPath: string
): Promise<void> {
  if (!isOwnedStoryPath(userId, mediaPath)) return;
  const { error } = await supabase.storage
    .from(STORIES_BUCKET)
    .remove([mediaPath]);
  if (error) {
    console.error("deleteOwnedStoryStorageObject error:", error);
  }
}

export type CreateStoryResult =
  | { ok: true; story: StoryItem }
  | { ok: false; message: string; code?: "auth_required" | "create_failed" };

export async function insertStoryForUser(
  supabase: SupabaseClient,
  userId: string,
  input: CreateStoryInput
): Promise<CreateStoryResult> {
  const path = input.mediaPath.trim();
  if (!isOwnedStoryPath(userId, path)) {
    await deleteOwnedStoryStorageObject(supabase, userId, path);
    return { ok: false, message: STORY_ERRORS.invalidMedia, code: "create_failed" };
  }

  const fileCheck = validateStoryFile({
    mimeType: input.mimeType,
    byteSize: input.byteSize,
  });
  if (!fileCheck.ok || fileCheck.mediaType !== input.mediaType) {
    await deleteOwnedStoryStorageObject(supabase, userId, path);
    return {
      ok: false,
      message: fileCheck.ok ? STORY_ERRORS.invalidMedia : fileCheck.message,
      code: "create_failed",
    };
  }

  const captionCheck = validateStoryCaption(input.caption);
  if (!captionCheck.ok) {
    await deleteOwnedStoryStorageObject(supabase, userId, path);
    return { ok: false, message: captionCheck.message, code: "create_failed" };
  }

  // Verify object is readable (owned) before insert.
  const probe = await createStorySignedUrl(supabase, path);
  if (!probe) {
    await deleteOwnedStoryStorageObject(supabase, userId, path);
    return { ok: false, message: STORY_ERRORS.uploadFailed, code: "create_failed" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, avatar_initial")
    .eq("id", userId)
    .maybeSingle();

  // expires_at is enforced by DB trigger; placeholder required by NOT NULL.
  const placeholderExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("stories")
    .insert({
      owner_id: userId,
      media_path: path,
      media_type: input.mediaType as StoryMediaType,
      caption: captionCheck.caption,
      expires_at: placeholderExpires,
    })
    .select(
      "id, owner_id, media_path, media_type, caption, created_at, expires_at"
    )
    .single();

  if (error || !data) {
    console.error("insertStoryForUser error:", error);
    await deleteOwnedStoryStorageObject(supabase, userId, path);
    return {
      ok: false,
      message: storyUserMessage(error?.message, STORY_ERRORS.createFailed),
      code: "create_failed",
    };
  }

  const row = data as StoryRow;
  return {
    ok: true,
    story: mapStoryRow(row, mapOwner(profile as ProfileLite | null, userId), true, probe, 0),
  };
}

export type DeleteStoryResult =
  | { ok: true }
  | { ok: false; message: string; code?: "auth_required" | "not_owner" | "delete_failed" };

export async function deleteStoryForOwner(
  supabase: SupabaseClient,
  userId: string,
  storyId: string
): Promise<DeleteStoryResult> {
  const { data: existing, error: loadError } = await supabase
    .from("stories")
    .select("id, owner_id, media_path")
    .eq("id", storyId)
    .maybeSingle();

  if (loadError) {
    console.error("deleteStoryForOwner load error:", loadError);
    return { ok: false, message: STORY_ERRORS.deleteFailed, code: "delete_failed" };
  }
  if (!existing) {
    return { ok: false, message: STORY_ERRORS.notFound, code: "delete_failed" };
  }
  if (existing.owner_id !== userId) {
    return { ok: false, message: STORY_ERRORS.notOwner, code: "not_owner" };
  }

  const { error } = await supabase.from("stories").delete().eq("id", storyId);
  if (error) {
    console.error("deleteStoryForOwner error:", error);
    return {
      ok: false,
      message: storyUserMessage(error.message, STORY_ERRORS.deleteFailed),
      code: "delete_failed",
    };
  }

  await deleteOwnedStoryStorageObject(supabase, userId, existing.media_path as string);
  return { ok: true };
}

export type ListActiveStoriesResult =
  | { ok: true; groups: StoryRailGroup[] }
  | { ok: false; message: string };

/**
 * Active stories for the viewer: own + followed authors.
 * Expired rows are filtered in-app even if RLS already gates followers.
 */
export async function listActiveStoryGroups(
  supabase: SupabaseClient,
  viewerId: string
): Promise<ListActiveStoriesResult> {
  const nowIso = new Date().toISOString();

  const { data: followingRows, error: followError } = await supabase
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", viewerId);

  if (followError) {
    console.error("listActiveStoryGroups follows error:", followError);
    return { ok: false, message: STORY_ERRORS.loadFailed };
  }

  const ownerIds = new Set<string>([viewerId]);
  for (const row of followingRows ?? []) {
    if (typeof row.following_id === "string") {
      ownerIds.add(row.following_id);
    }
  }

  const ownerIdList = [...ownerIds];

  const { data: storyRows, error: storiesError } = await supabase
    .from("stories")
    .select("id, owner_id, media_path, media_type, caption, created_at, expires_at")
    .in("owner_id", ownerIdList)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: true });

  if (storiesError) {
    console.error("listActiveStoryGroups stories error:", storiesError);
    return { ok: false, message: STORY_ERRORS.loadFailed };
  }

  const rows = (storyRows ?? []) as StoryRow[];
  const activeRows = rows.filter((r) => isStoryActive(r.expires_at));

  if (activeRows.length === 0) {
    return { ok: true, groups: [] };
  }

  const storyIds = activeRows.map((r) => r.id);
  const profileIds = [...new Set(activeRows.map((r) => r.owner_id))];
  const ownStoryIds = activeRows
    .filter((r) => r.owner_id === viewerId)
    .map((r) => r.id);

  const profilesPromise = supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, avatar_initial")
    .in("id", profileIds);

  const viewsPromise =
    storyIds.length > 0
      ? supabase
          .from("story_views")
          .select("story_id")
          .eq("viewer_id", viewerId)
          .in("story_id", storyIds)
      : Promise.resolve({ data: [] as { story_id: string }[] });

  const ownCountsPromise =
    ownStoryIds.length > 0
      ? supabase
          .from("story_views")
          .select("story_id")
          .in("story_id", ownStoryIds)
      : Promise.resolve({ data: [] as { story_id: string }[] });

  const [{ data: profiles }, { data: viewRows }, { data: ownViewCounts }] =
    await Promise.all([profilesPromise, viewsPromise, ownCountsPromise]);

  const profileMap = new Map<string, ProfileLite>();
  for (const p of (profiles ?? []) as ProfileLite[]) {
    profileMap.set(p.id, p);
  }

  const viewedSet = new Set(
    (viewRows ?? []).map((v) => v.story_id as string).filter(Boolean)
  );

  const viewCountMap = new Map<string, number>();
  for (const v of ownViewCounts ?? []) {
    const sid = v.story_id as string;
    viewCountMap.set(sid, (viewCountMap.get(sid) ?? 0) + 1);
  }

  const signedUrls = await Promise.all(
    activeRows.map((row) => createStorySignedUrl(supabase, row.media_path))
  );

  const items: StoryItem[] = activeRows.map((row, index) =>
    mapStoryRow(
      row,
      mapOwner(profileMap.get(row.owner_id), row.owner_id),
      viewedSet.has(row.id) || row.owner_id === viewerId,
      signedUrls[index] ?? null,
      row.owner_id === viewerId ? (viewCountMap.get(row.id) ?? 0) : undefined
    )
  );

  const activeItems = filterActiveStories(items);
  const byOwner = new Map<string, StoryItem[]>();
  for (const item of activeItems) {
    const list = byOwner.get(item.ownerId) ?? [];
    list.push(item);
    byOwner.set(item.ownerId, list);
  }

  const groups: StoryRailGroup[] = [];
  for (const [ownerId, stories] of byOwner) {
    const sorted = [...stories].sort(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)
    );
    const owner = sorted[0]?.owner ?? mapOwner(profileMap.get(ownerId), ownerId);
    const hasUnread = sorted.some((s) => !s.viewedByMe);
    const latestCreatedAt = sorted.reduce(
      (max, s) => (Date.parse(s.createdAt) > Date.parse(max) ? s.createdAt : max),
      sorted[0]!.createdAt
    );
    groups.push({
      ownerId,
      owner,
      stories: sorted,
      hasUnread,
      latestCreatedAt,
      isOwn: ownerId === viewerId,
    });
  }

  // Own group first, then unread, then recent.
  groups.sort((a, b) => {
    if (a.isOwn !== b.isOwn) return a.isOwn ? -1 : 1;
    if (a.hasUnread !== b.hasUnread) return a.hasUnread ? -1 : 1;
    return Date.parse(b.latestCreatedAt) - Date.parse(a.latestCreatedAt);
  });

  return { ok: true, groups };
}

export type StoryViewersResult =
  | { ok: true; viewers: StoryViewerRow[]; viewCount: number }
  | { ok: false; message: string; code?: "not_owner" | "not_found" | "load_failed" };

export async function getStoryViewersForOwner(
  supabase: SupabaseClient,
  ownerId: string,
  storyId: string
): Promise<StoryViewersResult> {
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, owner_id")
    .eq("id", storyId)
    .maybeSingle();

  if (storyError) {
    console.error("getStoryViewersForOwner story error:", storyError);
    return { ok: false, message: STORY_ERRORS.viewersFailed, code: "load_failed" };
  }
  if (!story) {
    return { ok: false, message: STORY_ERRORS.notFound, code: "not_found" };
  }
  if (story.owner_id !== ownerId) {
    return { ok: false, message: STORY_ERRORS.notOwner, code: "not_owner" };
  }

  const { data: views, error: viewsError } = await supabase
    .from("story_views")
    .select("viewer_id, first_viewed_at, last_viewed_at")
    .eq("story_id", storyId)
    .order("last_viewed_at", { ascending: false })
    .limit(100);

  if (viewsError) {
    console.error("getStoryViewersForOwner views error:", viewsError);
    return { ok: false, message: STORY_ERRORS.viewersFailed, code: "load_failed" };
  }

  const viewerIds = (views ?? []).map((v) => v.viewer_id as string);
  const profileMap = new Map<string, ProfileLite>();
  if (viewerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, avatar_initial")
      .in("id", viewerIds);
    for (const p of (profiles ?? []) as ProfileLite[]) {
      profileMap.set(p.id, p);
    }
  }

  const viewers: StoryViewerRow[] = (views ?? []).map((v) => {
    const profile = profileMap.get(v.viewer_id as string);
    return {
      viewerId: v.viewer_id as string,
      firstViewedAt: v.first_viewed_at as string,
      lastViewedAt: v.last_viewed_at as string,
      username: profile?.username ?? null,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      avatarInitial: (profile?.avatar_initial || "U").slice(0, 2).toUpperCase(),
    };
  });

  return { ok: true, viewers, viewCount: viewers.length };
}
