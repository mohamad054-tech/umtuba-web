import { createClient } from "./server";
import type { ProfileRow } from "./database.types";
import { getErrorMessage, normalizeUsername } from "./validation";

/** Full Foundation V1 profile projection. */
export const PROFILE_SELECT_COLUMNS =
  "id, username, display_name, full_name, bio, bio_long, city, country, avatar_url, cover_url, website_url, avatar_initial, created_at, updated_at";

/**
 * P0 / pre-foundation columns only. Used when the remote DB has not applied
 * profiles foundation (e.g. missing display_name) so real auth UUIDs still load.
 */
export const PROFILE_SELECT_CORE_COLUMNS =
  "id, username, full_name, avatar_initial, created_at";

function isMissingColumnError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const record = error as { code?: unknown; message?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  const message =
    typeof record.message === "string" ? record.message.toLowerCase() : "";

  return (
    code === "42703" ||
    message.includes("does not exist") ||
    message.includes("could not find")
  );
}

function normalizeProfileRow(row: Partial<ProfileRow> & { id: string }): ProfileRow {
  return {
    id: row.id,
    username: row.username ?? "",
    display_name: row.display_name ?? null,
    full_name: row.full_name ?? "",
    bio: row.bio ?? null,
    bio_long: row.bio_long ?? null,
    city: row.city ?? null,
    country: row.country ?? null,
    avatar_url: row.avatar_url ?? null,
    cover_url: row.cover_url ?? null,
    website_url: row.website_url ?? null,
    avatar_initial: row.avatar_initial || "U",
    created_at: row.created_at ?? new Date(0).toISOString(),
    updated_at: row.updated_at ?? row.created_at ?? new Date(0).toISOString(),
  };
}

async function selectProfile(
  query: (
    columns: string
  ) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<ProfileRow | null> {
  const extended = await query(PROFILE_SELECT_COLUMNS);

  if (!extended.error) {
    return extended.data
      ? normalizeProfileRow(extended.data as Partial<ProfileRow> & { id: string })
      : null;
  }

  if (!isMissingColumnError(extended.error)) {
    throw new Error(
      getErrorMessage(extended.error, "Unable to load profile.")
    );
  }

  const core = await query(PROFILE_SELECT_CORE_COLUMNS);

  if (core.error) {
    throw new Error(getErrorMessage(core.error, "Unable to load profile."));
  }

  return core.data
    ? normalizeProfileRow(core.data as Partial<ProfileRow> & { id: string })
    : null;
}

export async function getProfileByUsernameFromDb(
  username: string
): Promise<ProfileRow | null> {
  const key = normalizeUsername(username);

  if (!key) {
    return null;
  }

  const supabase = await createClient();

  return selectProfile((columns) =>
    supabase.from("profiles").select(columns).eq("username", key).maybeSingle()
  );
}

export async function getProfileByIdFromDb(
  userId: string
): Promise<ProfileRow | null> {
  if (!userId) {
    return null;
  }

  const supabase = await createClient();

  return selectProfile((columns) =>
    supabase.from("profiles").select(columns).eq("id", userId).maybeSingle()
  );
}
