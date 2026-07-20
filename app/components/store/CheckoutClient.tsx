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
import { CHECKOUT_PAYMENT_PLACEHOLDER_OPTIONS } from "../../../lib/store/payments";
import { APP_ROUTES } from "../../lib/nav";
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

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  const currency = cart.currency ?? "USD";
  const busy = pending || recoveryBusy || submitLockRef.current;

  function withSubmitLock(fn: () => void) {
    if (submitLockRef.current || pending || recoveryBusy) return;
    submitLockRef.current = true;
    setError(null);
    setStatusMessage(null);
    try {
      fn();
    } finally {
      // Unlock after transition settles via startTransition callbacks.
    }
  }

  if (cart.itemCount === 0) {
    return (
      <div className="mt-6 space-y-4">
        <StoreEmptyState
          title="Nothing to checkout"
          description="Add products to your cart before starting checkout."
        />
        <Link
          href={APP_ROUTES.store}
          className="watch-focus-ring inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-black text-black"
        >
          Continue shopping
        </Link>
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
        className="mt-6 space-y-4 rounded-[24px] border border-emerald-400/30 bg-[#080816]/90 p-6"
        role="status"
        aria-live="polite"
      >
        <h2 className="text-2xl font-black tracking-tight">Order recorded</h2>
        <p className="text-sm text-white/60">
          {(typeof result.payment_note === "string" && result.payment_note) ||
            "No payment was collected. Your order is recorded as pending payment with a deferred payment attempt (foundation only — not a live charge)."}
        </p>
        {incomplete ? (
          <div
            className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100"
            role="alert"
            aria-live="assertive"
          >
            <p className="font-bold">Deferred payment recording incomplete</p>
            <p className="mt-1 text-amber-100/80">
              Your order was confirmed. Recording the deferred payment attempt
              failed for one or more stores. No charge was attempted.
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
              className="watch-focus-ring mt-3 rounded-full border border-amber-200/40 px-4 py-2 text-sm font-bold disabled:opacity-50"
            >
              {recoveryBusy ? "Retrying…" : "Retry deferred payment recording"}
            </button>
          </div>
        ) : null}
        {statusMessage ? (
          <p className="text-sm text-white/55" aria-live="polite">
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
            <li key={String(o.order_id)} className="rounded-xl border border-white/10 p-3">
              <p className="font-bold">Order {String(o.order_number)}</p>
              <p className="text-white/45">Store {String(o.store_id)}</p>
            </li>
          ))}
        </ul>
        <Link
          href={APP_ROUTES.storeOrders}
          className="watch-focus-ring inline-flex rounded-full bg-violet-500 px-5 py-2.5 text-sm font-black text-white"
        >
          View my orders
        </Link>
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
            `checkout-quote-${selectedAddress.id}-${Date.now()}`
          );
          const res = await createCheckoutQuoteAction(form);
          if (!res.ok) {
            setError(res.message);
            return;
          }
          setQuote(res.data);
          setStatusMessage("Quote calculated. Totals are server-authoritative.");
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
      startTransition(async () => {
        try {
          const form = new FormData();
          form.set("quote_id", quoteId);
          const res = await confirmCheckoutQuoteAction(form);
          if (!res.ok) {
            setError(res.message);
            return;
          }
          setResult(res.data as ConfirmResult);
          setStatusMessage(
            res.data.payment_recording_incomplete
              ? "Order confirmed. Deferred payment recording needs a retry."
              : "Order confirmed. No live payment was collected."
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
          window.location.reload();
        } finally {
          submitLockRef.current = false;
        }
      });
    });
  }

  const payload = (quote?.payload as Record<string, unknown> | undefined) ?? null;
  const groups = (payload?.groups as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5" aria-busy={busy || undefined}>
        <div aria-live="assertive">
          {error ? <StoreErrorState message={error} /> : null}
        </div>
        <div aria-live="polite" className="sr-only">
          {busy ? "Checkout is working. Please wait." : statusMessage || ""}
        </div>
        {statusMessage && !error ? (
          <p className="text-sm text-white/55" role="status">
            {statusMessage}
          </p>
        ) : null}

        <section className="rounded-[24px] border border-white/10 bg-[#080816]/85 p-5">
          <h2 className="text-lg font-black">Cart review</h2>
          <ul className="mt-3 space-y-3">
            {cart.groups.map((group) => (
              <li key={group.storeId} className="rounded-2xl border border-white/10 p-3">
                <p className="font-bold">{group.storeName}</p>
                <p className="text-xs text-white/45">
                  {group.items.length} item(s) ·{" "}
                  {formatMinorUnits(group.storeSubtotalMinor, currency)}
                </p>
                <label className="mt-3 block text-xs font-bold text-white/50" htmlFor={`ship-${group.storeId}`}>
                  Shipping method
                </label>
                <select
                  id={`ship-${group.storeId}`}
                  className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  value={shippingByStore[group.storeId] ?? "standard"}
                  disabled={busy}
                  onChange={(e) =>
                    setShippingByStore((prev) => ({
                      ...prev,
                      [group.storeId]: e.target.value,
                    }))
                  }
                >
                  {shippingMethods.filter((m) => m.store_id === group.storeId).length === 0 ? (
                    <option value="standard">Standard shipping (default)</option>
                  ) : (
                    shippingMethods
                      .filter((m) => m.store_id === group.storeId)
                      .map((m) => (
                        <option key={m.id} value={m.code}>
                          {m.name} · {formatMinorUnits(m.fee_minor, m.currency)}
                        </option>
                      ))
                  )}
                </select>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-[#080816]/85 p-5">
          <h2 className="text-lg font-black">Shipping address</h2>
          {addresses.length > 0 ? (
            <div className="mt-3 space-y-2">
              {addresses.map((a) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer gap-3 rounded-xl border border-white/10 p-3"
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === a.id}
                    onChange={() => setSelectedAddressId(a.id)}
                    disabled={busy}
                  />
                  <span className="text-sm">
                    <span className="font-bold">{a.full_name}</span>
                    <br />
                    {a.address_line1}, {a.city}, {a.country_code}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-white/45">No saved addresses yet.</p>
          )}

          <form action={onSaveAddress} className="mt-4 grid gap-2 md:grid-cols-2">
            <h3 className="md:col-span-2 text-sm font-bold text-white/70">Add address</h3>
            {(
              [
                ["full_name", "Full name"],
                ["phone", "Phone"],
                ["email", "Email"],
                ["country_code", "Country (US)"],
                ["region", "Region/State"],
                ["city", "City"],
                ["postal_code", "Postal code"],
                ["address_line1", "Address line 1"],
                ["address_line2", "Address line 2"],
              ] as const
            ).map(([name, label]) => (
              <label key={name} className="block text-xs text-white/50">
                {label}
                <input
                  name={name}
                  required={["full_name", "phone", "country_code", "city", "address_line1"].includes(name)}
                  className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                  disabled={busy}
                />
              </label>
            ))}
            <label className="md:col-span-2 block text-xs text-white/50">
              Delivery instructions
              <textarea
                name="delivery_instructions"
                rows={2}
                className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                disabled={busy}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-white/60">
              <input type="checkbox" name="is_default" value="1" disabled={busy} />
              Set as default
            </label>
            <button
              type="submit"
              disabled={busy}
              className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-sm font-bold disabled:opacity-50"
            >
              Save address
            </button>
          </form>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-[#080816]/85 p-5">
          <h2 className="text-lg font-black">Payment</h2>
          <p className="mt-2 text-sm text-white/50">
            Live payment collection is not enabled. Placing an order only
            records it as pending payment and creates a deferred payment
            attempt — no card, wallet, or gateway charge runs in this
            foundation.
          </p>
          <fieldset className="mt-4 space-y-2" disabled={busy}>
            <legend className="sr-only">Payment method</legend>
            {CHECKOUT_PAYMENT_PLACEHOLDER_OPTIONS.map((option) => (
              <label
                key={option.provider}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-sm ${
                  option.enabled
                    ? "border-violet-400/30 bg-violet-500/10"
                    : "border-white/10 opacity-50"
                }`}
              >
                <input
                  type="radio"
                  name="payment_provider"
                  value={option.provider}
                  defaultChecked={option.enabled}
                  disabled={!option.enabled || busy}
                />
                <span>
                  {option.label}
                  {!option.enabled ? " (not available yet)" : ""}
                </span>
              </label>
            ))}
          </fieldset>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-[#080816]/85 p-5">
          <label className="block text-sm font-bold" htmlFor="coupon">
            Coupon code
          </label>
          <input
            id="coupon"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            disabled={busy}
            className="watch-focus-ring mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </section>
      </div>

      <aside className="h-fit rounded-[24px] border border-violet-400/25 bg-[#080816]/90 p-5 lg:sticky lg:top-20">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300/70">
          Order summary
        </p>
        <p className="mt-3 text-sm text-white/50">
          Subtotal (cart): {formatMinorUnits(cart.subtotalMinor, currency)}
        </p>
        {groups.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm">
            {groups.map((g) => (
              <li key={String(g.store_id)} className="border-t border-white/10 pt-2">
                <p className="font-bold">Store order</p>
                <p className="text-white/45">
                  Discount{" "}
                  {formatMinorUnits(Number(g.discount_total_minor ?? 0), currency)}
                </p>
                <p className="text-white/45">
                  Shipping{" "}
                  {formatMinorUnits(Number(g.shipping_total_minor ?? 0), currency)}
                </p>
                <p className="text-white/45">
                  Tax {formatMinorUnits(Number(g.tax_total_minor ?? 0), currency)}
                </p>
                <p className="font-black">
                  Grand {formatMinorUnits(Number(g.grand_total_minor ?? 0), currency)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-white/40">
            Calculate a quote to see shipping, tax, and discounts.
          </p>
        )}

        <button
          type="button"
          disabled={busy}
          onClick={onCreateQuote}
          aria-disabled={busy}
          className="watch-focus-ring mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-black text-black disabled:opacity-50"
        >
          {pending ? "Working…" : quote ? "Refresh quote" : "Calculate quote"}
        </button>
        <button
          type="button"
          disabled={busy || !quote || !purchasesAvailable}
          onClick={onConfirm}
          aria-disabled={busy || !quote || !purchasesAvailable}
          className="watch-focus-ring mt-3 w-full rounded-full bg-violet-500 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
        >
          {pending ? "Placing order…" : "Place order"}
        </button>
        {!purchasesAvailable ? (
          <p role="status" className="mt-3 text-xs leading-relaxed text-amber-100/90">
            {purchasesUnavailableMessage ||
              "Purchases are not currently available. Quote preview remains available."}
          </p>
        ) : null}
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          Multi-store carts create one order per store in a single atomic
          confirm. This foundation does not collect live payments.
        </p>
        <Link
          href={APP_ROUTES.storeCart}
          className="mt-3 block text-center text-sm font-bold text-violet-300"
        >
          Back to cart
        </Link>
      </aside>
    </div>
  );
}
