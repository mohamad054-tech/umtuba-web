/** Store Hardening V1 — product media Storage constants. */

export const STORE_PRODUCT_MEDIA_BUCKET = "store-product-media";

/** Matches storage.buckets.file_size_limit in the hardening migration. */
export const MAX_STORE_PRODUCT_MEDIA_BYTES = 10 * 1024 * 1024;

/** Short-lived signed media URLs (15 minutes). */
export const STORE_PRODUCT_MEDIA_SIGNED_URL_TTL_SECONDS = 15 * 60;

/** Buyer digital delivery signed URLs — same bound as catalog media. */
export const STORE_DIGITAL_ACCESS_SIGNED_URL_TTL_SECONDS =
  STORE_PRODUCT_MEDIA_SIGNED_URL_TTL_SECONDS;

export const ALLOWED_STORE_DIGITAL_FILE_EXTENSIONS = [
  "pdf",
  "zip",
  "epub",
  "mp3",
  "mp4",
  "webm",
  "txt",
  "jpg",
  "jpeg",
  "png",
  "webp",
] as const;

export type AllowedStoreDigitalFileExtension =
  (typeof ALLOWED_STORE_DIGITAL_FILE_EXTENSIONS)[number];

/** Same bound as catalog product media / storage bucket file_size_limit. */
export const MAX_STORE_DIGITAL_PRODUCT_ASSET_BYTES =
  MAX_STORE_PRODUCT_MEDIA_BYTES;

/**
 * Extension → accepted Content-Type values for digital deliverables.
 * Browser MIME is checked against this map; extension remains authoritative.
 */
export const STORE_DIGITAL_ASSET_MIME_BY_EXTENSION: Record<
  AllowedStoreDigitalFileExtension,
  readonly string[]
> = {
  pdf: ["application/pdf"],
  zip: ["application/zip", "application/x-zip-compressed"],
  epub: ["application/epub+zip"],
  mp3: ["audio/mpeg", "audio/mp3"],
  mp4: ["video/mp4"],
  webm: ["video/webm"],
  txt: ["text/plain"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
};

export const STORE_DIGITAL_ASSET_ACCEPT_ATTR = [
  ...new Set(
    Object.values(STORE_DIGITAL_ASSET_MIME_BY_EXTENSION).flatMap((mimes) => [
      ...mimes,
    ])
  ),
  ...ALLOWED_STORE_DIGITAL_FILE_EXTENSIONS.map((ext) => `.${ext}`),
].join(",");

export const STORE_DIGITAL_ASSET_FILE_HINT =
  "PDF, ZIP, EPUB, MP3, MP4, WebM, TXT, JPEG, PNG, or WebP — maximum 10 MB";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const DIGITAL_FILE_EXT_RE = new RegExp(
  `^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.(${ALLOWED_STORE_DIGITAL_FILE_EXTENSIONS.join("|")})$`,
  "i"
);

export function normalizeStoreDigitalFileExtension(
  value: string
): AllowedStoreDigitalFileExtension | null {
  const ext = value.trim().toLowerCase().replace(/^\./, "");
  return (ALLOWED_STORE_DIGITAL_FILE_EXTENSIONS as readonly string[]).includes(
    ext
  )
    ? (ext as AllowedStoreDigitalFileExtension)
    : null;
}

export function extensionFromStoreDigitalAssetPath(
  storagePath: string
): AllowedStoreDigitalFileExtension | null {
  const base = storagePath.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  if (dot < 0) return null;
  return normalizeStoreDigitalFileExtension(base.slice(dot + 1));
}

export function preferredMimeForDigitalExtension(
  extension: AllowedStoreDigitalFileExtension
): string {
  return STORE_DIGITAL_ASSET_MIME_BY_EXTENSION[extension][0];
}

export const ALLOWED_STORE_PRODUCT_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedStoreProductImageMimeType =
  (typeof ALLOWED_STORE_PRODUCT_IMAGE_MIME_TYPES)[number];

export const STORE_PRODUCT_MEDIA_ACCEPT_ATTR = [
  ...ALLOWED_STORE_PRODUCT_IMAGE_MIME_TYPES,
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
].join(",");

export const STORE_PRODUCT_MEDIA_FILE_HINT =
  "JPEG, PNG, or WebP — maximum 10 MB";

export function extensionForStoreProductMime(
  mime: AllowedStoreProductImageMimeType
): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

/** Path: stores/{storeId}/products/{productId}/{uuid}.{ext} */
export function buildStoreProductMediaPath(
  storeId: string,
  productId: string,
  fileId: string,
  extension: string
): string {
  return `stores/${storeId}/products/${productId}/${fileId}.${extension}`;
}

export function isOwnedStoreProductMediaPath(
  storeId: string,
  productId: string,
  storagePath: string
): boolean {
  if (
    !UUID_RE.test(storeId) ||
    !UUID_RE.test(productId) ||
    !storagePath ||
    storagePath.includes("..") ||
    storagePath.startsWith("/") ||
    storagePath.length > 512
  ) {
    return false;
  }
  const prefix = `stores/${storeId}/products/${productId}/`;
  if (!storagePath.startsWith(prefix)) return false;
  const rest = storagePath.slice(prefix.length);
  if (!rest || rest.includes("/") || rest.includes("\\")) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$/i.test(
    rest
  );
}

/**
 * Digital deliverable path:
 * stores/{storeId}/products/{productId}/digital/{uuid}.{ext}
 */
export function buildStoreDigitalProductAssetPath(
  storeId: string,
  productId: string,
  fileId: string,
  extension: AllowedStoreDigitalFileExtension
): string {
  return `stores/${storeId}/products/${productId}/digital/${fileId}.${extension}`;
}

export function isOwnedStoreDigitalProductAssetPath(
  storeId: string,
  productId: string,
  storagePath: string
): boolean {
  if (
    !UUID_RE.test(storeId) ||
    !UUID_RE.test(productId) ||
    !storagePath ||
    storagePath.includes("..") ||
    storagePath.startsWith("/") ||
    storagePath.includes("\\") ||
    storagePath.length > 512
  ) {
    return false;
  }
  const prefix = `stores/${storeId}/products/${productId}/digital/`;
  if (!storagePath.startsWith(prefix)) return false;
  const rest = storagePath.slice(prefix.length);
  if (!rest || rest.includes("/") || rest.includes("\\")) return false;
  return DIGITAL_FILE_EXT_RE.test(rest);
}
