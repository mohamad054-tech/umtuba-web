"use server";

import { revalidatePath } from "next/cache";
import { createClient, getServerUser } from "../../lib/supabase/server";
import {
  addSupplierProductToMyStore,
  updateSellerListingMerchandising,
} from "../../lib/store/marketplaceSupplierSellerQueries";
import { isMarketplaceListingStatus } from "../../lib/store/marketplaceSupplierSeller";
import { getOwnedOrMemberStore } from "../../lib/store/sellerStore";
import { canManageCatalog } from "../../lib/store/permissions";
import {
  canCreateSupplierListing,
  rejectClientListingCreateFields,
} from "../../lib/store/supplierListingCreateHardening";
import { APP_ROUTES } from "../lib/nav";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function addToMyStoreAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }

  const bag: Record<string, unknown> = {};
  for (const key of formData.keys()) {
    bag[key] = formData.get(key);
  }
  const clientFields = rejectClientListingCreateFields(bag);
  if (!clientFields.ok) {
    return { ok: false as const, message: clientFields.message };
  }

  // Reject client store/money identity — resolve server-side.
  if (
    formData.has("grand_total_minor") ||
    formData.has("unit_price_minor") ||
    formData.has("supplier_store_id") ||
    formData.has("listing_id")
  ) {
    return {
      ok: false as const,
      message: "Client must not supply money or supplier identity fields.",
    };
  }

  const sourceProductId = formString(formData, "source_product_id").trim();
  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership || !canCreateSupplierListing(membership.role)) {
    return {
      ok: false as const,
      message: "Only store owners or managers may create marketplace listings.",
    };
  }

  const result = await addSupplierProductToMyStore(supabase, {
    sourceProductId,
    sellerStoreId: membership.store.id,
    role: membership.role,
  });

  if (result.ok) {
    revalidatePath(APP_ROUTES.sellerMarketplace);
    revalidatePath(APP_ROUTES.sellerStoreProducts);
    revalidatePath(APP_ROUTES.sellerStore);
  }
  return result;
}

export async function updateSellerListingAction(formData: FormData) {
  const user = await getServerUser();
  if (!user) {
    return { ok: false as const, message: "Sign in required.", requiresAuth: true };
  }

  const listingId = formString(formData, "listing_id").trim();
  const statusRaw = formString(formData, "status").trim();
  const displayTitleOverride = formString(formData, "display_title_override");
  const marketingDescription = formString(formData, "marketing_description");
  if (statusRaw && !isMarketplaceListingStatus(statusRaw)) {
    return { ok: false as const, message: "Listing status is invalid." };
  }
  const status = isMarketplaceListingStatus(statusRaw) ? statusRaw : undefined;

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership || !canManageCatalog(membership.role)) {
    return { ok: false as const, message: "Not allowed to manage listings." };
  }

  const result = await updateSellerListingMerchandising(supabase, {
    listingId,
    sellerStoreId: membership.store.id,
    role: membership.role,
    displayTitleOverride:
      formData.has("display_title_override") ? displayTitleOverride : undefined,
    marketingDescription:
      formData.has("marketing_description") ? marketingDescription : undefined,
    status,
  });

  if (result.ok) {
    revalidatePath(APP_ROUTES.sellerMarketplace);
    revalidatePath(APP_ROUTES.sellerStoreProducts);
    revalidatePath(APP_ROUTES.sellerStore);
  }
  return result;
}
