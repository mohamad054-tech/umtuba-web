"use server";

import { createClient, getServerUser } from "../../lib/supabase/server";
import { recordWatchCompletion } from "../../lib/supabase/watchCompletions";

export type RecordQualifiedWatchResult =
  | { ok: true; persisted: boolean }
  | { ok: false; message: string };

export async function recordQualifiedWatchAction(
  postId: number
): Promise<RecordQualifiedWatchResult> {
  if (!Number.isInteger(postId) || postId <= 0) {
    return { ok: false, message: "Invalid video." };
  }

  const user = await getServerUser();
  if (!user) {
    return { ok: true, persisted: false };
  }

  const supabase = await createClient();
  const result = await recordWatchCompletion(supabase, postId);
  if (!result.ok) {
    return result;
  }
  return { ok: true, persisted: true };
}
