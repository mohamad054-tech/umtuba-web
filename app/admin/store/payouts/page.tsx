import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import {
  PAYOUT_PROVIDER_CONTRACTS,
  buildAdminPayoutRailsDiagnostics,
} from "../../../../lib/store/sellerPayoutRails";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";
import AdminStoreShell, { StatusChip } from "../AdminStoreShell";

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

  const diagnostics = buildAdminPayoutRailsDiagnostics();

  return (
    <AdminStoreShell title="Seller payout rails">
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-2xl font-black tracking-tight">
            Payout Rails V1
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Contracts and mock execution diagnostics only. Live bank rails and
            external transfer providers remain disabled.
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
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Providers</h2>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {PAYOUT_PROVIDER_CONTRACTS.map((p) => (
              <li key={p.providerId}>
                <code className="text-cyan-200/80">{p.providerId}</code> —{" "}
                {p.displayName} · live={String(p.supportsLiveTransfer)} · mock=
                {String(p.supportsMockExecution)}
                <p className="text-xs text-white/40">{p.notes}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Payout requests</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {diagnostics.requests.length === 0 ? (
              <li className="text-white/45">
                No in-process payout requests yet.
              </li>
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
                      {req.requestId} · store {req.storeId} · account{" "}
                      {req.accountId}
                      {req.failureCode ? ` · ${req.failureCode}` : ""}
                      {req.batchId ? ` · batch ${req.batchId}` : ""}
                    </p>
                  </li>
                ))
            )}
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Batches</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {diagnostics.batches.length === 0 ? (
              <li className="text-white/45">No batches yet.</li>
            ) : (
              diagnostics.batches
                .slice()
                .reverse()
                .map((batch) => (
                  <li
                    key={batch.batchId}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">
                        {batch.providerId} · {batch.totalAmountMinor}{" "}
                        {batch.currency}
                      </span>
                      <StatusChip status={batch.status} />
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {batch.batchId} · {batch.requestIds.length} request(s)
                    </p>
                  </li>
                ))
            )}
          </ul>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Executions / failures</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {diagnostics.executions.length === 0 ? (
              <li className="text-white/45">No mock executions yet.</li>
            ) : (
              diagnostics.executions
                .slice()
                .reverse()
                .map((ex) => (
                  <li
                    key={ex.executionId}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-white">
                        {ex.providerId}
                      </span>
                      <StatusChip status={ex.status} />
                    </div>
                    <p className="mt-1 text-xs text-white/45">
                      {ex.mockProviderReference}
                      {ex.failureCode ? ` · ${ex.failureCode}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-white/40">{ex.note}</p>
                  </li>
                ))
            )}
          </ul>
        </div>
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
