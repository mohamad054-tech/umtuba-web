import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../../components/AppTopNav";
import OrderDetailView from "../../../../components/store/OrderDetailView";
import StoreErrorState from "../../../../components/store/StoreErrorState";
import {
  APP_ROUTES,
  MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS,
} from "../../../../lib/nav";
import { createClient, getServerUser } from "../../../../../lib/supabase/server";
import { getSellerOrderDetail } from "../../../../../lib/store/orders";
import { getOwnedOrMemberStore } from "../../../../../lib/store/sellerStore";

export const metadata = {
  title: "Order detail | UMTUBA Seller",
};

type PageProps = {
  params: Promise<{ orderId: string }> | { orderId: string };
};

export default async function SellerStoreOrderDetailPage({
  params,
}: PageProps) {
  const user = await getServerUser();
  const { orderId } = await Promise.resolve(params);
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(
        `${APP_ROUTES.sellerOrders}/${orderId}`
      )}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) {
    redirect(APP_ROUTES.sellerStore);
  }

  const result = await getSellerOrderDetail(
    supabase,
    membership.store.id,
    membership.role,
    orderId
  );

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title="Order" subtitle={membership.store.name} />
        <div className="mt-4">
          <Link
            href={APP_ROUTES.sellerOrders}
            className="text-sm font-bold text-white/50 hover:text-white/80"
          >
            ← Back to orders
          </Link>
        </div>
        {!result.ok ? (
          <div className="mt-6">
            <StoreErrorState message={result.message} />
          </div>
        ) : (
          <OrderDetailView bundle={result.data} mode="seller" />
        )}
      </div>
    </main>
  );
}
