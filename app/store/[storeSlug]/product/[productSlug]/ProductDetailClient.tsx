"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addToCartAction } from "../../../../actions/storeCart";
import ProductCard from "../../../../components/store/ProductCard";
import PlaceholderPanel from "../../../../components/store/PlaceholderPanel";
import StoreSection from "../../../../components/store/StoreSection";
import WishlistButton from "../../../../components/store/WishlistButton";
import { APP_ROUTES } from "../../../../lib/nav";
import { formatMinorUnits } from "../../../../../lib/store/money";
import { STOREFRONT_FLAGS } from "../../../../../lib/store/storefrontFlags";
import type { PublicProductVideoItem } from "../../../../../lib/store/videoCommerceQueries";
import type {
  PublicCatalogItem,
  PublicProductDetail,
} from "../../../../../lib/store/types";

type ProductDetailClientProps = {
  detail: PublicProductDetail;
  related: PublicCatalogItem[];
  recommended: PublicCatalogItem[];
  videos: PublicProductVideoItem[];
  initialWishlisted: boolean;
};

export default function ProductDetailClient({
  detail,
  related,
  recommended,
  videos,
  initialWishlisted,
}: ProductDetailClientProps) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(
    detail.variants[0]?.variant.id ?? ""
  );
  const [mediaIndex, setMediaIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(
    () =>
      detail.variants.find((v) => v.variant.id === variantId) ??
      detail.variants[0],
    [detail.variants, variantId]
  );

  const price =
    selected?.price != null
      ? formatMinorUnits(
          Number(selected.price.amount_minor),
          selected.price.currency
        )
      : null;

  const compareAt =
    selected?.price != null &&
    selected.price.compare_at_amount_minor != null &&
    Number(selected.price.compare_at_amount_minor) >
      Number(selected.price.amount_minor)
      ? formatMinorUnits(
          Number(selected.price.compare_at_amount_minor),
          selected.price.currency
        )
      : null;

  const optionKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const v of detail.variants) {
      Object.keys(v.variant.option_values ?? {}).forEach((k) => keys.add(k));
    }
    return Array.from(keys);
  }, [detail.variants]);

  const media =
    detail.media.length > 0
      ? detail.media
      : [
          {
            id: "placeholder",
            product_id: detail.product.id,
            variant_id: null,
            media_type: "image",
            storage_path: "",
            alt_text: detail.product.title,
            sort_order: 0,
            role: "cover",
            status: "active",
            mediaUrl: null as string | null,
          },
        ];

  const logisticsRows = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = [];
    const { weight_grams, length_mm, width_mm, height_mm, origin_country_code } =
      detail.product;

    if (weight_grams != null) {
      rows.push({ label: "Weight", value: `${weight_grams} g` });
    }
    if (length_mm != null && width_mm != null && height_mm != null) {
      rows.push({
        label: "Dimensions",
        value: `${length_mm} × ${width_mm} × ${height_mm} mm`,
      });
    }
    if (origin_country_code) {
      rows.push({ label: "Origin", value: origin_country_code });
    }
    return rows;
  }, [detail.product]);

  const policyBlocks = useMemo(() => {
    const blocks: Array<{ title: string; body: string }> = [];
    if (detail.store.shipping_policy?.trim()) {
      blocks.push({
        title: "Shipping policy",
        body: detail.store.shipping_policy.trim(),
      });
    }
    if (detail.store.return_policy?.trim()) {
      blocks.push({
        title: "Return policy",
        body: detail.store.return_policy.trim(),
      });
    }
    if (detail.store.privacy_policy?.trim()) {
      blocks.push({
        title: "Privacy policy",
        body: detail.store.privacy_policy.trim(),
      });
    }
    return blocks;
  }, [detail.store]);

  const activeMedia = media[mediaIndex] ?? media[0];
  const activeMediaUrl =
    activeMedia.id === "placeholder"
      ? null
      : ((activeMedia as { mediaUrl?: string | null }).mediaUrl ?? null);
  const inStock =
    !!selected &&
    (selected.available > 0 || Boolean(selected.inventory?.allow_backorder));
  const maxQty = selected
    ? selected.inventory?.allow_backorder
      ? 99
      : Math.max(1, selected.available)
    : 1;
  const purchaseBlocked =
    detail.purchaseAllowed === false ||
    Boolean(detail.purchaseBlockedReason);
  const canAdd =
    !!selected &&
    inStock &&
    price != null &&
    !pending &&
    !purchaseBlocked;

  return (
    <div className="mt-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section aria-label="Product gallery">
          <div className="overflow-hidden rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)]">
            <div className="relative aspect-[4/5] bg-[var(--sf-surface-2)] sm:aspect-[4/3]">
              {activeMediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeMediaUrl}
                  alt={activeMedia.alt_text || detail.product.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  aria-hidden
                  style={{
                    backgroundImage:
                      "linear-gradient(160deg, rgba(214,196,161,0.18), transparent 45%), radial-gradient(circle at 70% 75%, rgba(255,255,255,0.06), transparent 50%)",
                  }}
                />
              )}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/60 via-transparent to-transparent p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--sf-accent)]">
                  {activeMedia.role} · {activeMedia.media_type}
                </p>
                {!activeMediaUrl ? (
                  <p className="mt-2 text-sm font-semibold text-white/85">
                    Product image coming soon
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <ul
            className="mt-3 flex gap-2 overflow-x-auto pb-1"
            aria-label="Media thumbnails"
          >
            {media.map((m, i) => {
              const thumbUrl =
                m.id === "placeholder"
                  ? null
                  : ((m as { mediaUrl?: string | null }).mediaUrl ?? null);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    aria-label={`Show media ${i + 1}`}
                    aria-current={i === mediaIndex ? "true" : undefined}
                    onClick={() => setMediaIndex(i)}
                    className={`watch-focus-ring relative h-16 w-16 overflow-hidden rounded-xl border transition ${
                      i === mediaIndex
                        ? "border-[rgba(214,196,161,0.55)]"
                        : "border-[var(--sf-line)] bg-white/5 hover:border-[rgba(214,196,161,0.35)]"
                    }`}
                  >
                    {thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-[10px] font-bold uppercase text-white/50">
                        {m.media_type.slice(0, 3)}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 backdrop-blur-xl md:p-7">
          <Link
            href={`/store/${detail.store.slug}`}
            className="watch-focus-ring inline-flex items-center gap-2 rounded-full border border-[rgba(214,196,161,0.28)] bg-[rgba(214,196,161,0.08)] px-3 py-1.5 text-xs font-semibold text-[var(--sf-accent-strong)] transition hover:bg-[rgba(214,196,161,0.16)]"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(214,196,161,0.22)] text-[10px] font-black"
              aria-hidden
            >
              {(detail.store.name[0] ?? "U").toUpperCase()}
            </span>
            {detail.store.name}
            {detail.store.verification_status === "verified" ? (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/70">
                Verified
              </span>
            ) : null}
          </Link>

          <h1 className="sf-display mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
            {detail.displayTitle?.trim() || detail.product.title}
          </h1>
          {detail.marketplaceSourceType === "supplier_listing" ? (
            <p
              role="status"
              className="mt-3 rounded-2xl border border-[rgba(214,196,161,0.28)] bg-[rgba(214,196,161,0.08)] px-3 py-2 text-xs leading-relaxed text-[var(--sf-accent-strong)]"
            >
              Sold by {detail.store.name}. Product supplied by{" "}
              {detail.supplierStoreName ?? "a verified supplier"}. Inventory and
              product specifications remain with the supplier; this storefront
              does not own that stock.
            </p>
          ) : null}
          {detail.product.short_description ? (
            <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
              {detail.product.short_description}
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            {price ? (
              <p className="text-3xl font-semibold text-[var(--sf-accent-strong)]">
                {price}
              </p>
            ) : (
              <p
                role="status"
                className="text-lg font-semibold text-[var(--sf-danger)]"
              >
                Price unavailable
              </p>
            )}
            {compareAt ? (
              <p className="text-base text-[var(--sf-faint)] line-through">
                {compareAt}
              </p>
            ) : null}
          </div>
          <p
            role="status"
            aria-live="polite"
            className={`mt-1 text-sm ${
              inStock ? "text-[var(--sf-ok)]" : "text-[var(--sf-faint)]"
            }`}
          >
            {selected
              ? inStock
                ? selected.inventory?.allow_backorder && selected.available <= 0
                  ? "Available on backorder"
                  : `${selected.available} available`
                : "Out of stock"
              : "No variants"}
          </p>
          {!price ? (
            <p className="mt-2 text-xs text-[var(--sf-faint)]">
              Purchase is closed until an active price is available for this
              variant.
            </p>
          ) : null}
          {purchaseBlocked && detail.purchaseBlockedReason ? (
            <p role="status" className="mt-2 text-xs text-[var(--sf-danger)]">
              {detail.purchaseBlockedReason}
            </p>
          ) : null}

          {detail.variants.length > 0 ? (
            <label className="mt-6 block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                Variant
              </span>
              <select
                value={selected?.variant.id ?? ""}
                onChange={(e) => {
                  setVariantId(e.target.value);
                  setQuantity(1);
                }}
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 text-sm outline-none focus:border-[rgba(214,196,161,0.45)]"
              >
                {detail.variants.map((v) => (
                  <option key={v.variant.id} value={v.variant.id}>
                    {v.variant.title} ({v.variant.sku})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {optionKeys.length > 0 && selected ? (
            <dl className="mt-4 space-y-2 text-sm">
              {optionKeys.map((key) => (
                <div
                  key={key}
                  className="flex justify-between gap-3 border-b border-[var(--sf-line)] py-2"
                >
                  <dt className="text-[var(--sf-faint)]">{key}</dt>
                  <dd className="font-semibold text-[var(--sf-ink)]">
                    {selected.variant.option_values?.[key] ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 rounded-full border border-[var(--sf-line)] bg-black/30 px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                Qty
              </span>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                disabled={!selected || !inStock}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  setQuantity(Math.min(maxQty, Math.max(1, Math.floor(next))));
                }}
                aria-label="Quantity"
                className="w-14 bg-transparent text-center text-sm font-semibold outline-none disabled:opacity-40"
              />
            </label>

            <button
              type="button"
              disabled={!canAdd}
              aria-disabled={!canAdd}
              onClick={() => {
                if (!selected || !canAdd) return;
                setCartError(null);
                setCartMessage(null);
                startTransition(async () => {
                  const result = await addToCartAction({
                    variantId: selected.variant.id,
                    quantity,
                    sellerListingId: detail.sellerListingId ?? null,
                  });
                  if (!result.ok) {
                    if (result.requiresAuth) {
                      router.push(
                        `${APP_ROUTES.login}?next=${encodeURIComponent(
                          `/store/${detail.store.slug}/product/${detail.product.slug}`
                        )}`
                      );
                      return;
                    }
                    setCartError(result.message);
                    return;
                  }
                  setCartMessage("Added to cart");
                  window.dispatchEvent(
                    new CustomEvent("umtuba:cart-updated", {
                      detail: { count: result.itemCount },
                    })
                  );
                });
              }}
              className="watch-focus-ring flex-1 rounded-full bg-[var(--sf-accent)] px-5 py-3.5 text-sm font-bold text-[#1a1712] transition hover:bg-[var(--sf-accent-strong)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
            >
              {pending
                ? "Adding…"
                : purchaseBlocked
                  ? "Unavailable"
                  : !price
                  ? "Price unavailable"
                  : !inStock
                    ? "Out of stock"
                    : "Add to cart"}
            </button>
            <WishlistButton
              productId={detail.product.id}
              sellerListingId={detail.sellerListingId ?? null}
              initialWishlisted={initialWishlisted}
              nextHref={`/store/${detail.store.slug}/product/${detail.product.slug}`}
              className="watch-focus-ring flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full border border-[var(--sf-line)] bg-white/5 text-xl text-white transition hover:bg-white/10"
            />
          </div>
          {cartError ? (
            <p role="alert" className="mt-3 text-sm text-[var(--sf-danger)]">
              {cartError}
            </p>
          ) : null}
          {cartMessage ? (
            <p role="status" className="mt-3 text-sm text-[var(--sf-ok)]">
              {cartMessage}{" "}
              <Link
                href={APP_ROUTES.storeCart}
                className="font-bold underline underline-offset-2"
              >
                View cart
              </Link>
            </p>
          ) : null}

          <div className="mt-7 rounded-2xl border border-[var(--sf-line)] bg-black/25 p-4">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-accent)]">
              Fulfillment
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
              {detail.store.shipping_policy?.trim()
                ? "This seller publishes a shipping policy below. Delivery timing is determined at checkout — no estimated dates are invented here."
                : "Fulfillment details are confirmed at checkout. No delivery dates or shipping fees are invented on this page."}
            </p>
            {logisticsRows.length > 0 ? (
              <dl className="mt-3 space-y-1.5 text-sm">
                {logisticsRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between gap-3 text-[var(--sf-muted)]"
                  >
                    <dt>{row.label}</dt>
                    <dd className="font-semibold text-[var(--sf-ink)]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </section>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-accent)]">
            Description
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--sf-muted)]">
            {detail.product.description || "No description provided."}
          </p>
        </section>
        <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-accent)]">
            Product information
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <SpecRow label="Type" value={detail.product.product_type} />
            <SpecRow label="Category" value={detail.category?.name ?? "—"} />
            <SpecRow label="SKU" value={selected?.variant.sku ?? "—"} />
            <SpecRow label="Store" value={detail.store.name} />
            {logisticsRows.map((row) => (
              <SpecRow key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        </section>
      </div>

      {policyBlocks.length > 0 ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {policyBlocks.map((block) => (
            <section
              key={block.title}
              className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5"
            >
              <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-accent)]">
                {block.title}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[var(--sf-muted)]">
                {block.body}
              </p>
            </section>
          ))}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {videos.length > 0 ? (
          <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-accent)]">
              Videos featuring this product
            </h2>
            <ul className="mt-3 space-y-2">
              {videos.map((video) => (
                <li key={video.postId}>
                  <Link
                    href={video.href}
                    className="watch-focus-ring flex items-center justify-between gap-3 rounded-2xl border border-[var(--sf-line)] bg-white/[0.03] px-4 py-3 text-sm transition hover:border-[rgba(214,196,161,0.35)]"
                  >
                    <span className="truncate text-[var(--sf-muted)]">
                      {video.caption || `@${video.authorUsername ?? "creator"}`}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-[var(--sf-accent-strong)]">
                      Watch →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <PlaceholderPanel
            title="Videos featuring this product"
            description="No shoppable videos have attached this product yet."
            tone="fuchsia"
          />
        )}
        {STOREFRONT_FLAGS.SHOW_PDP_REVIEWS_PLACEHOLDER ? (
          <PlaceholderPanel
            title="Reviews & questions"
            description="Reviews and Q&A are not available yet — no fabricated ratings are shown."
            tone="indigo"
          />
        ) : null}
      </div>

      {related.length > 0 ? (
        <StoreSection
          id="related"
          eyebrow="More like this"
          title="Related products"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.product.id} item={item} />
            ))}
          </div>
        </StoreSection>
      ) : null}

      {recommended.length > 0 ? (
        <StoreSection
          id="recommended"
          eyebrow="Explore"
          title="Recommended products"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((item) => (
              <ProductCard key={item.product.id} item={item} />
            ))}
          </div>
        </StoreSection>
      ) : null}
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-[var(--sf-line)] py-2">
      <dt className="text-[var(--sf-faint)]">{label}</dt>
      <dd className="font-semibold capitalize text-[var(--sf-ink)]">{value}</dd>
    </div>
  );
}
