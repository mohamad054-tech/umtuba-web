"use server";

import {
  getProfileFollowSnapshot,
  toggleProfileFollow,
  type FollowActionResult,
  type FollowSnapshot,
  type FollowToggleResult,
} from "../../lib/supabase/follows";
import { createClient, getServerUser } from "../../lib/supabase/server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseUuid(value: string): { ok: true; id: string } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (!UUID_RE.test(trimmed)) {
    return { ok: false, message: "Invalid user." };
  }
  return { ok: true, id: trimmed };
}

export async function getProfileFollowSnapshotAction(
  userId: string
): Promise<FollowActionResult<FollowSnapshot>> {
  const parsed = parseUuid(userId);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }

  const supabase = await createClient();
  return getProfileFollowSnapshot(supabase, parsed.id);
}

export async function toggleProfileFollowAction(
  followingId: string
): Promise<FollowActionResult<FollowToggleResult>> {
  const parsed = parseUuid(followingId);
  if (!parsed.ok) {
    return { ok: false, message: parsed.message };
  }

  const user = await getServerUser();
  if (!user) {
    return {
      ok: false,
      message: "Please sign in to follow creators.",
      requiresAuth: true,
    };
  }

  if (user.id === parsed.id) {
    return { ok: false, message: "You can’t follow yourself." };
  }

  const supabase = await createClient();
  return toggleProfileFollow(supabase, parsed.id);
}
