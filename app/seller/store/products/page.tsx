import Link from "next/link";
import { redirect } from "next/navigation";
import SellerOpsShell from "../../../components/store/SellerOpsShell";
import SellerProductDashboard from "../../../components/store/SellerProductDashboard";
import StoreErrorState from "../../../components/store/StoreErrorState";
import { APP_ROUTES } from "../../../lib/nav";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { canManageCatalog } from "../../../../lib/store/permissions";
import {
  getOwnedOrMemberStore,
  listSellerProducts,
} from "../../../../lib/store/sellerStore";
import { listSellerInventoryRows } from "../../../../lib/store/sellerInventoryQueries";
import {
  loadSellerCatalogHealthFacts,
  loadSellerCatalogVariantSearchTokens,
} from "../../../../lib/store/sellerCatalogWiring";
import { deriveSellerProductHealth } from "../../../../lib/store/sellerExperienceFoundation";
import {
  buildSellerCatalogSearchItems,
  indexVariantSearchTokens,
} from "../../../../lib/store/sellerCatalogSearchFiltering";
import type { SellerCatalogListItem } from "../../../../lib/store/sellerCatalogPresentation";

export const metadata = {
  title: "Seller Products | UMTUBA",
};

export default async function SellerProductsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent("/seller/store/products")}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) {
    redirect(APP_ROUTES.sellerStore);
  }

  if (membership.store.status !== "active") {
    return (
      <SellerOpsShell title="Products" subtitle={membership.store.name} wide>
        <p className="mt-6 rounded-2xl border border-[var(--sf-line)] bg-[var(--sf-surface)] px-4 py-6 text-sm text-[var(--sf-muted)]">
          This store is not active. Catalog management is unavailable.
        </p>
      </SellerOpsShell>
    );
  }

  const storeId = membership.store.id;
  const [productsResult, inventoryResult] = await Promise.all([
    listSellerProducts(supabase, storeId),
    listSellerInventoryRows(supabase, storeId, membership.role, {
      limit: 500,
    }),
  ]);

  const products = productsResult.ok ? productsResult.data : [];
  const listItems: SellerCatalogListItem[] = products.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    moderationStatus: p.moderation_status,
    productType: p.product_type,
    updatedAt: p.updated_at,
    createdAt: p.created_at,
    shortDescription: p.short_description,
  }));

  const [healthFacts, variantSearch] = products.length
    ? await Promise.all([
        loadSellerCatalogHealthFacts(supabase, {
          storeId,
          products,
          inventoryRows: inventoryResult.ok ? inventoryResult.data : null,
        }),
        loadSellerCatalogVariantSearchTokens(supabase, {
          storeId,
          products,
        }),
      ])
    : [[], { tokens: [], queryCount: 0, error: null } as const];

  const healthCodesByProductId = new Map(
    (Array.isArray(healthFacts) ? healthFacts : []).map((facts) => [
      facts.product.id,
      deriveSellerProductHealth(facts).codes,
    ])
  );
  const storeIdByProductId = new Map(
    products.map((p) => [p.id, String(p.store_id)])
  );
  const variantTokens = indexVariantSearchTokens(
    variantSearch.tokens,
    products.map((p) => p.id)
  );

  const searchItems = buildSellerCatalogSearchItems({
    storeId,
    items: listItems,
    storeIdByProductId,
    variantTokens,
    healthCodesByProductId,
  });

  const canManage = canManageCatalog(membership.role);

  return (
    <SellerOpsShell title="Products" subtitle={membership.store.name} wide>
      <header className="mt-6 rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">Catalog workspace</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="sf-display text-3xl font-semibold tracking-tight md:text-4xl">
              Products
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--sf-muted)]">
              Search, filter, and sort catalog items for @
              {membership.store.slug}. Publishing still requires operator
              approval — sellers cannot self-activate.
            </p>
          </div>
          {canManage ? (
            <Link
              href="/seller/store/products/new"
              className="watch-focus-ring rounded-full bg-[var(--sf-accent)] px-5 py-2.5 text-sm font-bold text-[#1a1712]"
            >
              New draft
            </Link>
          ) : null}
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link
            href={APP_ROUTES.sellerStore}
            className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
          >
            ← Store dashboard
          </Link>
          <Link
            href={APP_ROUTES.sellerInventory}
            className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
          >
            Inventory
          </Link>
          <Link
            href={APP_ROUTES.sellerOrders}
            className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
          >
            Orders
          </Link>
          <Link
            href={APP_ROUTES.sellerMarketplace}
            className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
          >
            Marketplace
          </Link>
        </div>
      </header>

      <div className="mt-6">
        {!productsResult.ok ? (
          <StoreErrorState message={productsResult.message} />
        ) : (
          <SellerProductDashboard
            products={searchItems}
            storeId={storeId}
            canManage={canManage}
            storeName={membership.store.name}
          />
        )}
      </div>
    </SellerOpsShell>
  );
}
