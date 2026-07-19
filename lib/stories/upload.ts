import { createClient } from "../supabase/client";
import { getAuthenticatedUser } from "../supabase/auth";
import { requireSupabasePublicEnv } from "../env/supabasePublic";
import {
  STORIES_BUCKET,
  type AllowedStoryMimeType,
} from "./constants";
import { STORY_ERRORS, storyUserMessage } from "./errors";
import {
  extensionForStoryMime,
  isOwnedStoryPath,
  validateStoryFile,
} from "./validation";
import type { StoryMediaType } from "./types";

export type UploadStoryMediaProgress = {
  loaded: number;
  total: number;
  percent: number;
};

export type UploadStoryMediaResult = {
  path: string;
  mimeType: AllowedStoryMimeType;
  mediaType: StoryMediaType;
  byteSize: number;
};

export type UploadStoryMediaOptions = {
  signal?: AbortSignal;
};

function getErrorMessage(error: { message?: string }, fallback: string): string {
  return storyUserMessage(error.message, fallback);
}

/**
 * Client upload into private `stories` bucket under `{userId}/{uuid}.{ext}`.
 * Does not mint signed URLs. Server action re-validates before insert.
 */
export async function uploadStoryMedia(
  file: File,
  onProgress?: (progress: UploadStoryMediaProgress) => void,
  options?: UploadStoryMediaOptions
): Promise<UploadStoryMediaResult> {
  const supabase = createClient();
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error(STORY_ERRORS.authRequired);
  }

  const fileCheck = validateStoryFile({
    mimeType: file.type,
    byteSize: file.size,
    fileName: file.name,
  });

  if (!fileCheck.ok) {
    throw new Error(fileCheck.message);
  }

  const mimeType = fileCheck.mimeType;
  const extension = extensionForStoryMime(mimeType);
  const uniqueFileName = `${crypto.randomUUID()}.${extension}`;
  const filePath = `${user.id}/${uniqueFileName}`;

  if (!isOwnedStoryPath(user.id, filePath)) {
    throw new Error("Invalid story upload path.");
  }

  if (onProgress) {
    await uploadStoryMediaWithProgressXhr(
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
      .from(STORIES_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Unable to upload story media:", uploadError);
      throw new Error(
        getErrorMessage(uploadError, STORY_ERRORS.uploadFailed)
      );
    }
  }

  return {
    path: filePath,
    mimeType,
    mediaType: fileCheck.mediaType,
    byteSize: file.size,
  };
}

const STORY_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

async function uploadStoryMediaWithProgressXhr(
  file: File,
  filePath: string,
  mimeType: string,
  onProgress: (progress: UploadStoryMediaProgress) => void,
  signal?: AbortSignal
): Promise<void> {
  const { url, publishableKey } = requireSupabasePublicEnv();
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error(STORY_ERRORS.authRequired);
  }

  if (signal?.aborted) {
    throw new DOMException("Upload cancelled.", "AbortError");
  }

  const endpoint = `${url.replace(/\/$/, "")}/storage/v1/object/${STORIES_BUCKET}/${filePath}`;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.timeout = STORY_UPLOAD_TIMEOUT_MS;
    xhr.setRequestHeader("apikey", publishableKey);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "3600");
    xhr.setRequestHeader("content-type", mimeType);

    const onAbort = () => {
      xhr.abort();
      reject(new DOMException("Upload cancelled.", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const percent =
        event.total > 0
          ? Math.min(100, Math.round((event.loaded / event.total) * 100))
          : 0;
      onProgress({ loaded: event.loaded, total: event.total, percent });
    };

    xhr.onload = () => {
      signal?.removeEventListener("abort", onAbort);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error(STORY_ERRORS.uploadFailed));
    };

    xhr.onerror = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error(STORY_ERRORS.uploadFailed));
    };

    xhr.ontimeout = () => {
      signal?.removeEventListener("abort", onAbort);
      reject(new Error(STORY_ERRORS.uploadFailed));
    };

    xhr.send(file);
  });
}

export async function deleteOwnedStoryObject(
  userId: string,
  mediaPath: string
): Promise<void> {
  if (!isOwnedStoryPath(userId, mediaPath)) {
    return;
  }
  const supabase = createClient();
  const { error } = await supabase.storage
    .from(STORIES_BUCKET)
    .remove([mediaPath]);
  if (error) {
    console.error("Unable to delete story media object:", error);
  }
}
