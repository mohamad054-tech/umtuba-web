"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AppLocale } from "../../../../lib/i18n";
import { sandboxHref } from "../../../../lib/sandbox/paths";
import { queryStoreCatalog, type StoreSort } from "../../../../lib/sandbox/store/catalogQuery";
import {
  displayOnHand,
  PROVIDER_MODEL_NOTES,
  STORE_CATEGORY_SLUGS,
  STORE_LISTING_VIEWS,
  type StoreListingView,
} from "../../../../lib/sandbox/store/listings";
import { storeT } from "../../../../lib/sandbox/store/messages";
import { formatMinorUnits } from "../../../../lib/store/money";
import ProductArt from "./ProductArt";
import { useStoreSession } from "./StoreSessionContext";

function Tile({
  locale,
  listing,
}: {
  locale: AppLocale;
  listing: StoreListingView;
}) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const price = listing.product.variants[0]?.priceMinor ?? 0;
  return (
    <Link className="sx-tile" href={sandboxHref(`store/products/${listing.product.slug}`)}>
      <ProductArt art={listing.art} />
      <p className="sx-tile-meta">
        <span className="sx-badge">{t("demoOnly")}</span>
        <span>{listing.product.category}</span>
      </p>
      <h3>{listing.product.title}</h3>
      <p className="sx-tile-price">{formatMinorUnits(price, "USD")}</p>
    </Link>
  );
}

export function StoreHome({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const featured = STORE_LISTING_VIEWS.slice(0, 8);
  return (
    <div>
      <section className="sx-hero">
        <p className="sx-eyebrow">{t("heroEyebrow")}</p>
        <h2>{t("heroTitle")}</h2>
        <p>{t("heroBody")}</p>
        <Link className="sx-cta" href={sandboxHref("store/catalog")}>
          {t("shopCatalog")}
        </Link>
      </section>
      <h3 className="sx-section-title">{t("featured")}</h3>
      <div className="sx-product-grid">
        {featured.map((listing) => (
          <Tile key={listing.product.id} locale={locale} listing={listing} />
        ))}
      </div>
      <h3 className="sx-section-title">{t("allProducts")}</h3>
      <div className="sx-product-grid">
        {STORE_LISTING_VIEWS.map((listing) => (
          <Tile key={listing.product.id} locale={locale} listing={listing} />
        ))}
      </div>
    </div>
  );
}

export function StoreCatalog({
  locale,
  initialQ,
  initialCategory,
  initialSort,
}: {
  locale: AppLocale;
  initialQ?: string;
  initialCategory?: string;
  initialSort?: string;
}) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const [q, setQ] = useState(initialQ ?? "");
  const [category, setCategory] = useState(initialCategory ?? "all");
  const [sort, setSort] = useState<StoreSort>(
    initialSort === "price-asc" || initialSort === "price-desc" || initialSort === "title"
      ? initialSort
      : "featured"
  );
  const rows = useMemo(
    () =>
      queryStoreCatalog({
        q,
        category: category === "all" ? "all" : (category as (typeof STORE_CATEGORY_SLUGS)[number]),
        sort,
      }),
    [q, category, sort]
  );

  return (
    <div>
      <h2 className="text-2xl font-semibold">{t("catalog")}</h2>
      <div className="sx-filters">
        <label>
          {t("search")}
          <input value={q} onChange={(event) => setQ(event.target.value)} />
        </label>
        <label>
          {t("filterCategory")}
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">{t("allCategories")}</option>
            {STORE_CATEGORY_SLUGS.map((slug) => (
              <option key={slug} value={slug}>
                {slug.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("sort")}
          <select value={sort} onChange={(event) => setSort(event.target.value as StoreSort)}>
            <option value="featured">{t("sortFeatured")}</option>
            <option value="price-asc">{t("sortPriceAsc")}</option>
            <option value="price-desc">{t("sortPriceDesc")}</option>
            <option value="title">{t("sortTitle")}</option>
          </select>
        </label>
      </div>
      <p className="mt-3 text-sm text-[var(--sx-muted)]">
        {rows.length} {t("results")}
      </p>
      {rows.length === 0 ? (
        <p className="sx-card mt-4">{t("emptySearch")}</p>
      ) : (
        <div className="sx-product-grid mt-4">
          {rows.map((listing) => (
            <Tile key={listing.product.id} locale={locale} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}

export function StorePdp({ locale, listing }: { locale: AppLocale; listing: StoreListingView }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const session = useStoreSession();
  const [variantId, setVariantId] = useState(listing.product.variants[0]?.id ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const variant = listing.product.variants.find((row) => row.id === variantId) ?? listing.product.variants[0];
  const stock = displayOnHand(listing, variant?.id);
  const saved = session.state.favorites.includes(listing.product.slug);
  const notes = PROVIDER_MODEL_NOTES[listing.commerceMode];

  return (
    <article className="sx-pdp">
      <ProductArt art={listing.art} className="sx-art sx-art-lg" />
      <div>
        <p className="sx-tile-meta">
          <span className="sx-badge">{t("demoOnly")}</span>
          <span>{listing.product.category}</span>
        </p>
        <h2 className="mt-3 text-3xl font-semibold">{listing.product.title}</h2>
        <p className="mt-3 text-[var(--sx-muted)]">{listing.shopperDescription}</p>
        <p className="mt-4 text-2xl">{formatMinorUnits(variant?.priceMinor ?? 0, "USD")}</p>
        {listing.product.variants.length > 1 ? (
          <label className="sx-field">
            {t("variant")}
            <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
              {listing.product.variants.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.title}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <p className="mt-3 text-sm text-[var(--sx-muted)]">
          {listing.stockKind === "digital"
            ? t("digitalStock")
            : `${t("physicalStock")}: ${stock ?? 0}`}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="sx-cta"
            onClick={() => {
              session.addToCart(listing.product.slug, variant?.id ?? "", 1);
              setNotice(t("addedToCart"));
            }}
          >
            {t("addToCart")}
          </button>
          <button
            type="button"
            className="sx-ghost"
            onClick={() => session.toggleFavorite(listing.product.slug)}
          >
            {saved ? t("favorited") : t("favorite")}
          </button>
        </div>
        {notice ? (
          <p className="mt-3 text-sm">
            {notice}.{" "}
            <Link className="underline" href={sandboxHref("store/cart")}>
              {t("viewCart")}
            </Link>
          </p>
        ) : null}
        <details className="sx-card mt-6">
          <summary>{t("howListingWorks")}</summary>
          <p className="mt-2 text-sm">
            {t("soldBy")}: {listing.actor.displayName}
          </p>
          <p className="mt-1 text-sm">
            {t("fulfillmentMode")}: {listing.commerceMode}
          </p>
          <p className="mt-1 text-sm text-[var(--sx-muted)]">{notes.owner}</p>
          <p className="mt-1 text-sm text-[var(--sx-muted)]">{notes.rights}</p>
        </details>
        <ul className="mt-4 space-y-1 text-sm text-[var(--sx-muted)]">
          <li>{t("noReviews")}</li>
          <li>{t("noRatings")}</li>
          <li>{t("noDiscount")}</li>
          <li>{t("noDeliveryPromise")}</li>
        </ul>
      </div>
    </article>
  );
}

export function StoreFavorites({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const { state } = useStoreSession();
  const rows = STORE_LISTING_VIEWS.filter((listing) => state.favorites.includes(listing.product.slug));
  if (rows.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-semibold">{t("favorites")}</h2>
        <p className="sx-card mt-4">{t("emptyFavorites")}</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold">{t("favorites")}</h2>
      <div className="sx-product-grid mt-4">
        {rows.map((listing) => (
          <Tile key={listing.product.id} locale={locale} listing={listing} />
        ))}
      </div>
    </div>
  );
}
