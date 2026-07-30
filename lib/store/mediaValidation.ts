import {
  ALLOWED_STORE_PRODUCT_IMAGE_MIME_TYPES,
  MAX_STORE_DIGITAL_PRODUCT_ASSET_BYTES,
  MAX_STORE_PRODUCT_MEDIA_BYTES,
  STORE_DIGITAL_ASSET_MIME_BY_EXTENSION,
  normalizeStoreDigitalFileExtension,
  preferredMimeForDigitalExtension,
  type AllowedStoreDigitalFileExtension,
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

/**
 * Server-side digital deliverable validation.
 * Extension is authoritative; MIME must match the extension allow-list when present.
 */
export function validateStoreDigitalAssetFile(input: {
  mimeType?: unknown;
  byteSize?: unknown;
  fileName?: unknown;
}):
  | {
      ok: true;
      extension: AllowedStoreDigitalFileExtension;
      mimeType: string;
      byteSize: number;
      titleHint: string | null;
    }
  | { ok: false; message: string; code: "unsafe_name" | "unsupported_type" | "oversized" } {
  const fileName =
    typeof input.fileName === "string" ? input.fileName.trim() : "";
  if (
    !fileName ||
    fileName.includes("..") ||
    fileName.includes("/") ||
    fileName.includes("\\") ||
    fileName.includes("\0")
  ) {
    return {
      ok: false,
      code: "unsafe_name",
      message: "File name is invalid.",
    };
  }

  const dot = fileName.lastIndexOf(".");
  if (dot <= 0 || dot === fileName.length - 1) {
    return {
      ok: false,
      code: "unsupported_type",
      message: "Unsupported digital file type.",
    };
  }

  const extension = normalizeStoreDigitalFileExtension(fileName.slice(dot + 1));
  if (!extension) {
    return {
      ok: false,
      code: "unsupported_type",
      message: "Unsupported digital file type.",
    };
  }

  const mimeType =
    typeof input.mimeType === "string" ? input.mimeType.trim().toLowerCase() : "";
  const allowedMimes = STORE_DIGITAL_ASSET_MIME_BY_EXTENSION[extension];
  if (mimeType && !allowedMimes.includes(mimeType)) {
    return {
      ok: false,
      code: "unsupported_type",
      message: "File type does not match the allowed digital formats.",
    };
  }

  const byteSize =
    typeof input.byteSize === "number" ? input.byteSize : Number(input.byteSize);
  if (
    !Number.isFinite(byteSize) ||
    byteSize <= 0 ||
    byteSize > MAX_STORE_DIGITAL_PRODUCT_ASSET_BYTES
  ) {
    return {
      ok: false,
      code: "oversized",
      message: "Digital file must be between 1 byte and 10 MB.",
    };
  }

  const baseName = fileName.slice(0, dot).trim();
  return {
    ok: true,
    extension,
    mimeType: mimeType || preferredMimeForDigitalExtension(extension),
    byteSize,
    titleHint: baseName || null,
  };
}
