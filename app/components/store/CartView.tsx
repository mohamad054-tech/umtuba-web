"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  clearCartAction,
  removeCartItemAction,
  updateCartQuantityAction,
} from "../../actions/storeCart";
import { formatMinorUnits } from "../../../lib/store/money";
import type { CartSummary } from "../../../lib/store/cartRules";
import {
  canProceedFromCart,
  cartMediaDisplayUrl,
} from "../../../lib/store/cartCheckoutPresentation";
import { APP_ROUTES } from "../../lib/nav";
import { useTranslation } from "../i18n";
import StoreEmptyState from "./StoreEmptyState";
import StoreErrorState from "./StoreErrorState";

type CartViewProps = {
  initialSummary: CartSummary;
  purchasesAvailable?: boolean;
  purchasesUnavailableMessage?: string | null;
};

export default function CartView({
  initialSummary,
  purchasesAvailable = true,
  purchasesUnavailableMessage = null,
}: CartViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setSummary(initialSummary);
  }, [initialSummary]);

  function applySummary(next: CartSummary | undefined, count?: number) {
    if (next) setSummary(next);
    window.dispatchEvent(
      new CustomEvent("umtuba:cart-updated", {
        detail: { count: count ?? next?.itemCount },
      })
    );
    router.refresh();
  }

  function onQuantity(itemId: string, quantity: number) {
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const result = await updateCartQuantityAction({ itemId, quantity });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (result.summary) {
        applySummary(result.summary, result.itemCount);
        if (result.summary.hasBlockingIssues) {
          setStatus(t("store.cart.reviewBeforeCheckout"));
        } else {
          setStatus(t("store.cart.quantityUpdated"));
        }
        return;
      }
      applySummary(undefined, result.itemCount);
    });
  }

  function onRemove(itemId: string) {
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const result = await removeCartItemAction({ itemId });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      applySummary(
        result.summary ?? {
          currency: summary.currency,
          itemCount: 0,
          subtotalMinor: 0,
          groups: [],
          hasBlockingIssues: false,
        },
        result.itemCount
      );
      setStatus(t("store.cart.itemRemoved"));
    });
  }

  function onClear() {
    setError(null);
    setStatus(null);
    startTransition(async () => {
      const result = await clearCartAction();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      applySummary(
        result.summary ?? {
          currency: null,
          itemCount: 0,
          subtotalMinor: 0,
          groups: [],
          hasBlockingIssues: false,
        },
        0
      );
      setStatus(t("store.cart.cleared"));
    });
  }

  if (summary.itemCount === 0 || summary.groups.length === 0) {
    return (
      <div className="mt-6 space-y-4">
        {error ? <StoreErrorState message={error} /> : null}
        <StoreEmptyState
          title={t("store.cart.emptyTitle")}
          description={t("store.cart.emptyDescription")}
          actionHref={APP_ROUTES.store}
          actionLabel={t("store.cart.continueShopping")}
        />
      </div>
    );
  }

  const currency = summary.currency ?? "USD";
  const proceed = canProceedFromCart(summary);
  const multiNotice =
    summary.groups.length > 1
      ? t("store.cart.multiSeller", { values: { count: summary.groups.length } })
      : null;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4" aria-busy={pending || undefined}>
        {error ? <StoreErrorState message={error} /> : null}
        {status && !error ? (
          <p role="status" className="text-sm text-[var(--sf-muted)]">
            {status}
          </p>
        ) : null}
        {multiNotice ? (
          <p
            role="note"
            className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[rgba(106,76,255),0.06)] px-4 py-3 text-sm leading-relaxed text-[var(--sf-muted)]"
          >
            {multiNotice}
          </p>
        ) : null}

        {summary.groups.map((group) => (
          <section
            key={group.storeId}
            className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 md:p-5"
            aria-label={t("store.cart.itemsFrom", { values: { name: group.storeName } })}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="sf-eyebrow">{t("store.cart.seller")}</p>
                <h2 className="sf-display mt-1 text-lg font-semibold tracking-tight">
                  {group.storeName}
                </h2>
              </div>
              <Link
                href={
                  group.storeSlug
                    ? `/store/${group.storeSlug}`
                    : APP_ROUTES.store
                }
                className="text-xs font-semibold text-[var(--sf-accent-strong)] hover:text-[var(--sf-accent)]"
              >
                {t("store.cart.viewStore")}
              </Link>
            </div>
            <p className="mt-1 text-xs text-[var(--sf-faint)]">
              {t("store.cart.sellerSubtotal", {
                values: {
                  amount: formatMinorUnits(group.storeSubtotalMinor, currency),
                },
              })}
            </p>

            <ul className="mt-4 space-y-3">
              {group.items.map((item) => {
                const mediaUrl = cartMediaDisplayUrl(item.mediaSnapshot);
                return (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-[var(--sf-line)] bg-black/25 p-3 md:p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--sf-line)] bg-[var(--sf-surface-2)]">
                        {mediaUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <span className="flex h-full items-center justify-center text-xs font-semibold text-[var(--sf-faint)]">
                            {(item.productTitle[0] ?? "U").toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="sf-display font-semibold tracking-tight">
                          {item.productTitle}
                        </p>
                        <p className="mt-1 text-xs text-[var(--sf-faint)]">
                          {item.variantTitle}
                        </p>
                        <div className="mt-2 flex flex-wrap items-baseline gap-2">
                          <p className="text-sm font-semibold text-[var(--sf-accent-strong)]">
                            {formatMinorUnits(item.unitPriceMinor, item.currency)}
                          </p>
                          {item.priceChanged && item.liveUnitPriceMinor != null ? (
                            <p className="text-xs text-[var(--sf-danger)]">
                              {t("store.cart.livePrice", {
                                values: {
                                  amount: formatMinorUnits(
                                    item.liveUnitPriceMinor,
                                    item.currency
                                  ),
                                },
                              })}
                            </p>
                          ) : null}
                        </div>
                        {item.available != null ? (
                          <p className="mt-1 text-xs text-[var(--sf-muted)]">
                            {item.available > 0
                              ? t("store.cart.availableCount", {
                                  values: { count: item.available },
                                })
                              : t("store.cart.unavailable")}
                          </p>
                        ) : null}
                        {item.blockingIssue ? (
                          <p
                            role="alert"
                            className="mt-2 text-xs font-semibold text-[var(--sf-danger)]"
                          >
                            {item.blockingIssue}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                        <div className="flex items-center gap-1 rounded-full border border-[var(--sf-line)] bg-black/30 p-1">
                          <button
                            type="button"
                            aria-label={t("store.cart.decreaseQty", {
                              values: { title: item.productTitle },
                            })}
                            disabled={pending || item.quantity <= 1}
                            onClick={() =>
                              onQuantity(item.id, Math.max(1, item.quantity - 1))
                            }
                            className="watch-focus-ring flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold disabled:opacity-40"
                          >
                            −
                          </button>
                          <label className="sr-only" htmlFor={`qty-${item.id}`}>
                            {t("store.cart.quantityFor", {
                              values: { title: item.productTitle },
                            })}
                          </label>
                          <input
                            id={`qty-${item.id}`}
                            key={`${item.id}-${item.quantity}`}
                            type="number"
                            min={1}
                            max={
                              item.available != null && item.available > 0
                                ? item.available
                                : 9999
                            }
                            defaultValue={item.quantity}
                            disabled={pending}
                            onBlur={(e) => {
                              const next = Number(e.target.value);
                              if (!Number.isInteger(next)) {
                                setError(t("store.cart.qtyWhole"));
                                e.target.value = String(item.quantity);
                                return;
                              }
                              if (next !== item.quantity) {
                                onQuantity(item.id, next);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="watch-focus-ring w-14 bg-transparent text-center text-sm outline-none"
                          />
                          <button
                            type="button"
                            aria-label={t("store.cart.increaseQty", {
                              values: { title: item.productTitle },
                            })}
                            disabled={pending}
                            onClick={() => onQuantity(item.id, item.quantity + 1)}
                            className="watch-focus-ring flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onRemove(item.id)}
                          className="sf-btn sf-btn-danger"
                        >
                          {t("store.cart.remove")}
                        </button>
                        <p className="text-xs text-[var(--sf-faint)]">
                          {t("store.cart.line", {
                            values: {
                              amount: formatMinorUnits(
                                item.lineTotalMinor,
                                item.currency
                              ),
                            },
                          })}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}

        <button
          type="button"
          disabled={pending}
          onClick={onClear}
          className="watch-focus-ring text-sm font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-ink)]"
        >
          {t("store.cart.clear")}
        </button>
      </div>

      <aside className="h-fit rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 lg:sticky lg:top-20">
        <p className="sf-eyebrow">{t("store.cart.summary")}</p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--sf-faint)]">{t("store.cart.items")}</dt>
            <dd className="font-semibold">{summary.itemCount}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-[var(--sf-faint)]">{t("store.cart.sellers")}</dt>
            <dd className="font-semibold">{summary.groups.length}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-[var(--sf-line)] pt-3">
            <dt className="text-[var(--sf-faint)]">{t("store.cart.itemSubtotal")}</dt>
            <dd className="text-lg font-semibold text-[var(--sf-accent-strong)]">
              {formatMinorUnits(summary.subtotalMinor, currency)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <dt className="text-[var(--sf-faint)]">{t("store.cart.discount")}</dt>
            <dd className="text-[var(--sf-faint)]">{t("store.cart.calculatedAtCheckout")}</dd>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <dt className="text-[var(--sf-faint)]">{t("store.cart.tax")}</dt>
            <dd className="text-[var(--sf-faint)]">{t("store.cart.calculatedAtCheckout")}</dd>
          </div>
          <div className="flex justify-between gap-3 text-xs">
            <dt className="text-[var(--sf-faint)]">{t("store.cart.delivery")}</dt>
            <dd className="text-[var(--sf-faint)]">{t("store.cart.calculatedAtCheckout")}</dd>
          </div>
        </dl>

        {!proceed.ok ? (
          <p role="alert" className="mt-4 text-xs leading-relaxed text-[var(--sf-danger)]">
            {proceed.message}
          </p>
        ) : null}

        {!purchasesAvailable ? (
          <p
            role="status"
            className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-100"
          >
            {purchasesUnavailableMessage ||
              "Order recording is currently disabled by the commerce confirm gate. You can still open checkout to review a quote preview."}
          </p>
        ) : null}

        {proceed.ok ? (
          <Link
            href={APP_ROUTES.storeCheckout}
            className="sf-btn sf-btn-primary mt-5 w-full"
          >
            {purchasesAvailable
              ? t("store.cart.continueCheckout")
              : t("store.cart.reviewCheckoutDisabled")}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="sf-btn sf-btn-primary mt-5 w-full"
          >
            {t("store.cart.checkoutUnavailable")}
          </button>
        )}
        <p className="mt-2 text-center text-[11px] leading-relaxed text-[var(--sf-faint)]">
          {t("store.cart.paymentDeferred")}
        </p>
        <Link
          href={APP_ROUTES.store}
          className="mt-3 block text-center text-sm font-semibold text-[var(--sf-accent-strong)] hover:text-[var(--sf-accent)]"
        >
          {t("store.cart.continueShopping")}
        </Link>
      </aside>

      {proceed.ok ? (
        <div className="sf-sticky-actions lg:hidden">
          <Link
            href={APP_ROUTES.store}
            className="sf-btn sf-btn-secondary"
          >
            {t("store.chrome.shop")}
          </Link>
          <Link
            href={APP_ROUTES.storeCheckout}
            className="sf-btn sf-btn-primary min-w-0 flex-1"
          >
            {purchasesAvailable
              ? t("store.cart.checkout")
              : t("store.cart.reviewCheckout")}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
