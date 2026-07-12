import { createClient } from "./client";
import type { DatabasePost } from "../../app/data/types/post";
import { getAuthenticatedUser, getCurrentProfile } from "./auth";

const POST_IMAGES_BUCKET = "post-images";

const postColumns = `
  id,
  user_id,
  content,
  post_type,
  author_name,
  author_username,
  author_avatar,
  image_url,
  video_url,
  likes,
  comments,
  shares,
  created_at
`;

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message).trim();

    if (message) {
      return message;
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export async function getPosts(): Promise<DatabasePost[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(postColumns)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Unable to load posts:", error);
    throw new Error(getErrorMessage(error, "Unable to load posts."));
  }

  return (data ?? []) as DatabasePost[];
}

export async function uploadPostImage(file: File): Promise<string> {
  const supabase = createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Please sign in to upload an image.");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Please select a valid image.");
  }

  const maximumFileSize = 5 * 1024 * 1024;

  if (file.size > maximumFileSize) {
    throw new Error("The image must be smaller than 5 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueFileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = `${user.id}/${uniqueFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Unable to upload image:", uploadError);
    throw new Error(getErrorMessage(uploadError, "Unable to upload image."));
  }

  const { data } = supabase.storage
    .from(POST_IMAGES_BUCKET)
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    throw new Error("The image URL could not be created.");
  }

  return data.publicUrl;
}

export async function createPost(
  content: string,
  imageUrl: string | null = null
): Promise<DatabasePost> {
  const supabase = createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Please sign in to publish a post.");
  }

  const profile = await getCurrentProfile();

  if (!profile) {
    throw new Error("Please sign in to publish a post.");
  }

  const trimmedContent = content.trim();

  if (!trimmedContent && !imageUrl) {
    throw new Error("The post must contain text or an image.");
  }

  const authorUsername = profile.username.startsWith("@")
    ? profile.username
    : `@${profile.username}`;

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      content: trimmedContent,
      post_type: imageUrl ? "image" : "text",
      author_name: profile.full_name,
      author_username: authorUsername,
      author_avatar: profile.avatar_initial,
      image_url: imageUrl,
      video_url: null,
      likes: 0,
      comments: 0,
      shares: 0,
    })
    .select(postColumns)
    .single();

  if (error) {
    console.error("Unable to create post:", error);
    throw new Error(getErrorMessage(error, "Unable to create the post."));
  }

  return data as DatabasePost;
}
