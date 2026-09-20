import type { SupabaseClient } from "@supabase/supabase-js";
import {
  sanitizeWatchHideEntries,
  type WatchHideEntry,
} from "../video/watchHidePolicy";

export async function loadRecentWatchCompletions(
  supabase: SupabaseClient,
  userId: string | null | undefined
): Promise<WatchHideEntry[]> {
  if (!userId) {
    return [];
  }

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("post_watch_completions")
    .select("post_id, watched_at")
    .eq("user_id", userId)
    .gte("watched_at", since)
    .order("watched_at", { ascending: true });

  if (error) {
    // Table may not exist until the owner applies 20260950.
    console.error("Unable to load watch completions:", error.message);
    return [];
  }

  return sanitizeWatchHideEntries(
    (data ?? []).map((row) => ({
      postId: row.post_id,
      watchedAt: Date.parse(row.watched_at),
    }))
  );
}

export async function recordWatchCompletion(
  supabase: SupabaseClient,
  postId: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc("record_post_watch_completion", {
    p_post_id: postId,
  });

  if (error) {
    console.error("record_post_watch_completion failed:", error.message);
    return { ok: false, message: "Unable to remember this watch." };
  }

  return { ok: true };
}
