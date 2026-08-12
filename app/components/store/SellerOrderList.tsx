import Link from "next/link";
import {
  deriveSellerOrderAttention,
  sellerListBuyerLabel,
  sellerOrderAttentionBadgeLabel,
} from "../../../lib/store/sellerOrdersPresentation";
import { formatOrderMoney } from "../../../lib/store/orderRules";
import type { SellerOrderListItem } from "../../../lib/store/orders";
import { APP_ROUTES, buildSellerOrderHref } from "../../lib/nav";
import { OrderStatusCluster } from "./OrderStatusBadges";
import StoreEmptyState from "./StoreEmptyState";

type SellerOrderListProps = {
  orders: SellerOrderListItem[];
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

export default function SellerOrderList({ orders }: SellerOrderListProps) {
  if (orders.length === 0) {
    return (
      <StoreEmptyState
        title="No orders yet"
        description="Orders placed against your store appear here. Each row is one seller order with separate order, payment, fulfillment, and delivery states."
        actionHref={APP_ROUTES.sellerStore}
        actionLabel="Store dashboard"
      />
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => {
        const attention = deriveSellerOrderAttention({
          status: order.status,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
        });
        const buyerLabel = sellerListBuyerLabel(order.buyerDisplayName);
        const attentionBadgeLabel = sellerOrderAttentionBadgeLabel(attention);

        return (
          <li key={order.id}>
            <Link
              href={buildSellerOrderHref(order.id)}
              aria-label={`Open operations for order ${order.orderNumber}, ${buyerLabel}`}
              className="watch-focus-ring group block rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 transition hover:border-[rgba(214,196,161,0.35)] md:p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="sf-eyebrow">{order.orderNumber}</p>
                    {attentionBadgeLabel ? (
                      <span
                        role="status"
                        aria-label={attentionBadgeLabel}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          attention.level === "critical"
                            ? "border-[rgba(240,168,168,0.4)] text-[var(--sf-danger)]"
                            : attention.level === "warn"
                              ? "border-amber-400/40 text-amber-100"
                              : "border-[var(--sf-line)] text-[var(--sf-faint)]"
                        }`}
                      >
                        Needs attention
                      </span>
                    ) : null}
                  </div>
                  <h2 className="sf-display mt-1 text-lg font-semibold tracking-tight">
                    {buyerLabel}
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
                  {attention.message ? (
                    <p role="status" className="mt-2 text-xs text-[var(--sf-accent)]">
                      {attention.message}
                    </p>
                  ) : null}
                </div>
                <div className="text-end">
                  <p className="text-base font-semibold text-[var(--sf-accent-strong)]">
                    {formatOrderMoney(order.grandTotalMinor, order.currency)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[var(--sf-faint)] transition group-hover:text-[var(--sf-accent)]">
                    Open operations →
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
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
