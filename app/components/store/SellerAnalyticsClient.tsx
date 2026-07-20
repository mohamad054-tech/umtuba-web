"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ANALYTICS_METRIC_DEFINITIONS,
  ANALYTICS_PERIOD_PRESETS,
  FINANCE_FOUNDATION_PLACEHOLDER,
  type AnalyticsPeriodKey,
  type SellerAnalyticsBundle,
} from "../../../lib/store/analyticsFinance";
import { formatMinorUnits } from "../../../lib/store/money";
import { APP_ROUTES } from "../../lib/nav";
import StoreEmptyState from "./StoreEmptyState";
import StoreErrorState from "./StoreErrorState";

type Props = {
  bundle: SellerAnalyticsBundle | null;
  periodKey: AnalyticsPeriodKey;
  unavailable: boolean;
  errorMessage: string | null;
};

function money(amountMinor: number, currency: string): string {
  return formatMinorUnits(amountMinor, currency);
}

function KpiCard({
  label,
  value,
  hint,
  provisional,
}: {
  label: string;
  value: string;
  hint?: string;
  provisional?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {label}
        {provisional ? (
          <span className="ml-1 normal-case tracking-normal text-white/30">
            (provisional)
          </span>
        ) : null}
      </dt>
      <dd className="mt-1 text-2xl font-black tabular-nums">{value}</dd>
      {hint ? (
        <p className="mt-1 text-xs text-white/35">{hint}</p>
      ) : null}
    </div>
  );
}

export default function SellerAnalyticsClient({
  bundle,
  periodKey,
  unavailable,
  errorMessage,
}: Props) {
  const router = useRouter();
  const currency = bundle?.summary.currency ?? "USD";

  function onPeriodChange(next: AnalyticsPeriodKey) {
    router.push(`${APP_ROUTES.sellerAnalytics}?period=${next}`);
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-white/45">
          Period
        </span>
        {ANALYTICS_PERIOD_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            onClick={() => onPeriodChange(preset.key)}
            className={`watch-focus-ring rounded-full border px-3 py-1.5 text-xs font-bold ${
              periodKey === preset.key
                ? "border-white bg-white text-black"
                : "border-white/15 text-white/70"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {unavailable ? (
        <div role="status" className="rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Store analytics requires migration{" "}
          <code className="text-xs">20260817_store_analytics_finance_foundation_v1</code>{" "}
          to be applied. Figures below are unavailable.
        </div>
      ) : null}

      <div aria-live="assertive">
        {errorMessage ? <StoreErrorState message={errorMessage} /> : null}
      </div>

      {!bundle && !unavailable && !errorMessage ? (
        <StoreEmptyState
          title="No analytics yet"
          description="Orders in the selected period will appear here once checkout and order data exist."
        />
      ) : null}

      {bundle ? (
        <>
          <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h2 className="text-xl font-black tracking-tight">Sales summary</h2>
            <p className="mt-2 text-sm text-white/45">
              Realized totals use paid orders only. Shipping and taxes are pass-through,
              not seller merchandise revenue.
            </p>
            <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label={ANALYTICS_METRIC_DEFINITIONS.netSalesMinor.label}
                value={money(bundle.summary.netSalesMinor, currency)}
                provisional
                hint={ANALYTICS_METRIC_DEFINITIONS.netSalesMinor.description}
              />
              <KpiCard
                label={ANALYTICS_METRIC_DEFINITIONS.grossMerchandiseValueMinor.label}
                value={money(bundle.summary.grossMerchandiseValueMinor, currency)}
                provisional
              />
              <KpiCard
                label={ANALYTICS_METRIC_DEFINITIONS.discountsMinor.label}
                value={money(bundle.summary.discountsMinor, currency)}
                provisional
              />
              <KpiCard
                label={ANALYTICS_METRIC_DEFINITIONS.shippingChargedMinor.label}
                value={money(bundle.summary.shippingChargedMinor, currency)}
                hint="Pass-through — not merchandise revenue"
              />
              <KpiCard
                label={ANALYTICS_METRIC_DEFINITIONS.taxesChargedMinor.label}
                value={money(bundle.summary.taxesChargedMinor, currency)}
                hint="Pass-through — not merchandise revenue"
              />
              <KpiCard
                label={ANALYTICS_METRIC_DEFINITIONS.refundsMinor.label}
                value={money(bundle.summary.refundsMinor, currency)}
              />
              <KpiCard
                label={ANALYTICS_METRIC_DEFINITIONS.paidOrders.label}
                value={String(bundle.summary.paidOrders)}
              />
              <KpiCard
                label={ANALYTICS_METRIC_DEFINITIONS.unpaidPendingOrders.label}
                value={String(bundle.summary.unpaidPendingOrders)}
              />
              <KpiCard
                label={ANALYTICS_METRIC_DEFINITIONS.refundedOrders.label}
                value={String(bundle.summary.refundedOrders)}
              />
            </dl>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h2 className="text-xl font-black tracking-tight">Sales trend (daily, UTC)</h2>
            {bundle.salesSeries.length === 0 ? (
              <p className="mt-4 text-sm text-white/45">No paid orders in this period.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
                      <th className="py-2 pr-4">Day</th>
                      <th className="py-2 pr-4">Paid orders</th>
                      <th className="py-2 pr-4">Merchandise</th>
                      <th className="py-2">Net sales</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.salesSeries.map((row) => (
                      <tr
                        key={row.periodStart}
                        className="border-b border-white/5 text-white/75"
                      >
                        <td className="py-2 pr-4 tabular-nums">
                          {new Date(row.periodStart).toLocaleDateString(undefined, {
                            dateStyle: "medium",
                            timeZone: "UTC",
                          })}
                        </td>
                        <td className="py-2 pr-4 tabular-nums">{row.orderCount}</td>
                        <td className="py-2 pr-4 tabular-nums">
                          {money(row.merchandiseSubtotalMinor, currency)}
                        </td>
                        <td className="py-2 tabular-nums">
                          {money(row.netSalesMinor, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h2 className="text-xl font-black tracking-tight">Orders by status</h2>
            {bundle.orderStatusCounts.length === 0 ? (
              <p className="mt-4 text-sm text-white/45">No orders in this period.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {bundle.orderStatusCounts.map((row) => (
                  <li
                    key={row.status}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm"
                  >
                    <span className="font-bold capitalize">{row.status}</span>
                    <span className="tabular-nums text-white/60">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h2 className="text-xl font-black tracking-tight">Top products</h2>
            {bundle.topProducts.length === 0 ? (
              <p className="mt-4 text-sm text-white/45">
                No paid line items in this period.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[28rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
                      <th className="py-2 pr-4">Product</th>
                      <th className="py-2 pr-4">Qty</th>
                      <th className="py-2">Merchandise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.topProducts.map((row) => (
                      <tr
                        key={row.productId}
                        className="border-b border-white/5 text-white/75"
                      >
                        <td className="py-2 pr-4">{row.title}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.quantitySold}</td>
                        <td className="py-2 tabular-nums">
                          {money(row.merchandiseSubtotalMinor, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h2 className="text-xl font-black tracking-tight">Coupon performance</h2>
            {bundle.couponPerformance.length === 0 ? (
              <p className="mt-4 text-sm text-white/45">
                No coupon redemptions on paid orders in this period.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[24rem] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-white/40">
                      <th className="py-2 pr-4">Code</th>
                      <th className="py-2 pr-4">Redemptions</th>
                      <th className="py-2">Discount total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.couponPerformance.map((row) => (
                      <tr
                        key={row.couponId}
                        className="border-b border-white/5 text-white/75"
                      >
                        <td className="py-2 pr-4 font-bold">{row.code}</td>
                        <td className="py-2 pr-4 tabular-nums">{row.redemptionCount}</td>
                        <td className="py-2 tabular-nums">
                          {money(row.discountMinor, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h2 className="text-xl font-black tracking-tight">
              Fulfillment &amp; shipping
            </h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ["pending", bundle.fulfillmentSummary.pending],
                  ["preparing", bundle.fulfillmentSummary.preparing],
                  ["shipped", bundle.fulfillmentSummary.shipped],
                  ["delivered", bundle.fulfillmentSummary.delivered],
                  ["returned", bundle.fulfillmentSummary.returned],
                  ["refunded", bundle.fulfillmentSummary.refunded],
                ] as const
              ).map(([label, count]) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                    {label}
                  </dt>
                  <dd className="mt-1 text-xl font-black tabular-nums">{count}</dd>
                </div>
              ))}
            </dl>
            {bundle.fulfillmentSummary.averageShipToDeliverHours != null ? (
              <p className="mt-4 text-sm text-white/45">
                Avg. ship → deliver:{" "}
                {bundle.fulfillmentSummary.averageShipToDeliverHours.toFixed(1)} hours
                (delivered orders only)
              </p>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h2 className="text-xl font-black tracking-tight">Refunds &amp; returns</h2>
            <p className="mt-2 text-sm text-white/45">
              Refunded totals rely on authoritative refunded order/payment states. Partial
              refunds are not modeled separately in V1.
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <KpiCard
                label="Refunded orders"
                value={String(bundle.refundsReturns.refundedOrders)}
              />
              <KpiCard
                label="Refund total"
                value={money(bundle.refundsReturns.refundsMinor, currency)}
              />
              <KpiCard
                label="Returned (fulfillment)"
                value={String(bundle.refundsReturns.returnedOrders)}
              />
            </dl>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
            <h2 className="text-xl font-black tracking-tight">Finance foundation</h2>
            <p className="mt-2 text-sm text-white/45">
              Future payout and settlement fields — not calculated in this foundation.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-white/55">
              {Object.entries(FINANCE_FOUNDATION_PLACEHOLDER).map(([key, model]) => (
                <li
                  key={key}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
                >
                  <span className="font-bold capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                  <span className="ml-2 text-xs text-amber-200/90">Not configured</span>
                  <p className="mt-1 text-xs text-white/35">{model.description}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      <div className="text-sm">
        <Link
          href={APP_ROUTES.sellerStore}
          className="font-bold text-white/50 hover:text-white/80"
        >
          ← Seller store
        </Link>
      </div>
    </div>
  );
}
