"use client";

import { createClient } from "../supabase/client";
import { getAuthenticatedUser } from "../supabase/auth";
import {
  STORE_PRODUCT_MEDIA_BUCKET,
  buildStoreProductMediaPath,
  extensionForStoreProductMime,
  isOwnedStoreProductMediaPath,
} from "./mediaConstants";
import { validateStoreProductImageFile } from "./mediaValidation";

export type UploadStoreProductMediaResult = {
  path: string;
  mimeType: string;
  byteSize: number;
};

/**
 * Client upload into private `store-product-media` under
 * stores/{storeId}/products/{productId}/{uuid}.{ext}.
 * Server re-validates path ownership before product_media insert.
 * Display uses short-lived signed URLs — never getPublicUrl.
 */
export async function uploadStoreProductMedia(
  file: File,
  input: { storeId: string; productId: string }
): Promise<UploadStoreProductMediaResult> {
  const supabase = createClient();
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("Sign in to upload product media.");
  }

  const fileCheck = validateStoreProductImageFile({
    mimeType: file.type,
    byteSize: file.size,
    fileName: file.name,
  });
  if (!fileCheck.ok) {
    throw new Error(fileCheck.message);
  }

  const extension = extensionForStoreProductMime(fileCheck.mimeType);
  const fileId = crypto.randomUUID();
  const filePath = buildStoreProductMediaPath(
    input.storeId,
    input.productId,
    fileId,
    extension
  );

  if (!isOwnedStoreProductMediaPath(input.storeId, input.productId, filePath)) {
    throw new Error("Invalid product media upload path.");
  }

  const { error } = await supabase.storage
    .from(STORE_PRODUCT_MEDIA_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: fileCheck.mimeType,
      upsert: false,
    });

  if (error) {
    console.error("uploadStoreProductMedia", error);
    throw new Error("Unable to upload product image.");
  }

  return {
    path: filePath,
    mimeType: fileCheck.mimeType,
    byteSize: file.size,
  };
}
