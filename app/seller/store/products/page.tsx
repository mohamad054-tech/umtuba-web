import Link from "next/link";
import { redirect } from "next/navigation";
import SellerOpsShell from "../../../components/store/SellerOpsShell";
import SellerProductDashboard from "../../../components/store/SellerProductDashboard";
import StoreErrorState from "../../../components/store/StoreErrorState";
import { APP_ROUTES } from "../../../lib/nav";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { canManageCatalog } from "../../../../lib/store/permissions";
import { getOwnedOrMemberStore } from "../../../../lib/store/sellerStore";
import { listSellerInventoryRows } from "../../../../lib/store/sellerInventoryQueries";
import {
  loadSellerCatalogHealthFacts,
  loadSellerCatalogVariantSearchTokens,
} from "../../../../lib/store/sellerCatalogWiring";
import { deriveSellerProductHealth } from "../../../../lib/store/sellerExperienceFoundation";
import {
  buildSellerCatalogSearchItems,
  filterSellerCatalogSearchItems,
  indexVariantSearchTokens,
  productMatchesCatalogHealthFilter,
  productMatchesCatalogStatusFilter,
} from "../../../../lib/store/sellerCatalogSearchFiltering";
import {
  buildSellerCatalogProductsHref,
  listSellerCatalogPage,
  parseSellerCatalogUrlState,
} from "../../../../lib/store/sellerCatalogDataAccess";
import type { SellerCatalogListItem } from "../../../../lib/store/sellerCatalogPresentation";

export const metadata = {
  title: "Seller Products | UMTUBA",
};

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SellerProductsPage({ searchParams }: PageProps) {
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
  const params = (await searchParams) ?? {};
  const urlState = parseSellerCatalogUrlState(params);

  const catalogPage = await listSellerCatalogPage(supabase, {
    storeId,
    ...urlState,
  });

  if (!catalogPage.ok) {
    return (
      <SellerOpsShell title="Products" subtitle={membership.store.name} wide>
        <div className="mt-6">
          <StoreErrorState message={catalogPage.message} />
          {catalogPage.code === "invalid_cursor" ? (
            <p className="mt-3 text-sm text-[var(--sf-muted)]">
              <Link
                href={buildSellerCatalogProductsHref({
                  search: urlState.search,
                  status: urlState.status,
                  productType: urlState.productType,
                  sort: urlState.sort,
                  health: urlState.health,
                  limit: urlState.limit,
                })}
                className="font-semibold text-[var(--sf-accent-strong)]"
              >
                Reset pagination
              </Link>
            </p>
          ) : null}
        </div>
      </SellerOpsShell>
    );
  }

  const products = catalogPage.items;
  const pageIds = new Set(products.map((p) => p.id));

  const inventoryResult = await listSellerInventoryRows(
    supabase,
    storeId,
    membership.role,
    { limit: Math.min(500, Math.max(products.length * 4, 50)) }
  );
  const inventoryForPage = inventoryResult.ok
    ? inventoryResult.data.filter((row) => pageIds.has(row.productId))
    : null;

  const [healthFacts, variantSearch] = products.length
    ? await Promise.all([
        loadSellerCatalogHealthFacts(supabase, {
          storeId,
          products,
          inventoryRows: inventoryForPage,
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

  let searchItems = buildSellerCatalogSearchItems({
    storeId,
    items: listItems,
    storeIdByProductId,
    variantTokens,
    healthCodesByProductId,
  });

  // Page-local only for ready / needs_attention / health chips — not catalog-wide.
  if (catalogPage.applied.healthFilterScope === "page_only") {
    searchItems = searchItems.filter((item) => {
      if (
        catalogPage.applied.status === "ready" ||
        catalogPage.applied.status === "needs_attention"
      ) {
        if (
          !productMatchesCatalogStatusFilter(item, catalogPage.applied.status)
        ) {
          return false;
        }
      }
      return productMatchesCatalogHealthFilter(
        item,
        catalogPage.applied.health
      );
    });
  } else {
    // Defense: keep store scope even if enrichment mixed rows.
    searchItems = filterSellerCatalogSearchItems(searchItems, {
      storeId,
      status: "all",
      health: "any",
      productType: "all",
      sort: catalogPage.applied.sort,
    });
  }

  const nextHref = catalogPage.nextCursor
    ? buildSellerCatalogProductsHref({
        search: catalogPage.applied.search,
        status: catalogPage.applied.status,
        productType: catalogPage.applied.productType,
        sort: catalogPage.applied.sort,
        health: catalogPage.applied.health,
        limit: catalogPage.pageSize,
        cursor: catalogPage.nextCursor,
      })
    : null;

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
              Paginated catalog for @{membership.store.slug}. Search, status,
              type, and sort run server-side; health chips apply to the current
              page only.
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
        </div>
      </header>

      <div className="mt-6">
        <SellerProductDashboard
          products={searchItems}
          storeId={storeId}
          canManage={canManage}
          storeName={membership.store.name}
          applied={catalogPage.applied}
          pageSize={catalogPage.pageSize}
          hasMore={catalogPage.hasMore}
          nextHref={nextHref}
          healthFilterScope={catalogPage.applied.healthFilterScope}
        />
      </div>
    </SellerOpsShell>
  );
}
