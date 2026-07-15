import type { SupabaseClient } from "@supabase/supabase-js";
import { formatWalletAmount } from "../wallet/formatBalance";

export type FollowSnapshot = {
  following: boolean;
  followersCount: number;
  followingCount: number;
  missingProfile?: boolean;
};

export type FollowToggleResult = FollowSnapshot;

type ActionOk<T> = { ok: true } & T;
type ActionErr = { ok: false; message: string; requiresAuth?: boolean };
export type FollowActionResult<T> = ActionOk<T> | ActionErr;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getErrorMessage(error: { message?: string }, fallback: string): string {
  const message = (error.message || "").toLowerCase();
  if (message.includes("authentication required")) {
    return "Please sign in to follow creators.";
  }
  if (message.includes("invalid follow target")) {
    return "You can’t follow this account.";
  }
  if (message.includes("profile not found")) {
    return "This profile is no longer available.";
  }
  return fallback;
}

function parseCount(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function parseSnapshot(data: unknown): FollowSnapshot {
  const row = asRecord(data);
  return {
    following: Boolean(row?.following),
    followersCount: parseCount(row?.followersCount),
    followingCount: parseCount(row?.followingCount),
    missingProfile: row?.reason === "missing_profile",
  };
}

/** Compact label for follower/following counts (never invents data). */
export function formatFollowCountLabel(count: number): string {
  return formatWalletAmount(count);
}

async function loadFollowSnapshotFromTable(
  supabase: SupabaseClient,
  userId: string
): Promise<FollowActionResult<FollowSnapshot>> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: followersCount, error: followersError }, { count: followingCount, error: followingError }] =
    await Promise.all([
      supabase
        .from("profile_follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", userId),
      supabase
        .from("profile_follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", userId),
    ]);

  if (followersError || followingError) {
    return {
      ok: false,
      message: "Unable to load follow status.",
    };
  }

  let following = false;
  if (user?.id && user.id !== userId) {
    const { data: row, error: rowError } = await supabase
      .from("profile_follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle();
    if (rowError) {
      return { ok: false, message: "Unable to load follow status." };
    }
    following = Boolean(row);
  }

  return {
    ok: true,
    following,
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

function isMissingRpcError(error: { message?: string; code?: string }): boolean {
  const message = (error.message || "").toLowerCase();
  return (
    error.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("schema cache")
  );
}

export async function getProfileFollowSnapshot(
  supabase: SupabaseClient,
  userId: string
): Promise<FollowActionResult<FollowSnapshot>> {
  const { data, error } = await supabase.rpc("get_profile_follow_snapshot", {
    p_user_id: userId,
  });

  if (error) {
    if (isMissingRpcError(error)) {
      return loadFollowSnapshotFromTable(supabase, userId);
    }
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to load follow status."),
    };
  }

  return { ok: true, ...parseSnapshot(data) };
}

export async function toggleProfileFollow(
  supabase: SupabaseClient,
  followingId: string
): Promise<FollowActionResult<FollowToggleResult>> {
  const { data, error } = await supabase.rpc("toggle_profile_follow", {
    p_following_id: followingId,
  });

  if (error) {
    return {
      ok: false,
      message: getErrorMessage(error, "Unable to update follow."),
    };
  }

  const snapshot = parseSnapshot(data);
  // Pre-A5 toggle RPC returns only `following` — fill counts from table.
  if (
    asRecord(data)?.followersCount == null &&
    asRecord(data)?.followerscount == null
  ) {
    const counts = await loadFollowSnapshotFromTable(supabase, followingId);
    if (counts.ok) {
      return {
        ok: true,
        following: snapshot.following,
        followersCount: counts.followersCount,
        followingCount: counts.followingCount,
      };
    }
  }

  return { ok: true, ...snapshot };
}

/**
 * Batch: which of `candidateIds` the viewer already follows.
 * Uses RLS-readable profile_follows select.
 */
export async function loadViewerFollowingSet(
  supabase: SupabaseClient,
  viewerId: string | null | undefined,
  candidateIds: string[]
): Promise<Set<string>> {
  const ids = [...new Set(candidateIds.filter(Boolean))];
  if (!viewerId || ids.length === 0) {
    return new Set();
  }

  const { data, error } = await supabase
    .from("profile_follows")
    .select("following_id")
    .eq("follower_id", viewerId)
    .in("following_id", ids);

  if (error) {
    console.error("loadViewerFollowingSet failed:", error);
    return new Set();
  }

  return new Set(
    (data ?? [])
      .map((row) =>
        typeof row.following_id === "string" ? row.following_id : null
      )
      .filter((id): id is string => Boolean(id))
  );
}

export function applyFollowingToDiscoverVideos<
  T extends { creator: { id: string | null; isFollowing?: boolean } },
>(videos: T[], followingSet: Set<string>): T[] {
  return videos.map((video) => {
    const id = video.creator.id;
    if (!id) {
      return { ...video, creator: { ...video.creator, isFollowing: false } };
    }
    return {
      ...video,
      creator: {
        ...video.creator,
        isFollowing: followingSet.has(id),
      },
    };
  });
}
