import { createClient } from "../supabase/client";
import { getAuthenticatedUser } from "../supabase/auth";
import {
  buildMessageMediaPath,
  extensionForMessageMime,
  isOwnedMessageMediaPath,
  MESSAGE_MEDIA_BUCKET,
  validateMessageMediaFile,
} from "./media";

export async function uploadPrivateVisualMedia(input: {
  file: Blob;
  conversationId: string;
  mimeType: string;
}): Promise<
  | { ok: true; path: string; mediaType: "image" | "video"; byteSize: number }
  | { ok: false; message: string }
> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { ok: false, message: "Please sign in to send a visual message." };
  }

  const check = validateMessageMediaFile({
    mimeType: input.mimeType,
    byteSize: input.file.size,
  });
  if (!check.ok) {
    return check;
  }

  const extension = extensionForMessageMime(input.mimeType);
  if (!extension) {
    return { ok: false, message: "Unsupported visual media type." };
  }

  const path = buildMessageMediaPath({
    userId: user.id,
    conversationId: input.conversationId,
    fileId: crypto.randomUUID(),
    extension,
  });

  if (!isOwnedMessageMediaPath(user.id, input.conversationId, path)) {
    return { ok: false, message: "Invalid media path." };
  }

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(MESSAGE_MEDIA_BUCKET)
    .upload(path, input.file, {
      contentType: input.mimeType,
      upsert: false,
      cacheControl: "3600",
    });

  if (error) {
    return {
      ok: false,
      message:
        error.message.includes("row-level security") ||
        error.message.toLowerCase().includes("not found")
          ? "Private visual storage is not available on this environment yet."
          : "Unable to upload visual message.",
    };
  }

  return {
    ok: true,
    path,
    mediaType: check.mediaType,
    byteSize: input.file.size,
  };
}
