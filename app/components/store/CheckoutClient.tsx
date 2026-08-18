"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import {
  confirmCheckoutQuoteAction,
  createCheckoutQuoteAction,
  ensureDeferredPaymentAttemptAction,
  saveCheckoutAddressAction,
} from "../../actions/storeCheckout";
import { formatMinorUnits } from "../../../lib/store/money";
import type { CartSummary } from "../../../lib/store/cartRules";
import type { BuyerAddressRow } from "../../../lib/store/checkout";
import {
  aggregateQuoteTotals,
  buildCheckoutQuoteMoneyRows,
  evaluateCheckoutStepReadiness,
  multiSellerCheckoutNotice,
} from "../../../lib/store/cartCheckoutPresentation";
import { CHECKOUT_PAYMENT_PLACEHOLDER_OPTIONS } from "../../../lib/store/payments";
import { formatTrustedMoney } from "../../../lib/store/tradingContracts";
import { APP_ROUTES, buildStoreOrderHref } from "../../lib/nav";
import { useTranslation } from "../i18n";
import StoreEmptyState from "./StoreEmptyState";
import StoreErrorState from "./StoreErrorState";

type ShippingMethod = {
  id: string;
  store_id: string;
  code: string;
  name: string;
  fee_minor: number;
  currency: string;
  free_above_subtotal_minor: number | null;
  estimate_text: string | null;
};

type Props = {
  cart: CartSummary;
  addresses: BuyerAddressRow[];
  shippingMethods: ShippingMethod[];
  purchasesAvailable?: boolean;
  purchasesUnavailableMessage?: string | null;
};

type ConfirmResult = {
  orders?: Array<Record<string, unknown>>;
  payment_note?: string;
  payment_recording_incomplete?: boolean;
  payment_attempt_failures?: Array<{ orderId: string; message: string }>;
  payment_attempts?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

export default function CheckoutClient({
  cart,
  addresses,
  shippingMethods,
  purchasesAvailable = true,
  purchasesUnavailableMessage = null,
}: Props) {
  const { t } = useTranslation();
  const STEPS = [
    { id: "review", label: t("store.checkout.step.review") },
    { id: "address", label: t("store.checkout.step.address") },
    { id: "delivery", label: t("store.checkout.step.delivery") },
    { id: "quote", label: t("store.checkout.step.quote") },
    { id: "place", label: t("store.checkout.step.place") },
  ] as const;
  const [pending, startTransition] = useTransition();
  const submitLockRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [coupon, setCoupon] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState(
    addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? ""
  );
  const [shippingByStore, setShippingByStore] = useState<Record<string, string>>(
    () => {
      const initial: Record<string, string> = {};
      for (const group of cart.groups) {
        const methods = shippingMethods.filter((m) => m.store_id === group.storeId);
        initial[group.storeId] = methods[0]?.code ?? "standard";
      }
      return initial;
    }
  );
  const [quote, setQuote] = useState<Record<string, unknown> | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [sameBilling, setSameBilling] = useState(true);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  const currency = cart.currency ?? "USD";
  const busy = pending || recoveryBusy;
  const multiNotice = multiSellerCheckoutNotice(cart.groups.length);
  const shippingSelectionsComplete = cart.groups.every(
    (g) => Boolean(shippingByStore[g.storeId]?.trim())
  );
  const readiness = evaluateCheckoutStepReadiness({
    hasItems: cart.itemCount > 0,
    hasAddress: Boolean(selectedAddress),
    shippingSelectionsComplete,
    hasQuote: Boolean(quote?.quote_id),
    quoteExpiresAt:
      typeof quote?.expires_at === "string" ? quote.expires_at : null,
    purchasesAvailable,
  });

  const activeStepIndex =
    readiness.step === "cart"
      ? 0
      : readiness.step === "address"
        ? 1
        : readiness.step === "delivery"
          ? 2
          : readiness.step === "quote"
            ? 3
            : 4;

  function withSubmitLock(fn: () => void) {
    if (submitLockRef.current || pending || recoveryBusy) return;
    submitLockRef.current = true;
    setError(null);
    setStatusMessage(null);
    fn();
  }

  if (cart.itemCount === 0) {
    return (
      <div className="mt-6 space-y-4">
        <StoreEmptyState
          title={t("store.checkout.emptyTitle")}
          description={t("store.checkout.emptyDescription")}
          actionHref={APP_ROUTES.storeCart}
          actionLabel={t("store.checkout.backToCart")}
        />
      </div>
    );
  }

  if (result) {
    const orders = result.orders ?? [];
    const incomplete = Boolean(result.payment_recording_incomplete);
    const failures = result.payment_attempt_failures ?? [];

    async function onRetryPaymentRecording() {
      if (recoveryBusy || submitLockRef.current) return;
      const orderIds = orders
        .map((o) => (typeof o.order_id === "string" ? o.order_id : ""))
        .filter(Boolean);
      if (orderIds.length === 0) {
        setError("No orders available to recover payment recording.");
        return;
      }
      setRecoveryBusy(true);
      setError(null);
      setStatusMessage("Retrying deferred payment recording…");
      try {
        const form = new FormData();
        form.set("order_ids_json", JSON.stringify(orderIds));
        const res = await ensureDeferredPaymentAttemptAction(form);
        if (!res.ok) {
          setError(res.message);
          setStatusMessage(null);
          return;
        }
        setResult((prev) =>
          prev
            ? {
                ...prev,
                payment_attempts: res.data.payment_attempts as unknown as Array<
                  Record<string, unknown>
                >,
                payment_attempt_failures: res.data.payment_attempt_failures,
                payment_recording_incomplete:
                  res.data.payment_recording_incomplete,
              }
            : prev
        );
        setStatusMessage(
          res.data.payment_recording_incomplete
            ? "Some deferred payment records are still missing. You can retry."
            : "Deferred payment records saved. No charge was made."
        );
      } finally {
        setRecoveryBusy(false);
      }
    }

    return (
      <div
        className="mt-6 space-y-4 rounded-[var(--sf-radius-lg)] border border-[rgba(159,214,184,0.35)] bg-[var(--sf-surface)] p-6"
        role="status"
        aria-live="polite"
      >
        <p className="sf-eyebrow">Recorded · unpaid</p>
        <h2 className="sf-display text-2xl font-semibold tracking-tight">
          Order recorded — payment pending
        </h2>
        <p className="text-sm leading-relaxed text-[var(--sf-muted)]">
          {(typeof result.payment_note === "string" && result.payment_note) ||
            "No payment was collected. Your order is recorded as pending payment with a deferred payment attempt — not a live charge."}
        </p>
        <p className="text-sm text-[var(--sf-ok)]">
          Next: open an order to track status, or return to the store.
        </p>
        {incomplete ? (
          <div
            className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-bold">Deferred payment recording incomplete</p>
            <p className="mt-1 text-amber-100/80">
              Your order was recorded. Recording the deferred payment attempt
              failed for one or more sellers. No charge was attempted. Cart was
              cleared only after order recording.
            </p>
            {failures.length > 0 ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/70">
                {failures.map((f) => (
                  <li key={f.orderId}>
                    Order {f.orderId.slice(0, 8)}… — {f.message}
                  </li>
                ))}
              </ul>
            ) : null}
            <button
              type="button"
              disabled={recoveryBusy}
              onClick={() => void onRetryPaymentRecording()}
              className="watch-focus-ring mt-3 rounded-full border border-amber-200/40 px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {recoveryBusy ? "Retrying…" : "Retry deferred payment recording"}
            </button>
          </div>
        ) : null}
        {statusMessage ? (
          <p className="text-sm text-[var(--sf-muted)]" aria-live="polite">
            {statusMessage}
          </p>
        ) : null}
        {error ? (
          <div aria-live="assertive">
            <StoreErrorState message={error} />
          </div>
        ) : null}
        <ul className="space-y-2 text-sm">
          {orders.map((o) => (
            <li
              key={String(o.order_id)}
              className="rounded-xl border border-[var(--sf-line)] p-3"
            >
              <p className="font-semibold">Order {String(o.order_number)}</p>
              <p className="text-[var(--sf-faint)]">
                Seller order · store {String(o.store_id).slice(0, 8)}…
              </p>
              {typeof o.order_id === "string" ? (
                <Link
                  href={buildStoreOrderHref(o.order_id)}
                  className="mt-2 inline-flex text-xs font-semibold text-[var(--sf-accent-strong)]"
                >
                  Open order detail →
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          {typeof orders[0]?.order_id === "string" ? (
            <Link
              href={buildStoreOrderHref(String(orders[0].order_id))}
              className="sf-btn sf-btn-primary"
            >
              View first order
            </Link>
          ) : null}
          <Link
            href={APP_ROUTES.storeOrders}
            className="sf-btn sf-btn-secondary"
          >
            View my orders
          </Link>
          <Link href={APP_ROUTES.store} className="sf-btn sf-btn-ghost">
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  function onCreateQuote() {
    withSubmitLock(() => {
      if (!selectedAddress) {
        submitLockRef.current = false;
        setError("Add or select a shipping address.");
        return;
      }
      if (!shippingSelectionsComplete) {
        submitLockRef.current = false;
        setError("Choose a delivery method for each seller.");
        return;
      }
      startTransition(async () => {
        try {
          const form = new FormData();
          for (const [k, v] of Object.entries(selectedAddress)) {
            if (k === "id" || k === "label" || k === "is_default") continue;
            form.set(k, v == null ? "" : String(v));
          }
          form.set("shipping_selections_json", JSON.stringify(shippingByStore));
          form.set("coupon_code", coupon);
          form.set(
            "idempotency_key",
            `checkout-quote-${selectedAddress.id}-${cart.itemCount}-${Date.now()}`
          );
          const res = await createCheckoutQuoteAction(form);
          if (!res.ok) {
            setError(res.message);
            setQuote(null);
            return;
          }
          setQuote(res.data);
          setStatusMessage(
            "Server quote calculated. Discount, tax, and delivery below are authoritative."
          );
        } finally {
          submitLockRef.current = false;
        }
      });
    });
  }

  function onConfirm() {
    withSubmitLock(() => {
      const quoteId = quote?.quote_id;
      if (typeof quoteId !== "string") {
        submitLockRef.current = false;
        setError("Create a checkout quote first.");
        return;
      }
      if (!purchasesAvailable) {
        submitLockRef.current = false;
        setError(
          purchasesUnavailableMessage ||
            "Purchases are not currently available."
        );
        return;
      }
      startTransition(async () => {
        try {
          const form = new FormData();
          form.set("quote_id", quoteId);
          const res = await confirmCheckoutQuoteAction(form);
          if (!res.ok) {
            setError(res.message);
            setStatusMessage(
              "Order was not recorded. Your cart and quote state are preserved — refresh the quote if it expired."
            );
            return;
          }
          setResult(res.data as ConfirmResult);
          setStatusMessage(
            res.data.payment_recording_incomplete
              ? "Order recorded. Deferred payment recording needs a retry. No live charge was made."
              : "Order recorded as pending payment. No live payment was collected."
          );
        } finally {
          submitLockRef.current = false;
        }
      });
    });
  }

  function onSaveAddress(formData: FormData) {
    withSubmitLock(() => {
      startTransition(async () => {
        try {
          const res = await saveCheckoutAddressAction(formData);
          if (!res.ok) {
            setError(res.message);
            return;
          }
          setSelectedAddressId(res.data.id);
          setQuote(null);
          setStatusMessage("Address saved. Recalculate the quote before placing the order.");
          window.location.reload();
        } finally {
          submitLockRef.current = false;
        }
      });
    });
  }

  const payload = (quote?.payload as Record<string, unknown> | undefined) ?? null;
  const groups = (payload?.groups as Array<Record<string, unknown>>) ?? [];
  const totals = groups.length > 0 ? aggregateQuoteTotals(groups) : null;
  const quoteMoneyTrusted = Boolean(totals?.complete && !totals.mixedCurrency);
  const moneyRows = buildCheckoutQuoteMoneyRows({
    cartSubtotalMinor: cart.subtotalMinor,
    quoted: Boolean(quote) && quoteMoneyTrusted,
    quoteGroup:
      quoteMoneyTrusted && totals
        ? {
            subtotal_minor: totals.subtotalMinor,
            discount_total_minor: totals.discountMinor,
            shipping_total_minor: totals.shippingMinor,
            tax_total_minor: totals.taxMinor,
            grand_total_minor: totals.grandMinor,
          }
        : null,
  });

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5" aria-busy={busy || undefined}>
        <nav aria-label={t("store.checkout.stepsAria")} className="overflow-x-auto">
          <ol className="flex min-w-max items-center gap-1">
            {STEPS.map((step, index) => {
              const current = index === activeStepIndex;
              const done = index < activeStepIndex;
              return (
                <li key={step.id} className="flex items-center gap-1">
                  {index > 0 ? (
                    <span
                      className={`mx-1 h-px w-6 ${
                        done || current
                          ? "bg-[rgba(214,196,161,0.45)]"
                          : "bg-[var(--sf-line)]"
                      }`}
                      aria-hidden
                    />
                  ) : null}
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] ${
                      current
                        ? "border-[rgba(214,196,161,0.45)] bg-[rgba(214,196,161,0.12)] text-[var(--sf-accent-strong)]"
                        : done
                          ? "border-[rgba(159,214,184,0.35)] text-[var(--sf-ok)]"
                          : "border-transparent text-[var(--sf-faint)]"
                    }`}
                    aria-current={current ? "step" : undefined}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        current
                          ? "bg-[var(--sf-accent)] text-[#1a1712]"
                          : done
                            ? "bg-[rgba(159,214,184,0.25)]"
                            : "bg-white/5"
                      }`}
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>

        <div aria-live="assertive">
          {error ? <StoreErrorState message={error} /> : null}
        </div>
        <div aria-live="polite" className="sr-only">
          {busy ? "Checkout is working. Please wait." : statusMessage || ""}
        </div>
        {statusMessage && !error ? (
          <p className="text-sm text-[var(--sf-muted)]" role="status">
            {statusMessage}
          </p>
        ) : null}
        {readiness.message && !error ? (
          <p className="text-sm text-[var(--sf-accent)]" role="status">
            {readiness.message}
          </p>
        ) : null}
        {multiNotice ? (
          <p
            role="note"
            className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[rgba(214,196,161,0.06)] px-4 py-3 text-sm leading-relaxed text-[var(--sf-muted)]"
          >
            {multiNotice}
          </p>
        ) : null}

        <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
          <h2 className="sf-display text-lg font-semibold">Cart review</h2>
          <p className="mt-1 text-sm text-[var(--sf-faint)]">
            Grouped by seller. Delivery is selected per seller — not one shared
            shipment.
          </p>
          <ul className="mt-3 space-y-3">
            {cart.groups.map((group) => (
              <li
                key={group.storeId}
                className="rounded-2xl border border-[var(--sf-line)] p-3"
              >
                <p className="font-semibold">{group.storeName}</p>
                <ul className="mt-2 space-y-1 text-sm text-[var(--sf-muted)]">
                  {group.items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="truncate">
                        {item.productTitle} · {item.variantTitle} ×{" "}
                        {item.quantity}
                      </span>
                      <span className="shrink-0 font-semibold text-[var(--sf-ink)]">
                        {formatMinorUnits(item.lineTotalMinor, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-[var(--sf-faint)]">
                  Seller subtotal{" "}
                  {formatMinorUnits(group.storeSubtotalMinor, currency)}
                </p>
                {itemBlocking(group.items) ? (
                  <p role="alert" className="mt-2 text-xs text-[var(--sf-danger)]">
                    One or more items need attention in the cart before placing
                    this order.
                  </p>
                ) : null}
                <label
                  className="mt-3 block text-xs font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]"
                  htmlFor={`ship-${group.storeId}`}
                >
                  Delivery method
                </label>
                <select
                  id={`ship-${group.storeId}`}
                  className="sf-select mt-1"
                  value={shippingByStore[group.storeId] ?? "standard"}
                  disabled={busy}
                  onChange={(e) => {
                    setQuote(null);
                    setShippingByStore((prev) => ({
                      ...prev,
                      [group.storeId]: e.target.value,
                    }));
                  }}
                >
                  {shippingMethods.filter((m) => m.store_id === group.storeId)
                    .length === 0 ? (
                    <option value="standard">
                      Standard delivery (seller default)
                    </option>
                  ) : (
                    shippingMethods
                      .filter((m) => m.store_id === group.storeId)
                      .map((m) => (
                        <option key={m.id} value={m.code}>
                          {m.name}
                          {m.estimate_text ? ` · ${m.estimate_text}` : ""} ·{" "}
                          {formatMinorUnits(m.fee_minor, m.currency)}
                          {m.free_above_subtotal_minor != null
                            ? ` (free above ${formatMinorUnits(
                                m.free_above_subtotal_minor,
                                m.currency
                              )})`
                            : ""}
                        </option>
                      ))
                  )}
                </select>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
          <h2 className="sf-display text-lg font-semibold">Delivery address</h2>
          {addresses.length > 0 ? (
            <div className="mt-3 space-y-2" role="radiogroup" aria-label="Saved addresses">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                    selectedAddressId === a.id
                      ? "border-[rgba(214,196,161,0.45)] bg-[rgba(214,196,161,0.08)]"
                      : "border-[var(--sf-line)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === a.id}
                    onChange={() => {
                      setSelectedAddressId(a.id);
                      setQuote(null);
                    }}
                    disabled={busy}
                  />
                  <span className="text-sm">
                    <span className="font-semibold">{a.full_name}</span>
                    {a.is_default ? (
                      <span className="ms-2 text-[10px] uppercase tracking-wider text-[var(--sf-accent)]">
                        Default
                      </span>
                    ) : null}
                    <br />
                    <span className="text-[var(--sf-muted)]">
                      {a.address_line1}
                      {a.address_line2 ? `, ${a.address_line2}` : ""}
                      <br />
                      {a.city}
                      {a.region ? `, ${a.region}` : ""}{" "}
                      {a.postal_code ?? ""} · {a.country_code}
                      <br />
                      {a.phone}
                      {a.email ? ` · ${a.email}` : ""}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--sf-faint)]">
              No saved addresses yet. Add one below.
            </p>
          )}

          <form action={onSaveAddress} className="mt-4 grid gap-3 md:grid-cols-2">
            <h3 className="md:col-span-2 text-sm font-semibold text-[var(--sf-muted)]">
              Add address
            </h3>
            {(
              [
                ["full_name", "Full name", true, "text", "name"],
                ["phone", "Phone", true, "tel", "tel"],
                ["email", "Email", false, "email", "email"],
                ["country_code", "Country code (ISO-2)", true, "text", "country"],
                ["region", "Region / State", false, "text", "address-level1"],
                ["city", "City", true, "text", "address-level2"],
                ["postal_code", "Postal code", false, "text", "postal-code"],
                ["address_line1", "Address line 1", true, "text", "address-line1"],
                ["address_line2", "Address line 2", false, "text", "address-line2"],
              ] as const
            ).map(([name, label, required, type, autoComplete]) => (
              <label key={name} className="block text-xs text-[var(--sf-faint)]">
                {label}
                <input
                  name={name}
                  type={type}
                  required={required}
                  autoComplete={autoComplete}
                  inputMode={
                    name === "phone"
                      ? "tel"
                      : name === "postal_code"
                        ? "numeric"
                        : undefined
                  }
                  maxLength={name === "country_code" ? 2 : undefined}
                  className="sf-input mt-1"
                  disabled={busy}
                />
              </label>
            ))}
            <label className="md:col-span-2 block text-xs text-[var(--sf-faint)]">
              Delivery instructions
              <textarea
                name="delivery_instructions"
                rows={2}
                className="sf-textarea mt-1"
                disabled={busy}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--sf-muted)]">
              <input type="checkbox" name="is_default" value="1" disabled={busy} />
              Set as default
            </label>
            <label className="flex items-center gap-2 text-xs text-[var(--sf-muted)]">
              <input
                type="checkbox"
                checked={sameBilling}
                onChange={(e) => setSameBilling(e.target.checked)}
                disabled={busy}
              />
              Billing same as delivery
            </label>
            {!sameBilling ? (
              <p className="md:col-span-2 text-xs text-[var(--sf-faint)]">
                Separate billing addresses are not collected in this foundation —
                checkout currently uses the delivery address for billing
                snapshots.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="sf-btn sf-btn-secondary disabled:opacity-50"
            >
              Save address
            </button>
          </form>
        </section>

        <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
          <h2 className="sf-display text-lg font-semibold">Payment</h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
            Live payment collection is not enabled. Placing an order only records
            it as pending payment and creates a deferred payment attempt — no
            card, wallet, or gateway charge runs here. Live PSP options are
            hidden until a provider is explicitly enabled.
          </p>
          <fieldset className="mt-4 space-y-2" disabled={busy}>
            <legend className="sr-only">Payment method</legend>
            {CHECKOUT_PAYMENT_PLACEHOLDER_OPTIONS.filter(
              (option) => option.enabled
            ).map((option) => (
              <label
                key={option.provider}
                className="flex items-center gap-3 rounded-xl border border-[rgba(214,196,161,0.35)] bg-[rgba(214,196,161,0.08)] px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name="payment_provider"
                  value={option.provider}
                  defaultChecked
                  disabled={busy}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </fieldset>
        </section>

        <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
          <label className="block text-sm font-semibold" htmlFor="coupon">
            Coupon code
          </label>
          <p className="mt-1 text-xs text-[var(--sf-faint)]">
            Applied only when the server quote accepts a trusted coupon.
          </p>
          <input
            id="coupon"
            value={coupon}
            onChange={(e) => {
              setCoupon(e.target.value);
              setQuote(null);
            }}
            disabled={busy}
            className="sf-input mt-2"
            placeholder="Optional"
            autoComplete="off"
          />
        </section>
      </div>

      <aside className="h-fit rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 lg:sticky lg:top-20">
        <p className="sf-eyebrow">Order summary</p>
        <dl className="mt-4 space-y-2 text-sm">
          {moneyRows.map((row) => (
            <div
              key={row.key}
              className={`flex justify-between gap-3 ${
                row.emphasize ? "border-t border-[var(--sf-line)] pt-3" : ""
              }`}
            >
              <dt className="text-[var(--sf-faint)]">{row.label}</dt>
              <dd
                className={
                  row.emphasize
                    ? "text-lg font-semibold text-[var(--sf-accent-strong)]"
                    : "font-semibold"
                }
              >
                {row.known && row.amountMinor != null
                  ? formatMinorUnits(row.amountMinor, currency)
                  : "Pending quote"}
              </dd>
            </div>
          ))}
        </dl>

        {totals?.mixedCurrency ? (
          <p
            className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
            role="alert"
          >
            Mixed currencies cannot be combined into one checkout total. Remove
            conflicting cart lines or check out sellers separately.
          </p>
        ) : null}

        {quoteMoneyTrusted && groups.length > 1 ? (
          <ul className="mt-4 space-y-2 text-xs text-[var(--sf-muted)]">
            {groups.map((g) => {
              const grand =
                typeof g.grand_total_minor === "number"
                  ? g.grand_total_minor
                  : typeof g.grand_total_minor === "string" &&
                      /^-?\d+$/.test(g.grand_total_minor.trim())
                    ? Number(g.grand_total_minor.trim())
                    : null;
              const groupCurrency =
                typeof g.currency === "string" ? g.currency : currency;
              return (
                <li
                  key={String(g.store_id)}
                  className="rounded-xl border border-[var(--sf-line)] px-3 py-2"
                >
                  Seller order · Grand{" "}
                  {formatTrustedMoney(grand, groupCurrency)}
                </li>
              );
            })}
          </ul>
        ) : null}

        <button
          type="button"
          disabled={busy || !readiness.canQuote}
          onClick={onCreateQuote}
          aria-disabled={busy || !readiness.canQuote}
          className="sf-btn sf-btn-secondary mt-5 w-full"
        >
          {pending ? "Working…" : quote ? "Refresh quote" : "Calculate quote"}
        </button>
        <button
          type="button"
          disabled={busy || !readiness.canSubmit}
          onClick={onConfirm}
          aria-disabled={busy || !readiness.canSubmit}
          className="sf-btn sf-btn-primary mt-3 w-full"
        >
          {pending ? "Recording order…" : "Record order (no charge)"}
        </button>
        {!purchasesAvailable ? (
          <p
            role="status"
            className="mt-3 text-xs leading-relaxed text-amber-100/90"
          >
            {purchasesUnavailableMessage ||
              "Purchases are not currently available. Quote preview remains available."}
          </p>
        ) : null}
        <p className="mt-3 text-[11px] leading-relaxed text-[var(--sf-faint)]">
          Double-submit protected. Cart clears only after the server confirms
          order creation. This foundation does not collect live payments.
        </p>
        <Link
          href={APP_ROUTES.storeCart}
          className="mt-3 block text-center text-sm font-semibold text-[var(--sf-accent-strong)]"
        >
          Back to cart
        </Link>
      </aside>

      <div className="sf-sticky-actions lg:hidden">
        <button
          type="button"
          disabled={busy || !readiness.canQuote}
          onClick={onCreateQuote}
          aria-disabled={busy || !readiness.canQuote}
          className="sf-btn sf-btn-secondary"
        >
          {quote ? "Refresh" : "Quote"}
        </button>
        <button
          type="button"
          disabled={busy || !readiness.canSubmit}
          onClick={onConfirm}
          aria-disabled={busy || !readiness.canSubmit}
          className="sf-btn sf-btn-primary min-w-0 flex-1"
        >
          {pending ? "Recording…" : "Record order"}
        </button>
      </div>
    </div>
  );
}

function itemBlocking(
  items: CartSummary["groups"][number]["items"]
): boolean {
  return items.some((item) => Boolean(item.blockingIssue));
}
