import { createClient } from "./client";
import type { DatabasePost } from "../../app/data/types/post";
import { getAuthenticatedUser, getCurrentProfile } from "./auth";
import { requireSupabasePublicEnv } from "../env/supabasePublic";
import { getErrorMessage } from "./validation";
import {
  isOwnedVideoPath,
  POST_VIDEOS_BUCKET,
  validateVideoFile,
  videoExtensionForMime,
} from "./videoPostsShared";

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
  video_path,
  video_mime_type,
  video_byte_size,
  likes,
  comments,
  shares,
  saves,
  views,
  created_at
`;

export type UploadPostVideoResult = {
  path: string;
  mimeType: string;
  byteSize: number;
};

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

export type UploadPostVideoProgress = {
  percent: number;
  loaded: number;
  total: number;
};

export type UploadPostVideoOptions = {
  signal?: AbortSignal;
};

/**
 * Client-side upload into the private post-videos bucket (owner folder only).
 * Client validation is convenience only — the server action re-validates.
 * Does not mint signed URLs.
 * Optional onProgress uses XHR for byte-level upload progress.
 */
export async function uploadPostVideo(
  file: File,
  onProgress?: (progress: UploadPostVideoProgress) => void,
  options?: UploadPostVideoOptions
): Promise<UploadPostVideoResult> {
  const supabase = createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("Please sign in to upload a video.");
  }

  const fileCheck = validateVideoFile({
    mimeType: file.type,
    byteSize: file.size,
    fileName: file.name,
  });

  if (!fileCheck.ok) {
    throw new Error(fileCheck.message);
  }

  const mimeType = fileCheck.mimeType;
  const extension = videoExtensionForMime(mimeType);
  const uniqueFileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = `${user.id}/${uniqueFileName}`;

  if (!isOwnedVideoPath(user.id, filePath)) {
    throw new Error("Invalid video upload path.");
  }

  if (onProgress) {
    await uploadPostVideoWithProgressXhr(
      file,
      filePath,
      mimeType,
      onProgress,
      options?.signal
    );
  } else {
    if (options?.signal?.aborted) {
      throw new DOMException("Upload cancelled.", "AbortError");
    }
    const { error: uploadError } = await supabase.storage
      .from(POST_VIDEOS_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Unable to upload video:", uploadError);
      throw new Error(getErrorMessage(uploadError, "Unable to upload video."));
    }
  }

  return {
    path: filePath,
    mimeType,
    byteSize: file.size,
  };
}

const VIDEO_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

async function uploadPostVideoWithProgressXhr(
  file: File,
  filePath: string,
  mimeType: string,
  onProgress: (progress: UploadPostVideoProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  const { url, publishableKey } = requireSupabasePublicEnv();
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("Please sign in to upload a video.");
  }

  if (signal?.aborted) {
    throw new DOMException("Upload cancelled.", "AbortError");
  }

  const endpoint = `${url.replace(/\/$/, "")}/storage/v1/object/${POST_VIDEOS_BUCKET}/${filePath}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.timeout = VIDEO_UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader("apikey", publishableKey);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "3600");
    xhr.setRequestHeader("content-type", mimeType);

    const onAbort = () => {
      xhr.abort();
    };

    signal?.addEventListener("abort", onAbort);

    const settle = (fn: () => void) => {
      signal?.removeEventListener("abort", onAbort);
      fn();
    };

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) {
        onProgress({ percent: 0, loaded: event.loaded, total: file.size });
        return;
      }
      const percent = Math.round((event.loaded / event.total) * 100);
      onProgress({
        percent: Math.max(0, Math.min(100, percent)),
        loaded: event.loaded,
        total: event.total,
      });
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress({ percent: 100, loaded: file.size, total: file.size });
        settle(() => resolve());
        return;
      }
      console.error("Unable to upload video:", xhr.status, xhr.responseText);
      const message =
        xhr.status === 413
          ? "The video is too large to upload."
          : xhr.status === 401 || xhr.status === 403
            ? "Please sign in to upload a video."
            : "Unable to upload video. Please try again.";
      settle(() => reject(new Error(message)));
    };

    xhr.onerror = () => {
      settle(() =>
        reject(
          new Error(
            "Network issue during upload. Check your connection and try again."
          )
        )
      );
    };

    xhr.ontimeout = () => {
      settle(() =>
        reject(
          new Error(
            "Upload timed out. Please try again on a stronger connection."
          )
        )
      );
    };

    xhr.onabort = () => {
      settle(() =>
        reject(new DOMException("Upload cancelled.", "AbortError"))
      );
    };

    xhr.send(file);
  });
}

/**
 * Client-side orphan cleanup when publish fails after a successful upload.
 * Server action also deletes; this is a best-effort complement.
 */
export async function deleteUploadedPostVideo(path: string): Promise<void> {
  const supabase = createClient();
  const user = await getAuthenticatedUser();

  if (!user || !isOwnedVideoPath(user.id, path)) {
    return;
  }

  const { error } = await supabase.storage
    .from(POST_VIDEOS_BUCKET)
    .remove([path]);

  if (error) {
    console.error("Unable to delete uploaded video after publish failure:", error);
  }
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
      video_path: null,
      video_mime_type: null,
      video_byte_size: null,
      likes: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      views: 0,
    })
    .select(postColumns)
    .single();

  if (error) {
    console.error("Unable to create post:", error);
    throw new Error(getErrorMessage(error, "Unable to create the post."));
  }

  return data as DatabasePost;
}
