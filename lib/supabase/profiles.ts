import { createClient } from "./server";
import type { ProfileRow } from "./database.types";
import { getErrorMessage, normalizeUsername } from "./validation";

export const PROFILE_SELECT_COLUMNS =
  "id, username, display_name, full_name, bio, city, country, avatar_url, avatar_initial, created_at, updated_at";

export async function getProfileByUsernameFromDb(
  username: string
): Promise<ProfileRow | null> {
  const key = normalizeUsername(username);

  if (!key) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("username", key)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to load profile."));
  }

  return (data as ProfileRow | null) ?? null;
}

export async function getProfileByIdFromDb(
  userId: string
): Promise<ProfileRow | null> {
  if (!userId) {
    return null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to load profile."));
  }

  return (data as ProfileRow | null) ?? null;
}
