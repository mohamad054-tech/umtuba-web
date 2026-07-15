"use server";

import {
  buildActivityTierProgress,
  emptyActivityTierProgress,
  type ActivityTierProgress,
} from "../../lib/activity-tiers";
import {
  getActivityTierSnapshot,
  getMyActivityTierProgress,
} from "../../lib/supabase/activityTiers";
import { createClient, getServerUser } from "../../lib/supabase/server";

export type ActivityTierActionResult<T> =
  | ({ ok: true } & T)
  | { ok: false; message: string; requiresAuth?: boolean };

export async function getMyActivityTierAction(): Promise<
  ActivityTierActionResult<{ progress: ActivityTierProgress }>
> {
  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Sign in to view your activity tier.",
      requiresAuth: true,
    };
  }

  try {
    const supabase = await createClient();
    const progress = await getMyActivityTierProgress(supabase);
    return { ok: true, progress };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to load activity tier.";
    return { ok: false, message };
  }
}

export async function getActivityTierForUserAction(
  userId: string
): Promise<ActivityTierActionResult<{ progress: ActivityTierProgress }>> {
  if (!userId) {
    return { ok: false, message: "Missing user id." };
  }

  try {
    const supabase = await createClient();
    const progress = await getActivityTierSnapshot(supabase, userId);
    return { ok: true, progress };
  } catch {
    return {
      ok: true,
      progress: emptyActivityTierProgress(),
    };
  }
}

/** Safe default for SSR profile pages when migration is not applied yet. */
export async function loadProfileActivityTier(
  userId: string
): Promise<ActivityTierProgress> {
  try {
    const result = await getActivityTierForUserAction(userId);
    if (result.ok) {
      return result.progress;
    }
  } catch {
    // ignore
  }
  return buildActivityTierProgress({ score: 0 });
}
