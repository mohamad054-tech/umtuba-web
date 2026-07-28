import Link from "next/link";
import {
  SELLER_DASHBOARD_FULFILLMENT_CARDS,
  sellerOrdersHrefForDashboardCard,
  type FulfillmentDashboardCounts,
} from "../../../lib/store/adminUiHelpers";
import {
  formatDashboardMoney,
  type SellerDashboardAttentionItem,
  type SellerDashboardInventorySnapshot,
  type SellerDashboardMetricCard,
  type SellerDashboardOrderSnapshot,
  type SellerDashboardProductSnapshot,
  type SellerDashboardStoreReadiness,
} from "../../../lib/store/sellerDashboardInsights";
import type { AnalyticsSalesSeriesPoint, AnalyticsTopProductRow } from "../../../lib/store/analyticsFinance";
import { FINANCE_FOUNDATION_PLACEHOLDER } from "../../../lib/store/analyticsFinance";
import { APP_ROUTES } from "../../lib/nav";

type Props = {
  storeName: string;
  storeSlug: string;
  role: string;
  readiness: SellerDashboardStoreReadiness;
  attention: SellerDashboardAttentionItem[];
  metrics: SellerDashboardMetricCard[];
  orderSnapshot: SellerDashboardOrderSnapshot | null;
  orderError: string | null;
  productSnapshot: SellerDashboardProductSnapshot | null;
  inventorySnapshot: SellerDashboardInventorySnapshot | null;
  inventoryError: string | null;
  fulfillmentCounts: FulfillmentDashboardCounts | null;
  fulfillmentError: string | null;
  salesSeries: AnalyticsSalesSeriesPoint[] | null;
  topProducts: AnalyticsTopProductRow[] | null;
  analyticsPeriodLabel: string | null;
  analyticsUnavailable: boolean;
  canManage: boolean;
  periodKey: "7d" | "30d";
};

export default function SellerDashboardInsightsView(props: Props) {
  const {
    storeName,
    storeSlug,
    role,
    readiness,
    attention,
    metrics,
    orderSnapshot,
    orderError,
    productSnapshot,
    inventorySnapshot,
    inventoryError,
    fulfillmentCounts,
    fulfillmentError,
    salesSeries,
    topProducts,
    analyticsPeriodLabel,
    analyticsUnavailable,
    canManage,
    periodKey,
  } = props;

  return (
    <div className="space-y-6">
      <header className="rounded-[var(--sf-radius-lg)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <p className="sf-eyebrow">@{storeSlug}</p>
        <h1 className="sf-display mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          {storeName}
        </h1>
        <p className="mt-2 text-sm text-[var(--sf-muted)]">
          Operational command center · Role {role}. Metrics are trusted
          summaries only — not forecasts, traffic, or profit.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["7d", "30d"] as const).map((key) => (
            <Link
              key={key}
              href={`${APP_ROUTES.sellerStore}?period=${key}`}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                periodKey === key
                  ? "border-[var(--sf-accent)] bg-[var(--sf-accent)] text-[#1a1712]"
                  : "border-[var(--sf-line)] text-[var(--sf-muted)]"
              }`}
            >
              {key === "7d" ? "Last 7 days" : "Last 30 days"}
            </Link>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/seller/store/products"
            className="watch-focus-ring rounded-full bg-[var(--sf-accent)] px-4 py-2 text-sm font-bold text-[#1a1712]"
          >
            Products
          </Link>
          <Link
            href={APP_ROUTES.sellerOrders}
            className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold"
          >
            Orders
          </Link>
          <Link
            href={APP_ROUTES.sellerInventory}
            className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold"
          >
            Inventory
          </Link>
          {canManage ? (
            <Link
              href={`${APP_ROUTES.sellerAnalytics}?period=${periodKey}`}
              className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold"
            >
              Analytics
            </Link>
          ) : null}
          <Link
            href={`/store/${storeSlug}`}
            className="watch-focus-ring rounded-full border border-[var(--sf-line)] px-4 py-2 text-sm font-semibold"
          >
            Public store
          </Link>
        </div>
      </header>

      <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Store readiness
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-[var(--sf-line)] px-3 py-1 text-xs font-semibold">
            Store · {readiness.storeActive ? "Active" : "Inactive"}
          </span>
          <span className="rounded-full border border-[var(--sf-line)] px-3 py-1 text-xs font-semibold">
            Verification · {readiness.storeVerified ? "Verified" : "Incomplete"}
          </span>
          <span className="rounded-full border border-[var(--sf-line)] px-3 py-1 text-xs font-semibold">
            Catalog · {readiness.catalogReady ? "Ready" : "Not ready"}
          </span>
          <span className="rounded-full border border-[var(--sf-line)] px-3 py-1 text-xs font-semibold">
            Order ops · {readiness.orderOpsReady ? "Ready" : "Blocked"}
          </span>
        </div>
        {readiness.notes.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-[var(--sf-muted)]">
            {readiness.notes.map((note) => (
              <li key={note}>· {note}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--sf-ok)]">
            Store appears operationally ready from trusted status signals.
          </p>
        )}
      </section>

      <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Needs attention
        </h2>
        <p className="mt-1 text-sm text-[var(--sf-faint)]">
          Only trusted blockers and actionable states. No guessed alerts.
        </p>
        {attention.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--sf-line)] px-4 py-8 text-center text-sm text-[var(--sf-faint)]">
            Nothing urgent in the current trusted window.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {attention.map((item) => (
              <li
                key={item.id}
                className={`rounded-2xl border px-4 py-3 ${
                  item.severity === "critical"
                    ? "border-[rgba(240,168,168,0.35)] bg-[rgba(240,168,168,0.08)]"
                    : item.severity === "warn"
                      ? "border-amber-400/25 bg-amber-500/10"
                      : "border-[var(--sf-line)] bg-black/20"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                      {item.severity}
                    </p>
                    <p className="mt-1 font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-[var(--sf-muted)]">
                      {item.reason}
                    </p>
                  </div>
                  <Link
                    href={item.href}
                    className="shrink-0 text-sm font-semibold text-[var(--sf-accent-strong)]"
                  >
                    {item.actionLabel} →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Trusted summaries
        </h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metrics.map((card) => (
            <div
              key={card.id}
              className="rounded-2xl border border-[var(--sf-line)] bg-black/20 px-4 py-3"
            >
              <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                {card.label}
              </dt>
              <dd className="mt-1 text-2xl font-semibold tracking-tight">
                {card.href ? (
                  <Link href={card.href} className="hover:text-[var(--sf-accent)]">
                    {card.value}
                  </Link>
                ) : (
                  card.value
                )}
              </dd>
              <p className="mt-1 text-xs text-[var(--sf-faint)]">{card.hint}</p>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Order operations
        </h2>
        {orderError ? (
          <p role="status" className="mt-3 text-sm text-[var(--sf-danger)]">
            {orderError}
          </p>
        ) : orderSnapshot ? (
          <>
            <p className="mt-2 text-sm text-[var(--sf-faint)]">
              {orderSnapshot.scopeLabel}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                  Awaiting ack
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {orderSnapshot.awaitingAck}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                  Preparing
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {orderSnapshot.preparing}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                  Packed
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {orderSnapshot.packed}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                  Completed
                </dt>
                <dd className="mt-1 text-xl font-semibold">
                  {orderSnapshot.completedOrders}
                </dd>
              </div>
            </dl>
            {orderSnapshot.recent.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {orderSnapshot.recent.map((order) => (
                  <li key={order.id}>
                    <Link
                      href={`${APP_ROUTES.sellerOrders}/${order.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--sf-line)] px-3 py-2 text-sm hover:border-[rgba(214,196,161,0.35)]"
                    >
                      <span>
                        {order.orderNumber} · {order.status} ·{" "}
                        {order.paymentStatus}
                      </span>
                      <span className="font-semibold text-[var(--sf-accent-strong)]">
                        {formatDashboardMoney(
                          order.grandTotalMinor,
                          order.currency
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-[var(--sf-faint)]">
                No orders in this window yet.
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--sf-faint)]">
            Order snapshot unavailable.
          </p>
        )}

        {fulfillmentCounts ? (
          <dl className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {SELLER_DASHBOARD_FULFILLMENT_CARDS.map((card) => (
              <Link
                key={card.key}
                href={sellerOrdersHrefForDashboardCard(
                  card,
                  APP_ROUTES.sellerOrders
                )}
                className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2 hover:border-[rgba(214,196,161,0.35)]"
              >
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                  {card.label}
                </dt>
                <dd className="mt-1 text-lg font-semibold">
                  {fulfillmentCounts[card.key]}
                </dd>
              </Link>
            ))}
          </dl>
        ) : fulfillmentError ? (
          <p role="status" className="mt-4 text-sm text-amber-100">
            {fulfillmentError}
          </p>
        ) : null}
      </section>

      <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Product readiness
        </h2>
        {productSnapshot ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                ["Draft", productSnapshot.draft],
                ["In review", productSnapshot.inReview],
                ["Published", productSnapshot.active],
                ["Hidden", productSnapshot.hidden],
                ["Rejected", productSnapshot.rejected],
                ["Archived", productSnapshot.archived],
              ] as const
            ).map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2"
              >
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                  {label}
                </dt>
                <dd className="mt-1 text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[var(--sf-faint)]">
            Product snapshot unavailable.
          </p>
        )}
      </section>

      <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="sf-display text-xl font-semibold tracking-tight">
            Inventory pressure
          </h2>
          <Link
            href={APP_ROUTES.sellerInventory}
            className="text-sm font-semibold text-[var(--sf-accent)]"
          >
            Open inventory →
          </Link>
        </div>
        {inventoryError ? (
          <p role="status" className="mt-3 text-sm text-[var(--sf-danger)]">
            {inventoryError}
          </p>
        ) : inventorySnapshot ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                Low stock
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {inventorySnapshot.lowStock}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                Out of stock
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {inventorySnapshot.outOfStock}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                Fully reserved
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {inventorySnapshot.fullyReserved}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                Missing
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {inventorySnapshot.missing}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                Active holds
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {inventorySnapshot.reservationsVisible
                  ? String(inventorySnapshot.activeReservations ?? 0)
                  : "—"}
              </dd>
            </div>
            <div className="rounded-xl border border-[var(--sf-line)] bg-black/20 px-3 py-2">
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                Stuck holds
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {inventorySnapshot.reservationsVisible
                  ? String(inventorySnapshot.stuckReservations ?? 0)
                  : "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-[var(--sf-faint)]">
            Inventory snapshot unavailable.
          </p>
        )}
      </section>

      {(salesSeries || topProducts || analyticsUnavailable) && canManage ? (
        <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
          <h2 className="sf-display text-xl font-semibold tracking-tight">
            Trusted sales signals
          </h2>
          <p className="mt-1 text-sm text-[var(--sf-faint)]">
            {analyticsPeriodLabel
              ? `${analyticsPeriodLabel} · analytics RPC`
              : "Analytics period"}{" "}
            · merchandise value is provisional, not earnings.
          </p>
          {analyticsUnavailable ? (
            <p role="status" className="mt-3 text-sm text-amber-100">
              Analytics RPCs unavailable — showing operational list summaries
              only.
            </p>
          ) : null}
          {salesSeries && salesSeries.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {salesSeries.slice(-7).map((point) => (
                <li
                  key={point.periodStart}
                  className="flex flex-wrap justify-between gap-2 rounded-xl border border-[var(--sf-line)] px-3 py-2 text-sm"
                >
                  <span>
                    {new Date(point.periodStart).toLocaleDateString()} ·{" "}
                    {point.orderCount} orders
                  </span>
                  <span className="text-[var(--sf-muted)]">
                    Net sales (provisional) tracked in analytics
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {topProducts && topProducts.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {topProducts.slice(0, 5).map((row) => (
                <li
                  key={row.productId}
                  className="flex flex-wrap justify-between gap-2 rounded-xl border border-[var(--sf-line)] px-3 py-2 text-sm"
                >
                  <Link
                    href={`/seller/store/products/${row.productId}/edit`}
                    className="font-semibold text-[var(--sf-accent-strong)]"
                  >
                    {row.title}
                  </Link>
                  <span className="text-[var(--sf-muted)]">
                    {row.quantitySold} units ordered
                  </span>
                </li>
              ))}
            </ul>
          ) : !analyticsUnavailable ? (
            <p className="mt-3 text-sm text-[var(--sf-faint)]">
              No product order quantity in this analytics window.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Settlement & payouts
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--sf-muted)]">
          Settlement and payout visibility will appear when the trusted
          financial ledger is connected. Platform commission, seller net
          proceeds, reserves, and payout status remain{" "}
          <code className="text-[var(--sf-faint)]">
            {FINANCE_FOUNDATION_PLACEHOLDER.sellerNetProceeds.status}
          </code>
          .
        </p>
      </section>
    </div>
  );
}
