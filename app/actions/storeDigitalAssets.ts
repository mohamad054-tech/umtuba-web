"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  activateSellerDigitalAssetVersion,
  finalizeSellerDigitalAssetAttach,
  prepareSellerDigitalAssetUpload,
  type ActivateDigitalAssetVersionResult,
  type FinalizeDigitalAssetAttachResult,
  type PrepareDigitalAssetUploadResult,
} from "../../lib/store/digitalAssetUpload";

function rejectAuthorityClaims(formData: FormData): string | null {
  if (
    formData.has("store_id") ||
    formData.has("storeId") ||
    formData.has("seller_id") ||
    formData.has("sellerId") ||
    formData.has("bucket") ||
    formData.has("role") ||
    formData.has("user_id") ||
    formData.has("userId")
  ) {
    return "Store authority and storage destination are derived server-side.";
  }
  return null;
}

export async function prepareSellerDigitalAssetUploadAction(
  formData: FormData
): Promise<PrepareDigitalAssetUploadResult> {
  const authorityError = rejectAuthorityClaims(formData);
  if (authorityError) {
    return {
      ok: false,
      code: "forbidden",
      message: authorityError,
    };
  }

  const user = await getServerUser();
  const productId = String(formData.get("productId") || "").trim();
  const supabase = await createClient();

  return prepareSellerDigitalAssetUpload(supabase, {
    productId,
    userId: user?.id ?? null,
    fileName: formData.get("fileName"),
    mimeType: formData.get("mimeType"),
    byteSize: formData.get("byteSize"),
  });
}

export async function finalizeSellerDigitalAssetAttachAction(
  formData: FormData
): Promise<FinalizeDigitalAssetAttachResult> {
  const authorityError = rejectAuthorityClaims(formData);
  if (authorityError) {
    return {
      ok: false,
      code: "forbidden",
      message: authorityError,
      previousPreserved: true,
    };
  }

  const user = await getServerUser();
  const productId = String(formData.get("productId") || "").trim();
  const supabase = await createClient();

  const result = await finalizeSellerDigitalAssetAttach(supabase, {
    productId,
    userId: user?.id ?? null,
    storagePath: formData.get("storagePath"),
    title: formData.get("title"),
  });

  if (result.ok) {
    revalidatePath(`/seller/store/products/${productId}/edit`);
  }

  return result;
}

export async function activateSellerDigitalAssetVersionAction(
  formData: FormData
): Promise<ActivateDigitalAssetVersionResult> {
  const authorityError = rejectAuthorityClaims(formData);
  if (authorityError) {
    return {
      ok: false,
      code: "forbidden",
      message: authorityError,
    };
  }

  const user = await getServerUser();
  const productId = String(formData.get("productId") || "").trim();
  const versionId = String(formData.get("versionId") || "").trim();
  const supabase = await createClient();

  const result = await activateSellerDigitalAssetVersion(supabase, {
    productId,
    versionId,
    userId: user?.id ?? null,
  });

  if (result.ok) {
    revalidatePath(`/seller/store/products/${productId}/edit`);
  }

  return result;
}
