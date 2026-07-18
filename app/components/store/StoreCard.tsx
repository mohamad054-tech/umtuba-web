import Link from "next/link";
import type { FeaturedStore } from "../../lib/storefront/deriveSections";

type StoreCardProps = {
  store: FeaturedStore;
};

export default function StoreCard({ store }: StoreCardProps) {
  return (
    <Link
      href={`/store/${store.slug}`}
      className="watch-focus-ring group flex min-w-[200px] flex-1 flex-col rounded-[24px] border border-white/10 bg-[#080816]/85 p-4 transition duration-300 hover:-translate-y-1 hover:border-violet-400/35"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-600/40 to-fuchsia-600/20 text-lg font-black">
        {(store.name[0] ?? "U").toUpperCase()}
      </div>
      <p className="mt-4 text-base font-black tracking-tight group-hover:text-violet-100">
        {store.name}
      </p>
      <p className="mt-1 text-xs text-white/40">@{store.slug}</p>
      <p className="mt-3 text-xs font-bold text-violet-200/70">
        {store.productCount} active product{store.productCount === 1 ? "" : "s"}
      </p>
    </Link>
  );
}
