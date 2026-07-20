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
import { APP_ROUTES } from "../lib/nav";
import {
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
  description: "Premium UMTUBA storefront — browse active products and stores.",
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
  const heroSlides = heroSlidesFromCatalog(items);

  return (
    <StoreShell
      title="Store"
      subtitle="Discover"
      actions={
        <Link
          href="/store/search"
          className="watch-focus-ring rounded-full border border-violet-400/30 bg-violet-500/15 px-3 py-1.5 text-xs font-bold text-violet-100 transition hover:bg-violet-500/25"
        >
          Search
        </Link>
      }
    >
      <HeroCarousel slides={heroSlides} />

      {catalog.error ? (
        <div className="mt-6">
          <StoreErrorState message={catalog.error} />
        </div>
      ) : null}

      <StoreSection
        id="trending"
        eyebrow="Now"
        title="Trending products"
        description="Active listings with the strongest availability signal."
        href="/store/search?sort=newest"
      >
        <ProductRail items={trending} badge="Hot" />
      </StoreSection>

      <StoreSection
        id="featured-stores"
        eyebrow="Stores"
        title="Featured stores"
        href="/store/search"
      >
        {featuredStores.length === 0 ? (
          <StoreEmptyState
            title="No featured stores yet"
            description="Active stores with approved products will appear here."
          />
        ) : (
          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
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
          title="Live shopping now"
          description="Realtime shoppable streams arrive in a later phase."
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
              description="Scheduled live shopping sessions placeholder."
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
            description="Product-tagged videos will surface here — browsing only for now."
            tone="violet"
          />
        </StoreSection>
      ) : null}

      <StoreSection
        id="categories"
        eyebrow="Browse"
        title="Categories"
        href="/store/search"
      >
        <CategoryRail categories={categories} />
      </StoreSection>

      <StoreSection
        id="new-arrivals"
        eyebrow="Fresh"
        title="New arrivals"
        href="/store/search?sort=newest"
      >
        <ProductRail items={arrivals} />
      </StoreSection>

      {STOREFRONT_FLAGS.SHOW_FLASH_DEALS ? (
        <StoreSection id="flash" eyebrow="Limited" title="Flash deals">
          <PlaceholderPanel
            title="Flash deals"
            description="Timed promotions and deal pricing ship with the commerce phase."
            tone="fuchsia"
          />
        </StoreSection>
      ) : null}

      <StoreSection
        id="recommended"
        eyebrow="For you"
        title="Recommended products"
      >
        {recommended.length === 0 ? (
          <StoreEmptyState
            title="Recommendations warming up"
            description="Personalized picks appear once there is an active catalog."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((item) => (
              <ProductCard key={item.product.id} item={item} badge="For you" />
            ))}
          </div>
        )}
      </StoreSection>

      {STOREFRONT_FLAGS.SHOW_BRAND_RAIL ? (
        <StoreSection id="brands" eyebrow="Labels" title="Popular brands">
          <BrandRail />
        </StoreSection>
      ) : null}

      <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-6">
        <Link
          href="/store/search"
          className="text-sm font-bold text-violet-300 hover:text-violet-200"
        >
          Open full search →
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={APP_ROUTES.storeWishlist}
            className="text-sm font-bold text-white/45 hover:text-white/70"
          >
            Favorites
          </Link>
          <Link
            href={APP_ROUTES.seller}
            className="text-sm font-bold text-white/45 hover:text-white/70"
          >
            Sell on UMTUBA
          </Link>
        </div>
      </div>
    </StoreShell>
  );
}
