import Link from "next/link";
import { formatMinorUnits } from "../../../lib/store/money";
import type { PublicCatalogItem } from "../../../lib/store/types";

type ProductCardProps = {
  item: PublicCatalogItem;
  badge?: string;
};

export default function ProductCard({ item, badge }: ProductCardProps) {
  const href = `/store/${item.store.slug}/product/${item.product.slug}`;
  const price =
    item.priceMinor != null && item.currency
      ? formatMinorUnits(item.priceMinor, item.currency)
      : null;

  return (
    <Link
      href={href}
      className="watch-focus-ring group flex flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#080816]/85 transition duration-300 hover:-translate-y-1 hover:border-violet-400/35 hover:shadow-[0_20px_50px_-24px_rgba(139,92,246,0.55)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-violet-950/80 via-[#0a0a18] to-fuchsia-950/50">
        <div
          className="absolute inset-0 opacity-60 transition duration-500 group-hover:scale-105"
          aria-hidden
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(167,139,250,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(217,70,239,0.2), transparent 40%)",
          }}
        />
        {badge ? (
          <span className="absolute left-3 top-3 rounded-full border border-violet-300/30 bg-violet-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-100 backdrop-blur">
            {badge}
          </span>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="truncate rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/70 backdrop-blur">
            {item.coverPath ?? "Premium media coming soon"}
          </p>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/60">
          {item.store.name}
        </p>
        <h3 className="text-base font-black tracking-tight text-white transition group-hover:text-violet-100">
          {item.product.title}
        </h3>
        {item.product.short_description ? (
          <p className="line-clamp-2 text-sm text-white/50">
            {item.product.short_description}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-sm font-bold text-white">{price ?? "Price TBD"}</span>
          {item.available != null ? (
            <span className="text-xs text-white/40">
              {item.available > 0 ? `${item.available} left` : "Unavailable"}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
