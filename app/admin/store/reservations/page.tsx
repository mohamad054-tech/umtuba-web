import Link from "next/link";
import { adminSetCommerceConfirmEnabledAction } from "../../../actions/storeCommerceAdmin";
import {
  adminListInventoryReservations,
  loadCommerceConfirmGate,
} from "../../../../lib/store/commerceSafetyQueries";
import { APP_ROUTES } from "../../../lib/nav";
import AdminStoreShell, { FlashMessages, StatusChip } from "../AdminStoreShell";
import { requireAdminStoreSession } from "../requireAdminStore";
import PendingSubmitButton from "../PendingSubmitButton";

export const metadata = {
  title: "Store reservations | UMTUBA Admin",
};

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

function firstParam(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function AdminStoreReservationsPage({
  searchParams,
}: PageProps) {
  const { supabase } = await requireAdminStoreSession();
  const params = await Promise.resolve(searchParams ?? {});
  const status = firstParam(params.status) ?? "active";
  const storeId = firstParam(params.store_id)?.trim() || null;
  const stuckOnly = status === "stuck";

  const gate = await loadCommerceConfirmGate(supabase);
  const list = await adminListInventoryReservations(supabase, {
    status: stuckOnly ? null : status === "all" ? null : status,
    storeId,
    stuckOnly,
    limit: 100,
  });

  return (
    <AdminStoreShell title="Reservations">
      <section className="rounded-[28px] border border-white/10 bg-[#080816]/80 p-5 md:p-7">
        <h1 className="text-2xl font-black tracking-tight">
          Inventory reservations
        </h1>
        <p className="mt-2 text-sm text-white/50">
          Operational visibility only. No buyer contact or payment metadata.
          Stuck = active/pending_capture past expiry (conservative, read-only).
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <StatusChip
            status={gate.purchasesAvailable ? "commerce_on" : "commerce_off"}
          />
          <p className="text-sm text-white/60">
            DB gate: {gate.dbEnabled ? "enabled" : "disabled"}
            {!gate.purchasesAvailable
              ? " · purchases blocked (DB and/or server kill switch)"
              : ""}
          </p>
        </div>

        <form
          action={adminSetCommerceConfirmEnabledAction}
          className="mt-4 flex flex-wrap gap-2"
        >
          <input type="hidden" name="enabled" value="1" />
          <PendingSubmitButton
            label="Enable commerce confirm (DB)"
            pendingLabel="Saving…"
            className="watch-focus-ring rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-100"
          />
        </form>
        <form
          action={adminSetCommerceConfirmEnabledAction}
          className="mt-2 flex flex-wrap gap-2"
        >
          <input type="hidden" name="enabled" value="0" />
          <PendingSubmitButton
            label="Disable commerce confirm (DB)"
            pendingLabel="Saving…"
            className="watch-focus-ring rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-100"
          />
        </form>
        <p className="mt-3 text-[11px] text-white/40">
          Emergency env kill switch ({`STORE_COMMERCE_CONFIRM_KILL_SWITCH`}) is
          server-only, kill-only, and never force-enables when DB is off.
          Expiry cleanup RPC exists for manual/ops use — no automated schedule
          in this phase.
        </p>
      </section>

      <form
        method="get"
        className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
      >
        <label className="text-xs text-white/50">
          Status
          <select
            name="status"
            defaultValue={status}
            className="watch-focus-ring mt-1 block rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="pending_capture">Pending capture</option>
            <option value="released">Released</option>
            <option value="expired">Expired</option>
            <option value="consumed">Consumed</option>
            <option value="stuck">Stuck (past expiry)</option>
          </select>
        </label>
        <label className="text-xs text-white/50">
          Store id filter
          <input
            name="store_id"
            defaultValue={storeId ?? ""}
            placeholder="uuid"
            className="watch-focus-ring mt-1 block w-72 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          className="watch-focus-ring rounded-full border border-white/20 px-4 py-2 text-sm font-bold"
        >
          Filter
        </button>
        <Link
          href={APP_ROUTES.adminStoreReservations}
          className="text-sm font-bold text-white/50 hover:text-white"
        >
          Reset
        </Link>
      </form>

      {!list.ok ? (
        <FlashMessages error={list.message} />
      ) : list.data.length === 0 ? (
        <p className="mt-4 text-sm text-white/45">No reservations match.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.04] text-[11px] uppercase tracking-wide text-white/45">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Qty</th>
                <th className="px-3 py-2">Store</th>
                <th className="px-3 py-2">Variant</th>
                <th className="px-3 py-2">Session</th>
                <th className="px-3 py-2">Order</th>
                <th className="px-3 py-2">Expires</th>
                <th className="px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((row) => (
                <tr key={row.id} className="border-t border-white/10">
                  <td className="px-3 py-2">
                    <StatusChip status={row.status} />
                    {row.is_stuck_past_expiry ? (
                      <span className="ml-2 text-[10px] font-bold uppercase text-amber-200">
                        stuck
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 font-mono">{row.quantity}</td>
                  <td className="px-3 py-2 font-mono text-xs text-white/60">
                    {row.store_id.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-white/60">
                    {row.variant_id.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-white/60">
                    {row.checkout_session_id.slice(0, 8)}…
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-white/60">
                    {row.order_id ? `${row.order_id.slice(0, 8)}…` : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-white/55">
                    {new Date(row.expires_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs text-white/45">
                    {row.release_reason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminStoreShell>
  );
}
