"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AppLocale } from "../../../../lib/i18n";
import { sandboxHref } from "../../../../lib/sandbox/paths";
import { actorById } from "../../../../lib/sandbox/store/listings";
import { storeT } from "../../../../lib/sandbox/store/messages";
import type { CheckoutPaymentOutcome } from "../../../../lib/sandbox/store/payment";
import {
  cartActorIds,
  cartSubtotalMinor,
  resolveCartLines,
  shippingQuote,
  type ShippingId,
  type ShopperOrder,
} from "../../../../lib/sandbox/store/session";
import { formatMinorUnits } from "../../../../lib/store/money";
import { useStoreSession } from "./StoreSessionContext";

export function StoreCart({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const { state, setQty } = useStoreSession();
  const rows = resolveCartLines(state);
  const actors = cartActorIds(state);
  if (rows.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-semibold">{t("cart")}</h2>
        <p className="sx-card mt-4">{t("emptyCart")}</p>
        <Link className="sx-cta mt-4 inline-flex" href={sandboxHref("store/catalog")}>
          {t("continueShopping")}
        </Link>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold">{t("cart")}</h2>
      {actors.length > 1 ? <p className="mt-2 text-sm text-[var(--sx-muted)]">{t("multiSellerNote")}</p> : null}
      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <article key={`${row.line.productSlug}-${row.line.variantId}`} className="sx-card sx-line">
            <div>
              <Link href={sandboxHref(`store/products/${row.line.productSlug}`)}>
                <strong>{row.listing.product.title}</strong>
              </Link>
              <p className="text-sm text-[var(--sx-muted)]">
                {row.variantTitle} · {row.listing.actor.displayName} · {row.listing.commerceMode}
              </p>
            </div>
            <div className="sx-line-actions">
              <label>
                {t("quantity")}
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={row.line.quantity}
                  onChange={(event) =>
                    setQty(row.line.productSlug, row.line.variantId, Number(event.target.value))
                  }
                />
              </label>
              <p>{formatMinorUnits(row.unitMinor * row.line.quantity, "USD")}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-4">
        {t("subtotal")}: {formatMinorUnits(cartSubtotalMinor(state), "USD")}
      </p>
      <Link className="sx-cta mt-4 inline-flex" href={sandboxHref("store/checkout")}>
        {t("checkout")}
      </Link>
    </div>
  );
}

export function StoreCheckout({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const { state, setAddress, checkout } = useStoreSession();
  const rows = resolveCartLines(state);
  const [shippingId, setShippingId] = useState<ShippingId>("standard");
  const [message, setMessage] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const ship = useMemo(
    () => shippingQuote(shippingId, rows.map((row) => row.listing)),
    [shippingId, rows]
  );
  const total = cartSubtotalMinor(state) + ship.amountMinor;
  const actors = cartActorIds(state);

  if (rows.length === 0 && !orderId) {
    return (
      <div>
        <h2 className="text-2xl font-semibold">{t("checkoutTitle")}</h2>
        <p className="sx-card mt-4">{t("emptyCart")}</p>
      </div>
    );
  }

  function run(outcome: CheckoutPaymentOutcome) {
    const result = checkout(shippingId, outcome);
    if (result.ok) {
      setOrderId(result.order.id);
      setMessage(outcome === "PROCESSING" ? t("orderPending") : t("orderPlaced"));
      return;
    }
    if (result.reason === "DECLINED") setMessage(t("orderDeclined"));
    else if (result.reason === "CANCELLED") setMessage(t("orderCancelled"));
    else setMessage(t("emptyCart"));
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold">{t("checkoutTitle")}</h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">
        {t("paymentMode")} · {t("payNote")}
      </p>
      {actors.length > 1 ? <p className="mt-2 text-sm">{t("multiSellerNote")}</p> : null}
      <section className="sx-card mt-4">
        <h3>{t("address")}</h3>
        <div className="sx-form-grid">
          {(
            [
              ["name", "addressName"],
              ["line1", "addressLine"],
              ["city", "city"],
              ["region", "region"],
              ["postal", "postal"],
              ["country", "country"],
            ] as const
          ).map(([field, key]) => (
            <label key={field}>
              {t(key)}
              <input
                value={state.address[field]}
                onChange={(event) => setAddress({ ...state.address, [field]: event.target.value })}
              />
            </label>
          ))}
        </div>
      </section>
      <section className="sx-card mt-4">
        <h3>{t("shipping")}</h3>
        <p className="text-sm text-[var(--sx-muted)]">{t("notAPromise")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["standard", "express", "digital"] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={shippingId === id ? "sx-cta" : "sx-ghost"}
              onClick={() => setShippingId(id)}
            >
              {id === "standard" ? t("shipStandard") : id === "express" ? t("shipExpress") : t("shipDigital")}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm">
          {ship.label} · {formatMinorUnits(ship.amountMinor, "USD")}
        </p>
      </section>
      <section className="sx-card mt-4">
        <h3>{t("payment")}</h3>
        <p className="text-sm text-[var(--sx-muted)]">{t("noCard")}</p>
        <p className="mt-2">
          {t("total")}: {formatMinorUnits(total, "USD")}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="sx-cta" onClick={() => run("SUCCESS")}>
            {t("paySuccess")}
          </button>
          <button type="button" className="sx-ghost" onClick={() => run("DECLINED")}>
            {t("payDeclined")}
          </button>
          <button type="button" className="sx-ghost" onClick={() => run("PROCESSING")}>
            {t("payProcessing")}
          </button>
          <button type="button" className="sx-ghost" onClick={() => run("CANCELLED")}>
            {t("payCancelled")}
          </button>
        </div>
      </section>
      {message ? (
        <p className="sx-card mt-4" role="status">
          {message}
          {orderId ? (
            <>
              {" "}
              <Link className="underline" href={sandboxHref(`store/orders/${orderId}`)}>
                {t("viewOrder")}
              </Link>
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

function OrderCard({ locale, order }: { locale: AppLocale; order: ShopperOrder }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  return (
    <Link className="sx-card block" href={sandboxHref(`store/orders/${order.id}`)}>
      <strong>{order.id}</strong>
      <p className="mt-1 text-sm text-[var(--sx-muted)]">
        {order.status} · {order.paymentOutcome} · {formatMinorUnits(order.totalMinor, "USD")}
      </p>
      <p className="text-sm">{order.lines.map((line) => line.title).join(" · ")}</p>
      {order.afterSale ? (
        <p className="mt-1 text-xs">
          {t("afterSale")}: {order.afterSale}
        </p>
      ) : null}
    </Link>
  );
}

export function StoreOrders({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const { state } = useStoreSession();
  if (state.orders.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-semibold">{t("orders")}</h2>
        <p className="sx-card mt-4">{t("emptyOrders")}</p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="text-2xl font-semibold">{t("orders")}</h2>
      <div className="sx-grid mt-4">
        {state.orders.map((order) => (
          <OrderCard key={order.id} locale={locale} order={order} />
        ))}
      </div>
    </div>
  );
}

export function StoreOrderDetail({ locale, orderId }: { locale: AppLocale; orderId: string }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const { state, requestReturn, requestRefund, completeRefundDemo } = useStoreSession();
  const order = state.orders.find((row) => row.id === orderId);
  if (!order) {
    return <p>Unknown sandbox order.</p>;
  }
  const groups = new Map<string, typeof order.lines>();
  for (const line of order.lines) {
    const list = groups.get(line.actorId) ?? [];
    list.push(line);
    groups.set(line.actorId, list);
  }
  return (
    <article>
      <h2 className="text-2xl font-semibold">
        {t("orderDetail")} {order.id}
      </h2>
      <p className="mt-2 text-sm text-[var(--sx-muted)]">
        {order.status} · {order.paymentOutcome} · {t("paymentMode")} · REAL_PROVIDER_CALL=NO
      </p>
      {groups.size > 1 ? <p className="mt-2 text-sm">{t("multiSellerNote")}</p> : null}
      <div className="mt-4 space-y-3">
        {[...groups.entries()].map(([actorId, lines]) => (
          <section key={actorId} className="sx-card">
            <h3>
              {t("soldBy")}: {actorById(actorId)?.displayName ?? actorId}
            </h3>
            <ul className="mt-2 text-sm">
              {lines.map((line) => (
                <li key={`${line.productSlug}-${line.variantId}`}>
                  <Link href={sandboxHref(`store/products/${line.productSlug}`)}>{line.title}</Link>{" "}
                  · {line.variantTitle} × {line.quantity} · {formatMinorUnits(line.unitMinor * line.quantity, "USD")}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-4 text-sm">
        {t("address")}: {order.address.name}, {order.address.line1}, {order.address.city}
      </p>
      <p className="text-sm">
        {t("shipping")}: {order.shippingLabel}
      </p>
      <p className="mt-2">
        {t("total")}: {formatMinorUnits(order.totalMinor, "USD")}
      </p>
      {order.afterSale ? (
        <p className="mt-2 text-sm">
          {t("afterSale")}: {order.afterSale}
        </p>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="sx-ghost" onClick={() => requestReturn(order.id)}>
          {t("requestReturn")}
        </button>
        <button type="button" className="sx-ghost" onClick={() => requestRefund(order.id)}>
          {t("requestRefund")}
        </button>
        <button type="button" className="sx-ghost" onClick={() => completeRefundDemo(order.id)}>
          {t("completeRefundDemo")}
        </button>
      </div>
    </article>
  );
}

export function StoreReturns({ locale }: { locale: AppLocale }) {
  const t = (key: Parameters<typeof storeT>[1]) => storeT(locale, key);
  const { state } = useStoreSession();
  const rows = state.orders.filter(
    (order) =>
      order.afterSale ||
      order.paymentOutcome === "REFUNDED_DEMO" ||
      order.paymentOutcome === "REFUND_PENDING"
  );
  return (
    <div>
      <h2 className="text-2xl font-semibold">{t("returns")}</h2>
      {rows.length === 0 ? (
        <p className="sx-card mt-4">{t("emptyOrders")}</p>
      ) : (
        <div className="sx-grid mt-4">
          {rows.map((order) => (
            <OrderCard key={order.id} locale={locale} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
