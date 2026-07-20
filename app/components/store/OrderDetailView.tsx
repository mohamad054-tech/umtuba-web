import { formatOrderMoney } from "../../../lib/store/orderRules";
import type { OrderDetailBundle } from "../../../lib/store/orders";
import BuyerCancelOrderButton from "./BuyerCancelOrderButton";
import { OrderStatusCluster } from "./OrderStatusBadges";
import OrderTimeline from "./OrderTimeline";
import SellerOrderStatusForm from "./SellerOrderStatusForm";

type OrderDetailViewProps = {
  bundle: OrderDetailBundle;
  mode: "buyer" | "seller";
};

function formatAddress(contact: Record<string, string | null> | null) {
  if (!contact) return null;
  const lines = [
    contact.full_name,
    contact.phone,
    contact.email,
    contact.address_line1,
    contact.address_line2,
    [contact.city, contact.region, contact.postal_code]
      .filter(Boolean)
      .join(", "),
    contact.country_code,
    contact.delivery_instructions
      ? `Instructions: ${contact.delivery_instructions}`
      : null,
  ].filter((v): v is string => Boolean(v && v.trim()));
  return lines;
}

export default function OrderDetailView({
  bundle,
  mode,
}: OrderDetailViewProps) {
  const { order, items } = bundle;
  const addressLines = formatAddress(bundle.shippingContact);
  const pendingPayment = order.payment_status === "pending";
  const buyerCanCancel =
    mode === "buyer" &&
    pendingPayment &&
    order.status !== "cancelled" &&
    order.status !== "refunded" &&
    order.status !== "shipped" &&
    order.status !== "delivered" &&
    ["pending", "confirmed", "processing", "packed"].includes(order.status);

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/40">
          {order.order_number}
        </p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          {mode === "buyer" ? bundle.storeName : bundle.buyerDisplayName}
        </h1>
        <p className="mt-2 text-sm text-white/45">
          Placed{" "}
          {new Date(order.created_at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {" · "}
          {bundle.itemCount} item{bundle.itemCount === 1 ? "" : "s"}
        </p>
        <div className="mt-4">
          <OrderStatusCluster
            status={order.status}
            paymentStatus={order.payment_status}
            fulfillmentStatus={order.fulfillment_status}
          />
        </div>
        {pendingPayment && mode === "buyer" ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            Payment collection is not enabled yet. This order is recorded as
            pending payment. Inventory is held until payment, cancellation, or
            hold expiry.
          </p>
        ) : null}
        {buyerCanCancel ? (
          <BuyerCancelOrderButton orderId={order.id} canCancel />
        ) : null}
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-xl font-black tracking-tight">Items</h2>
        <ul className="mt-4 divide-y divide-white/10">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div>
                <p className="font-bold text-white/90">{item.title_snapshot}</p>
                {item.variant_title_snapshot ? (
                  <p className="text-sm text-white/45">
                    {item.variant_title_snapshot}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-white/35">
                  SKU {item.sku_snapshot} · Qty {item.quantity}
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-white/50">
                  {formatOrderMoney(item.unit_price_minor, order.currency)} each
                </p>
                <p className="font-black">
                  {formatOrderMoney(item.total_price_minor, order.currency)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-xl font-black tracking-tight">Shipping</h2>
          {order.shipping_method_name || order.shipping_method_code ? (
            <p className="mt-3 text-sm text-white/70">
              {order.shipping_method_name ?? order.shipping_method_code}
              {order.shipping_estimate_text
                ? ` · ${order.shipping_estimate_text}`
                : ""}
            </p>
          ) : (
            <p className="mt-3 text-sm text-white/45">No shipping method on file.</p>
          )}
          {addressLines && addressLines.length > 0 ? (
            <address className="mt-4 not-italic text-sm leading-6 text-white/65">
              {addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </address>
          ) : (
            <p className="mt-4 text-sm text-white/45">
              Shipping address snapshot is not available.
            </p>
          )}
          {mode === "seller" ? (
            <p className="mt-4 text-xs text-white/35">
              Contact details are limited to fulfillment fields from the order
              snapshot. Profile and payment credentials are never exposed.
            </p>
          ) : null}
        </section>

        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-xl font-black tracking-tight">Totals</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-white/45">Subtotal</dt>
              <dd>
                {formatOrderMoney(order.subtotal_minor, order.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-white/45">Discount</dt>
              <dd>
                −{formatOrderMoney(order.discount_total_minor, order.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-white/45">Tax</dt>
              <dd>{formatOrderMoney(order.tax_total_minor, order.currency)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-white/45">Shipping</dt>
              <dd>
                {formatOrderMoney(order.shipping_total_minor, order.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-white/10 pt-3 text-base font-black">
              <dt>Total</dt>
              <dd>
                {formatOrderMoney(order.grand_total_minor, order.currency)}
              </dd>
            </div>
          </dl>
          {order.coupon_code_snapshot && mode === "buyer" ? (
            <p className="mt-3 text-xs text-white/40">
              Coupon applied: {order.coupon_code_snapshot}
            </p>
          ) : null}
          {mode === "seller" && order.coupon_code_snapshot ? (
            <p className="mt-3 text-xs text-white/40">
              Coupon code on order: {order.coupon_code_snapshot}
            </p>
          ) : null}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h2 className="text-xl font-black tracking-tight">Timeline</h2>
          <div className="mt-4">
            <OrderTimeline
              createdAt={order.created_at}
              status={order.status}
              confirmedAt={order.confirmed_at}
              processingAt={order.processing_at}
              packedAt={order.packed_at}
              shippedAt={order.shipped_at}
              deliveredAt={order.delivered_at}
              cancelledAt={order.cancelled_at}
              history={bundle.history}
            />
          </div>
        </section>

        {mode === "seller" ? (
          <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h2 className="text-xl font-black tracking-tight">Update status</h2>
            <div className="mt-4">
              <SellerOrderStatusForm
                orderId={order.id}
                status={order.status}
                fulfillmentStatus={order.fulfillment_status}
                canUpdate={bundle.canUpdate}
              />
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
