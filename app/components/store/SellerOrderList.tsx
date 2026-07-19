import Link from "next/link";
import { formatOrderMoney } from "../../../lib/store/orderRules";
import type { SellerOrderListItem } from "../../../lib/store/orders";
import { buildSellerOrderHref } from "../../lib/nav";
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
        description="Orders placed against your store will appear here. Buyers complete checkout with pending payment until gateways are enabled."
      />
    );
  }

  return (
    <ul className="space-y-3">
      {orders.map((order) => (
        <li key={order.id}>
          <Link
            href={buildSellerOrderHref(order.id)}
            className="watch-focus-ring block rounded-[24px] border border-white/10 bg-[#080816]/80 p-4 transition hover:border-white/20 md:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                  {order.orderNumber}
                </p>
                <h2 className="mt-1 text-lg font-black tracking-tight">
                  {order.buyerDisplayName}
                </h2>
                <p className="mt-1 text-sm text-white/45">
                  {formatDate(order.createdAt)} · {order.itemCount} item
                  {order.itemCount === 1 ? "" : "s"}
                </p>
              </div>
              <p className="text-base font-black">
                {formatOrderMoney(order.grandTotalMinor, order.currency)}
              </p>
            </div>
            <div className="mt-4">
              <OrderStatusCluster
                status={order.status}
                paymentStatus={order.paymentStatus}
                fulfillmentStatus={order.fulfillmentStatus}
              />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
