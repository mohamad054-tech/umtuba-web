import Link from "next/link";
import { redirect } from "next/navigation";
import BuyerOrderList from "../../components/store/BuyerOrderList";
import StoreErrorState from "../../components/store/StoreErrorState";
import StorePageHeader from "../../components/store/StorePageHeader";
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
 Promise<{ status?: string }>;
};

const FILTERS = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export default async function StoreOrdersPage({ searchParams }: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.storeOrders)}`
    );
  }

  const params = (await searchParams) ?? {};
  const statusFilter =
    params.status && isOrderStatus(params.status)
      ? (params.status as OrderStatus)
      : "all";

  const supabase = await createClient();
  const result = await listBuyerOrders(supabase, user.id, {
    status: statusFilter,
    limit: 50,
  });

  return (
    <StoreShell title="My Orders" subtitle="Store" wide>
      <StorePageHeader
        eyebrow="Orders"
        title="My orders"
        description="Each card is one seller order with separate order, payment, fulfillment, and delivery states. Multi-seller checkouts appear as multiple orders — not one shared shipment. Payment collection remains deferred."
      >
        <div className="mt-4 flex flex-wrap gap-2" role="navigation" aria-label="Filter orders">
          <Link
            href={APP_ROUTES.storeOrders}
            className={`sf-chip watch-focus-ring ${
              statusFilter === "all" ? "is-active" : ""
            }`}
            aria-current={statusFilter === "all" ? "page" : undefined}
          >
            All
          </Link>
          {FILTERS.map((status) => (
            <Link
              key={status}
              href={`${APP_ROUTES.storeOrders}?status=${status}`}
              className={`sf-chip watch-focus-ring capitalize ${
                statusFilter === status ? "is-active" : ""
              }`}
              aria-current={statusFilter === status ? "page" : undefined}
            >
              {status}
            </Link>
          ))}
        </div>
      </StorePageHeader>

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
