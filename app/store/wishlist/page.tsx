import Link from "next/link";
import { redirect } from "next/navigation";
import ProductCard from "../../components/store/ProductCard";
import StoreEmptyState from "../../components/store/StoreEmptyState";
import StoreErrorState from "../../components/store/StoreErrorState";
import StoreShell from "../../components/store/StoreShell";
import WishlistButton from "../../components/store/WishlistButton";
import { APP_ROUTES } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { listWishlist } from "../../../lib/store/wishlist";

export const metadata = {
  title: "Favorites | UMTUBA Store",
};

export default async function StoreWishlistPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.storeWishlist)}`
    );
  }

  const supabase = await createClient();
  const { items, error } = await listWishlist(supabase, user.id);

  return (
    <StoreShell
      title="Favorites"
      subtitle="Store"
      actions={
        <Link
          href={APP_ROUTES.store}
          className="watch-focus-ring rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70"
        >
          Store home
        </Link>
      }
    >
      {error ? (
        <div className="mt-6">
          <StoreErrorState message={error} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <StoreEmptyState
            title="No favorites yet"
            description="Save products from the store to find them here later."
            actionHref={APP_ROUTES.store}
            actionLabel="Browse the Store"
          />
        </div>
      ) : (
        <section
          className="mt-6"
          aria-label="Saved favorites"
          aria-live="polite"
        >
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((entry) => (
              <li key={entry.wishlistItemId} className="relative">
                <ProductCard item={entry.item} />
                <div className="absolute right-3 top-3 z-20">
                  <WishlistButton
                    productId={entry.item.product.id}
                    sellerListingId={entry.item.sellerListingId ?? null}
                    initialWishlisted={true}
                    nextHref={APP_ROUTES.storeWishlist}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </StoreShell>
  );
}
