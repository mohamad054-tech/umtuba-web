import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import ShippingAdminClient from "../../../components/store/ShippingAdminClient";
import StoreErrorState from "../../../components/store/StoreErrorState";
import {
  APP_ROUTES,
  MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS,
} from "../../../lib/nav";
import {
  listShippingProvidersForAdmin,
  listShippingRatesForAdmin,
  listShippingZonesForAdmin,
  type ShippingRateRow,
} from "../../../../lib/store/promotionsFulfillment";
import { canManageStoreSettings } from "../../../../lib/store/permissions";
import { getOwnedOrMemberStore } from "../../../../lib/store/sellerStore";
import { createClient, getServerUser } from "../../../../lib/supabase/server";

export const metadata = {
  title: "Shipping | UMTUBA Seller",
};

export default async function SellerStoreShippingPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerShipping)}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) {
    redirect(APP_ROUTES.sellerStore);
  }

  const canManage = canManageStoreSettings(membership.role);
  if (!canManage) {
    redirect(APP_ROUTES.sellerStore);
  }

  const providersResult = await listShippingProvidersForAdmin(
    supabase,
    membership.store.id
  );
  const zonesResult = await listShippingZonesForAdmin(
    supabase,
    membership.store.id
  );

  if (!providersResult.ok) {
    return (
      <main
        className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
      >
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
          <AppTopNav title="Shipping" subtitle={membership.store.name} />
          <div className="mt-6">
            <StoreErrorState message={providersResult.message} />
          </div>
        </div>
      </main>
    );
  }

  if (!zonesResult.ok) {
    return (
      <main
        className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
      >
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
          <AppTopNav title="Shipping" subtitle={membership.store.name} />
          <div className="mt-6">
            <StoreErrorState message={zonesResult.message} />
          </div>
        </div>
      </main>
    );
  }

  const ratesByZoneId: Record<string, ShippingRateRow[]> = {};
  for (const zone of zonesResult.rows) {
    const rates = await listShippingRatesForAdmin(supabase, zone.id);
    ratesByZoneId[zone.id] = rates.ok ? rates.rows : [];
  }

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title="Shipping" subtitle={membership.store.name} />
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href={APP_ROUTES.sellerStore}
            className="font-bold text-white/50 hover:text-white/80"
          >
            ← Seller store
          </Link>
          <Link
            href={APP_ROUTES.sellerPromotions}
            className="font-bold text-white/50 hover:text-white/80"
          >
            Promotions
          </Link>
        </div>

        <ShippingAdminClient
          storeId={membership.store.id}
          providers={providersResult.rows}
          zones={zonesResult.rows}
          ratesByZoneId={ratesByZoneId}
          canManage={canManage}
        />
      </div>
    </main>
  );
}
