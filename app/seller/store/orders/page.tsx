import Link from "next/link";
import { redirect } from "next/navigation";
import AppTopNav from "../../../components/AppTopNav";
import SellerOrderList from "../../../components/store/SellerOrderList";
import StoreErrorState from "../../../components/store/StoreErrorState";
import {
  APP_ROUTES,
  MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS,
} from "../../../lib/nav";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { isOrderStatus } from "../../../../lib/store/orderRules";
import { listSellerOrders } from "../../../../lib/store/orders";
import { getOwnedOrMemberStore } from "../../../../lib/store/sellerStore";
import type { OrderStatus } from "../../../../lib/store/types";

export const metadata = {
  title: "Store Orders | UMTUBA Seller",
};

type PageProps = {
  searchParams?:
    | Promise<{ status?: string }>
    | { status?: string };
};

export default async function SellerStoreOrdersPage({
  searchParams,
}: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerOrders)}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) {
    redirect(APP_ROUTES.sellerStore);
  }

  const params = await Promise.resolve(searchParams ?? {});
  const statusFilter =
    params.status && isOrderStatus(params.status)
      ? (params.status as OrderStatus)
      : "all";

  const result = await listSellerOrders(
    supabase,
    membership.store.id,
    membership.role,
    { status: statusFilter }
  );

  return (
    <main
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
    >
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title="Orders" subtitle={membership.store.name} />

        <header className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
            @{membership.store.slug}
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight">Orders</h1>
          <p className="mt-2 text-sm text-white/50">
            Manage orders for your store only. Payment status is read-only until
            payment gateways are enabled.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={APP_ROUTES.sellerOrders}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/70"
            >
              All
            </Link>
            {(
              [
                "pending",
                "confirmed",
                "processing",
                "packed",
                "shipped",
                "delivered",
                "cancelled",
              ] as const
            ).map((status) => (
              <Link
                key={status}
                href={`${APP_ROUTES.sellerOrders}?status=${status}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                  statusFilter === status
                    ? "border-white bg-white text-black"
                    : "border-white/15 text-white/70"
                }`}
              >
                {status}
              </Link>
            ))}
          </div>
          <div className="mt-4">
            <Link
              href={APP_ROUTES.sellerStore}
              className="text-sm font-bold text-white/50 hover:text-white/80"
            >
              ← Store dashboard
            </Link>
          </div>
        </header>

        <div className="mt-6">
          {!result.ok ? (
            <StoreErrorState message={result.message} />
          ) : (
            <SellerOrderList orders={result.data} />
          )}
        </div>
      </div>
    </main>
  );
}
