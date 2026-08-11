import Link from "next/link";
import { adminStoreQueueCounts } from "../../../lib/store/adminQueries";
import { buildAdminCommerceBridgeStatus } from "../../../lib/store/commerceRevenueBridge";
import { loadMarketplaceAdminDiagnostics } from "../../../lib/store/marketplaceAdminDiagnostics";
import { APP_ROUTES } from "../../lib/nav";
import AdminStoreShell from "./AdminStoreShell";
import { requireAdminStoreSession } from "./requireAdminStore";

export const metadata = {
  title: "Store Admin | UMTUBA",
};

export default async function AdminStoreOverviewPage() {
  const { supabase } = await requireAdminStoreSession();
  const counts = await adminStoreQueueCounts(supabase);
  const bridgeStatus = buildAdminCommerceBridgeStatus();
  const marketplace = await loadMarketplaceAdminDiagnostics(supabase);

  return (
    <AdminStoreShell title="Store admin">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-2xl font-black tracking-tight">
          Moderation queue overview
        </h2>
        <p className="mt-2 text-sm text-white/50">
          Internal console for seller applications and product review. Checkout,
          payments, and shipping remain outside this slice.
        </p>
      </section>

      {!counts.ok ? (
        <p role="alert" className="mt-4 text-sm text-red-100">
          {counts.message}
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            {
              label: "Seller applications pending",
              value: counts.counts.seller_applications_pending,
              href: `${APP_ROUTES.adminStoreSellers}?status=pending`,
            },
            {
              label: "Products awaiting moderation",
              value: counts.counts.products_pending,
              href: `${APP_ROUTES.adminStoreProducts}?status=pending`,
            },
            {
              label: "Inventory reservations",
              value: "Ops",
              href: APP_ROUTES.adminStoreReservations,
            },
          ].map((card) => (
            <Link
              key={card.label}
              href={card.href}
              className="watch-focus-ring rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:bg-white/5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-black">{card.value}</p>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black tracking-tight">
          Marketplace diagnostics
        </h2>
        <p className="mt-2 text-sm text-white/50">
          Bounded supplier/listing eligibility signals. Remote migration probe:{" "}
          {marketplace.migrationsAppliedRemotely === false
            ? "unavailable / not confirmed"
            : marketplace.migrationsAppliedRemotely
              ? "reachable"
              : "unknown"}
          . No other-seller private merchandising or secrets.
        </p>
        {marketplace.diagnostics.length === 0 ? (
          <p className="mt-4 text-sm text-white/60" role="status">
            No marketplace diagnostics in the current bounded sample.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {marketplace.diagnostics.slice(0, 24).map((row) => (
              <li
                key={`${row.code}-${row.listingId ?? row.productId ?? row.supplierStoreId ?? "x"}`}
                className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                  {row.severity} · {row.code}
                </p>
                <p className="mt-1 text-white/80">{row.message}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h2 className="text-lg font-black tracking-tight">
          Commerce revenue bridge
        </h2>
        <p className="mt-2 text-sm text-white/50">
          Bounded operational visibility for the shared financial ledger bridge.
          No payout balances, secrets, or provider credentials are shown.
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {bridgeStatus.map((row) => (
            <div
              key={row.label}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">
                {row.label}
              </dt>
              <dd className="mt-1 text-sm text-white/80">{row.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </AdminStoreShell>
  );
}
