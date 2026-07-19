import {
  ALLOWED_STORY_IMAGE_MIME_TYPES,
  ALLOWED_STORY_MIME_TYPES,
  ALLOWED_STORY_VIDEO_MIME_TYPES,
  MAX_STORY_BYTES,
  MAX_STORY_CAPTION_LENGTH,
  type AllowedStoryMimeType,
} from "./constants";
import type { StoryMediaType } from "./types";

const ALLOWED_MIME_SET = new Set<string>(ALLOWED_STORY_MIME_TYPES);
const IMAGE_MIME_SET = new Set<string>(ALLOWED_STORY_IMAGE_MIME_TYPES);
const VIDEO_MIME_SET = new Set<string>(ALLOWED_STORY_VIDEO_MIME_TYPES);

export function isAllowedStoryMimeType(
  mimeType: string
): mimeType is AllowedStoryMimeType {
  return ALLOWED_MIME_SET.has(mimeType);
}

export function mediaTypeForMime(mimeType: string): StoryMediaType | null {
  if (IMAGE_MIME_SET.has(mimeType)) return "image";
  if (VIDEO_MIME_SET.has(mimeType)) return "video";
  return null;
}

/**
 * Prefer browser MIME; when empty (common on mobile), infer from extension.
 */
export function resolveStoryMimeType(
  mimeType: string | null | undefined,
  fileName?: string | null
): string {
  const trimmed = (mimeType || "").trim().toLowerCase();
  if (isAllowedStoryMimeType(trimmed)) {
    return trimmed;
  }

  const name = (fileName || "").trim().toLowerCase();
  if (name.endsWith(".webp")) return "image/webp";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webm")) return "video/webm";
  if (name.endsWith(".mov")) return "video/quicktime";
  if (name.endsWith(".mp4") || name.endsWith(".m4v")) return "video/mp4";

  return trimmed;
}

export function extensionForStoryMime(mimeType: AllowedStoryMimeType): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    case "video/mp4":
    default:
      return "mp4";
  }
}

export type StoryFileValidationResult =
  | { ok: true; mimeType: AllowedStoryMimeType; mediaType: StoryMediaType }
  | { ok: false; message: string };

export type CaptionValidationResult =
  | { ok: true; caption: string | null }
  | { ok: false; message: string };

export function validateStoryFile(input: {
  mimeType: string;
  byteSize: number;
  fileName?: string | null;
}): StoryFileValidationResult {
  const mimeType = resolveStoryMimeType(input.mimeType, input.fileName);

  if (!isAllowedStoryMimeType(mimeType)) {
    return {
      ok: false,
      message: "Please select a JPEG, PNG, WebP image or MP4, WebM, MOV video.",
    };
  }

  if (input.byteSize <= 0) {
    return {
      ok: false,
      message: "The selected file is empty.",
    };
  }

  if (input.byteSize > MAX_STORY_BYTES) {
    return {
      ok: false,
      message: "Stories must be 50 MB or smaller.",
    };
  }

  const mediaType = mediaTypeForMime(mimeType);
  if (!mediaType) {
    return {
      ok: false,
      message: "Unsupported story media type.",
    };
  }

  return { ok: true, mimeType, mediaType };
}

export function validateStoryCaption(
  caption: string | null | undefined
): CaptionValidationResult {
  if (caption == null) {
    return { ok: true, caption: null };
  }
  const trimmed = caption.trim();
  if (!trimmed) {
    return { ok: true, caption: null };
  }
  if (trimmed.length > MAX_STORY_CAPTION_LENGTH) {
    return {
      ok: false,
      message: `Captions can be up to ${MAX_STORY_CAPTION_LENGTH} characters.`,
    };
  }
  return { ok: true, caption: trimmed };
}

/** Owned path: `{userId}/{uuid}.{ext}` — no traversal / spaces. */
export function isOwnedStoryPath(userId: string, path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed || trimmed.includes("..") || /\s/.test(trimmed)) {
    return false;
  }
  const prefix = `${userId}/`;
  if (!trimmed.startsWith(prefix)) {
    return false;
  }
  const rest = trimmed.slice(prefix.length);
  if (!rest || rest.includes("/")) {
    return false;
  }
  return /^[0-9a-f-]{36}\.(jpg|jpeg|png|webp|mp4|webm|mov|m4v)$/i.test(rest);
}
