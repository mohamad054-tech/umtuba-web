import {
  ALLOWED_STORE_PRODUCT_IMAGE_MIME_TYPES,
  MAX_STORE_PRODUCT_MEDIA_BYTES,
  type AllowedStoreProductImageMimeType,
} from "./mediaConstants";

export function validateStoreProductImageFile(input: {
  mimeType?: unknown;
  byteSize?: unknown;
  fileName?: unknown;
}):
  | { ok: true; mimeType: AllowedStoreProductImageMimeType }
  | { ok: false; message: string } {
  const mimeType =
    typeof input.mimeType === "string" ? input.mimeType.trim().toLowerCase() : "";
  if (
    !ALLOWED_STORE_PRODUCT_IMAGE_MIME_TYPES.includes(
      mimeType as AllowedStoreProductImageMimeType
    )
  ) {
    return {
      ok: false,
      message: "Only JPEG, PNG, or WebP images are allowed.",
    };
  }

  const byteSize =
    typeof input.byteSize === "number" ? input.byteSize : Number(input.byteSize);
  if (
    !Number.isFinite(byteSize) ||
    byteSize <= 0 ||
    byteSize > MAX_STORE_PRODUCT_MEDIA_BYTES
  ) {
    return {
      ok: false,
      message: "Image must be between 1 byte and 10 MB.",
    };
  }

  const fileName =
    typeof input.fileName === "string" ? input.fileName.trim() : "";
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return { ok: false, message: "File name is invalid." };
  }

  return {
    ok: true,
    mimeType: mimeType as AllowedStoreProductImageMimeType,
  };
}
