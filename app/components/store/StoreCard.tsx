import Link from "next/link";
import type { FeaturedStore } from "../../lib/storefront/deriveSections";

type StoreCardProps = {
  store: FeaturedStore;
};

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <Link
      href={`/store/${store.slug}`}
      className="watch-focus-ring group flex min-w-[210px] flex-1 flex-col rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(214,196,161,0.35)] hover:shadow-[var(--sf-shadow)]"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(214,196,161,0.28)] bg-[linear-gradient(145deg,rgba(214,196,161,0.22),rgba(255,255,255,0.04))] text-lg font-semibold text-[var(--sf-accent-strong)]">
        {(store.name[0] ?? "U").toUpperCase()}
      </div>
      <p className="sf-display mt-4 text-base font-semibold tracking-tight group-hover:text-[var(--sf-accent-strong)]">
        {store.name}
      </p>
      <p className="mt-1 text-xs text-[var(--sf-faint)]">@{store.slug}</p>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--sf-accent)]">
        {store.productCount} active product{store.productCount === 1 ? "" : "s"}
      </p>
    </Link>
  );
}
