import Link from "next/link";
import {
  buildBuyerOrderMoneyRows,
  deriveBuyerOrderActions,
  formatBuyerMoneyRow,
} from "../../../lib/store/buyerOrdersPresentation";
import { formatOrderMoney } from "../../../lib/store/orderRules";
import type { OrderDetailBundle } from "../../../lib/store/orders";
import { APP_ROUTES, buildStoreOrderHref } from "../../lib/nav";
import BuyerCancelOrderButton from "./BuyerCancelOrderButton";
import BuyerDeferredPaymentRecoveryButton from "./BuyerDeferredPaymentRecoveryButton";
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
  const attempts = bundle.paymentAttempts ?? [];
  const hasDeferredAttempt = attempts.some(
    (a) => a.status === "deferred" || a.provider === "none"
  );
  const buyerActions =
    mode === "buyer"
      ? deriveBuyerOrderActions({
          storeSlug: bundle.storeSlug,
          orderId: order.id,
          status: order.status,
          paymentStatus: order.payment_status,
          hasDeferredAttempt,
        })
      : [];
  const cancelAction = buyerActions.find((a) => a.id === "cancel_unpaid");
  const retryAction = buyerActions.find(
    (a) => a.id === "retry_deferred_payment"
  );
  const moneyRows = buildBuyerOrderMoneyRows(order);
  const siblings = bundle.siblingOrders ?? [];

  return (
    <div className="mt-6 space-y-6">
      <section className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">{order.order_number}</p>
        <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight">
          {mode === "buyer" ? bundle.storeName : bundle.buyerDisplayName}
        </h1>
        <p className="mt-2 text-sm text-[var(--sf-muted)]">
          Placed{" "}
          {new Date(order.created_at).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {" · "}
          {bundle.itemCount} item{bundle.itemCount === 1 ? "" : "s"}
        </p>
        {mode === "buyer" && bundle.storeSlug ? (
          <Link
            href={`/store/${bundle.storeSlug}`}
            className="mt-3 inline-flex text-sm font-semibold text-[var(--sf-accent-strong)] hover:text-[var(--sf-accent)]"
          >
            View seller store →
          </Link>
        ) : null}
        <div className="mt-4">
          <OrderStatusCluster
            status={order.status}
            paymentStatus={order.payment_status}
            fulfillmentStatus={order.fulfillment_status}
            shippedAt={order.shipped_at}
            deliveredAt={order.delivered_at}
            buyerReadable={mode === "buyer"}
          />
        </div>
        {pendingPayment && mode === "buyer" ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
          >
            This order exists and is recorded as payment pending. Live payment
            collection is not enabled — no charge is collected here. Inventory
            holds follow trusted commerce rules until payment, cancellation, or
            hold expiry.
          </p>
        ) : null}
        {order.payment_status === "paid" &&
        mode === "buyer" &&
        (bundle.digitalEntitlements?.length ?? 0) > 0 ? (
          <div className="mt-4 rounded-2xl border border-[var(--sf-line)] bg-[var(--sf-surface-2)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--sf-ink)]">
              Digital access granted
            </p>
            <ul className="mt-2 space-y-1 text-sm text-[var(--sf-muted)]">
              {bundle.digitalEntitlements!.map((entitlement) => (
                <li key={entitlement.id}>
                  {entitlement.titleSnapshot?.trim() || "Digital item"}
                  {entitlement.skuSnapshot
                    ? ` · ${entitlement.skuSnapshot}`
                    : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {order.payment_status === "failed" && mode === "buyer" ? (
          <p
            role="alert"
            className="mt-4 rounded-2xl border border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.08)] px-4 py-3 text-sm text-[var(--sf-danger)]"
          >
            Payment is marked failed in trusted records. Retry from checkout when
            a live payment attempt is available for this order.
          </p>
        ) : null}
        {mode === "buyer" && retryAction ? (
          <div className="mt-4">
            <BuyerDeferredPaymentRecoveryButton
              orderId={order.id}
              enabled={retryAction.enabled}
              reason={"reason" in retryAction ? retryAction.reason : undefined}
              hasAttempt={hasDeferredAttempt}
            />
          </div>
        ) : null}
        {mode === "buyer" && cancelAction?.enabled ? (
          <BuyerCancelOrderButton orderId={order.id} canCancel />
        ) : null}
        {mode === "buyer" && cancelAction && !cancelAction.enabled ? (
          <p className="mt-3 text-xs text-[var(--sf-faint)]">
            Cancellation unavailable: {cancelAction.reason}
          </p>
        ) : null}
      </section>

      {mode === "buyer" && siblings.length > 0 ? (
        <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
          <h2 className="sf-display text-xl font-semibold tracking-tight">
            Related seller orders
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
            This checkout created multiple seller orders. Each order has its own
            fulfillment and delivery path — they are not one combined shipment.
          </p>
          <ul className="mt-4 space-y-2">
            {siblings.map((sibling) => (
              <li key={sibling.id}>
                <Link
                  href={buildStoreOrderHref(sibling.id)}
                  className="watch-focus-ring flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--sf-line)] px-4 py-3 text-sm transition hover:border-[rgba(214,196,161,0.35)]"
                >
                  <span>
                    <span className="font-semibold">{sibling.storeName}</span>
                    <span className="ms-2 text-[var(--sf-faint)]">
                      {sibling.orderNumber}
                    </span>
                  </span>
                  <span className="font-semibold text-[var(--sf-accent-strong)]">
                    {formatOrderMoney(
                      sibling.grandTotalMinor,
                      sibling.currency
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <h2 className="sf-display text-xl font-semibold tracking-tight">Items</h2>
        <ul className="mt-4 divide-y divide-[var(--sf-line)]">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-semibold text-[var(--sf-ink)]">
                  {item.title_snapshot}
                </p>
                {item.variant_title_snapshot ? (
                  <p className="text-sm text-[var(--sf-faint)]">
                    {item.variant_title_snapshot}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-[var(--sf-faint)]">
                  SKU {item.sku_snapshot} · Qty {item.quantity}
                </p>
              </div>
              <div className="text-end text-sm">
                <p className="text-[var(--sf-faint)]">
                  {formatOrderMoney(item.unit_price_minor, order.currency)} each
                </p>
                <p className="font-semibold">
                  {formatOrderMoney(item.total_price_minor, order.currency)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
          <h2 className="sf-display text-xl font-semibold tracking-tight">
            Delivery
          </h2>
          {order.shipping_method_name || order.shipping_method_code ? (
            <p className="mt-3 text-sm text-[var(--sf-muted)]">
              {order.shipping_method_name ?? order.shipping_method_code}
              {order.shipping_estimate_text
                ? ` · ${order.shipping_estimate_text}`
                : ""}
            </p>
          ) : (
            <p className="mt-3 text-sm text-[var(--sf-faint)]">
              No delivery method on file.
            </p>
          )}
          <p className="mt-2 text-xs text-[var(--sf-faint)]">
            Carrier names, tracking codes, and delivery dates are shown only when
            trusted records exist. Shipping Network events are not invented here.
          </p>
          {addressLines && addressLines.length > 0 ? (
            <address className="mt-4 not-italic text-sm leading-6 text-[var(--sf-muted)]">
              {addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
            </address>
          ) : (
            <p className="mt-4 text-sm text-[var(--sf-faint)]">
              Delivery address snapshot is not available.
            </p>
          )}
          {mode === "seller" ? (
            <p className="mt-4 text-xs text-white/35">
              Contact details are limited to fulfillment fields from the order
              snapshot. Profile and payment credentials are never exposed.
            </p>
          ) : null}
        </section>

        <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
          <h2 className="sf-display text-xl font-semibold tracking-tight">
            Totals
          </h2>
          <dl className="mt-4 space-y-2 text-sm">
            {moneyRows.map((row) => (
              <div
                key={row.key}
                className={`flex justify-between gap-3 ${
                  row.emphasize
                    ? "border-t border-[var(--sf-line)] pt-3 text-base font-semibold"
                    : ""
                }`}
              >
                <dt className="text-[var(--sf-faint)]">{row.label}</dt>
                <dd className={row.emphasize ? "text-[var(--sf-accent-strong)]" : ""}>
                  {formatBuyerMoneyRow(row, order.currency)}
                </dd>
              </div>
            ))}
          </dl>
          {order.coupon_code_snapshot ? (
            <p className="mt-3 text-xs text-[var(--sf-faint)]">
              Coupon on order: {order.coupon_code_snapshot}
            </p>
          ) : null}
          {mode === "buyer" && attempts.length > 0 ? (
            <div className="mt-4 border-t border-[var(--sf-line)] pt-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                Payment attempts
              </p>
              <ul className="mt-2 space-y-1 text-xs text-[var(--sf-muted)]">
                {attempts.map((attempt) => (
                  <li key={attempt.id}>
                    {attempt.status} · {attempt.provider} ·{" "}
                    {formatOrderMoney(attempt.amountMinor, attempt.currency)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
          <h2 className="sf-display text-xl font-semibold tracking-tight">
            Timeline
          </h2>
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
              confirmedEventsOnly={mode === "buyer"}
            />
          </div>
        </section>

        {mode === "seller" ? (
          <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
            <h2 className="sf-display text-xl font-semibold tracking-tight">
              Update status
            </h2>
            <div className="mt-4">
              <SellerOrderStatusForm
                orderId={order.id}
                status={order.status}
                fulfillmentStatus={order.fulfillment_status}
                paymentStatus={order.payment_status}
                canUpdate={bundle.canUpdate}
              />
            </div>
          </section>
        ) : (
          <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
            <h2 className="sf-display text-xl font-semibold tracking-tight">
              Next steps
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {buyerActions
                .filter(
                  (a) =>
                    a.id === "view_store" ||
                    a.id === "continue_shopping" ||
                    a.id === "view_orders"
                )
                .map((action) =>
                  action.enabled ? (
                    <li key={action.id}>
                      <Link
                        href={action.href}
                        className="font-semibold text-[var(--sf-accent-strong)] hover:text-[var(--sf-accent)]"
                      >
                        {action.label} →
                      </Link>
                    </li>
                  ) : null
                )}
              <li>
                <Link
                  href={APP_ROUTES.storeCart}
                  className="font-semibold text-[var(--sf-muted)] hover:text-[var(--sf-ink)]"
                >
                  View cart →
                </Link>
              </li>
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
