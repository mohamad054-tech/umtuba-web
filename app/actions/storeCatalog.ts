"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser, createClient } from "../../lib/supabase/server";
import {
  archiveProduct,
  attachProductMediaMetadata,
  createDraftProduct,
  submitProductForReview,
  updateDraftProduct,
  updateStoreBasics,
  upsertVariantPriceInventory,
} from "../../lib/store/sellerStore";
import { APP_ROUTES } from "../lib/nav";

async function requireUser() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerStore)}`
    );
  }
  return user;
}

/**
 * Store creation now happens through the Seller Self-Service setup wizard
 * (`/seller/setup`). This action only exists so any lingering callers land
 * on the correct next step instead of a dead end.
 */
export async function createStoreAction(): Promise<void> {
  await requireUser();
  redirect(APP_ROUTES.sellerSetup);
}

export async function updateStoreAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const storeId = String(formData.get("storeId") || "");
  if (!storeId) {
    redirect(`/seller/store?error=${encodeURIComponent("Missing store id.")}`);
  }

  const supabase = await createClient();
  const result = await updateStoreBasics(supabase, user.id, storeId, {
    name: formData.get("name"),
    description: formData.get("description"),
    city: formData.get("city"),
    publicContactEmail: formData.get("publicContactEmail"),
    publicContactPhone: formData.get("publicContactPhone"),
    publicContactUrl: formData.get("publicContactUrl"),
  });

  if (!result.ok) {
    redirect(`/seller/store?error=${encodeURIComponent(result.message)}`);
  }
  revalidatePath("/seller/store");
  revalidatePath(`/store/${result.data.slug}`);
  redirect("/seller/store");
}

export async function createDraftProductAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const storeId = String(formData.get("storeId") || "");
  if (!storeId) {
    redirect(
      `/seller/store/products/new?error=${encodeURIComponent("Missing store id.")}`
    );
  }

  const supabase = await createClient();
  const result = await createDraftProduct(supabase, user.id, storeId, {
    title: formData.get("title"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    productType: formData.get("productType"),
    categoryId: formData.get("categoryId"),
    sku: formData.get("sku"),
    priceMajor: formData.get("priceMajor"),
    currency: formData.get("currency") || "USD",
    onHand: formData.get("onHand"),
    safetyStock: formData.get("safetyStock"),
  });

  if (!result.ok) {
    redirect(
      `/seller/store/products/new?error=${encodeURIComponent(result.message)}`
    );
  }
  revalidatePath("/seller/store/products");
  redirect(`/seller/store/products/${result.data.id}/edit`);
}

export async function updateDraftProductAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    redirect(`/seller/store/products?error=${encodeURIComponent("Missing product id.")}`);
  }

  const supabase = await createClient();
  const result = await updateDraftProduct(supabase, user.id, productId, {
    title: formData.get("title"),
    slug: formData.get("slug"),
    shortDescription: formData.get("shortDescription"),
    description: formData.get("description"),
    productType: formData.get("productType"),
    categoryId: formData.get("categoryId"),
  });

  if (!result.ok) {
    redirect(
      `/seller/store/products/${productId}/edit?error=${encodeURIComponent(result.message)}`
    );
  }
  revalidatePath(`/seller/store/products/${productId}/edit`);
  revalidatePath("/seller/store/products");
  redirect(`/seller/store/products/${productId}/edit`);
}

export async function upsertVariantAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    redirect(`/seller/store/products?error=${encodeURIComponent("Missing product id.")}`);
  }

  const supabase = await createClient();
  const result = await upsertVariantPriceInventory(
    supabase,
    user.id,
    productId,
    {
      variantId: formData.get("variantId"),
      sku: formData.get("sku"),
      variantTitle: formData.get("variantTitle"),
      optionValues: formData.get("optionValues"),
      priceMajor: formData.get("priceMajor"),
      currency: formData.get("currency") || "USD",
      onHand: formData.get("onHand"),
      safetyStock: formData.get("safetyStock"),
      allowBackorder: formData.get("allowBackorder"),
    }
  );

  if (!result.ok) {
    redirect(
      `/seller/store/products/${productId}/edit?error=${encodeURIComponent(result.message)}`
    );
  }
  revalidatePath(`/seller/store/products/${productId}/edit`);
  redirect(`/seller/store/products/${productId}/edit`);
}

export async function attachMediaMetadataResultAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    return { ok: false, message: "Missing product id." };
  }

  const supabase = await createClient();
  const result = await attachProductMediaMetadata(
    supabase,
    user.id,
    productId,
    {
      storagePath: formData.get("storagePath"),
      mediaType: formData.get("mediaType") || "image",
      altText: formData.get("altText"),
      role: formData.get("role") || "gallery",
      sortOrder: formData.get("sortOrder"),
      variantId: formData.get("variantId"),
    }
  );

  if (!result.ok) {
    return { ok: false, message: result.message };
  }
  revalidatePath(`/seller/store/products/${productId}/edit`);
  return { ok: true };
}

export async function attachMediaMetadataAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") || "");
  const result = await attachMediaMetadataResultAction(formData);
  if (!productId) {
    redirect(`/seller/store/products?error=${encodeURIComponent("Missing product id.")}`);
  }
  if (!result.ok) {
    redirect(
      `/seller/store/products/${productId}/edit?error=${encodeURIComponent(result.message)}`
    );
  }
  redirect(`/seller/store/products/${productId}/edit`);
}

export async function submitProductReviewAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    redirect(`/seller/store/products?error=${encodeURIComponent("Missing product id.")}`);
  }

  const supabase = await createClient();
  const result = await submitProductForReview(supabase, user.id, productId);

  if (!result.ok) {
    redirect(
      `/seller/store/products/${productId}/edit?error=${encodeURIComponent(result.message)}`
    );
  }
  revalidatePath(`/seller/store/products/${productId}/edit`);
  revalidatePath("/seller/store/products");
  redirect("/seller/store/products");
}

export async function archiveProductAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    redirect(`/seller/store/products?error=${encodeURIComponent("Missing product id.")}`);
  }

  const supabase = await createClient();
  const result = await archiveProduct(supabase, user.id, productId);

  if (!result.ok) {
    redirect(
      `/seller/store/products/${productId}/edit?error=${encodeURIComponent(result.message)}`
    );
  }
  revalidatePath("/seller/store/products");
  redirect("/seller/store/products");
}
