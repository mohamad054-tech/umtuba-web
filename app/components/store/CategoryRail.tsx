import Link from "next/link";
import type { ProductCategoryRow } from "../../../lib/store/types";
import { categoryHref } from "../../lib/storefront/deriveSections";
import StoreEmptyState from "./StoreEmptyState";

type CategoryRailProps = {
  categories: Array<ProductCategoryRow & { productCount?: number }>;
  variant?: "categories" | "collections";
};

export default function CategoryRail({
  categories,
  variant = "categories",
}: CategoryRailProps) {
  if (categories.length === 0) {
    return (
      <StoreEmptyState
        title={
          variant === "collections"
            ? "Collections arriving soon"
            : "Categories arriving soon"
        }
        description="Active catalog categories will appear here once products are published."
      />
    );
  }

  return (
    <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
      {categories.map((category) => (
        <li key={category.id} className="shrink-0">
          <Link
            href={categoryHref(category)}
            className="watch-focus-ring group relative flex h-28 w-44 flex-col justify-end overflow-hidden rounded-[1.25rem] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 transition hover:border-[rgba(214,196,161,0.35)]"
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-80 transition group-hover:opacity-100"
              aria-hidden
              style={{
                backgroundImage:
                  "linear-gradient(160deg, rgba(214,196,161,0.14), transparent 55%)",
              }}
            />
            <span className="relative sf-display text-base font-semibold tracking-tight">
              {category.name}
            </span>
            <span className="relative mt-1 text-[10px] uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              {category.productCount != null && category.productCount > 0
                ? `${category.productCount} products`
                : category.slug}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
