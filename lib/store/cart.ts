import type { SupabaseClient } from "@supabase/supabase-js";
import {
  assertCurrenciesCompatible,
  canAccessBuyerCart,
  computeCartSummary,
  evaluateCartAdd,
  evaluateCartSetQuantity,
  type CartSummary,
  validateCartQuantity,
} from "./cartRules";
import { deriveCartLineBlockingIssue } from "./cartCheckoutPresentation";
import { availableUnits } from "./inventory";
import { isPubliclyVisibleProduct } from "./permissions";
import { rejectClientCartPrice } from "./tradingContracts";

type AnyClient = SupabaseClient;

export type CartActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; requiresAuth?: boolean };

type VariantOffer = {
  variantId: string;
  variantStatus: string;
  variantTitle: string;
  productId: string;
  productTitle: string;
  productStatus: string;
  moderationStatus: string;
  storeId: string;
  storeName: string;
  storeStatus: string;
  priceAmountMinor: number;
  priceCurrency: string;
  priceStatus: string;
  onHand: number;
  reserved: number;
  safetyStock: number;
  allowBackorder: boolean;
  mediaSnapshot: string | null;
};

async function loadVariantOffer(
  supabase: AnyClient,
  variantId: string
): Promise<CartActionResult<VariantOffer>> {
  const { data: variant, error } = await supabase
    .from("product_variants")
    .select("id, title, status, product_id")
    .eq("id", variantId)
    .maybeSingle();

  if (error || !variant) {
    return { ok: false, message: "Variant not found." };
  }

  const { data: product } = await supabase
    .from("store_products")
    .select(
      "id, title, status, moderation_status, store_id, stores!inner(id, name, status)"
    )
    .eq("id", variant.product_id)
    .maybeSingle();

  if (!product) {
    return { ok: false, message: "Product not found." };
  }

  const store = product.stores as unknown as {
    id: string;
    name: string;
    status: string;
  };

  const { data: price } = await supabase
    .from("product_prices")
    .select("amount_minor, currency, status")
    .eq("variant_id", variantId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!price) {
    return { ok: false, message: "This variant has no active price." };
  }

  const { data: inventory } = await supabase
    .from("product_inventory")
    .select("on_hand, reserved, safety_stock, allow_backorder")
    .eq("variant_id", variantId)
    .eq("warehouse_key", "default")
    .maybeSingle();

  const { data: media } = await supabase
    .from("product_media")
    .select("storage_path, role")
    .eq("product_id", product.id)
    .eq("status", "active")
    .order("sort_order", { ascending: true })
    .limit(8);

  const cover =
    (media ?? []).find((m) => m.role === "cover")?.storage_path ??
    (media ?? [])[0]?.storage_path ??
    null;

  return {
    ok: true,
    data: {
      variantId: variant.id as string,
      variantStatus: variant.status as string,
      variantTitle: variant.title as string,
      productId: product.id as string,
      productTitle: product.title as string,
      productStatus: product.status as string,
      moderationStatus: product.moderation_status as string,
      storeId: store.id,
      storeName: store.name,
      storeStatus: store.status,
      priceAmountMinor: Number(price.amount_minor),
      priceCurrency: price.currency as string,
      priceStatus: price.status as string,
      onHand: inventory?.on_hand ?? 0,
      reserved: inventory?.reserved ?? 0,
      safetyStock: inventory?.safety_stock ?? 0,
      allowBackorder: Boolean(inventory?.allow_backorder),
      mediaSnapshot: cover,
    },
  };
}

async function getOrCreateActiveCart(
  supabase: AnyClient,
  userId: string,
  currency: string
): Promise<CartActionResult<{ id: string; currency: string; user_id: string }>> {
  const { data: existing } = await supabase
    .from("carts")
    .select("id, currency, user_id, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .eq("currency", currency)
    .maybeSingle();

  if (existing) {
    if (!canAccessBuyerCart({ cartUserId: existing.user_id, requesterUserId: userId })) {
      return { ok: false, message: "Cart access denied." };
    }
    return {
      ok: true,
      data: {
        id: existing.id as string,
        currency: existing.currency as string,
        user_id: existing.user_id as string,
      },
    };
  }

  // Reject if user already has an active cart in a different currency with items
  const { data: otherCart } = await supabase
    .from("carts")
    .select("id, currency")
    .eq("user_id", userId)
    .eq("status", "active")
    .neq("currency", currency)
    .maybeSingle();

  if (otherCart) {
    const { count } = await supabase
      .from("cart_items")
      .select("id", { count: "exact", head: true })
      .eq("cart_id", otherCart.id);
    if ((count ?? 0) > 0) {
      return {
        ok: false,
        message: "Cross-currency cart mixing is not allowed. Clear your cart first.",
      };
    }
  }

  const { data: created, error } = await supabase
    .from("carts")
    .insert({
      user_id: userId,
      status: "active",
      currency,
    })
    .select("id, currency, user_id")
    .single();

  if (error || !created) {
    // Race: unique index — re-fetch
    const { data: raced } = await supabase
      .from("carts")
      .select("id, currency, user_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("currency", currency)
      .maybeSingle();
    if (raced) {
      return {
        ok: true,
        data: {
          id: raced.id as string,
          currency: raced.currency as string,
          user_id: raced.user_id as string,
        },
      };
    }
    console.error("getOrCreateActiveCart", error);
    return { ok: false, message: "Unable to open cart." };
  }

  return {
    ok: true,
    data: {
      id: created.id as string,
      currency: created.currency as string,
      user_id: created.user_id as string,
    },
  };
}

export async function getActiveCart(
  supabase: AnyClient,
  userId: string,
  currency?: string
): Promise<
  CartActionResult<{
    id: string;
    currency: string;
    user_id: string;
  } | null>
> {
  let query = supabase
    .from("carts")
    .select("id, currency, user_id, status")
    .eq("user_id", userId)
    .eq("status", "active");

  if (currency) {
    query = query.eq("currency", currency.toUpperCase());
  }

  const { data } = await query.order("created_at", { ascending: true }).limit(1).maybeSingle();

  if (!data) {
    return { ok: true, data: null };
  }

  if (!canAccessBuyerCart({ cartUserId: data.user_id, requesterUserId: userId })) {
    return { ok: false, message: "Cart access denied." };
  }

  return {
    ok: true,
    data: {
      id: data.id as string,
      currency: data.currency as string,
      user_id: data.user_id as string,
    },
  };
}

export async function getCartSummary(
  supabase: AnyClient,
  userId: string
): Promise<CartActionResult<CartSummary>> {
  const cartResult = await getActiveCart(supabase, userId);
  if (!cartResult.ok) return cartResult;
  if (!cartResult.data) {
    return { ok: true, data: computeCartSummary([]) };
  }

  const { data: items, error } = await supabase
    .from("cart_items")
    .select(
      `
      id,
      store_id,
      variant_id,
      quantity,
      unit_price_minor_snapshot,
      currency,
      product_title_snapshot,
      variant_title_snapshot,
      media_snapshot,
      stores ( name, slug, status )
    `
    )
    .eq("cart_id", cartResult.data.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getCartSummary", error);
    return { ok: false, message: "Unable to load cart." };
  }

  const rows = items ?? [];
  const variantIds = Array.from(
    new Set(
      rows
        .map((row) => row.variant_id as string | null)
        .filter((id): id is string => Boolean(id))
    )
  );

  const liveByVariant = new Map<
    string,
    {
      unitPriceMinor: number | null;
      available: number | null;
      allowBackorder: boolean;
      productAvailable: boolean;
      variantAvailable: boolean;
    }
  >();

  if (variantIds.length > 0) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select(
        "id, status, product_id, store_products!inner(status, moderation_status, store_id)"
      )
      .in("id", variantIds);

    for (const variant of variants ?? []) {
      const product = variant.store_products as unknown as {
        status: string;
        moderation_status: string;
        store_id: string;
      };
      const { data: price } = await supabase
        .from("product_prices")
        .select("amount_minor, status")
        .eq("variant_id", variant.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const { data: inv } = await supabase
        .from("product_inventory")
        .select("on_hand, reserved, safety_stock, allow_backorder")
        .eq("variant_id", variant.id)
        .eq("warehouse_key", "default")
        .maybeSingle();

      const storeRow = rows.find((r) => r.variant_id === variant.id);
      const storeMeta = storeRow?.stores as unknown as
        | { status?: string }
        | null;
      const storeActive = (storeMeta?.status ?? "active") === "active";

      liveByVariant.set(variant.id as string, {
        unitPriceMinor:
          price && price.status === "active"
            ? Number(price.amount_minor)
            : null,
        available: inv
          ? availableUnits({
              onHand: inv.on_hand,
              reserved: inv.reserved,
              safetyStock: inv.safety_stock,
            })
          : null,
        allowBackorder: Boolean(inv?.allow_backorder),
        productAvailable: isPubliclyVisibleProduct({
          productStatus: product.status,
          moderationStatus: product.moderation_status,
          storeStatus: storeActive ? "active" : "inactive",
        }),
        variantAvailable: (variant.status as string) === "active",
      });
    }
  }

  const lines = rows.map((row) => {
    const store = row.stores as unknown as {
      name: string;
      slug?: string;
      status?: string;
    } | null;
    const variantId = (row.variant_id as string | null) ?? null;
    const live = variantId ? liveByVariant.get(variantId) : undefined;
    const snapshotUnitPriceMinor = Number(row.unit_price_minor_snapshot);
    const liveUnitPriceMinor = live?.unitPriceMinor ?? null;
    const available = live?.available ?? null;
    const priceChanged =
      liveUnitPriceMinor != null && liveUnitPriceMinor !== snapshotUnitPriceMinor;
    const blockingIssue = live
      ? deriveCartLineBlockingIssue({
          liveUnitPriceMinor,
          snapshotUnitPriceMinor,
          available,
          quantity: row.quantity as number,
          allowBackorder: live.allowBackorder,
          productAvailable: live.productAvailable,
          variantAvailable: live.variantAvailable,
          storeActive: (store?.status ?? "active") === "active",
        })
      : variantId
        ? "Unable to verify live availability for this item."
        : "Variant is missing from this cart line.";

    return {
      id: row.id as string,
      storeId: row.store_id as string,
      storeName: store?.name ?? "Store",
      storeSlug: store?.slug ?? null,
      variantId,
      quantity: row.quantity as number,
      unitPriceMinor: snapshotUnitPriceMinor,
      currency: row.currency as string,
      productTitle: row.product_title_snapshot as string,
      variantTitle: row.variant_title_snapshot as string,
      mediaSnapshot: (row.media_snapshot as string | null) ?? null,
      liveUnitPriceMinor,
      available,
      priceChanged,
      blockingIssue,
    };
  });

  return { ok: true, data: computeCartSummary(lines) };
}

export async function addToCart(
  supabase: AnyClient,
  userId: string,
  input: {
    variantId: unknown;
    quantity?: unknown;
    /** Ignored — server snapshots price. */
    clientPriceMinor?: unknown;
  }
): Promise<CartActionResult<{ cartId: string; itemId: string; quantity: number }>> {
  const clientPriceGate = rejectClientCartPrice(input.clientPriceMinor);
  if (!clientPriceGate.ok) return clientPriceGate;

  const variantId =
    typeof input.variantId === "string" ? input.variantId.trim() : "";
  if (!variantId || !/^[0-9a-f-]{36}$/i.test(variantId)) {
    return { ok: false, message: "Variant is invalid." };
  }

  const qtyParsed = validateCartQuantity(input.quantity ?? 1);
  if (!qtyParsed.ok) return qtyParsed;

  const offer = await loadVariantOffer(supabase, variantId);
  if (!offer.ok) return offer;

  const currencyCheck = assertCurrenciesCompatible(null, offer.data.priceCurrency);
  if (!currencyCheck.ok) return currencyCheck;

  const cart = await getOrCreateActiveCart(
    supabase,
    userId,
    currencyCheck.currency
  );
  if (!cart.ok) return cart;

  const mix = assertCurrenciesCompatible(cart.data.currency, offer.data.priceCurrency);
  if (!mix.ok) return mix;

  const { data: existingItem } = await supabase
    .from("cart_items")
    .select("id, quantity")
    .eq("cart_id", cart.data.id)
    .eq("variant_id", variantId)
    .maybeSingle();

  const evaluated = evaluateCartAdd({
    productStatus: offer.data.productStatus,
    moderationStatus: offer.data.moderationStatus,
    storeStatus: offer.data.storeStatus,
    variantStatus: offer.data.variantStatus,
    priceStatus: offer.data.priceStatus,
    priceAmountMinor: offer.data.priceAmountMinor,
    priceCurrency: offer.data.priceCurrency,
    onHand: offer.data.onHand,
    reserved: offer.data.reserved,
    safetyStock: offer.data.safetyStock,
    allowBackorder: offer.data.allowBackorder,
    requestedQuantity: qtyParsed.quantity,
    existingQuantity: existingItem?.quantity ?? 0,
  });

  if (!evaluated.ok) return evaluated;

  if (existingItem) {
    const { data: updated, error } = await supabase
      .from("cart_items")
      .update({
        quantity: evaluated.quantity,
        unit_price_minor_snapshot: evaluated.unitPriceMinor,
        currency: evaluated.currency,
        product_title_snapshot: offer.data.productTitle,
        variant_title_snapshot: offer.data.variantTitle,
        media_snapshot: offer.data.mediaSnapshot,
      })
      .eq("id", existingItem.id)
      .eq("cart_id", cart.data.id)
      .select("id, quantity")
      .single();

    if (error || !updated) {
      console.error("addToCart update", error);
      return { ok: false, message: "Unable to update cart item." };
    }

    return {
      ok: true,
      data: {
        cartId: cart.data.id,
        itemId: updated.id as string,
        quantity: updated.quantity as number,
      },
    };
  }

  const { data: inserted, error } = await supabase
    .from("cart_items")
    .insert({
      cart_id: cart.data.id,
      variant_id: variantId,
      quantity: evaluated.quantity,
      unit_price_minor_snapshot: evaluated.unitPriceMinor,
      currency: evaluated.currency,
      store_id: offer.data.storeId,
      product_title_snapshot: offer.data.productTitle,
      variant_title_snapshot: offer.data.variantTitle,
      media_snapshot: offer.data.mediaSnapshot,
    })
    .select("id, quantity")
    .single();

  if (error || !inserted) {
    // Unique race — merge
    if (error?.code === "23505") {
      return addToCart(supabase, userId, {
        variantId,
        quantity: qtyParsed.quantity,
      });
    }
    console.error("addToCart insert", error);
    return { ok: false, message: "Unable to add item to cart." };
  }

  return {
    ok: true,
    data: {
      cartId: cart.data.id,
      itemId: inserted.id as string,
      quantity: inserted.quantity as number,
    },
  };
}

export async function updateCartQuantity(
  supabase: AnyClient,
  userId: string,
  input: { itemId: unknown; quantity: unknown }
): Promise<CartActionResult<{ itemId: string; quantity: number }>> {
  const itemId = typeof input.itemId === "string" ? input.itemId.trim() : "";
  if (!itemId || !/^[0-9a-f-]{36}$/i.test(itemId)) {
    return { ok: false, message: "Cart item is invalid." };
  }

  const qtyParsed = validateCartQuantity(input.quantity);
  if (!qtyParsed.ok) return qtyParsed;

  const { data: item } = await supabase
    .from("cart_items")
    .select("id, cart_id, variant_id, quantity")
    .eq("id", itemId)
    .maybeSingle();

  if (!item) {
    return { ok: false, message: "Cart item not found." };
  }

  const { data: cart } = await supabase
    .from("carts")
    .select("id, user_id, status, currency")
    .eq("id", item.cart_id)
    .maybeSingle();

  if (
    !cart ||
    cart.status !== "active" ||
    !canAccessBuyerCart({
      cartUserId: cart.user_id as string,
      requesterUserId: userId,
    })
  ) {
    return { ok: false, message: "Cart access denied." };
  }

  const offer = await loadVariantOffer(supabase, item.variant_id as string);
  if (!offer.ok) return offer;

  const mix = assertCurrenciesCompatible(
    cart.currency as string,
    offer.data.priceCurrency
  );
  if (!mix.ok) return mix;

  const evaluated = evaluateCartSetQuantity({
    setQuantity: qtyParsed.quantity,
    eligibility: {
      productStatus: offer.data.productStatus,
      moderationStatus: offer.data.moderationStatus,
      storeStatus: offer.data.storeStatus,
      variantStatus: offer.data.variantStatus,
      priceStatus: offer.data.priceStatus,
      priceAmountMinor: offer.data.priceAmountMinor,
      priceCurrency: offer.data.priceCurrency,
      onHand: offer.data.onHand,
      reserved: offer.data.reserved,
      safetyStock: offer.data.safetyStock,
      allowBackorder: offer.data.allowBackorder,
    },
  });

  if (!evaluated.ok) return evaluated;

  const { data: updated, error } = await supabase
    .from("cart_items")
    .update({
      quantity: evaluated.quantity,
      unit_price_minor_snapshot: evaluated.unitPriceMinor,
      currency: evaluated.currency,
      product_title_snapshot: offer.data.productTitle,
      variant_title_snapshot: offer.data.variantTitle,
      media_snapshot: offer.data.mediaSnapshot,
    })
    .eq("id", itemId)
    .eq("cart_id", cart.id)
    .select("id, quantity")
    .single();

  if (error || !updated) {
    console.error("updateCartQuantity", error);
    return { ok: false, message: "Unable to update quantity." };
  }

  return {
    ok: true,
    data: {
      itemId: updated.id as string,
      quantity: updated.quantity as number,
    },
  };
}

export async function removeCartItem(
  supabase: AnyClient,
  userId: string,
  itemIdRaw: unknown
): Promise<CartActionResult> {
  const itemId = typeof itemIdRaw === "string" ? itemIdRaw.trim() : "";
  if (!itemId || !/^[0-9a-f-]{36}$/i.test(itemId)) {
    return { ok: false, message: "Cart item is invalid." };
  }

  const { data: item } = await supabase
    .from("cart_items")
    .select("id, cart_id")
    .eq("id", itemId)
    .maybeSingle();

  if (!item) {
    return { ok: false, message: "Cart item not found." };
  }

  const { data: cart } = await supabase
    .from("carts")
    .select("id, user_id, status")
    .eq("id", item.cart_id)
    .maybeSingle();

  if (
    !cart ||
    cart.status !== "active" ||
    !canAccessBuyerCart({
      cartUserId: cart.user_id as string,
      requesterUserId: userId,
    })
  ) {
    return { ok: false, message: "Cart access denied." };
  }

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", itemId)
    .eq("cart_id", cart.id);

  if (error) {
    console.error("removeCartItem", error);
    return { ok: false, message: "Unable to remove item." };
  }

  return { ok: true, data: undefined };
}

export async function clearCart(
  supabase: AnyClient,
  userId: string
): Promise<CartActionResult> {
  const cartResult = await getActiveCart(supabase, userId);
  if (!cartResult.ok) return cartResult;
  if (!cartResult.data) {
    return { ok: true, data: undefined };
  }

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("cart_id", cartResult.data.id);

  if (error) {
    console.error("clearCart", error);
    return { ok: false, message: "Unable to clear cart." };
  }

  return { ok: true, data: undefined };
}
