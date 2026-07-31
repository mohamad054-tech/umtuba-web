import { redirect } from "next/navigation";
import {
  ADMIN_STORE_UNAUTHORIZED,
  assertPlatformAdminDb,
} from "../../../../lib/store/adminAuth";
import { loadAdminRefundOperations } from "../../../../lib/store/refundOperations";
import { createClient, getServerUser } from "../../../../lib/supabase/server";
import { APP_ROUTES } from "../../../lib/nav";
import AdminStoreShell, { StatusChip } from "../AdminStoreShell";
import RefundOpsActions from "./RefundOpsActions";

export const metadata = {
  title: "Store refunds | UMTUBA Admin",
};

const PATH = APP_ROUTES.adminStoreRefunds;

export default async function AdminStoreRefundsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
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

  const sp = (await Promise.resolve(searchParams)) ?? {};
  const error =
    typeof sp.error === "string" ? sp.error : null;
  const flash =
    sp.created === "1"
      ? "Refund request created."
      : sp.updated === "1"
        ? "Refund request updated."
        : sp.executed === "1"
          ? "Refund execution finished."
          : null;

  const loaded = await loadAdminRefundOperations(supabase, { limit: 50 });
  const requests = "requests" in loaded ? loaded.requests : [];
  const loadError =
    "code" in loaded && !("requests" in loaded) ? loaded.message : null;

  return (
    <AdminStoreShell title="Refund operations">
      <section className="space-y-4">
        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
          <h1 className="text-2xl font-black tracking-tight">
            Refund Operations V1
          </h1>
          <p className="mt-2 text-sm text-white/50">
            Full-order workflow only. Approve/reject/execute are server-side and
            fail-closed. Execute uses the existing full-order refund path — no
            partial refunds and no client money fields.
          </p>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <Stat label="Requests" value={String(requests.length)} />
            <Stat
              label="Open"
              value={String(
                requests.filter((r) =>
                  ["requested", "under_review", "approved", "processing"].includes(
                    r.status
                  )
                ).length
              )}
            />
            <Stat
              label="Completed"
              value={String(
                requests.filter((r) => r.status === "completed").length
              )}
            />
          </dl>
        </div>

        {flash ? (
          <p
            role="status"
            className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
          >
            {flash}
          </p>
        ) : null}
        {error || loadError ? (
          <p
            role="alert"
            className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100"
          >
            {error ?? loadError}
          </p>
        ) : null}

        <div className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5">
          <h2 className="text-lg font-black">Refund requests</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {requests.length === 0 ? (
              <li className="text-white/45">
                No durable refund requests yet. Create via seller/admin RPC when
                an order is paid and captured.
              </li>
            ) : (
              requests.map((req) => (
                <li
                  key={req.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-white">
                      {req.trustedAmountMinor} {req.currency}
                    </span>
                    <StatusChip status={req.status} />
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    order {req.orderId} · payment {req.paymentAttemptId} · store{" "}
                    {req.storeId}
                  </p>
                  <p className="mt-1 text-xs text-white/45">
                    buyer {req.buyerUserId} · seller {req.sellerUserId}
                  </p>
                  <p className="mt-2 text-sm text-white/75">
                    Reason: {req.reason}
                  </p>
                  {req.rejectionReason ? (
                    <p className="mt-1 text-xs text-red-200/80">
                      Rejection: {req.rejectionReason}
                    </p>
                  ) : null}
                  {req.failureMessageSafe ? (
                    <p className="mt-1 text-xs text-amber-100/80">
                      Failure: {req.failureMessageSafe}
                      {req.failureCode ? ` (${req.failureCode})` : ""}
                    </p>
                  ) : null}
                  <RefundOpsActions
                    requestId={req.id}
                    status={req.status}
                    returnTo={PATH}
                  />
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
