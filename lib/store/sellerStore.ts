import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoreMemberRole, StoreProductRow, StoreRow } from "./types";
import {
  validateMediaMetadata,
  validatePriceInput,
  validateProductDraftInput,
  validateVariantInput,
} from "./validators";
import { validateInventoryInput } from "./inventory";
import { canManageCatalog, canManageStoreSettings } from "./permissions";
import { canManageSellerCatalog } from "./sellerApplications";
import { majorToMinorUnits } from "./money";

type AnyClient = SupabaseClient;

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string };

export async function getMembership(
  supabase: AnyClient,
  storeId: string,
  userId: string
): Promise<StoreMemberRole | null> {
  const { data } = await supabase
    .from("store_members")
    .select("role, status")
    .eq("store_id", storeId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  return (data?.role as StoreMemberRole | undefined) ?? null;
}

export async function getOwnedOrMemberStore(
  supabase: AnyClient,
  userId: string
): Promise<{ store: StoreRow; role: StoreMemberRole } | null> {
  const { data: membership } = await supabase
    .from("store_members")
    .select("store_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("id", membership.store_id)
    .maybeSingle();

  if (!store) return null;
  return { store: store as StoreRow, role: membership.role as StoreMemberRole };
}

/**
 * Marketplace Foundation V1: stores are no longer created directly by the
 * app. They are provisioned by the service-role `approve_seller_application`
 * RPC once an operator approves a `/seller/apply` submission. Kept as a
 * stub (rather than deleted) so any lingering callers fail closed with a
 * helpful redirect instead of a broken insert.
 */
export async function createStoreForUser(
  _supabase: AnyClient,
  _userId: string,
  _raw: Record<string, unknown>
): Promise<ActionResult<StoreRow>> {
  return {
    ok: false,
    message:
      "Store creation now happens through the seller application. Apply at /seller/apply.",
  };
}

export async function updateStoreBasics(
  supabase: AnyClient,
  userId: string,
  storeId: string,
  raw: Record<string, unknown>
): Promise<ActionResult<StoreRow>> {
  const role = await getMembership(supabase, storeId, userId);
  if (!canManageStoreSettings(role)) {
    return { ok: false, message: "You do not have permission to update this store." };
  }

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (name.length < 2 || name.length > 80) {
    return { ok: false, message: "Store name must be 2–80 characters." };
  }
  const description =
    typeof raw.description === "string" && raw.description.trim()
      ? raw.description.trim().slice(0, 2000)
      : null;

  const city =
    typeof raw.city === "string" && raw.city.trim()
      ? raw.city.trim().slice(0, 80)
      : null;

  const publicContactEmail =
    typeof raw.publicContactEmail === "string" && raw.publicContactEmail.trim()
      ? raw.publicContactEmail.trim().slice(0, 160)
      : null;
  if (publicContactEmail && !/^\S+@\S+\.\S+$/.test(publicContactEmail)) {
    return { ok: false, message: "Contact email is invalid." };
  }

  const publicContactPhone =
    typeof raw.publicContactPhone === "string" && raw.publicContactPhone.trim()
      ? raw.publicContactPhone.trim().slice(0, 40)
      : null;

  const publicContactUrl =
    typeof raw.publicContactUrl === "string" && raw.publicContactUrl.trim()
      ? raw.publicContactUrl.trim().slice(0, 300)
      : null;
  if (publicContactUrl && /\s/.test(publicContactUrl)) {
    return { ok: false, message: "Contact link must not contain spaces." };
  }

  const { data, error } = await supabase
    .from("stores")
    .update({
      name,
      description,
      city,
      public_contact_email: publicContactEmail,
      public_contact_phone: publicContactPhone,
      public_contact_url: publicContactUrl,
    })
    .eq("id", storeId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("updateStoreBasics", error);
    return { ok: false, message: "Unable to update store." };
  }

  return { ok: true, data: data as StoreRow };
}

export async function createDraftProduct(
  supabase: AnyClient,
  userId: string,
  storeId: string,
  raw: Record<string, unknown>
): Promise<ActionResult<StoreProductRow>> {
  const role = await getMembership(supabase, storeId, userId);
  const { data: store } = await supabase
    .from("stores")
    .select("verification_status")
    .eq("id", storeId)
    .maybeSingle();

  if (
    !canManageSellerCatalog({
      role,
      storeVerificationStatus: store?.verification_status ?? null,
    })
  ) {
    if (!canManageCatalog(role)) {
      return { ok: false, message: "You do not have permission to create products." };
    }
    return {
      ok: false,
      message:
        "Your store must be verified before you can create products. Apply at /seller/apply.",
    };
  }

  const parsed = validateProductDraftInput(raw);
  if (!parsed.ok) return parsed;

  const categoryId =
    typeof raw.categoryId === "string" && raw.categoryId.trim()
      ? raw.categoryId.trim()
      : null;

  const sku =
    typeof raw.sku === "string" && raw.sku.trim()
      ? raw.sku.trim()
      : `SKU-${Date.now().toString(36).toUpperCase()}`;
  const variantParsed = validateVariantInput({
    sku,
    title: "Default",
    optionValues: {},
  });
  if (!variantParsed.ok) return variantParsed;

  const currency =
    typeof raw.currency === "string" ? raw.currency : "USD";
  let amountMinor: number | null = null;
  if (raw.amountMinor !== undefined && raw.amountMinor !== null && raw.amountMinor !== "") {
    const price = validatePriceInput({
      amountMinor: raw.amountMinor,
      currency,
    });
    if (!price.ok) return price;
    amountMinor = price.value.amountMinor;
  } else if (raw.priceMajor !== undefined && raw.priceMajor !== null && raw.priceMajor !== "") {
    const minor = majorToMinorUnits(raw.priceMajor);
    if (minor === null) {
      return { ok: false, message: "Price is invalid." };
    }
    const price = validatePriceInput({ amountMinor: minor, currency });
    if (!price.ok) return price;
    amountMinor = price.value.amountMinor;
  } else {
    amountMinor = 0;
  }

  const inventory = validateInventoryInput({
    onHand: raw.onHand ?? 0,
    reserved: 0,
    safetyStock: raw.safetyStock ?? 0,
    allowBackorder: raw.allowBackorder === true || raw.allowBackorder === "on",
  });
  if (!inventory.ok) return inventory;

  const { data: product, error } = await supabase
    .from("store_products")
    .insert({
      store_id: storeId,
      slug: parsed.value.slug,
      title: parsed.value.title,
      short_description: parsed.value.shortDescription,
      description: parsed.value.description,
      product_type: parsed.value.productType,
      item_type: parsed.value.productType,
      status: "draft",
      moderation_status: "pending",
      primary_category_id: categoryId,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error || !product) {
    console.error("createDraftProduct", error);
    if (error?.code === "23505") {
      return { ok: false, message: "That product slug already exists in this store." };
    }
    return { ok: false, message: "Unable to create product." };
  }

  const productRow = product as StoreProductRow;

  if (categoryId) {
    await supabase.from("product_category_links").upsert({
      product_id: productRow.id,
      category_id: categoryId,
      is_primary: true,
    });
  }

  const { data: variant, error: variantError } = await supabase
    .from("product_variants")
    .insert({
      product_id: productRow.id,
      sku: variantParsed.value.sku,
      title: variantParsed.value.title,
      option_values: variantParsed.value.optionValues,
      status: "active",
    })
    .select("id")
    .single();

  if (variantError || !variant) {
    console.error("createDraftProduct variant", variantError);
    return { ok: false, message: "Product created but variant setup failed." };
  }

  await Promise.all([
    supabase.from("product_prices").insert({
      variant_id: variant.id,
      currency: currency.toUpperCase(),
      amount_minor: amountMinor,
      status: "active",
    }),
    supabase.from("product_inventory").insert({
      variant_id: variant.id,
      warehouse_key: inventory.warehouseKey,
      on_hand: inventory.onHand,
      reserved: inventory.reserved,
      safety_stock: inventory.safetyStock,
      allow_backorder: inventory.allowBackorder,
    }),
  ]);

  return { ok: true, data: productRow };
}

export async function updateDraftProduct(
  supabase: AnyClient,
  userId: string,
  productId: string,
  raw: Record<string, unknown>
): Promise<ActionResult<StoreProductRow>> {
  const { data: existing } = await supabase
    .from("store_products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (!existing) {
    return { ok: false, message: "Product not found." };
  }

  const role = await getMembership(supabase, existing.store_id, userId);
  if (!canManageCatalog(role)) {
    return { ok: false, message: "You do not have permission to edit this product." };
  }

  if (!["draft", "in_review"].includes(existing.status)) {
    return {
      ok: false,
      message: "Only draft or in-review products can be edited in this phase.",
    };
  }

  const parsed = validateProductDraftInput({
    title: raw.title ?? existing.title,
    slug: raw.slug ?? existing.slug,
    shortDescription: raw.shortDescription ?? existing.short_description,
    description: raw.description ?? existing.description,
    productType: raw.productType ?? existing.product_type,
  });
  if (!parsed.ok) return parsed;

  const categoryId =
    typeof raw.categoryId === "string" && raw.categoryId.trim()
      ? raw.categoryId.trim()
      : existing.primary_category_id;

  const { data, error } = await supabase
    .from("store_products")
    .update({
      title: parsed.value.title,
      slug: parsed.value.slug,
      short_description: parsed.value.shortDescription,
      description: parsed.value.description,
      product_type: parsed.value.productType,
      primary_category_id: categoryId,
    })
    .eq("id", productId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("updateDraftProduct", error);
    return { ok: false, message: "Unable to update product." };
  }

  if (categoryId) {
    await supabase
      .from("product_category_links")
      .update({ is_primary: false })
      .eq("product_id", productId);
    await supabase.from("product_category_links").upsert({
      product_id: productId,
      category_id: categoryId,
      is_primary: true,
    });
  }

  return { ok: true, data: data as StoreProductRow };
}

export async function upsertVariantPriceInventory(
  supabase: AnyClient,
  userId: string,
  productId: string,
  raw: Record<string, unknown>
): Promise<ActionResult<{ variantId: string }>> {
  const { data: product } = await supabase
    .from("store_products")
    .select("id, store_id, status")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return { ok: false, message: "Product not found." };

  const role = await getMembership(supabase, product.store_id, userId);
  if (!canManageCatalog(role)) {
    return { ok: false, message: "You do not have permission to edit this product." };
  }

  if (!["draft", "in_review"].includes(product.status)) {
    return {
      ok: false,
      message: "Only draft or in-review products can update variants in this phase.",
    };
  }

  const variantParsed = validateVariantInput({
    sku: raw.sku,
    title: raw.variantTitle ?? raw.title,
    optionValues:
      typeof raw.optionValues === "string"
        ? safeParseJsonObject(raw.optionValues)
        : raw.optionValues,
  });
  if (!variantParsed.ok) return variantParsed;

  const currency =
    typeof raw.currency === "string" ? raw.currency : "USD";
  let amountMinor: number;
  if (raw.amountMinor !== undefined && raw.amountMinor !== null && raw.amountMinor !== "") {
    const price = validatePriceInput({
      amountMinor: raw.amountMinor,
      compareAtMinor: raw.compareAtMinor,
      currency,
    });
    if (!price.ok) return price;
    amountMinor = price.value.amountMinor;
  } else {
    const minor = majorToMinorUnits(raw.priceMajor);
    if (minor === null) return { ok: false, message: "Price is required." };
    const price = validatePriceInput({
      amountMinor: minor,
      compareAtMinor: raw.compareAtMinor
        ? majorToMinorUnits(raw.compareAtMinor)
        : undefined,
      currency,
    });
    if (!price.ok) return price;
    amountMinor = price.value.amountMinor;
  }

  const inventory = validateInventoryInput({
    onHand: raw.onHand,
    reserved: raw.reserved ?? 0,
    safetyStock: raw.safetyStock ?? 0,
    allowBackorder: raw.allowBackorder === true || raw.allowBackorder === "on",
    warehouseKey: raw.warehouseKey,
  });
  if (!inventory.ok) return inventory;

  let variantId =
    typeof raw.variantId === "string" && raw.variantId.trim()
      ? raw.variantId.trim()
      : null;

  if (variantId) {
    const { error } = await supabase
      .from("product_variants")
      .update({
        sku: variantParsed.value.sku,
        title: variantParsed.value.title,
        option_values: variantParsed.value.optionValues,
      })
      .eq("id", variantId)
      .eq("product_id", productId);
    if (error) {
      console.error("upsertVariant update", error);
      return { ok: false, message: "Unable to update variant." };
    }
  } else {
    const { data: variant, error } = await supabase
      .from("product_variants")
      .insert({
        product_id: productId,
        sku: variantParsed.value.sku,
        title: variantParsed.value.title,
        option_values: variantParsed.value.optionValues,
        status: "active",
      })
      .select("id")
      .single();
    if (error || !variant) {
      console.error("upsertVariant insert", error);
      return { ok: false, message: "Unable to create variant." };
    }
    variantId = variant.id;
  }

  if (!variantId) {
    return { ok: false, message: "Unable to resolve variant." };
  }

  const { data: existingPrice } = await supabase
    .from("product_prices")
    .select("id")
    .eq("variant_id", variantId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (existingPrice) {
    await supabase
      .from("product_prices")
      .update({
        amount_minor: amountMinor,
        currency: currency.toUpperCase(),
      })
      .eq("id", existingPrice.id);
  } else {
    await supabase.from("product_prices").insert({
      variant_id: variantId,
      amount_minor: amountMinor,
      currency: currency.toUpperCase(),
      status: "active",
    });
  }

  const { data: existingInv } = await supabase
    .from("product_inventory")
    .select("id")
    .eq("variant_id", variantId)
    .eq("warehouse_key", inventory.warehouseKey)
    .maybeSingle();

  if (existingInv) {
    await supabase
      .from("product_inventory")
      .update({
        on_hand: inventory.onHand,
        reserved: inventory.reserved,
        safety_stock: inventory.safetyStock,
        allow_backorder: inventory.allowBackorder,
      })
      .eq("id", existingInv.id);
  } else {
    await supabase.from("product_inventory").insert({
      variant_id: variantId,
      warehouse_key: inventory.warehouseKey,
      on_hand: inventory.onHand,
      reserved: inventory.reserved,
      safety_stock: inventory.safetyStock,
      allow_backorder: inventory.allowBackorder,
    });
  }

  return { ok: true, data: { variantId } };
}

export async function attachProductMediaMetadata(
  supabase: AnyClient,
  userId: string,
  productId: string,
  raw: Record<string, unknown>
): Promise<ActionResult<{ mediaId: string }>> {
  const { data: product } = await supabase
    .from("store_products")
    .select("store_id")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return { ok: false, message: "Product not found." };

  const role = await getMembership(supabase, product.store_id, userId);
  if (!canManageCatalog(role)) {
    return { ok: false, message: "You do not have permission to edit this product." };
  }

  const parsed = validateMediaMetadata(raw);
  if (!parsed.ok) return parsed;

  const variantId =
    typeof raw.variantId === "string" && raw.variantId.trim()
      ? raw.variantId.trim()
      : null;

  const { data, error } = await supabase
    .from("product_media")
    .insert({
      product_id: productId,
      variant_id: variantId,
      media_type: parsed.value.mediaType,
      storage_path: parsed.value.storagePath,
      alt_text: parsed.value.altText,
      sort_order: parsed.value.sortOrder,
      role: parsed.value.role,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("attachProductMediaMetadata", error);
    return { ok: false, message: "Unable to save media metadata." };
  }

  return { ok: true, data: { mediaId: data.id } };
}

export async function submitProductForReview(
  supabase: AnyClient,
  userId: string,
  productId: string
): Promise<ActionResult<StoreProductRow>> {
  const { data: product } = await supabase
    .from("store_products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return { ok: false, message: "Product not found." };

  const role = await getMembership(supabase, product.store_id, userId);
  if (!canManageCatalog(role)) {
    return { ok: false, message: "You do not have permission to submit this product." };
  }

  if (product.status !== "draft" && product.status !== "in_review") {
    return { ok: false, message: "Only draft products can be submitted for review." };
  }

  if (!product.primary_category_id) {
    return { ok: false, message: "Add a primary category before submitting for review." };
  }

  const { data, error } = await supabase
    .from("store_products")
    .update({
      status: "in_review",
      moderation_status: "pending",
    })
    .eq("id", productId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("submitProductForReview", error);
    return { ok: false, message: "Unable to submit product for review." };
  }

  return { ok: true, data: data as StoreProductRow };
}

export async function archiveProduct(
  supabase: AnyClient,
  userId: string,
  productId: string
): Promise<ActionResult<StoreProductRow>> {
  const { data: product } = await supabase
    .from("store_products")
    .select("store_id")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return { ok: false, message: "Product not found." };

  const role = await getMembership(supabase, product.store_id, userId);
  if (!canManageCatalog(role)) {
    return { ok: false, message: "You do not have permission to archive this product." };
  }

  const { data, error } = await supabase
    .from("store_products")
    .update({ status: "archived" })
    .eq("id", productId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("archiveProduct", error);
    return { ok: false, message: "Unable to archive product." };
  }

  return { ok: true, data: data as StoreProductRow };
}

export async function listSellerProducts(
  supabase: AnyClient,
  storeId: string
): Promise<StoreProductRow[]> {
  const { data } = await supabase
    .from("store_products")
    .select("*")
    .eq("store_id", storeId)
    .order("updated_at", { ascending: false });
  return (data ?? []) as StoreProductRow[];
}

export async function getSellerProductBundle(
  supabase: AnyClient,
  userId: string,
  productId: string
): Promise<
  | {
      ok: true;
      product: StoreProductRow;
      role: StoreMemberRole;
      variants: Array<{
        id: string;
        sku: string;
        title: string;
        option_values: Record<string, string>;
        price: { amount_minor: number; currency: string } | null;
        inventory: {
          on_hand: number;
          reserved: number;
          safety_stock: number;
          allow_backorder: boolean;
        } | null;
      }>;
      media: Array<{
        id: string;
        storage_path: string;
        alt_text: string | null;
        role: string;
        media_type: string;
      }>;
    }
  | { ok: false; message: string }
> {
  const { data: product } = await supabase
    .from("store_products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (!product) return { ok: false, message: "Product not found." };

  const role = await getMembership(supabase, product.store_id, userId);
  if (!role) {
    return { ok: false, message: "You do not have access to this product." };
  }

  const { data: variants } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId)
    .neq("status", "archived")
    .order("created_at", { ascending: true });

  const enriched = [];
  for (const v of variants ?? []) {
    const [{ data: price }, { data: inv }] = await Promise.all([
      supabase
        .from("product_prices")
        .select("amount_minor, currency")
        .eq("variant_id", v.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("product_inventory")
        .select("on_hand, reserved, safety_stock, allow_backorder")
        .eq("variant_id", v.id)
        .eq("warehouse_key", "default")
        .maybeSingle(),
    ]);
    enriched.push({
      id: v.id as string,
      sku: v.sku as string,
      title: v.title as string,
      option_values: (v.option_values as Record<string, string>) ?? {},
      price: price
        ? {
            amount_minor: Number(price.amount_minor),
            currency: price.currency as string,
          }
        : null,
      inventory: inv
        ? {
            on_hand: inv.on_hand as number,
            reserved: inv.reserved as number,
            safety_stock: inv.safety_stock as number,
            allow_backorder: inv.allow_backorder as boolean,
          }
        : null,
    });
  }

  const { data: media } = await supabase
    .from("product_media")
    .select("id, storage_path, alt_text, role, media_type")
    .eq("product_id", productId)
    .neq("status", "archived")
    .order("sort_order", { ascending: true });

  return {
    ok: true,
    product: product as StoreProductRow,
    role,
    variants: enriched,
    media: (media ?? []) as Array<{
      id: string;
      storage_path: string;
      alt_text: string | null;
      role: string;
      media_type: string;
    }>,
  };
}

function safeParseJsonObject(raw: string): Record<string, string> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}
