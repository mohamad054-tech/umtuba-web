import ProductCard from "./ProductCard";
import StoreEmptyState from "./StoreEmptyState";
import type { PublicCatalogItem } from "../../../lib/store/types";

type ProductRailProps = {
  items: PublicCatalogItem[];
  emptyTitle?: string;
  emptyDescription?: string;
  badge?: string;
};

export default function ProductRail({
  items,
  emptyTitle = "Nothing here yet",
  emptyDescription = "Active products will appear when stores publish approved listings.",
  badge,
}: ProductRailProps) {
  if (items.length === 0) {
    return (
      <StoreEmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 snap-x snap-mandatory [scrollbar-width:thin]">
      {items.map((item) => (
        <div
          key={item.product.id}
          className="w-[220px] shrink-0 snap-start sm:w-[240px] md:w-[260px]"
        >
          <ProductCard item={item} badge={badge} />
        </div>
      ))}
    </div>
  );
}
