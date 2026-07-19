"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  confirmCheckoutQuoteAction,
  createCheckoutQuoteAction,
  saveCheckoutAddressAction,
} from "../../actions/storeCheckout";
import { formatMinorUnits } from "../../../lib/store/money";
import type { CartSummary } from "../../../lib/store/cartRules";
import type { BuyerAddressRow } from "../../../lib/store/checkout";
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
};

export default function CheckoutClient({
  cart,
  addresses,
  shippingMethods,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
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
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId]
  );

  const currency = cart.currency ?? "USD";

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
    const orders = (result.orders as Array<Record<string, unknown>>) ?? [];
    return (
      <div className="mt-6 space-y-4 rounded-[24px] border border-emerald-400/30 bg-[#080816]/90 p-6">
        <h2 className="text-2xl font-black tracking-tight">Order recorded</h2>
        <p className="text-sm text-white/60">
          {(result.payment_note as string) ||
            "Payment collection is not enabled yet. Your order is recorded as pending payment."}
        </p>
        <ul className="space-y-2 text-sm">
          {orders.map((o) => (
            <li key={String(o.order_id)} className="rounded-xl border border-white/10 p-3">
              <p className="font-bold">Order {String(o.order_number)}</p>
              <p className="text-white/45">Store {String(o.store_id)}</p>
            </li>
          ))}
        </ul>
        <Link
          href={APP_ROUTES.store}
          className="watch-focus-ring inline-flex rounded-full bg-violet-500 px-5 py-2.5 text-sm font-black text-white"
        >
          Back to store
        </Link>
      </div>
    );
  }

  function onCreateQuote() {
    setError(null);
    if (!selectedAddress) {
      setError("Add or select a shipping address.");
      return;
    }
    startTransition(async () => {
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
    });
  }

  function onConfirm() {
    setError(null);
    const quoteId = quote?.quote_id;
    if (typeof quoteId !== "string") {
      setError("Create a checkout quote first.");
      return;
    }
    startTransition(async () => {
      const form = new FormData();
      form.set("quote_id", quoteId);
      const res = await confirmCheckoutQuoteAction(form);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setResult(res.data);
    });
  }

  function onSaveAddress(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveCheckoutAddressAction(formData);
      if (!res.ok) {
        setError(res.message);
        return;
      }
      setSelectedAddressId(res.data.id);
      window.location.reload();
    });
  }

  const payload = (quote?.payload as Record<string, unknown> | undefined) ?? null;
  const groups = (payload?.groups as Array<Record<string, unknown>>) ?? [];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5" aria-busy={pending || undefined}>
        {error ? <StoreErrorState message={error} /> : null}

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
                  disabled={pending}
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
                    disabled={pending}
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
                  disabled={pending}
                />
              </label>
            ))}
            <label className="md:col-span-2 block text-xs text-white/50">
              Delivery instructions
              <textarea
                name="delivery_instructions"
                rows={2}
                className="watch-focus-ring mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
                disabled={pending}
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-white/60">
              <input type="checkbox" name="is_default" value="1" disabled={pending} />
              Set as default
            </label>
            <button
              type="submit"
              disabled={pending}
              className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-sm font-bold"
            >
              Save address
            </button>
          </form>
        </section>

        <section className="rounded-[24px] border border-white/10 bg-[#080816]/85 p-5">
          <label className="block text-sm font-bold" htmlFor="coupon">
            Coupon code
          </label>
          <input
            id="coupon"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            disabled={pending}
            className="watch-focus-ring mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
            placeholder="Optional"
          />
        </section>
      </div>

      <aside className="h-fit rounded-[24px] border border-violet-400/25 bg-[#080816]/90 p-5 lg:sticky lg:top-20">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300/70">
          Summary
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
                  Grand {formatMinorUnits(Number(g.grand_total_minor ?? 0), currency)}
                </p>
              </li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          disabled={pending}
          onClick={onCreateQuote}
          className="watch-focus-ring mt-5 w-full rounded-full bg-white px-5 py-3 text-sm font-black text-black"
        >
          {pending ? "Working…" : quote ? "Refresh quote" : "Calculate quote"}
        </button>
        <button
          type="button"
          disabled={pending || !quote}
          onClick={onConfirm}
          className="watch-focus-ring mt-3 w-full rounded-full bg-violet-500 px-5 py-3 text-sm font-black text-white disabled:opacity-40"
        >
          Place order
        </button>
        <p className="mt-3 text-[11px] leading-relaxed text-white/40">
          Multi-store carts create one order per store in a single atomic
          confirm. No payment is collected in this foundation.
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
