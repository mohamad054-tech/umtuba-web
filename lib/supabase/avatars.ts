import { createClient } from "./client";
import { getAuthenticatedUser } from "./auth";
import type { ProfileRow } from "./database.types";
import { sanitizeHttpsUrl, validateBioLong } from "../profile/richProfileContract";
import {
  getErrorMessage,
  isUsernameTakenError,
  isValidUsername,
  normalizeUsername,
  USERNAME_HINT,
} from "./validation";

const AVATARS_BUCKET = "avatars";
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const PROFILE_COLUMNS =
  "id, username, display_name, full_name, bio, city, country, avatar_url, avatar_initial, created_at, updated_at";
const PROFILE_RICH_COLUMNS =
  "id, username, display_name, full_name, bio, bio_long, city, country, avatar_url, cover_url, website_url, avatar_initial, created_at, updated_at";

export type ProfileUpdateInput = {
  displayName: string;
  username: string;
  bio: string;
  city: string;
  country: string;
  bioLong?: string;
  websiteUrl?: string;
};

export async function uploadAvatar(file: File): Promise<string> {
  const supabase = createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Please sign in to upload an avatar.");
  }

  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error("Please choose a JPEG, PNG, WebP, or GIF image.");
  }

  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error("The avatar must be smaller than 2 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueFileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = `${user.id}/${uniqueFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(getErrorMessage(uploadError, "Unable to upload avatar."));
  }

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error("The avatar URL could not be created.");
  }

  return data.publicUrl;
}

export async function updateOwnProfile(
  input: ProfileUpdateInput
): Promise<ProfileRow> {
  const supabase = createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Please sign in to edit your profile.");
  }

  const displayName = input.displayName.trim();
  const username = normalizeUsername(input.username);
  const bio = input.bio.trim();
  const city = input.city.trim();
  const country = input.country.trim();

  if (!displayName) {
    throw new Error("Display name is required.");
  }

  if (!isValidUsername(username)) {
    throw new Error(USERNAME_HINT);
  }

  const avatarInitial = displayName.charAt(0).toUpperCase() || "U";
  const websiteUrl =
    input.websiteUrl === undefined
      ? undefined
      : input.websiteUrl.trim()
        ? sanitizeHttpsUrl(input.websiteUrl)
        : null;

  if (input.websiteUrl?.trim() && websiteUrl === null) {
    throw new Error("Enter a valid https:// website.");
  }

  const bioLong =
    input.bioLong === undefined ? undefined : validateBioLong(input.bioLong);

  if (input.bioLong && input.bioLong.trim() && bioLong === null) {
    throw new Error("The longer bio is too long.");
  }

  const payload: Record<string, unknown> = {
    display_name: displayName,
    full_name: displayName,
    username,
    bio: bio || null,
    city: city || null,
    country: country || null,
    avatar_initial: avatarInitial,
  };

  if (bioLong !== undefined) {
    payload.bio_long = bioLong;
  }
  if (websiteUrl !== undefined) {
    payload.website_url = websiteUrl;
  }

  const rich = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id)
    .select(PROFILE_RICH_COLUMNS)
    .single();

  if (!rich.error) {
    return rich.data as ProfileRow;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      full_name: displayName,
      username,
      bio: bio || null,
      city: city || null,
      country: country || null,
      avatar_initial: avatarInitial,
    })
    .eq("id", user.id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    const message = getErrorMessage(error, "Unable to update your profile.");

    if (isUsernameTakenError(message)) {
      throw new Error("That username is already taken.");
    }

    throw new Error(message);
  }

  return data as ProfileRow;
}

export async function updateOwnAvatarUrl(avatarUrl: string): Promise<ProfileRow> {
  const supabase = createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Please sign in to update your avatar.");
  }

  if (!avatarUrl.startsWith("http://") && !avatarUrl.startsWith("https://")) {
    throw new Error("Invalid avatar URL.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to save avatar."));
  }

  return data as ProfileRow;
}
