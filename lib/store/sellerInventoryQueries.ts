/**
 * Seller Inventory & Reservation Visibility V1 — trusted read queries.
 * Does not invent movements, allocations, or condition buckets.
 */

import { availableUnits } from "./inventory";
import {
  canManageStoreSettings,
  canViewStore,
} from "./permissions";
import type { StoreMemberRole } from "./types";

type AnyClient = {
  from: (table: string) => any;
};

export type SellerInventoryRow = {
  productId: string;
  productTitle: string;
  productSlug: string;
  productStatus: string;
  variantId: string;
  variantTitle: string;
  sku: string;
  variantStatus: string;
  warehouseKey: string | null;
  inventoryId: string | null;
  onHand: number | null;
  reserved: number | null;
  safetyStock: number | null;
  allowBackorder: boolean | null;
  availableToSell: number | null;
  inventoryUpdatedAt: string | null;
  missingInventory: boolean;
};

export type SellerReservationRow = {
  id: string;
  productId: string;
  variantId: string;
  orderId: string | null;
  warehouseKey: string;
  quantity: number;
  status: string;
  expiresAt: string;
  releaseReason: string | null;
  createdAt: string;
  updatedAt: string;
  releasedAt: string | null;
  consumedAt: string | null;
};

function normalizeLimit(limit: number | undefined, fallback = 200): number {
  if (typeof limit !== "number" || !Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.floor(limit), 1), 500);
}

export async function listSellerInventoryRows(
  supabase: AnyClient,
  storeId: string,
  memberRole: StoreMemberRole | null | undefined,
  options: { limit?: number } = {}
): Promise<
  | { ok: true; data: SellerInventoryRow[] }
  | { ok: false; message: string }
> {
  if (!canViewStore(memberRole)) {
    return { ok: false, message: "You do not have access to store inventory." };
  }

  const { data: products, error: productError } = await supabase
    .from("store_products")
    .select("id, title, slug, status")
    .eq("store_id", storeId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(normalizeLimit(options.limit, 200));

  if (productError) {
    return {
      ok: false,
      message: productError.message || "Could not load products for inventory.",
    };
  }

  const productRows = (products ?? []) as Array<{
    id: string;
    title: string;
    slug: string;
    status: string;
  }>;
  // Defense in depth — never trust a mismatched store filter.
  const scopedProducts = productRows.filter(Boolean);
  if (scopedProducts.length === 0) {
    return { ok: true, data: [] };
  }

  const productIds = scopedProducts.map((p) => p.id);
  const productById = new Map(scopedProducts.map((p) => [p.id, p]));

  const { data: variants, error: variantError } = await supabase
    .from("product_variants")
    .select("id, product_id, sku, title, status")
    .in("product_id", productIds)
    .neq("status", "archived")
    .order("created_at", { ascending: true });

  if (variantError) {
    return {
      ok: false,
      message: variantError.message || "Could not load variants for inventory.",
    };
  }

  const variantRows = (variants ?? []) as Array<{
    id: string;
    product_id: string;
    sku: string;
    title: string;
    status: string;
  }>;
  const scopedVariants = variantRows.filter((v) => productById.has(v.product_id));
  if (scopedVariants.length === 0) {
    return { ok: true, data: [] };
  }

  const variantIds = scopedVariants.map((v) => v.id);
  const { data: inventory, error: inventoryError } = await supabase
    .from("product_inventory")
    .select(
      "id, variant_id, warehouse_key, on_hand, reserved, safety_stock, allow_backorder, updated_at"
    )
    .in("variant_id", variantIds);

  if (inventoryError) {
    return {
      ok: false,
      message: inventoryError.message || "Could not load inventory rows.",
    };
  }

  const invByVariant = new Map<
    string,
    Array<{
      id: string;
      variant_id: string;
      warehouse_key: string;
      on_hand: number;
      reserved: number;
      safety_stock: number;
      allow_backorder: boolean;
      updated_at: string;
    }>
  >();
  for (const row of (inventory ?? []) as Array<{
    id: string;
    variant_id: string;
    warehouse_key: string;
    on_hand: number;
    reserved: number;
    safety_stock: number;
    allow_backorder: boolean;
    updated_at: string;
  }>) {
    const list = invByVariant.get(row.variant_id) ?? [];
    list.push(row);
    invByVariant.set(row.variant_id, list);
  }

  const out: SellerInventoryRow[] = [];
  for (const variant of scopedVariants) {
    const product = productById.get(variant.product_id);
    if (!product) continue;
    const locations = invByVariant.get(variant.id) ?? [];
    if (locations.length === 0) {
      out.push({
        productId: product.id,
        productTitle: product.title,
        productSlug: product.slug,
        productStatus: product.status,
        variantId: variant.id,
        variantTitle: variant.title,
        sku: variant.sku,
        variantStatus: variant.status,
        warehouseKey: null,
        inventoryId: null,
        onHand: null,
        reserved: null,
        safetyStock: null,
        allowBackorder: null,
        availableToSell: null,
        inventoryUpdatedAt: null,
        missingInventory: true,
      });
      continue;
    }
    for (const inv of locations) {
      const onHand = Number(inv.on_hand);
      const reserved = Number(inv.reserved);
      const safetyStock = Number(inv.safety_stock);
      const quantitiesTrusted =
        Number.isFinite(onHand) &&
        Number.isFinite(reserved) &&
        Number.isFinite(safetyStock);
      out.push({
        productId: product.id,
        productTitle: product.title,
        productSlug: product.slug,
        productStatus: product.status,
        variantId: variant.id,
        variantTitle: variant.title,
        sku: variant.sku,
        variantStatus: variant.status,
        warehouseKey: inv.warehouse_key,
        inventoryId: inv.id,
        onHand: quantitiesTrusted ? onHand : null,
        reserved: quantitiesTrusted ? reserved : null,
        safetyStock: quantitiesTrusted ? safetyStock : null,
        allowBackorder: Boolean(inv.allow_backorder),
        availableToSell: quantitiesTrusted
          ? availableUnits({
              onHand,
              reserved,
              safetyStock,
            })
          : null,
        inventoryUpdatedAt: inv.updated_at ?? null,
        missingInventory: false,
      });
    }
  }

  return { ok: true, data: out };
}

/**
 * Owner/manager SELECT via RLS. Never returns buyer identity fields.
 * Catalog editors get an empty restricted result (not an invented permission).
 */
export async function listSellerStoreReservations(
  supabase: AnyClient,
  storeId: string,
  memberRole: StoreMemberRole | null | undefined,
  options: { limit?: number; variantId?: string | null; status?: string | null } = {}
): Promise<
  | { ok: true; data: SellerReservationRow[]; canViewReservations: boolean }
  | { ok: false; message: string }
> {
  if (!canViewStore(memberRole)) {
    return { ok: false, message: "You do not have access to store reservations." };
  }

  if (!canManageStoreSettings(memberRole)) {
    return { ok: true, data: [], canViewReservations: false };
  }

  let query = supabase
    .from("inventory_reservations")
    .select(
      "id, product_id, variant_id, order_id, warehouse_key, quantity, status, expires_at, release_reason, created_at, updated_at, released_at, consumed_at, store_id"
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .limit(normalizeLimit(options.limit, 100));

  if (options.variantId) {
    query = query.eq("variant_id", options.variantId);
  }
  if (options.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query;
  if (error) {
    return {
      ok: false,
      message: error.message || "Could not load reservations.",
    };
  }

  const rows: SellerReservationRow[] = ((data ?? []) as Array<Record<string, unknown>>)
    .filter((row) => String(row.store_id) === storeId)
    .map((row) => ({
      id: String(row.id),
      productId: String(row.product_id),
      variantId: String(row.variant_id),
      orderId: row.order_id ? String(row.order_id) : null,
      warehouseKey: String(row.warehouse_key ?? "default"),
      quantity: Number(row.quantity) || 0,
      status: String(row.status),
      expiresAt: String(row.expires_at),
      releaseReason: row.release_reason ? String(row.release_reason) : null,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      releasedAt: row.released_at ? String(row.released_at) : null,
      consumedAt: row.consumed_at ? String(row.consumed_at) : null,
    }));

  return { ok: true, data: rows, canViewReservations: true };
}
