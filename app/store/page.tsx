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
import { createTranslator } from "../../lib/i18n";
import { resolveRequestLocale } from "../../lib/i18n/server";
import { createClient } from "../../lib/supabase/server";
import {
  listActiveCategories,
  listPublicCatalog,
} from "../../lib/store/catalogQueries";
import { STOREFRONT_FLAGS } from "../../lib/store/storefrontFlags";

import JsonLd from "../components/JsonLd";
import { buildBreadcrumbListJsonLd, buildItemListJsonLd } from "../../lib/site/jsonLd";
import { buildLocalizedRouteMetadata } from "../../lib/site/localizedSeo";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const { locale } = await resolveRequestLocale();
  return buildLocalizedRouteMetadata({
    key: "store",
    path: "/store",
    locale,
  });
}

export default async function StoreHomePage() {
  const [{ locale }, supabase] = await Promise.all([
    resolveRequestLocale(),
    createClient(),
  ]);
  const t = createTranslator(locale);
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
  const catalogHero = heroSlidesFromCatalog(items);
  const heroSlides =
    catalogHero.length > 0
      ? catalogHero.map((slide) => ({
          ...slide,
          ctaLabel: t("store.hero.viewProduct"),
        }))
      : [
          {
            id: "welcome",
            title: t("store.hero.shopTitle"),
            subtitle: t("store.hero.shopSubtitle"),
            href: "/store/search",
            imageUrl: null,
            ctaLabel: t("store.hero.browseProducts"),
          },
        ];
  const catalogEmpty = !catalog.error && items.length === 0;

  return (
    <>
    <JsonLd
      data={buildBreadcrumbListJsonLd([
        { name: "UMTUBA", path: "/" },
        { name: t("store.shell.title"), path: "/store" },
      ])}
    />
    <JsonLd
      data={buildItemListJsonLd({
        name: t("store.shell.title"),
        items: items.slice(0, 24).map((item) => ({
          name: item.product.title,
          path: `/store/${item.store.slug}/product/${item.product.slug}`,
        })),
      })}
    />
    <StoreShell title={t("store.shell.title")} subtitle={t("store.shell.subtitle")}>
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
            title={t("store.empty.catalogTitle")}
            description={t("store.empty.catalogDescription")}
            actionHref="/store/search"
            actionLabel={t("store.empty.catalogAction")}
          />
        </div>
      ) : null}

      <StoreSection
        id="trending"
        eyebrow={t("store.home.featuredEyebrow")}
        title={t("store.home.featuredTitle")}
        description={t("store.home.featuredDescription")}
        href="/store/search?sort=newest"
        linkLabel={t("store.home.seeAll")}
      >
        <ProductRail
          items={trending}
          emptyTitle={t("store.empty.featuredTitle")}
          emptyDescription={t("store.empty.featuredDescription")}
        />
      </StoreSection>

      <StoreSection
        id="collections"
        eyebrow={t("store.home.collectionsEyebrow")}
        title={t("store.home.collectionsTitle")}
        description={t("store.home.collectionsDescription")}
        href="/store/search"
        linkLabel={t("store.home.browseCategories")}
      >
        <CategoryRail categories={collections} variant="collections" />
      </StoreSection>

      <StoreSection
        id="featured-stores"
        eyebrow={t("store.home.sellersEyebrow")}
        title={t("store.home.sellersTitle")}
        description={t("store.home.sellersDescription")}
        href="/store/search"
      >
        {featuredStores.length === 0 ? (
          <StoreEmptyState
            title={t("store.empty.sellersTitle")}
            description={t("store.empty.sellersDescription")}
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
          eyebrow={t("watch.eyebrow")}
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
        eyebrow={t("store.home.categoriesEyebrow")}
        title={t("store.home.categoriesTitle")}
        href="/store/search"
        linkLabel={t("store.home.openFilters")}
      >
        <CategoryRail categories={categories} />
      </StoreSection>

      <StoreSection
        id="new-arrivals"
        eyebrow={t("store.home.newEyebrow")}
        title={t("store.home.newTitle")}
        description={t("store.home.newDescription")}
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
        eyebrow={t("store.home.moreEyebrow")}
        title={t("store.home.moreTitle")}
        description={t("store.home.moreDescription")}
      >
        {recommended.length === 0 ? (
          <StoreEmptyState
            title={t("store.empty.recommendedTitle")}
            description={t("store.empty.recommendedDescription")}
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
          {t("store.home.openCatalog")}
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href={APP_ROUTES.storeWishlist}
            className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
          >
            {t("store.home.favorites")}
          </Link>
          <Link
            href={APP_ROUTES.storeCart}
            className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
          >
            {t("store.home.cart")}
          </Link>
          <Link
            href={APP_ROUTES.seller}
            className="text-sm font-semibold text-[var(--sf-faint)] transition hover:text-[var(--sf-ink)]"
          >
            {t("store.home.sellOnUmtuba")}
          </Link>
        </div>
      </div>
    </StoreShell>
    </>
  );
}
