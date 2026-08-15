import Link from "next/link";
import { formatOrderMoney } from "../../../lib/store/orderRules";
import type { BuyerOrderListItem } from "../../../lib/store/orders";
import { APP_ROUTES, buildStoreOrderHref } from "../../lib/nav";
import { OrderStatusCluster } from "./OrderStatusBadges";
import StoreEmptyState from "./StoreEmptyState";

type BuyerOrderListProps = {
  orders: BuyerOrderListItem[];
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function BuyerOrderList({ orders }: BuyerOrderListProps) {
  if (orders.length === 0) {
    return (
      <StoreEmptyState
        title="No orders yet"
        description="When checkout confirms an order, it appears here with separate order, payment, fulfillment, and delivery states."
        actionHref={APP_ROUTES.store}
        actionLabel="Browse the Store"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={buildStoreOrderHref(order.id)}
            className="watch-focus-ring group block rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-[rgba(214,196,161,0.35)] hover:shadow-[var(--sf-shadow)] md:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="sf-eyebrow">{order.orderNumber}</p>
                <h2 className="sf-display mt-1 text-lg font-semibold tracking-tight">
                  {order.storeName}
                </h2>
                <p className="mt-1 text-sm text-[var(--sf-faint)]">
                  {formatDate(order.createdAt)} · {order.itemCount} item
                  {order.itemCount === 1 ? "" : "s"}
                </p>
                {order.previewTitles.length > 0 ? (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--sf-muted)]">
                    {order.previewTitles.join(" · ")}
                  </p>
                ) : null}
              </div>
              <div className="text-end">
                <p className="text-base font-semibold text-[var(--sf-accent-strong)]">
                  {formatOrderMoney(order.grandTotalMinor, order.currency)}
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--sf-faint)] transition group-hover:text-[var(--sf-accent)]">
                  View details →
                </p>
              </div>
            </div>
            <div className="mt-4">
              <OrderStatusCluster
                status={order.status}
                paymentStatus={order.paymentStatus}
                fulfillmentStatus={order.fulfillmentStatus}
                buyerReadable
              />
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-[var(--sf-faint)]">
              This is one seller order. Multi-seller checkouts create separate
              orders — not one shared shipment.
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
