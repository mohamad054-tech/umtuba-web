"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  clearCartAction,
  removeCartItemAction,
  updateCartQuantityAction,
} from "../../actions/storeCart";
import { formatMinorUnits } from "../../../lib/store/money";
import type { CartSummary } from "../../../lib/store/cartRules";
import { APP_ROUTES } from "../../lib/nav";
import StoreEmptyState from "./StoreEmptyState";
import StoreErrorState from "./StoreErrorState";

type CartViewProps = {
  initialSummary: CartSummary;
};

export default function CartView({ initialSummary }: CartViewProps) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refreshAfter(count?: number) {
    window.dispatchEvent(
      new CustomEvent("umtuba:cart-updated", {
        detail: { count },
      })
    );
    router.refresh();
  }

  function onQuantity(itemId: string, quantity: number) {
    setError(null);
    startTransition(async () => {
      const result = await updateCartQuantityAction({ itemId, quantity });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      refreshAfter();
    });
  }

  function onRemove(itemId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeCartItemAction({ itemId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSummary((prev) => {
        const lines = prev.groups.flatMap((g) => g.items).filter((i) => i.id !== itemId);
        const nextCount = lines.reduce((s, i) => s + i.quantity, 0);
        refreshAfter(nextCount);
        return {
          ...prev,
          itemCount: nextCount,
          groups: prev.groups
            .map((g) => ({
              ...g,
              items: g.items.filter((i) => i.id !== itemId),
              storeSubtotalMinor: g.items
                .filter((i) => i.id !== itemId)
                .reduce((s, i) => s + i.lineTotalMinor, 0),
            }))
            .filter((g) => g.items.length > 0),
          subtotalMinor: lines.reduce((s, i) => s + i.lineTotalMinor, 0),
        };
      });
    });
  }

  function onClear() {
    setError(null);
    startTransition(async () => {
      const result = await clearCartAction();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSummary({ currency: null, itemCount: 0, subtotalMinor: 0, groups: [] });
      refreshAfter(0);
    });
  }

  if (summary.itemCount === 0 || summary.groups.length === 0) {
    return (
      <div className="mt-6 space-y-4">
        {error ? <StoreErrorState message={error} /> : null}
        <StoreEmptyState
          title="Your cart is empty"
          description="Browse the store and add active products when you are ready."
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

  const currency = summary.currency ?? "USD";

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4" aria-busy={pending || undefined}>
        {error ? <StoreErrorState message={error} /> : null}

        {summary.groups.map((group) => (
          <section
            key={group.storeId}
            className="rounded-[24px] border border-white/10 bg-[#080816]/85 p-4 md:p-5"
            aria-label={`Items from ${group.storeName}`}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black tracking-tight">{group.storeName}</h2>
              <Link
                href={`/store`}
                className="text-xs font-bold text-violet-300 hover:text-violet-200"
              >
                Store
              </Link>
            </div>

            <ul className="mt-4 space-y-3">
              {group.items.map((item) => (
                <li
                  key={item.id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-3 md:p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-black tracking-tight">{item.productTitle}</p>
                      <p className="mt-1 text-xs text-white/45">{item.variantTitle}</p>
                      {item.mediaSnapshot ? (
                        <p className="mt-2 truncate text-[10px] uppercase tracking-wider text-white/30">
                          {item.mediaSnapshot}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm font-bold text-violet-100">
                        {formatMinorUnits(item.unitPriceMinor, item.currency)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="sr-only" htmlFor={`qty-${item.id}`}>
                        Quantity for {item.productTitle}
                      </label>
                      <input
                        id={`qty-${item.id}`}
                        type="number"
                        min={1}
                        max={9999}
                        defaultValue={item.quantity}
                        disabled={pending}
                        onBlur={(e) => {
                          const next = Number(e.target.value);
                          if (Number.isInteger(next) && next !== item.quantity) {
                            onQuantity(item.id, next);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="watch-focus-ring w-20 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-violet-400/50"
                      />
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onRemove(item.id)}
                        className="watch-focus-ring rounded-full border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-right text-xs text-white/40">
                    Line{" "}
                    {formatMinorUnits(item.lineTotalMinor, item.currency)}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <button
          type="button"
          disabled={pending}
          onClick={onClear}
          className="watch-focus-ring text-sm font-bold text-white/45 hover:text-white/70"
        >
          Clear cart
        </button>
      </div>

      <aside className="h-fit rounded-[24px] border border-violet-400/25 bg-[#080816]/90 p-5 lg:sticky lg:top-20">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-300/70">
          Summary
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-white/45">Items</dt>
            <dd className="font-bold">{summary.itemCount}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-white/10 pt-3">
            <dt className="text-white/45">Subtotal</dt>
            <dd className="text-lg font-black text-violet-100">
              {formatMinorUnits(summary.subtotalMinor, currency)}
            </dd>
          </div>
        </dl>
        <Link
          href={APP_ROUTES.storeCheckout}
          className="mt-5 flex w-full items-center justify-center rounded-full bg-violet-500 px-5 py-3 text-sm font-black text-white hover:bg-violet-400"
        >
          Proceed to checkout
        </Link>
        <p className="mt-2 text-center text-[11px] text-white/40">
          Payment collection is not enabled yet. Checkout creates pending-payment
          orders only.
        </p>
        <Link
          href={APP_ROUTES.store}
          className="mt-3 block text-center text-sm font-bold text-violet-300 hover:text-violet-200"
        >
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
