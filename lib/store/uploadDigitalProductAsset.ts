"use client";

import { createClient } from "../supabase/client";
import { getAuthenticatedUser } from "../supabase/auth";
import {
  STORE_PRODUCT_MEDIA_BUCKET,
  isOwnedStoreDigitalProductAssetPath,
} from "./mediaConstants";
import { validateStoreDigitalAssetFile } from "./mediaValidation";

export type UploadStoreDigitalProductAssetResult = {
  storagePath: string;
  contentType: string;
  byteSize: number;
};

/**
 * Client upload into private `store-product-media` at a server-prepared
 * owned digital path. Never constructs store/product/path client-side.
 */
export async function uploadStoreDigitalProductAsset(
  file: File,
  input: {
    storagePath: string;
    contentType: string;
    storeId: string;
    productId: string;
  }
): Promise<UploadStoreDigitalProductAssetResult> {
  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("Sign in to upload a digital asset.");
  }

  const fileCheck = validateStoreDigitalAssetFile({
    mimeType: file.type,
    byteSize: file.size,
    fileName: file.name,
  });
  if (!fileCheck.ok) {
    throw new Error(fileCheck.message);
  }

  const storagePath = input.storagePath.trim();
  if (
    !isOwnedStoreDigitalProductAssetPath(
      input.storeId,
      input.productId,
      storagePath
    )
  ) {
    throw new Error("Invalid digital asset upload path.");
  }

  const supabase = createClient();
  const { error } = await supabase.storage
    .from(STORE_PRODUCT_MEDIA_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: input.contentType || fileCheck.mimeType,
      upsert: false,
    });

  if (error) {
    console.error("uploadStoreDigitalProductAsset failed");
    throw new Error("Unable to upload digital file.");
  }

  return {
    storagePath,
    contentType: input.contentType || fileCheck.mimeType,
    byteSize: file.size,
  };
}
