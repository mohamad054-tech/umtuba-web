import { Suspense } from "react";
import Link from "next/link";
import ProductCard from "../../components/store/ProductCard";
import SearchFilters from "../../components/store/SearchFilters";
import StoreEmptyState from "../../components/store/StoreEmptyState";
import StoreErrorState from "../../components/store/StoreErrorState";
import StoreShell from "../../components/store/StoreShell";
import { ProductGridSkeleton } from "../../components/store/StoreSkeleton";
import { APP_ROUTES } from "../../lib/nav";
import { sortCatalogItems } from "../../lib/storefront/deriveSections";
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

  const supabase = await createClient();
  const [categories, catalog] = await Promise.all([
    listActiveCategories(supabase),
    listPublicCatalog(supabase, {
      search,
      categoryId,
      limit: 100,
    }),
  ]);

  const items = sortCatalogItems(catalog.items, sort);

  return (
    <StoreShell
      title="Search"
      subtitle="Store"
      actions={
        <Link
          href={APP_ROUTES.store}
          className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70"
        >
          Home
        </Link>
      }
    >
      <header className="mt-6 rounded-[28px] border border-violet-400/20 bg-[#080816]/80 p-5 md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300/70">
          Discovery
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Search</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Search active products by keyword, category, and sort order.
        </p>
      </header>

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
