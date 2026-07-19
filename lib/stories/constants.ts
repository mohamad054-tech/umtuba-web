/** Story Foundation V1 — shared constants (client + server). */

export const STORIES_BUCKET = "stories";

/** Matches storage.buckets.file_size_limit in the migration. */
export const MAX_STORY_BYTES = 50 * 1024 * 1024;

export const MAX_STORY_CAPTION_LENGTH = 500;

/** Short-lived signed media URLs (15 minutes). */
export const STORY_SIGNED_URL_TTL_SECONDS = 15 * 60;

/** Canonical story lifetime. */
export const STORY_TTL_MS = 24 * 60 * 60 * 1000;

export const ALLOWED_STORY_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ALLOWED_STORY_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export const ALLOWED_STORY_MIME_TYPES = [
  ...ALLOWED_STORY_IMAGE_MIME_TYPES,
  ...ALLOWED_STORY_VIDEO_MIME_TYPES,
] as const;

export type AllowedStoryMimeType = (typeof ALLOWED_STORY_MIME_TYPES)[number];

export const STORY_ACCEPT_ATTR = [
  ...ALLOWED_STORY_MIME_TYPES,
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".mp4",
  ".m4v",
  ".webm",
  ".mov",
].join(",");

export const STORY_FILE_HINT =
  "JPEG, PNG, WebP, MP4, WebM, or MOV — maximum 50 MB";

/** Default image dwell time in the fullscreen viewer. */
export const STORY_IMAGE_DURATION_MS = 5_000;
