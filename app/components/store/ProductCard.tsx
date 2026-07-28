import Link from "next/link";
import { formatMinorUnits } from "../../../lib/store/money";
import type { PublicCatalogItem } from "../../../lib/store/types";
import WishlistButton from "./WishlistButton";

type ProductCardProps = {
  item: PublicCatalogItem;
  badge?: string;
  showWishlist?: boolean;
};

function availabilityLabel(available: number | null): {
  text: string;
  tone: "ok" | "low" | "out" | "unknown";
} {
  if (available == null) return { text: "Availability on request", tone: "unknown" };
  if (available <= 0) return { text: "Unavailable", tone: "out" };
  if (available <= 3) return { text: `${available} left`, tone: "low" };
  return { text: "In stock", tone: "ok" };
}

export default function ProductCard({
  item,
  badge,
  showWishlist = true,
}: ProductCardProps) {
  const href = `/store/${item.store.slug}/product/${item.product.slug}`;
  const price =
    item.priceMinor != null && item.currency
      ? formatMinorUnits(item.priceMinor, item.currency)
      : null;
  const compareAt =
    item.compareAtMinor != null &&
    item.priceMinor != null &&
    item.currency &&
    item.compareAtMinor > item.priceMinor
      ? formatMinorUnits(item.compareAtMinor, item.currency)
      : null;
  const coverUrl = item.coverUrl ?? null;
  const availability = availabilityLabel(item.available);
  const productType = item.product.product_type;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(214,196,161,0.35)] hover:shadow-[0_24px_60px_-36px_rgba(0,0,0,0.85)]">
      <Link href={href} className="watch-focus-ring absolute inset-0 z-10 rounded-[var(--sf-radius)]" aria-label={item.product.title}>
        <span className="sr-only">View {item.product.title}</span>
      </Link>

      <div className="relative aspect-[4/5] overflow-hidden bg-[var(--sf-surface-2)]">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt=""
            className="sf-media-zoom absolute inset-0 h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div
            className="absolute inset-0"
            aria-hidden
            style={{
              backgroundImage:
                "linear-gradient(160deg, rgba(214,196,161,0.16), transparent 42%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.06), transparent 50%)",
            }}
          />
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent" />

        <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-2">
          {badge ? (
            <span className="rounded-full border border-[rgba(214,196,161,0.35)] bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-accent-strong)] backdrop-blur-sm">
              {badge}
            </span>
          ) : null}
          {productType && productType !== "physical" ? (
            <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/75 backdrop-blur-sm">
              {productType}
            </span>
          ) : null}
        </div>

        {showWishlist ? (
          <div className="pointer-events-auto absolute right-3 top-3 z-20">
            <WishlistButton
              productId={item.product.id}
              initialWishlisted={false}
              nextHref={href}
              className="watch-focus-ring flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/40 text-base text-white backdrop-blur-sm transition hover:bg-black/55"
            />
          </div>
        ) : null}

        {!coverUrl ? (
          <p className="absolute inset-x-3 bottom-3 z-10 truncate rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/65 backdrop-blur-sm">
            Media coming soon
          </p>
        ) : null}
      </div>

      <div className="relative z-20 flex flex-1 flex-col gap-2 p-4 pointer-events-none">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--sf-faint)]">
          {item.store.name}
        </p>
        <h3 className="sf-display text-base font-semibold leading-snug text-[var(--sf-ink)] md:text-[1.05rem]">
          {item.product.title}
        </h3>
        {item.product.short_description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-[var(--sf-muted)]">
            {item.product.short_description}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="min-w-0">
            {price ? (
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold text-[var(--sf-ink)]">
                  {price}
                </span>
                {compareAt ? (
                  <span className="text-xs text-[var(--sf-faint)] line-through">
                    {compareAt}
                  </span>
                ) : null}
              </div>
            ) : (
              <span className="text-sm text-[var(--sf-faint)]">Price unavailable</span>
            )}
          </div>
          <span
            className={`shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] ${
              availability.tone === "ok"
                ? "text-[var(--sf-ok)]"
                : availability.tone === "low"
                  ? "text-[var(--sf-accent)]"
                  : availability.tone === "out"
                    ? "text-[var(--sf-danger)]"
                    : "text-[var(--sf-faint)]"
            }`}
          >
            {availability.text}
          </span>
        </div>
      </div>
    </article>
  );
}
