import Link from "next/link";
import BrandRail from "../components/store/BrandRail";
import CategoryRail from "../components/store/CategoryRail";
import HeroCarousel from "../components/store/HeroCarousel";
import PlaceholderPanel from "../components/store/PlaceholderPanel";
import ProductCard from "../components/store/ProductCard";
import ProductRail from "../components/store/ProductRail";
import StoreCard from "../components/store/StoreCard";
import StoreEmptyState from "../components/store/StoreEmptyState";
import StoreErrorState from "../components/store/StoreErrorState";
import StoreSection from "../components/store/StoreSection";
import StoreShell from "../components/store/StoreShell";
import StoreTrustStrip from "../components/store/StoreTrustStrip";
import { APP_ROUTES } from "../lib/nav";
import {
  deriveCuratedCollections,
  deriveFeaturedStores,
  heroSlidesFromCatalog,
  pickNewArrivals,
  pickRecommended,
  pickTrending,
} from "../lib/storefront/deriveSections";
import { createClient } from "../../lib/supabase/server";
import {
  listActiveCategories,
  listPublicCatalog,
} from "../../lib/store/catalogQueries";
import { STOREFRONT_FLAGS } from "../../lib/store/storefrontFlags";

export const metadata = {
  title: "Store | UMTUBA",
  description:
    "Premium UMTUBA storefront — discover products, collections, and creators.",
};

export default async function StoreHomePage() {
  const supabase = await createClient();
  const [categories, catalog] = await Promise.all([
    listActiveCategories(supabase),
    listPublicCatalog(supabase, { limit: 48 }),
  ]);

  const items = catalog.items;
  const trending = pickTrending(items, 8);
  const arrivals = pickNewArrivals(items, 8);
  const recommended = pickRecommended(items, undefined, 8);
  const featuredStores = deriveFeaturedStores(items).slice(0, 8);
  const collections = deriveCuratedCollections(items, categories, 6);
  const heroSlides = heroSlidesFromCatalog(items);
  const catalogEmpty = !catalog.error && items.length === 0;

  return (
    <StoreShell title="Store" subtitle="Commerce">
      <HeroCarousel slides={heroSlides} />
      <StoreTrustStrip />

      {catalog.error ? (
        <div className="mt-6">
          <StoreErrorState message={catalog.error} />
        </div>
      ) : null}

      {catalogEmpty ? (
        <div className="mt-8">
          <StoreEmptyState
            title="Catalog is quiet right now"
            description="Active, approved products will appear here as sellers publish. Home stays Discovery — this Store surface is the commerce layer."
            actionHref="/store/search"
            actionLabel="Open search"
          />
        </div>
      ) : null}

      <StoreSection
        id="trending"
        eyebrow="Featured"
        title="Featured products"
        description="Active listings ranked by availability and recency — no fabricated popularity scores."
        href="/store/search?sort=newest"
        linkLabel="See all"
      >
        <ProductRail
          items={trending}
          emptyTitle="No featured products yet"
          emptyDescription="Publish approved active listings to populate this rail."
        />
      </StoreSection>

      <StoreSection
        id="collections"
        eyebrow="Curated"
        title="Collections"
        description="Category collections derived from products currently in the public catalog."
        href="/store/search"
        linkLabel="Browse categories"
      >
        <CategoryRail categories={collections} variant="collections" />
      </StoreSection>

      <StoreSection
        id="featured-stores"
        eyebrow="Creators"
        title="Featured sellers"
        description="Sellers with active catalog presence on UMTUBA."
        href="/store/search"
      >
        {featuredStores.length === 0 ? (
          <StoreEmptyState
            title="No featured sellers yet"
            description="Active stores with approved products will appear here."
          />
        ) : (
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
            {featuredStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </StoreSection>

      {STOREFRONT_FLAGS.SHOW_LIVE_SHOPPING ? (
        <StoreSection
          id="live"
          eyebrow="Live"
          title="Live shopping"
          description="Realtime shoppable streams are not enabled yet — this panel is intentionally unavailable."
        >
          <div className="grid gap-3 md:grid-cols-3">
            <PlaceholderPanel
              title="Live stage"
              description="Hosts will go live with products from their store."
              tone="fuchsia"
            />
            <PlaceholderPanel
              title="Join room"
              description="Watch-and-buy rooms connect here later."
              tone="violet"
            />
            <PlaceholderPanel
              title="Upcoming"
              description="Scheduled live shopping is not available yet."
              tone="indigo"
            />
          </div>
        </StoreSection>
      ) : null}

      {STOREFRONT_FLAGS.SHOW_SHOPPABLE_VIDEO_RAIL ? (
        <StoreSection
          id="shoppable-video"
          eyebrow="Watch"
          title="Videos you can shop"
        >
          <PlaceholderPanel
            title="Shoppable video rail"
            description="Product-tagged videos will surface here when video commerce is enabled."
            tone="violet"
          />
        </StoreSection>
      ) : null}

      <StoreSection
        id="categories"
        eyebrow="Browse"
        title="Categories"
        href="/store/search"
        linkLabel="Open filters"
      >
        <CategoryRail categories={categories} />
      </StoreSection>

      <StoreSection
        id="new-arrivals"
        eyebrow="New"
        title="New arrivals"
        description="Recently published active products."
        href="/store/search?sort=newest"
      >
        <ProductRail items={arrivals} />
      </StoreSection>

      {STOREFRONT_FLAGS.SHOW_FLASH_DEALS ? (
        <StoreSection id="flash" eyebrow="Limited" title="Flash deals">
          <PlaceholderPanel
            title="Flash deals unavailable"
            description="Timed promotions require trusted deal pricing — not invented for this surface."
            tone="fuchsia"
          />
        </StoreSection>
      ) : null}

      <StoreSection
        id="recommended"
        eyebrow="Explore"
        title="More to discover"
        description="Additional active catalog picks when inventory allows."
      >
        {recommended.length === 0 ? (
          <StoreEmptyState
            title="Nothing extra to show"
            description="Recommendations appear once there is an active catalog with available products."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((item) => (
              <ProductCard key={item.product.id} item={item} />
            ))}
          </div>
        )}
      </StoreSection>

      {STOREFRONT_FLAGS.SHOW_BRAND_RAIL ? (
        <StoreSection id="brands" eyebrow="Labels" title="Popular brands">
          <BrandRail />
        </StoreSection>
      ) : null}

      <div className="mt-14 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--sf-line)] pt-7">
        <Link
          href="/store/search"
          className="text-sm font-semibold text-[var(--sf-accent-strong)] transition hover:text-[var(--sf-accent)]"
        >
          Open full catalog →
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={APP_ROUTES.storeWishlist}
            className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
          >
            Favorites
          </Link>
          <Link
            href={APP_ROUTES.storeCart}
            className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
          >
            Cart
          </Link>
          <Link
            href={APP_ROUTES.seller}
            className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
          >
            Sell on UMTUBA
          </Link>
        </div>
      </div>
    </StoreShell>
  );
}
