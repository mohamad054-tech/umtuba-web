import type { SupabaseClient } from "@supabase/supabase-js";
import { STORY_ERRORS } from "./errors";
import { isStoryActive } from "./expiry";

export type RecordStoryViewResult =
  | { ok: true; firstView: boolean }
  | {
      ok: false;
      message: string;
      code?: "auth_required" | "not_found" | "expired" | "view_failed";
    };

/**
 * Record a view for the current user. Skips own stories.
 * Upserts: preserves first_viewed_at, refreshes last_viewed_at.
 */
export async function recordStoryViewForUser(
  supabase: SupabaseClient,
  viewerId: string,
  storyId: string
): Promise<RecordStoryViewResult> {
  const { data: story, error: storyError } = await supabase
    .from("stories")
    .select("id, owner_id, expires_at")
    .eq("id", storyId)
    .maybeSingle();

  if (storyError) {
    console.error("recordStoryViewForUser load error:", storyError);
    return { ok: false, message: STORY_ERRORS.viewFailed, code: "view_failed" };
  }
  if (!story) {
    return { ok: false, message: STORY_ERRORS.notFound, code: "not_found" };
  }
  if (story.owner_id === viewerId) {
    return { ok: true, firstView: false };
  }
  if (!isStoryActive(story.expires_at as string)) {
    return { ok: false, message: STORY_ERRORS.expired, code: "expired" };
  }

  const { data: existing } = await supabase
    .from("story_views")
    .select("id")
    .eq("story_id", storyId)
    .eq("viewer_id", viewerId)
    .maybeSingle();

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("story_views")
      .update({ last_viewed_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("viewer_id", viewerId);

    if (updateError) {
      console.error("recordStoryViewForUser update error:", updateError);
      return { ok: false, message: STORY_ERRORS.viewFailed, code: "view_failed" };
    }
    return { ok: true, firstView: false };
  }

  const now = new Date().toISOString();
  const { error: insertError } = await supabase.from("story_views").insert({
    story_id: storyId,
    viewer_id: viewerId,
    first_viewed_at: now,
    last_viewed_at: now,
  });

  if (insertError) {
    // Race: unique conflict → treat as update path.
    if (insertError.code === "23505") {
      const { error: updateError } = await supabase
        .from("story_views")
        .update({ last_viewed_at: new Date().toISOString() })
        .eq("story_id", storyId)
        .eq("viewer_id", viewerId);
      if (updateError) {
        console.error("recordStoryViewForUser race update error:", updateError);
        return { ok: false, message: STORY_ERRORS.viewFailed, code: "view_failed" };
      }
      return { ok: true, firstView: false };
    }
    console.error("recordStoryViewForUser insert error:", insertError);
    return { ok: false, message: STORY_ERRORS.viewFailed, code: "view_failed" };
  }

  return { ok: true, firstView: true };
}
