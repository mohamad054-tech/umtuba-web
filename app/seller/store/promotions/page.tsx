import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import CouponAdminClient from "../../../components/store/CouponAdminClient";
import StoreErrorState from "../../../components/store/StoreErrorState";
import {
  APP_ROUTES,
  MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS,
} from "../../../lib/nav";
import type { CouponTargetingSummary } from "../../../../lib/store/adminUiHelpers";
import {
  getCouponTargetingSummary,
  listStoreCouponsForAdmin,
} from "../../../../lib/store/promotionsFulfillment";
import { canManageStoreSettings } from "../../../../lib/store/permissions";
import { getOwnedOrMemberStore } from "../../../../lib/store/sellerStore";
import { createClient, getServerUser } from "../../../../lib/supabase/server";

export const metadata = {
  title: "Promotions | UMTUBA Seller",
};

export default async function SellerStorePromotionsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerPromotions)}`
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

  const couponsResult = await listStoreCouponsForAdmin(
    supabase,
    membership.store.id
  );

  const targetingByCouponId: Record<string, CouponTargetingSummary> = {};
  if (couponsResult.ok) {
    for (const coupon of couponsResult.rows) {
      const summary = await getCouponTargetingSummary(supabase, coupon.id);
      if (summary.ok) {
        targetingByCouponId[coupon.id] = {
          couponId: summary.summary.coupon_id,
          productCount: summary.summary.product_count,
          categoryCount: summary.summary.category_count,
          regionCount: summary.summary.region_count,
          storeWide: summary.summary.store_wide,
        };
      }
    }
  }

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title="Promotions" subtitle={membership.store.name} />
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href={APP_ROUTES.sellerStore}
            className="font-bold text-white/50 hover:text-white/80"
          >
            ← Seller store
          </Link>
          <Link
            href={APP_ROUTES.sellerShipping}
            className="font-bold text-white/50 hover:text-white/80"
          >
            Shipping
          </Link>
        </div>

        {!couponsResult.ok ? (
          <div className="mt-6">
            <StoreErrorState message={couponsResult.message} />
          </div>
        ) : (
          <CouponAdminClient
            storeId={membership.store.id}
            coupons={couponsResult.rows}
            targetingByCouponId={targetingByCouponId}
            canManage={canManage}
          />
        )}
      </div>
    </main>
  );
}
