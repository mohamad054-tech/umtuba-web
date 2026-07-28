import Link from "next/link";
import { APP_ROUTES } from "../../lib/nav";
import {
  normalizeProfileProducts,
} from "../lib/profileCoursesProductsStructure";
import type { ProfileProductPreview } from "../types";

type ProfileProductsPanelProps = {
  products?: ProfileProductPreview[];
  isOwner?: boolean;
};

/**
 * Products tab — structured cards (Creator Space Experience V1 §12).
 * Structure readiness only; shop window links to PDP — not checkout.
 */
export default function ProfileProductsPanel({
  products = [],
  isOwner = false,
}: ProfileProductsPanelProps) {
  const items = normalizeProfileProducts(products);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-8 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
          Products
        </p>
        <p className="mt-3 text-base font-bold text-white/80">No products yet</p>
        <p className="mt-2 text-sm text-white/45">
          {isOwner
            ? "Listed products will appear here. Open Seller products when your shop is ready."
            : "This creator has not listed products yet."}
        </p>
        {isOwner ? (
          <Link
            href={APP_ROUTES.sellerProducts}
            className="watch-focus-ring mt-5 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold transition hover:bg-white/10"
          >
            Seller products
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/45">
        Products
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {items.map((product) => (
          <li key={product.id}>
            <Link
              href={product.href}
              className="watch-focus-ring group flex h-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#080816]/70 transition hover:border-white/20"
            >
              <div
                className={`relative aspect-square bg-gradient-to-br ${product.coverGradient}`}
              >
                {product.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- optional cover URL
                  <img
                    src={product.coverUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                {product.storeBadge ? (
                  <span className="absolute left-2 top-2 rounded-full border border-white/15 bg-black/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white/80">
                    {product.storeBadge}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
                <p className="line-clamp-2 text-sm font-black tracking-tight group-hover:text-white sm:text-base">
                  {product.title}
                </p>
                <p className="text-sm font-bold text-white/70">
                  {product.priceLabel}
                </p>
                <p className="mt-auto pt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-200/80 sm:text-xs">
                  View product
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
