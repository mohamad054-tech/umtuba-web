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

  const params = await Promise.resolve(searchParams ?? {});
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
      <header className="mt-6 rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">Orders</p>
        <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          My orders
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--sf-muted)]">
          Each card is one seller order with separate order, payment,
          fulfillment, and delivery states. Multi-seller checkouts appear as
          multiple orders — not one shared shipment. Payment collection remains
          deferred.
        </p>
        <div className="mt-4 flex flex-wrap gap-2" role="navigation" aria-label="Filter orders">
          <Link
            href={APP_ROUTES.storeOrders}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              statusFilter === "all"
                ? "border-[var(--sf-accent)] bg-[var(--sf-accent)] text-[#1a1712]"
                : "border-[var(--sf-line)] text-[var(--sf-muted)]"
            }`}
          >
            All
          </Link>
          {FILTERS.map((status) => (
            <Link
              key={status}
              href={`${APP_ROUTES.storeOrders}?status=${status}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${
                statusFilter === status
                  ? "border-[var(--sf-accent)] bg-[var(--sf-accent)] text-[#1a1712]"
                  : "border-[var(--sf-line)] text-[var(--sf-muted)]"
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
