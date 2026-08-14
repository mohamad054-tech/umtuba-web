/**
 * Load published question counts for learner quiz CTAs.
 * Count-only — never selects answer keys or option correctness.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type AnyClient = SupabaseClient;

export async function loadPublishedQuestionCountsByActivityIds(
  supabase: AnyClient,
  activityIds: readonly string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  const ids = [
    ...new Set(
      activityIds.filter((id) => typeof id === "string" && id.trim().length > 0)
    ),
  ];
  if (ids.length === 0) return counts;

  const { data, error } = await supabase
    .from("learning_questions")
    .select("activity_id")
    .in("activity_id", ids)
    .eq("status", "published");

  if (error || !data) return counts;

  for (const row of data) {
    const aid =
      typeof row.activity_id === "string" ? row.activity_id.trim() : "";
    if (!aid) continue;
    counts.set(aid, (counts.get(aid) ?? 0) + 1);
  }
  return counts;
}
