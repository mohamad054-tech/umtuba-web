import type { SupabaseClient } from "@supabase/supabase-js";
import {
  deriveMarketplaceAdminDiagnostics,
  type MarketplaceAdminDiagnostic,
} from "./marketplaceEligibility";

type AnyClient = SupabaseClient;

/**
 * Bounded admin marketplace diagnostics. Does not expose other sellers’
 * private merchandising or secrets. Probes remote migration availability
 * via store_seller_listings readability.
 */
export async function loadMarketplaceAdminDiagnostics(
  supabase: AnyClient
): Promise<{
  diagnostics: MarketplaceAdminDiagnostic[];
  migrationsAppliedRemotely: boolean | null;
}> {
  const { error: listingProbeError } = await supabase
    .from("store_seller_listings")
    .select("id")
    .limit(1);

  const migrationsAppliedRemotely = listingProbeError ? false : true;

  if (!migrationsAppliedRemotely) {
    return {
      diagnostics: deriveMarketplaceAdminDiagnostics({
        suppliers: [],
        products: [],
        listings: [],
        migrationsAppliedRemotely: false,
      }),
      migrationsAppliedRemotely: false,
    };
  }

  const { data: listings } = await supabase
    .from("store_seller_listings")
    .select(
      "id, status, source_product_id, seller_store_id, supplier_store_id"
    )
    .eq("status", "active")
    .limit(80);

  const supplierIds = Array.from(
    new Set((listings ?? []).map((l) => String(l.supplier_store_id)))
  );
  const productIds = Array.from(
    new Set(
      (listings ?? [])
        .map((l) => (l.source_product_id ? String(l.source_product_id) : null))
        .filter((id): id is string => Boolean(id))
    )
  );

  const suppliers: Array<{
    storeId: string;
    marketplaceSupplierEnabled: boolean;
    status: string;
    activeListingCount: number;
  }> = [];

  for (const storeId of supplierIds) {
    const { data: store } = await supabase
      .from("stores")
      .select("id, status, marketplace_supplier_enabled")
      .eq("id", storeId)
      .maybeSingle();
    if (!store) continue;
    suppliers.push({
      storeId,
      marketplaceSupplierEnabled: Boolean(store.marketplace_supplier_enabled),
      status: String(store.status),
      activeListingCount: (listings ?? []).filter(
        (l) => String(l.supplier_store_id) === storeId
      ).length,
    });
  }

  const products: Array<{
    productId: string;
    storeId: string;
    marketplaceEligible: boolean;
    status: string;
    activeListingCount: number;
    hasTrustedPrice: boolean;
  }> = [];

  for (const productId of productIds) {
    const { data: product } = await supabase
      .from("store_products")
      .select("id, store_id, status, marketplace_eligible")
      .eq("id", productId)
      .maybeSingle();
    if (!product) {
      products.push({
        productId,
        storeId: "unknown",
        marketplaceEligible: false,
        status: "missing",
        activeListingCount: (listings ?? []).filter(
          (l) => String(l.source_product_id) === productId
        ).length,
        hasTrustedPrice: false,
      });
      continue;
    }
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId)
      .eq("status", "active")
      .limit(1);
    let hasTrustedPrice = false;
    const variantId = variants?.[0]?.id;
    if (variantId) {
      const { data: price } = await supabase
        .from("product_prices")
        .select("id")
        .eq("variant_id", variantId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      hasTrustedPrice = Boolean(price);
    }
    products.push({
      productId,
      storeId: String(product.store_id),
      marketplaceEligible: Boolean(product.marketplace_eligible),
      status: String(product.status),
      activeListingCount: (listings ?? []).filter(
        (l) => String(l.source_product_id) === productId
      ).length,
      hasTrustedPrice,
    });
  }

  const listingRows = (listings ?? []).map((l) => {
    const sourceProductId = l.source_product_id
      ? String(l.source_product_id)
      : null;
    const product = products.find((p) => p.productId === sourceProductId);
    const supplier = suppliers.find(
      (s) => s.storeId === String(l.supplier_store_id)
    );
    return {
      listingId: String(l.id),
      status: String(l.status),
      sourceProductId,
      sourceProductExists: Boolean(product && product.status !== "missing"),
      hasTrustedPrice: Boolean(product?.hasTrustedPrice),
      sellerStoreId: String(l.seller_store_id),
      supplierEnabled: Boolean(supplier?.marketplaceSupplierEnabled),
      productEligible: Boolean(product?.marketplaceEligible),
    };
  });

  return {
    diagnostics: deriveMarketplaceAdminDiagnostics({
      suppliers,
      products,
      listings: listingRows,
      migrationsAppliedRemotely: true,
    }),
    migrationsAppliedRemotely: true,
  };
}
