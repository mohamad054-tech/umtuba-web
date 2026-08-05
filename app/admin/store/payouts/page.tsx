import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import {
  PAYOUT_PROVIDER_CONTRACTS,
  buildAdminPayoutRailsDiagnostics,
} from "../../../../lib/store/sellerPayoutRails";
import {
  buildSellerLivePayoutGateReadinessReport,
  SELLER_LIVE_PAYOUT_V1_PROVIDER_ID,
} from "../../../../lib/store/sellerLivePayout";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { adminListLivePayoutExecutionsAction } from "../../../actions/storeAdminLivePayout";
import { APP_ROUTES } from "../../../lib/nav";
import AdminStoreShell, { StatusChip } from "../AdminStoreShell";
import AdminLivePayoutQueue from "../../../components/store/AdminLivePayoutQueue";
import LivePayoutGateBadge from "../../../components/store/LivePayoutGateBadge";

export const metadata = {
  title: "Store payouts | UMTUBA Admin",
};

const PATH = APP_ROUTES.adminStorePayouts;

export default async function AdminStorePayoutsPage() {
  const user = await getServerUser();
  if (!user) {
    redirect(`${APP_ROUTES.login}?next=${encodeURIComponent(PATH)}`);
  }
  const supabase = await createClient();
  const isAdmin = await assertPlatformAdminDb(supabase);
  if (!isAdmin) {
    redirect(
      `${APP_ROUTES.home}?error=${encodeURIComponent(ADMIN_STORE_UNAUTHORIZED)}`
    );
  }

  const gateReport = buildSellerLivePayoutGateReadinessReport();
  const liveControlsEnabled = gateReport.ready;

  const listResult = await adminListLivePayoutExecutionsAction({ limit: 50 });
  const executions = listResult.ok ? listResult.executions : [];
  const listError = listResult.ok ? null : listResult.message;

  // Mock rails diagnostics remain secondary developer information only.
  const diagnostics = buildAdminPayoutRailsDiagnostics();

  return (
    <AdminStoreShell title="Seller live payouts">
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-2xl font-black tracking-tight">
            Live payout operations
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Durable Manual Ops Live queue for platform admins. Stripe Connect,
            Wise, and PayPal remain unavailable as live providers.
          </p>
        </div>

        <LivePayoutGateBadge report={gateReport} />

        <AdminLivePayoutQueue
          executions={executions}
          liveControlsEnabled={liveControlsEnabled}
          listError={listError}
        />

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Live provider availability</h2>
          <p className="mt-1 text-xs text-white/45">
            Only the V1 Manual Ops Live provider is in scope. Unsupported
            providers are not selectable for live execution.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li data-live-payout-provider={SELLER_LIVE_PAYOUT_V1_PROVIDER_ID}>
              <code className="text-cyan-200/80">
                {SELLER_LIVE_PAYOUT_V1_PROVIDER_ID}
              </code>{" "}
              — Manual Ops Live (V1)
              {liveControlsEnabled ? "" : " · controls gated"}
            </li>
            {(["stripe_connect", "wise", "paypal"] as const).map((id) => (
              <li
                key={id}
                className="text-white/40"
                data-live-payout-provider-blocked={id}
              >
                <code>{id}</code> — not selectable for live payouts
              </li>
            ))}
            {PAYOUT_PROVIDER_CONTRACTS.map((p) => (
              <li
                key={p.providerId}
                className="text-white/35"
                data-mock-payout-provider={p.providerId}
              >
                <code>{p.providerId}</code> — mock/deferred rail only (not live
                selectable)
              </li>
            ))}
          </ul>
        </div>

        <details
          className="rounded-[28px] border border-white/10 bg-[#080816]/60 p-5"
          data-mock-payout-diagnostics="secondary"
        >
          <summary className="cursor-pointer text-sm font-bold text-white/60">
            Developer: mock payout rails diagnostics (secondary)
          </summary>
          <p className="mt-2 text-xs text-white/40">
            In-process mock rails only — not the durable live payout queue.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <Stat label="Requests" value={String(diagnostics.requests.length)} />
            <Stat label="Batches" value={String(diagnostics.batches.length)} />
            <Stat
              label="Executions"
              value={String(diagnostics.executions.length)}
            />
            <Stat
              label="Bank rails"
              value={diagnostics.bankRailsEnabled ? "on" : "disabled"}
            />
          </dl>

          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-bold text-white/70">Mock requests</h3>
            <ul className="space-y-2 text-sm">
              {diagnostics.requests.length === 0 ? (
                <li className="text-white/45">No in-process mock requests.</li>
              ) : (
                diagnostics.requests
                  .slice()
                  .reverse()
                  .map((req) => (
                    <li
                      key={req.requestId}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-white">
                          {req.amountMinor} {req.currency}
                        </span>
                        <StatusChip status={req.status} />
                      </div>
                      <p className="mt-1 text-xs text-white/45">
                        {req.requestId} · store {req.storeId}
                        {req.failureCode ? ` · ${req.failureCode}` : ""}
                      </p>
                    </li>
                  ))
              )}
            </ul>
          </div>
        </details>
      </section>
    </AdminStoreShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-white/40">
        {label}
      </dt>
      <dd className="mt-1 font-semibold text-white/90">{value}</dd>
    </div>
  );
}
