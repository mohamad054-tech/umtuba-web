import { redirect } from "next/navigation";
import ProductCard from "../../components/store/ProductCard";
import StoreEmptyState from "../../components/store/StoreEmptyState";
import StoreErrorState from "../../components/store/StoreErrorState";
import StoreShell from "../../components/store/StoreShell";
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
    <StoreShell title="Favorites" subtitle="Store">
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
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((entry) => (
            <ProductCard
              key={entry.wishlistItemId}
              item={entry.item}
              initialWishlisted
            />
          ))}
        </div>
      )}
    </StoreShell>
  );
}
