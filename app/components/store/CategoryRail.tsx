import Link from "next/link";
import type { ProductCategoryRow } from "../../../lib/store/types";
import { categoryHref } from "../../lib/storefront/deriveSections";
import StoreEmptyState from "./StoreEmptyState";

type CategoryRailProps = {
  categories: ProductCategoryRow[];
};

export default function CategoryRail({ categories }: CategoryRailProps) {
  if (categories.length === 0) {
    return (
      <StoreEmptyState
        title="Categories arriving soon"
        description="Operators can configure product categories for discovery filters."
      />
    );
  }

  return (
    <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {categories.map((category) => (
        <li key={category.id} className="shrink-0">
          <Link
            href={categoryHref(category)}
            className="watch-focus-ring flex h-24 w-36 flex-col justify-end rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-600/25 to-[#080816] p-3 transition hover:border-violet-300/40 hover:from-violet-500/35"
          >
            <span className="text-sm font-black tracking-tight">{category.name}</span>
            <span className="mt-1 text-[10px] uppercase tracking-wider text-white/40">
              {category.slug}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
