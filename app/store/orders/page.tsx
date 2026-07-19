import Link from "next/link";
import { redirect } from "next/navigation";
import BuyerOrderList from "../../components/store/BuyerOrderList";
import StoreErrorState from "../../components/store/StoreErrorState";
import StoreShell from "../../components/store/StoreShell";
import { APP_ROUTES } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import { isOrderStatus } from "../../../lib/store/orderRules";
import { listBuyerOrders } from "../../../lib/store/orders";
import type { OrderStatus } from "../../../lib/store/types";

export const metadata = {
  title: "My Orders | UMTUBA Store",
  description: "Your UMTUBA Store order history.",
};

type PageProps = {
  searchParams?:
    | Promise<{ status?: string }>
    | { status?: string };
};

export default async function StoreOrdersPage({ searchParams }: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.storeOrders)}`
    );
  }

  const params = await Promise.resolve(searchParams ?? {});
  const statusFilter =
    params.status && isOrderStatus(params.status)
      ? (params.status as OrderStatus)
      : "all";

  const supabase = await createClient();
  const result = await listBuyerOrders(supabase, user.id, {
    status: statusFilter,
  });

  return (
    <StoreShell title="My Orders" subtitle="Store" wide>
      <header className="mt-6 rounded-[28px] border border-violet-400/20 bg-[#080816]/80 p-5 md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300/70">
          Orders
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">My orders</h1>
        <p className="mt-2 max-w-2xl text-sm text-white/50">
          Track purchases across stores. Payment collection is not enabled yet —
          pending-payment orders are still recorded securely.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href={APP_ROUTES.storeOrders}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-bold text-white/70"
          >
            All
          </Link>
          {(
            [
              "pending",
              "confirmed",
              "processing",
              "shipped",
              "delivered",
              "cancelled",
            ] as const
          ).map((status) => (
            <Link
              key={status}
              href={`${APP_ROUTES.storeOrders}?status=${status}`}
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
      </header>

      <div className="mt-6">
        {!result.ok ? (
          <StoreErrorState message={result.message} />
        ) : (
          <BuyerOrderList orders={result.data} />
        )}
      </div>
    </StoreShell>
  );
}
