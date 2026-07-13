/** Shared Video Posts V1 constants and pure validation (client + server). */

export const POST_VIDEOS_BUCKET = "post-videos";

/** 50 MB — matches storage.buckets.file_size_limit in the migration. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export const MAX_CAPTION_LENGTH = 1000;

/** Short-lived signed playback URLs (15 minutes). Generated server-side only. */
export const VIDEO_SIGNED_URL_TTL_SECONDS = 15 * 60;

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export type AllowedVideoMimeType = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

const ALLOWED_VIDEO_MIME_SET = new Set<string>(ALLOWED_VIDEO_MIME_TYPES);

export const VIDEO_ACCEPT_ATTR = ALLOWED_VIDEO_MIME_TYPES.join(",");

export const VIDEO_FILE_HINT =
  "MP4, WebM, or MOV — maximum 50 MB";

export function isAllowedVideoMimeType(
  mimeType: string
): mimeType is AllowedVideoMimeType {
  return ALLOWED_VIDEO_MIME_SET.has(mimeType);
}

export function formatMaxVideoSizeLabel(): string {
  return "50 MB";
}

export type VideoFileValidationResult =
  | { ok: true }
  | { ok: false; message: string };

export function validateVideoFile(input: {
  mimeType: string;
  byteSize: number;
}): VideoFileValidationResult {
  if (!isAllowedVideoMimeType(input.mimeType)) {
    return {
      ok: false,
      message: "Please select an MP4, WebM, or MOV video.",
    };
  }

  if (input.byteSize <= 0) {
    return {
      ok: false,
      message: "The selected video file is empty.",
    };
  }

  if (input.byteSize > MAX_VIDEO_BYTES) {
    return {
      ok: false,
      message: `The video must be smaller than ${formatMaxVideoSizeLabel()}.`,
    };
  }

  return { ok: true };
}

export function validateCaption(caption: string): VideoFileValidationResult {
  if (caption.length > MAX_CAPTION_LENGTH) {
    return {
      ok: false,
      message: `Caption must be ${MAX_CAPTION_LENGTH} characters or fewer.`,
    };
  }

  return { ok: true };
}

export function videoExtensionForMime(mimeType: string): string {
  switch (mimeType) {
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    case "video/mp4":
    default:
      return "mp4";
  }
}

export function isOwnedVideoPath(userId: string, path: string): boolean {
  const normalized = path.replace(/^\/+/, "");
  return (
    normalized.startsWith(`${userId}/`) &&
    normalized.length > userId.length + 1 &&
    !normalized.includes("..") &&
    !normalized.includes("\\")
  );
}
