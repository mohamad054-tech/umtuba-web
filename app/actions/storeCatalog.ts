"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerUser, createClient } from "../../lib/supabase/server";
import {
  archiveProduct,
  archiveProductMedia,
  attachProductMediaMetadata,
  createDraftProduct,
  getOwnedOrMemberStore,
  submitProductForReview,
  updateDraftProduct,
  updateProductMarketplaceEligibility,
  updateProductMediaLayout,
  updateStoreBasics,
  upsertVariantPriceInventory,
} from "../../lib/store/sellerStore";
import { canManageCatalog } from "../../lib/store/permissions";
import { assertPrimaryCategoryEligibleForReview } from "../../lib/store/categoryTaxonomySeed";
import { buildOptionValuesPayload } from "../../lib/store/sellerCatalogPresentation";
import {
  assertBulkFieldEditBatchSize,
  buildBulkFieldUpdateDraftPayload,
  deferredSellerCatalogBulkFieldReason,
  isBulkFieldOperationAllowed,
  isSellerCatalogBulkFieldSupported,
  mapWithConcurrencyLimit,
  mergeBulkFieldPlanWithExecutionResults,
  normalizeBulkCategoryId,
  normalizeBulkShortDescription,
  parseSellerCatalogBulkFieldId,
  parseSellerCatalogBulkFieldOperation,
  planSellerCatalogBulkFieldEdit,
  SELLER_CATALOG_BULK_FIELD_EDIT_CONCURRENCY,
  type SellerCatalogBulkFieldSelectionItem,
} from "../../lib/store/sellerCatalogBulkFieldEditing";
import { uniqueBulkSelectionIds } from "../../lib/store/sellerCatalogBulkOperations";
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
    marketplaceSupplierEnabled: formData.has("marketplaceSupplierEnabled"),
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

export async function updateProductMarketplaceEligibilityAction(
  formData: FormData
): Promise<void> {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    redirect(`/seller/store/products?error=${encodeURIComponent("Missing product id.")}`);
  }

  const supabase = await createClient();
  const result = await updateProductMarketplaceEligibility(
    supabase,
    user.id,
    productId,
    formData.has("marketplaceEligible")
  );

  if (!result.ok) {
    redirect(
      `/seller/store/products/${productId}/edit?error=${encodeURIComponent(result.message)}`
    );
  }
  revalidatePath(`/seller/store/products/${productId}/edit`);
  revalidatePath("/seller/store/products");
  revalidatePath(APP_ROUTES.sellerMarketplace);
  redirect(`/seller/store/products/${productId}/edit`);
}

export async function upsertVariantAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "");
  if (!productId) {
    redirect(`/seller/store/products?error=${encodeURIComponent("Missing product id.")}`);
  }

  const supabase = await createClient();
  const optionValues = buildOptionValuesPayload({
    color: String(formData.get("optionColor") || ""),
    size: String(formData.get("optionSize") || ""),
    capacity: String(formData.get("optionCapacity") || ""),
  });
  const optionValuesJson = String(formData.get("optionValues") || "").trim();
  const result = await upsertVariantPriceInventory(
    supabase,
    user.id,
    productId,
    {
      variantId: formData.get("variantId"),
      sku: formData.get("sku"),
      variantTitle: formData.get("variantTitle"),
      optionValues:
        optionValuesJson ||
        (Object.keys(optionValues).length > 0
          ? JSON.stringify(optionValues)
          : "{}"),
      priceMajor: formData.get("priceMajor"),
      compareAtMajor: formData.get("compareAtMajor"),
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

export async function bulkArchiveProductsAction(
  formData: FormData
): Promise<
  | {
      ok: true;
      archived: number;
      failed: number;
      skipped: number;
      results: Array<{
        productId: string;
        outcome: "success" | "failed" | "skipped";
        reason?: string;
      }>;
    }
  | { ok: false; message: string }
> {
  const user = await requireUser();
  const ids = formData
    .getAll("productId")
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return { ok: false, message: "Select at least one product." };
  }

  const supabase = await createClient();
  let archived = 0;
  let failed = 0;
  const results: Array<{
    productId: string;
    outcome: "success" | "failed" | "skipped";
    reason?: string;
  }> = [];
  for (const productId of ids) {
    const result = await archiveProduct(supabase, user.id, productId);
    if (result.ok) {
      archived += 1;
      results.push({ productId, outcome: "success" });
    } else {
      failed += 1;
      results.push({
        productId,
        outcome: "failed",
        reason: result.message,
      });
    }
  }
  revalidatePath("/seller/store/products");
  return { ok: true, archived, failed, skipped: 0, results };
}

export async function bulkSubmitProductsAction(
  formData: FormData
): Promise<
  | {
      ok: true;
      submitted: number;
      failed: number;
      skipped: number;
      results: Array<{
        productId: string;
        outcome: "success" | "failed" | "skipped";
        reason?: string;
      }>;
    }
  | { ok: false; message: string }
> {
  const user = await requireUser();
  const ids = formData
    .getAll("productId")
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return { ok: false, message: "Select at least one product." };
  }

  const supabase = await createClient();
  let submitted = 0;
  let failed = 0;
  const results: Array<{
    productId: string;
    outcome: "success" | "failed" | "skipped";
    reason?: string;
  }> = [];
  for (const productId of ids) {
    const result = await submitProductForReview(supabase, user.id, productId);
    if (result.ok) {
      submitted += 1;
      results.push({ productId, outcome: "success" });
    } else {
      failed += 1;
      results.push({
        productId,
        outcome: "failed",
        reason: result.message,
      });
    }
  }
  revalidatePath("/seller/store/products");
  return { ok: true, submitted, failed, skipped: 0, results };
}

export async function bulkEditProductFieldsAction(
  formData: FormData
): Promise<
  | {
      ok: true;
      succeeded: number;
      failed: number;
      skipped: number;
      overall: "success" | "partial" | "failed" | "skipped_only" | "empty";
      results: Array<{
        productId: string;
        outcome: "success" | "failed" | "skipped";
        reason?: string;
      }>;
    }
  | { ok: false; message: string }
> {
  const user = await requireUser();
  const fieldRaw = formData.get("field");
  const operationRaw = formData.get("operation");
  const field = parseSellerCatalogBulkFieldId(fieldRaw);
  const operation = parseSellerCatalogBulkFieldOperation(operationRaw);

  if (!field) {
    return { ok: false, message: "Invalid bulk field." };
  }
  if (!operation) {
    return { ok: false, message: "Invalid bulk field operation." };
  }
  if (!isSellerCatalogBulkFieldSupported(field)) {
    return {
      ok: false,
      message:
        deferredSellerCatalogBulkFieldReason(field) ||
        "Field is not supported for bulk edit.",
    };
  }
  if (!isBulkFieldOperationAllowed(field, operation)) {
    return {
      ok: false,
      message: `Operation "${operation}" is not allowed for this field.`,
    };
  }

  const ids = uniqueBulkSelectionIds(
    formData
      .getAll("productId")
      .map((value) => ({
        id: String(value || "").trim(),
        title: "",
        status: "draft",
        storeId: "",
      }))
  );
  const sizeGate = assertBulkFieldEditBatchSize(ids.length);
  if (!sizeGate.ok) {
    return { ok: false, message: sizeGate.message };
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) {
    return { ok: false, message: "Store membership required." };
  }
  if (!canManageCatalog(membership.role)) {
    return {
      ok: false,
      message: "You do not have permission to edit catalog products.",
    };
  }

  const storeId = membership.store.id;
  const categoryIdRaw = String(formData.get("categoryId") || "").trim();
  const shortDescriptionRaw = String(
    formData.get("shortDescription") || ""
  );

  let categoryFound: boolean | undefined;
  let categoryStatus: string | null | undefined;
  let categoryName: string | null = null;

  if (field === "category" && operation === "replace") {
    const parsed = normalizeBulkCategoryId(categoryIdRaw);
    if (!parsed.ok) {
      return { ok: false, message: parsed.message };
    }
    const { data: categoryRow } = await supabase
      .from("product_categories")
      .select("id, name, status")
      .eq("id", parsed.value)
      .maybeSingle();
    categoryFound = Boolean(categoryRow);
    categoryStatus = categoryRow ? String(categoryRow.status) : null;
    categoryName = categoryRow ? String(categoryRow.name) : null;
    const eligibility = assertPrimaryCategoryEligibleForReview({
      primaryCategoryId: parsed.value,
      categoryFound,
      categoryStatus,
    });
    if (!eligibility.ok) {
      return { ok: false, message: eligibility.message };
    }
  }

  if (field === "short_description" && operation === "replace") {
    const parsed = normalizeBulkShortDescription(shortDescriptionRaw);
    if (!parsed.ok) {
      return { ok: false, message: parsed.message };
    }
  }

  const { data: rows, error } = await supabase
    .from("store_products")
    .select(
      "id, title, status, store_id, primary_category_id, short_description"
    )
    .eq("store_id", storeId)
    .in("id", ids);

  if (error) {
    console.error("bulkEditProductFieldsAction load", error);
    return { ok: false, message: "Unable to load selected products." };
  }

  const byId = new Map(
    (rows ?? []).map((row) => [String(row.id), row] as const)
  );
  const selectionItems: SellerCatalogBulkFieldSelectionItem[] = ids.map(
    (id) => {
      const row = byId.get(id);
      if (!row) {
        return {
          id,
          title: id,
          status: "missing",
          storeId,
          primaryCategoryId: null,
          shortDescription: null,
        };
      }
      return {
        id: String(row.id),
        title: String(row.title ?? ""),
        status: String(row.status ?? ""),
        storeId: String(row.store_id ?? ""),
        primaryCategoryId: row.primary_category_id
          ? String(row.primary_category_id)
          : null,
        shortDescription: row.short_description
          ? String(row.short_description)
          : null,
      };
    }
  );

  // Mark missing rows as outside store by forcing a rejected store id in plan
  // via a synthetic status skip — rebuild items so missing stay in store scope
  // but fail editability, then add explicit skip for missing.
  const presentItems: SellerCatalogBulkFieldSelectionItem[] = [];
  const missingResults: Array<{
    productId: string;
    outcome: "skipped";
    reason: string;
  }> = [];
  for (const item of selectionItems) {
    if (!byId.has(item.id)) {
      missingResults.push({
        productId: item.id,
        outcome: "skipped",
        reason: "Product not found in this store (stale or cross-store id).",
      });
      continue;
    }
    presentItems.push(item);
  }

  if (presentItems.length === 0) {
    revalidatePath("/seller/store/products");
    return {
      ok: true,
      succeeded: 0,
      failed: 0,
      skipped: missingResults.length,
      overall: missingResults.length > 0 ? "skipped_only" : "empty",
      results: missingResults,
    };
  }

  const plan = planSellerCatalogBulkFieldEdit({
    field,
    operation,
    storeId,
    items: presentItems,
    categoryId: categoryIdRaw || null,
    categoryName,
    shortDescription: shortDescriptionRaw,
    categoryFound,
    categoryStatus,
  });

  if (!plan.supported) {
    return {
      ok: false,
      message: plan.deferredReason || "Bulk field edit is not available.",
    };
  }

  const payload = buildBulkFieldUpdateDraftPayload({
    field: field as "category" | "short_description",
    operation,
    categoryId: categoryIdRaw || null,
    shortDescription: shortDescriptionRaw,
  });

  const execution = await mapWithConcurrencyLimit(
    plan.eligible,
    SELLER_CATALOG_BULK_FIELD_EDIT_CONCURRENCY,
    async (item) => {
      const result = await updateDraftProduct(
        supabase,
        user.id,
        item.id,
        payload
      );
      return {
        productId: item.id,
        ok: result.ok,
        message: result.ok ? undefined : result.message,
      };
    }
  );

  const summary = mergeBulkFieldPlanWithExecutionResults({
    plan,
    execution,
  });

  const results = [
    ...missingResults,
    ...summary.results,
  ];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  for (const row of results) {
    if (row.outcome === "success") succeeded += 1;
    else if (row.outcome === "failed") failed += 1;
    else skipped += 1;
  }
  const total = results.length;
  let overall: "success" | "partial" | "failed" | "skipped_only" | "empty" =
    "empty";
  if (total === 0) overall = "empty";
  else if (succeeded === total) overall = "success";
  else if (succeeded === 0 && failed === 0) overall = "skipped_only";
  else if (succeeded === 0) overall = "failed";
  else overall = "partial";

  revalidatePath("/seller/store/products");
  return { ok: true, succeeded, failed, skipped, overall, results };
}

export async function updateProductMediaLayoutAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "").trim();
  if (!productId) return { ok: false, message: "Missing product id." };

  const orderedRaw = String(formData.get("orderedMediaIds") || "").trim();
  let orderedMediaIds: string[] = [];
  try {
    const parsed = JSON.parse(orderedRaw) as unknown;
    if (Array.isArray(parsed)) {
      orderedMediaIds = parsed.map((id) => String(id));
    }
  } catch {
    return { ok: false, message: "Invalid media order payload." };
  }

  const coverMediaId = String(formData.get("coverMediaId") || "").trim() || null;
  const supabase = await createClient();
  const result = await updateProductMediaLayout(supabase, user.id, productId, {
    orderedMediaIds,
    coverMediaId,
  });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath(`/seller/store/products/${productId}/edit`);
  return { ok: true };
}

export async function archiveProductMediaAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await requireUser();
  const productId = String(formData.get("productId") || "").trim();
  const mediaId = String(formData.get("mediaId") || "").trim();
  if (!productId || !mediaId) {
    return { ok: false, message: "Product and media ids are required." };
  }

  const supabase = await createClient();
  const result = await archiveProductMedia(supabase, user.id, productId, mediaId);
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath(`/seller/store/products/${productId}/edit`);
  return { ok: true };
}
