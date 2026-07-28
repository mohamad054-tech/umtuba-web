import { redirect } from "next/navigation";
import Link from "next/link";
import SellerMarketplaceClient from "../../../components/store/SellerMarketplaceClient";
import SellerOpsShell from "../../../components/store/SellerOpsShell";
import { APP_ROUTES } from "../../../lib/nav";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import {
  listMarketplaceDiscoveryForSeller,
  listSellerStoreListings,
} from "../../../../lib/store/marketplaceSupplierSellerQueries";
import { canManageCatalog, canViewStore } from "../../../../lib/store/permissions";
import { getOwnedOrMemberStore } from "../../../../lib/store/sellerStore";

export const metadata = {
  title: "Marketplace | Seller Store | UMTUBA",
};

export default async function SellerMarketplacePage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerMarketplace)}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) redirect(APP_ROUTES.sellerSetup);
  if (!canViewStore(membership.role)) redirect(APP_ROUTES.seller);

  const canManage = canManageCatalog(membership.role);
  const [discovery, listings] = await Promise.all([
    listMarketplaceDiscoveryForSeller(supabase, {
      sellerStoreId: membership.store.id,
    }),
    listSellerStoreListings(supabase, membership.store.id),
  ]);

  return (
    <SellerOpsShell
      title="Marketplace"
      subtitle={membership.store.name}
      wide
      actions={
        <Link
          href={`${APP_ROUTES.sellerStore}/products`}
          className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-3 py-1.5 text-xs font-semibold"
        >
          My products
        </Link>
      }
    >
      <div className="mt-6">
        <SellerMarketplaceClient
          discovery={discovery.ok ? discovery.data : []}
          listings={listings.ok ? listings.data : []}
          canManage={canManage}
          loadError={
            !discovery.ok
              ? discovery.message
              : !listings.ok
                ? listings.message
                : null
          }
        />
      </div>
    </SellerOpsShell>
  );
}
