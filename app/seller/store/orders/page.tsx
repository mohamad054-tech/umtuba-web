import Link from "next/link";
import { redirect } from "next/navigation";
import SellerOpsShell from "../../../components/store/SellerOpsShell";
import SellerOrderList from "../../../components/store/SellerOrderList";
import StoreErrorState from "../../../components/store/StoreErrorState";
import { APP_ROUTES } from "../../../lib/nav";
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

const FILTERS = [
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
] as const;

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

  if (membership.store.status !== "active") {
    return (
      <SellerOpsShell title="Orders" subtitle={membership.store.name}>
        <div className="mt-6">
          <StoreErrorState message="This store is not active. Order operations are unavailable." />
        </div>
      </SellerOpsShell>
    );
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
    { status: statusFilter, limit: 50 }
  );

  return (
    <SellerOpsShell title="Orders" subtitle={membership.store.name}>
      <header className="mt-6 rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">@{membership.store.slug}</p>
        <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Seller orders
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
          Operate only on your store’s orders. Order, payment, fulfillment, and
          delivery states stay separate. Payment collection remains deferred —
          sellers cannot mark payments successful. Role: {membership.role}.
        </p>
        <div
          className="mt-4 flex flex-wrap gap-2"
          role="navigation"
          aria-label="Filter seller orders"
        >
          <Link
            href={APP_ROUTES.sellerOrders}
            aria-current={statusFilter === "all" ? "page" : undefined}
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
              href={`${APP_ROUTES.sellerOrders}?status=${status}`}
              aria-current={statusFilter === status ? "page" : undefined}
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
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <Link
            href={APP_ROUTES.sellerStore}
            className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
          >
            ← Store dashboard
          </Link>
          <Link
            href={APP_ROUTES.sellerStoreProducts}
            className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
          >
            Products
          </Link>
          <Link
            href={APP_ROUTES.sellerInventory}
            className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
          >
            Inventory
          </Link>
          <Link
            href={APP_ROUTES.sellerMarketplace}
            className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent-strong)]"
          >
            Marketplace
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
    </SellerOpsShell>
  );
}
