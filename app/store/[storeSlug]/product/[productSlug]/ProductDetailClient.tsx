"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { addToCartAction } from "../../../../actions/storeCart";
import ProductCard from "../../../../components/store/ProductCard";
import PlaceholderPanel from "../../../../components/store/PlaceholderPanel";
import StoreSection from "../../../../components/store/StoreSection";
import { APP_ROUTES } from "../../../../lib/nav";
import { formatMinorUnits } from "../../../../../lib/store/money";
import type {
  PublicCatalogItem,
  PublicProductDetail,
} from "../../../../../lib/store/types";

type ProductDetailClientProps = {
  detail: PublicProductDetail;
  related: PublicCatalogItem[];
  recommended: PublicCatalogItem[];
};

export default function ProductDetailClient({
  detail,
  related,
  recommended,
}: ProductDetailClientProps) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(
    detail.variants[0]?.variant.id ?? ""
  );
  const [mediaIndex, setMediaIndex] = useState(0);
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
            storage_path: "Premium gallery placeholder",
            alt_text: detail.product.title,
            sort_order: 0,
            role: "cover",
            status: "active",
          },
        ];

  const activeMedia = media[mediaIndex] ?? media[0];
  const inStock =
    !!selected &&
    (selected.available > 0 || Boolean(selected.inventory?.allow_backorder));

  return (
    <div className="mt-6">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section aria-label="Product gallery">
          <div className="overflow-hidden rounded-[28px] border border-violet-400/20 bg-[#080816]/85">
            <div className="relative aspect-[4/3] bg-gradient-to-br from-violet-900/50 via-[#0a0a18] to-fuchsia-950/40">
              <div
                className="absolute inset-0 opacity-50"
                aria-hidden
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 25% 20%, rgba(167,139,250,0.45), transparent 50%), radial-gradient(circle at 80% 70%, rgba(217,70,239,0.25), transparent 45%)",
                }}
              />
              <div className="absolute inset-0 flex flex-col justify-end p-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200/70">
                  {activeMedia.role} · {activeMedia.media_type}
                </p>
                <p className="mt-2 break-all text-sm font-bold text-white/85">
                  {activeMedia.storage_path}
                </p>
                {activeMedia.alt_text ? (
                  <p className="mt-1 text-xs text-white/45">{activeMedia.alt_text}</p>
                ) : null}
              </div>
            </div>
          </div>

          <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Media thumbnails">
            {media.map((m, i) => (
              <li key={m.id}>
                <button
                  type="button"
                  aria-label={`Show media ${i + 1}`}
                  aria-current={i === mediaIndex}
                  onClick={() => setMediaIndex(i)}
                  className={`watch-focus-ring h-16 w-16 overflow-hidden rounded-xl border transition ${
                    i === mediaIndex
                      ? "border-violet-400 bg-violet-500/20"
                      : "border-white/10 bg-white/5 hover:border-violet-400/40"
                  }`}
                >
                  <span className="sr-only">{m.role}</span>
                  <span className="flex h-full items-center justify-center text-[10px] font-bold uppercase text-white/50">
                    {m.media_type.slice(0, 3)}
                  </span>
                </button>
              </li>
            ))}
            <li>
              <div
                className="flex h-16 w-20 items-center justify-center rounded-xl border border-dashed border-white/15 text-[10px] font-bold uppercase tracking-wider text-white/35"
                aria-label="Video placeholder"
              >
                Video
              </div>
            </li>
          </ul>
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#080816]/85 p-5 backdrop-blur-xl md:p-7">
          <Link
            href={`/store/${detail.store.slug}`}
            className="watch-focus-ring inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs font-bold text-violet-100 transition hover:bg-violet-500/20"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500/30 text-[10px] font-black"
              aria-hidden
            >
              {(detail.store.name[0] ?? "U").toUpperCase()}
            </span>
            {detail.store.name}
            {detail.store.verification_status === "verified" ? (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider">
                Verified
              </span>
            ) : null}
          </Link>

          <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
            {detail.product.title}
          </h1>
          {detail.product.short_description ? (
            <p className="mt-2 text-sm text-white/55">
              {detail.product.short_description}
            </p>
          ) : null}

          <p className="mt-5 text-3xl font-black text-violet-100">
            {price ?? "Price TBD"}
          </p>
          <p
            className={`mt-1 text-sm ${
              inStock ? "text-emerald-300/80" : "text-white/40"
            }`}
          >
            {selected
              ? inStock
                ? `${selected.available} available`
                : "Out of stock"
              : "No variants"}
          </p>

          {detail.variants.length > 0 ? (
            <label className="mt-6 block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                Variant
              </span>
              <select
                value={selected?.variant.id ?? ""}
                onChange={(e) => setVariantId(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/40 p-4 text-sm outline-none focus:border-violet-400/50"
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
                  className="flex justify-between gap-3 border-b border-white/5 py-2"
                >
                  <dt className="text-white/40">{key}</dt>
                  <dd className="font-bold text-white/80">
                    {selected.variant.option_values?.[key] ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <button
            type="button"
            disabled={!selected || !inStock || pending}
            aria-disabled={!selected || !inStock || pending}
            onClick={() => {
              if (!selected) return;
              setCartError(null);
              setCartMessage(null);
              startTransition(async () => {
                const result = await addToCartAction({
                  variantId: selected.variant.id,
                  quantity: 1,
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
            className="watch-focus-ring mt-6 w-full rounded-full bg-violet-500 px-5 py-3.5 text-sm font-black text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:bg-violet-500/30 disabled:text-violet-100/70"
          >
            {pending ? "Adding…" : !inStock ? "Out of stock" : "Add to Cart"}
          </button>
          {cartError ? (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {cartError}
            </p>
          ) : null}
          {cartMessage ? (
            <p role="status" className="mt-3 text-sm text-emerald-300">
              {cartMessage}{" "}
              <Link
                href={APP_ROUTES.storeCart}
                className="font-bold underline underline-offset-2"
              >
                View cart
              </Link>
            </p>
          ) : null}
        </section>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[24px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-violet-300/70">
            Description
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/65">
            {detail.product.description || "No description provided."}
          </p>
        </section>
        <section className="rounded-[24px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-violet-300/70">
            Specifications
          </h2>
          <dl className="mt-3 space-y-2 text-sm">
            <SpecRow label="Type" value={detail.product.product_type} />
            <SpecRow label="Category" value={detail.category?.name ?? "—"} />
            <SpecRow label="SKU" value={selected?.variant.sku ?? "—"} />
            <SpecRow label="Store" value={detail.store.name} />
          </dl>
        </section>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <PlaceholderPanel
          title="Videos featuring this product"
          description="Shoppable video attachments arrive in a later phase."
          tone="fuchsia"
        />
        <PlaceholderPanel
          title="Reviews & questions"
          description="Reviews and Q&A placeholders — social proof ships later."
          tone="indigo"
        />
      </div>

      {related.length > 0 ? (
        <StoreSection id="related" eyebrow="More like this" title="Related products">
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
          eyebrow="For you"
          title="Recommended products"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((item) => (
              <ProductCard key={item.product.id} item={item} badge="Rec" />
            ))}
          </div>
        </StoreSection>
      ) : null}
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-white/5 py-2">
      <dt className="text-white/40">{label}</dt>
      <dd className="font-bold capitalize text-white/80">{value}</dd>
    </div>
  );
}
