import { redirect } from "next/navigation";
import ProductCard from "../../components/store/ProductCard";
import StoreEmptyState from "../../components/store/StoreEmptyState";
import StoreErrorState from "../../components/store/StoreErrorState";
import StoreShell from "../../components/store/StoreShell";
import { APP_ROUTES } from "../../lib/nav";
import { createTranslator } from "../../../lib/i18n";
import { resolveRequestLocale } from "../../../lib/i18n/server";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { listWishlist } from "../../../lib/store/wishlist";

export const dynamic = "force-dynamic";

import { storeWishlistMetadata } from "../../../lib/site/routeMetadata";

export const metadata = storeWishlistMetadata;

export default async function StoreWishlistPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.storeWishlist)}`
    );
  }

  const { locale } = await resolveRequestLocale();
  const t = createTranslator(locale);
  const supabase = await createClient();
  const { items, error } = await listWishlist(supabase, user.id);

  return (
    <StoreShell title={t("store.wishlist.navTitle")} subtitle={t("store.wishlist.navSubtitle")}>
      {error ? (
        <div className="mt-6">
          <StoreErrorState message={error} />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6">
          <StoreEmptyState
            title={t("store.wishlist.emptyTitle")}
            description={t("store.wishlist.emptyDescription")}
            actionHref={APP_ROUTES.store}
            actionLabel={t("store.wishlist.browse")}
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
