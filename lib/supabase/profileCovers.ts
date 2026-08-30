import { createClient } from "./client";
import { getAuthenticatedUser } from "./auth";
import type { ProfileRow } from "./database.types";
import { getErrorMessage } from "./validation";

const COVERS_BUCKET = "profile-covers";
const MAX_COVER_BYTES = 5 * 1024 * 1024;
const ALLOWED_COVER_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const PROFILE_COLUMNS =
  "id, username, display_name, full_name, bio, bio_long, city, country, avatar_url, cover_url, website_url, avatar_initial, created_at, updated_at";

export async function uploadProfileCover(file: File): Promise<string> {
  const supabase = createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Please sign in to upload a cover image.");
  }

  if (!ALLOWED_COVER_TYPES.has(file.type)) {
    throw new Error("Please choose a JPEG, PNG, or WebP image.");
  }

  if (file.size > MAX_COVER_BYTES) {
    throw new Error("The cover image must be smaller than 5 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueFileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = `${user.id}/${uniqueFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(COVERS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(getErrorMessage(uploadError, "Unable to upload cover."));
  }

  const { data } = supabase.storage.from(COVERS_BUCKET).getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error("The cover URL could not be created.");
  }

  return data.publicUrl;
}

export async function updateOwnCoverUrl(coverUrl: string): Promise<ProfileRow> {
  const supabase = createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Please sign in to update your cover.");
  }

  if (!coverUrl.startsWith("https://")) {
    throw new Error("Invalid cover URL.");
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ cover_url: coverUrl })
    .eq("id", user.id)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    throw new Error(getErrorMessage(error, "Unable to save cover."));
  }

  return data as ProfileRow;
}
