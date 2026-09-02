export const MESSAGE_MEDIA_BUCKET = "message-media";

export const MESSAGE_MEDIA_MAX_BYTES = 20 * 1024 * 1024;

export const MESSAGE_MEDIA_MIME = {
  image: ["image/jpeg", "image/png", "image/webp"] as const,
  video: ["video/mp4", "video/webm", "video/quicktime"] as const,
} as const;

export function isOwnedMessageMediaPath(
  userId: string,
  conversationId: string,
  path: string
): boolean {
  return path.startsWith(`${userId}/${conversationId}/`);
}

export function buildMessageMediaPath(input: {
  userId: string;
  conversationId: string;
  fileId: string;
  extension: string;
}): string {
  const extension = input.extension.replace(/^\./, "").toLowerCase();
  return `${input.userId}/${input.conversationId}/${input.fileId}.${extension}`;
}

export function extensionForMessageMime(mimeType: string): string | null {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return null;
  }
}

export function classifyMessageMediaMime(
  mimeType: string
): { ok: true; mediaType: "image" | "video" } | { ok: false; message: string } {
  if ((MESSAGE_MEDIA_MIME.image as readonly string[]).includes(mimeType)) {
    return { ok: true, mediaType: "image" };
  }
  if ((MESSAGE_MEDIA_MIME.video as readonly string[]).includes(mimeType)) {
    return { ok: true, mediaType: "video" };
  }
  return { ok: false, message: "Unsupported visual media type." };
}

export function validateMessageMediaFile(input: {
  mimeType: string;
  byteSize: number;
}): { ok: true; mediaType: "image" | "video" } | { ok: false; message: string } {
  if (input.byteSize <= 0 || input.byteSize > MESSAGE_MEDIA_MAX_BYTES) {
    return { ok: false, message: "Visual media is too large." };
  }
  return classifyMessageMediaMime(input.mimeType);
}
