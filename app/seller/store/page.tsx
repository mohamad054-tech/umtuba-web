import Link from "next/link";
import { redirect } from "next/navigation";
import SellerDashboardInsightsView from "../../components/store/SellerDashboardInsights";
import SellerOpsShell from "../../components/store/SellerOpsShell";
import { APP_ROUTES } from "../../lib/nav";
import { createClient, getServerUser } from "../../../lib/supabase/server";
import {
  ANALYTICS_PERIOD_PRESETS,
  buildAnalyticsDateRange,
  getSellerAnalyticsBundle,
  resolveAnalyticsPeriod,
  type AnalyticsPeriodKey,
  type SellerAnalyticsBundle,
} from "../../../lib/store/analyticsFinance";
import { parseFulfillmentDashboardCounts } from "../../../lib/store/adminUiHelpers";
import {
  canManageStoreSettings,
  canViewStore,
} from "../../../lib/store/permissions";
import { getSellerFulfillmentDashboardCounts } from "../../../lib/store/promotionsFulfillment";
import { listSellerOrders } from "../../../lib/store/orders";
import {
  buildDashboardMetricCards,
  deriveInventorySnapshot,
  deriveOrderSnapshotFromRecentList,
  deriveProductSnapshot,
  deriveSellerDashboardAttention,
  deriveStoreReadiness,
} from "../../../lib/store/sellerDashboardInsights";
import { buildSellerRevenueBridgeVisibility } from "../../../lib/store/commerceRevenueBridge";
import {
  listSellerInventoryRows,
  listSellerStoreReservations,
} from "../../../lib/store/sellerInventoryQueries";
import {
  countListingsReferencingSupplier,
  listSellerStoreListings,
  summarizeSellerListingsForDashboard,
} from "../../../lib/store/marketplaceSupplierSellerQueries";
import {
  explainMarketplaceSupplierToggle,
} from "../../../lib/store/marketplaceEligibility";
import {
  getOwnedOrMemberStore,
  listSellerProducts,
} from "../../../lib/store/sellerStore";
import { updateStoreAction } from "../../actions/storeCatalog";

export const metadata = {
  title: "Seller Store | UMTUBA",
};

type PageProps = {
  searchParams?: Promise<{ period?: string }> | { period?: string };
};

export default async function SellerStorePage({ searchParams }: PageProps) {
  const user = await getServerUser();
  if (!user) {
    redirect(
      `${APP_ROUTES.login}?next=${encodeURIComponent(APP_ROUTES.sellerStore)}`
    );
  }

  const supabase = await createClient();
  const membership = await getOwnedOrMemberStore(supabase, user.id);
  if (!membership) {
    redirect(APP_ROUTES.sellerSetup);
  }

  if (!canViewStore(membership.role)) {
    redirect(APP_ROUTES.seller);
  }

  const params = await Promise.resolve(searchParams ?? {});
  const periodKey = resolveAnalyticsPeriod(params.period) as AnalyticsPeriodKey;
  const periodPreset =
    ANALYTICS_PERIOD_PRESETS.find((p) => p.key === periodKey) ??
    ANALYTICS_PERIOD_PRESETS[1]!;
  const canManage = canManageStoreSettings(membership.role);
  const uiPeriod: "7d" | "30d" = periodKey === "7d" ? "7d" : "30d";

  const [
    products,
    ordersResult,
    inventoryResult,
    reservationResult,
    fulfillmentCountsResult,
    analyticsResult,
    listingsResult,
    supplierListingRefs,
  ] = await Promise.all([
    listSellerProducts(supabase, membership.store.id),
    listSellerOrders(supabase, membership.store.id, membership.role, {
      limit: 50,
    }),
    listSellerInventoryRows(supabase, membership.store.id, membership.role, {
      limit: 200,
    }),
    listSellerStoreReservations(
      supabase,
      membership.store.id,
      membership.role,
      { limit: 100 }
    ),
    getSellerFulfillmentDashboardCounts(supabase, membership.store.id),
    canManage
      ? getSellerAnalyticsBundle(
          supabase,
          membership.store.id,
          buildAnalyticsDateRange(uiPeriod)
        )
      : Promise.resolve({
          ok: false as const,
          message: "Analytics requires owner or manager.",
          unavailable: true,
        }),
    listSellerStoreListings(supabase, membership.store.id),
    countListingsReferencingSupplier(supabase, membership.store.id),
  ]);

  const productSnapshot = deriveProductSnapshot(products);
  const readiness = deriveStoreReadiness({
    storeStatus: membership.store.status,
    verificationStatus: membership.store.verification_status,
    productSnapshot,
  });

  const orderSnapshot = ordersResult.ok
    ? deriveOrderSnapshotFromRecentList({
        orders: ordersResult.data,
        scopeLabel: `Recent orders window (up to ${ordersResult.data.length} loaded)`,
      })
    : null;

  const inventorySnapshot = inventoryResult.ok
    ? deriveInventorySnapshot({
        rows: inventoryResult.data,
        reservations: reservationResult.ok ? reservationResult.data : [],
        reservationsVisible: Boolean(
          reservationResult.ok && reservationResult.canViewReservations
        ),
      })
    : null;

  const attention = deriveSellerDashboardAttention({
    storeStatus: membership.store.status,
    verificationStatus: membership.store.verification_status,
    products,
    orders: ordersResult.ok ? ordersResult.data : [],
    inventory: inventoryResult.ok ? inventoryResult.data : [],
    reservations: reservationResult.ok ? reservationResult.data : [],
    reservationsVisible: Boolean(
      reservationResult.ok && reservationResult.canViewReservations
    ),
    marketplaceListingSummary: listingsResult.ok
      ? summarizeSellerListingsForDashboard(listingsResult.data)
      : null,
  });

  const analyticsBundle: SellerAnalyticsBundle | null = analyticsResult.ok
    ? analyticsResult.bundle
    : null;
  const analyticsUnavailable =
    canManage && !analyticsResult.ok && Boolean(analyticsResult.unavailable);

  const metrics = buildDashboardMetricCards({
    orderSnapshot,
    productSnapshot,
    inventorySnapshot,
    analyticsGmvMinor: analyticsBundle
      ? analyticsBundle.summary.grossMerchandiseValueMinor
      : null,
    analyticsCurrency: analyticsBundle
      ? analyticsBundle.summary.currency
      : null,
    analyticsPeriodLabel: analyticsBundle ? periodPreset.label : null,
  });

  const fulfillmentCounts = fulfillmentCountsResult.ok
    ? parseFulfillmentDashboardCounts(fulfillmentCountsResult.counts)
    : null;

  const revenueBridge = buildSellerRevenueBridgeVisibility({
    hasPaidOrdersInWindow: (orderSnapshot?.paidOrderValueMinor ?? 0) > 0,
  });

  const eligibleProductCount = products.filter(
    (p) => Boolean(p.marketplace_eligible)
  ).length;
  const ineligibleProductCount = products.length - eligibleProductCount;
  const supplierEnabled = Boolean(
    membership.store.marketplace_supplier_enabled
  );

  return (
    <SellerOpsShell title="Store dashboard" subtitle={membership.role} wide>
      <div className="mt-6">
        <SellerDashboardInsightsView
          storeName={membership.store.name}
          storeSlug={membership.store.slug}
          role={membership.role}
          readiness={readiness}
          attention={attention}
          metrics={metrics}
          orderSnapshot={orderSnapshot}
          orderError={ordersResult.ok ? null : ordersResult.message}
          productSnapshot={productSnapshot}
          inventorySnapshot={inventorySnapshot}
          inventoryError={
            inventoryResult.ok ? null : inventoryResult.message
          }
          fulfillmentCounts={fulfillmentCounts}
          fulfillmentError={
            fulfillmentCountsResult.ok
              ? null
              : "Fulfillment lifecycle counts unavailable (RPC not applied or failed)."
          }
          salesSeries={analyticsBundle ? analyticsBundle.salesSeries : null}
          topProducts={analyticsBundle ? analyticsBundle.topProducts : null}
          analyticsPeriodLabel={periodPreset.label}
          analyticsUnavailable={analyticsUnavailable}
          canManage={canManage}
          periodKey={uiPeriod}
          revenueBridge={revenueBridge}
        />
      </div>

      <section className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Marketplace supplier
        </h2>
        <p className="mt-2 text-sm text-[var(--sf-muted)]">
          {explainMarketplaceSupplierToggle()}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: "Participation",
              value: supplierEnabled ? "Enabled" : "Paused",
            },
            {
              label: "Eligible products",
              value: String(eligibleProductCount),
            },
            {
              label: "Ineligible products",
              value: String(ineligibleProductCount),
            },
            {
              label: "Active seller listings of yours",
              value: String(supplierListingRefs.active),
            },
            {
              label: "Hidden / archived refs",
              value: String(
                supplierListingRefs.hidden + supplierListingRefs.archived
              ),
            },
          ].map((row) => (
            <div
              key={row.label}
              className="rounded-2xl border border-[var(--sf-line)] bg-black/25 px-4 py-3"
            >
              <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--sf-faint)]">
                {row.label}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-[var(--sf-ink)]">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-[var(--sf-faint)]">
          Hidden/archived listing counts stay on the seller Marketplace page.
          Enabling participation does not mark every product eligible.
        </p>
        <div className="mt-4">
          <Link
            href={APP_ROUTES.sellerMarketplace}
            className="text-sm font-semibold text-[var(--sf-accent-strong)] hover:underline"
          >
            Open marketplace workspace
          </Link>
        </div>
      </section>

      <section className="mt-6 rounded-[var(--sf-radius)] border border-[var(--sf-line)] bg-[var(--sf-surface)] p-5 md:p-7">
        <h2 className="sf-display text-xl font-semibold tracking-tight">
          Store settings
        </h2>
        <p className="mt-2 text-sm text-[var(--sf-muted)]">
          City and public contact details show on your storefront About tab.
        </p>
        <form action={updateStoreAction} className="mt-4 space-y-4">
          <input type="hidden" name="storeId" value={membership.store.id} />
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Name
            </span>
            <input
              name="name"
              required
              defaultValue={membership.store.name}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Description
            </span>
            <textarea
              name="description"
              rows={4}
              defaultValue={membership.store.description ?? ""}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              City
            </span>
            <input
              name="city"
              defaultValue={membership.store.city ?? ""}
              maxLength={80}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                Contact email
              </span>
              <input
                name="publicContactEmail"
                type="email"
                defaultValue={membership.store.public_contact_email ?? ""}
                maxLength={160}
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
                Contact phone
              </span>
              <input
                name="publicContactPhone"
                defaultValue={membership.store.public_contact_phone ?? ""}
                maxLength={40}
                className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
              />
            </label>
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sf-faint)]">
              Contact link
            </span>
            <input
              name="publicContactUrl"
              placeholder="https://…"
              defaultValue={membership.store.public_contact_url ?? ""}
              maxLength={300}
              className="w-full rounded-2xl border border-[var(--sf-line)] bg-black/40 p-4 outline-none focus:border-[rgba(214,196,161,0.45)]"
            />
          </label>
          {canManage ? (
            <label className="flex items-start gap-3 rounded-2xl border border-[var(--sf-line)] bg-black/25 p-4">
              <input
                type="checkbox"
                name="marketplaceSupplierEnabled"
                defaultChecked={supplierEnabled}
                className="mt-1 h-4 w-4 rounded border-[var(--sf-line)]"
              />
              <span>
                <span className="block text-sm font-semibold text-[var(--sf-ink)]">
                  Enable marketplace supplier participation
                </span>
                <span className="mt-1 block text-xs text-[var(--sf-muted)]">
                  Requires an active, verified store. Uncheck to pause discovery
                  of newly eligible products. Existing seller listings may become
                  purchase-blocked until eligibility is restored.
                </span>
              </span>
            </label>
          ) : null}
          <button
            type="submit"
            disabled={!canManage}
            className="watch-focus-ring rounded-full bg-[var(--sf-accent)] px-5 py-3 text-sm font-bold text-[#1a1712] disabled:opacity-40"
          >
            Save changes
          </button>
        </form>
        {canManage ? (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link
              href={APP_ROUTES.sellerPromotions}
              className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent)]"
            >
              Promotions
            </Link>
            <Link
              href={APP_ROUTES.sellerShipping}
              className="font-semibold text-[var(--sf-faint)] hover:text-[var(--sf-accent)]"
            >
              Shipping
            </Link>
          </div>
        ) : null}
      </section>
    </SellerOpsShell>
  );
}
