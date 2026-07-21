/** World place media — private bucket + signed URL path contracts. */

export const WORLD_PLACE_MEDIA_BUCKET = "world-place-media";

/** Matches storage.buckets.file_size_limit in the hardening migration. */
export const MAX_WORLD_PLACE_MEDIA_BYTES = 10 * 1024 * 1024;

export const WORLD_PLACE_MEDIA_SIGNED_URL_TTL_SECONDS = 15 * 60;

export const ALLOWED_WORLD_PLACE_MEDIA_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
] as const;

export type AllowedWorldPlaceMediaMimeType =
  (typeof ALLOWED_WORLD_PLACE_MEDIA_MIME_TYPES)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function extensionForWorldPlaceMime(
  mime: AllowedWorldPlaceMediaMimeType
): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/webm") return "webm";
  return "jpg";
}

/** Path: places/{placeId}/{fileId}.{ext} */
export function buildWorldPlaceMediaPath(
  placeId: string,
  fileId: string,
  extension: string
): string {
  return `places/${placeId}/${fileId}.${extension}`;
}

export function isOwnedWorldPlaceMediaPath(
  placeId: string,
  storagePath: string
): boolean {
  if (!UUID_RE.test(placeId)) return false;
  if (storagePath.includes("..")) return false;
  const prefix = `places/${placeId}/`;
  if (!storagePath.startsWith(prefix)) return false;
  const rest = storagePath.slice(prefix.length);
  return /^[A-Za-z0-9_.-]+$/.test(rest) && !rest.includes("/");
}
