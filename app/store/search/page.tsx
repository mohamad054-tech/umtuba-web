import { Suspense } from "react";
import ProductCard from "../../components/store/ProductCard";
import SearchFilters from "../../components/store/SearchFilters";
import StoreEmptyState from "../../components/store/StoreEmptyState";
import StoreErrorState from "../../components/store/StoreErrorState";
import StorePageHeader from "../../components/store/StorePageHeader";
import StoreShell from "../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../components/store/StoreSkeleton";
import { APP_ROUTES } from "../../lib/nav";
import {
  filterCatalogByAvailability,
  sortCatalogItems,
} from "../../lib/storefront/deriveSections";
import { createClient } from "../../../lib/supabase/server";
import {
  listActiveCategories,
  listPublicCatalog,
} from "../../../lib/store/catalogQueries";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    category?: string;
    sort?: string;
    availability?: string;
  }>;
};

export const metadata = {
  title: "Search Store | UMTUBA",
  description: "Search active UMTUBA store products.",
};

export default async function StoreSearchPage({ searchParams }: SearchPageProps) {
  const params = (await searchParams) ?? {};
  const search = typeof params.q === "string" ? params.q : "";
  const categoryId =
    typeof params.category === "string" ? params.category : undefined;
  const sort = typeof params.sort === "string" ? params.sort : "newest";
  const availability =
    typeof params.availability === "string" ? params.availability : "";

  const supabase = await createClient();
  const [categories, catalog] = await Promise.all([
    listActiveCategories(supabase),
    listPublicCatalog(supabase, {
      search,
      categoryId,
      limit: 100,
    }),
  ]);

  const items = sortCatalogItems(
    filterCatalogByAvailability(catalog.items, availability),
    sort
  );

  return (
    <StoreShell title="Search" subtitle="Store">
      <StorePageHeader
        eyebrow="Browse"
        title="Search & categories"
        description="Filter active catalog products by keyword, category, and sort. Search uses the existing store catalog contract — no fabricated matches."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[260px_1fr]">
        <Suspense
          fallback={
            <div className="h-64 animate-pulse rounded-[24px] bg-white/5" />
          }
        >
          <SearchFilters categories={categories} resultCount={items.length} />
        </Suspense>

        <div>
          {catalog.error ? (
            <StoreErrorState message={catalog.error} />
          ) : items.length === 0 ? (
            <StoreEmptyState
              title="No matches"
              description="Try another search term or clear category filters."
              actionHref={APP_ROUTES.storeSearch}
              actionLabel="Clear search"
            />
          ) : (
            <Suspense fallback={<ProductGridSkeleton />}>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <ProductCard key={item.product.id} item={item} />
                ))}
              </div>
            </Suspense>
          )}
        </div>
      </div>
    </StoreShell>
  );
}
